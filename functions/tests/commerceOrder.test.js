/**
 * Server tests — createCommerceOrder (FOOD / MARKET / PHARMACY authority).
 * Run: node --test tests/commerceOrder.test.js  (from functions/)
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createCommerceOrder, readOrderType, COMMERCE_TYPES } = require('../commerceOrderService');
const { AuthFeeError } = require('../deliveryFeeService');
const {
  calculatePromotionDiscount,
  redeemPromotion,
  verifyPromotionQuote,
} = require('../promotionService');

// ---- order type gating (pure) ----
test('createCommerceOrder only allows FOOD / MARKET / PHARMACY', () => {
  assert.deepEqual(COMMERCE_TYPES, ['FOOD', 'MARKET', 'PHARMACY']);
  assert.equal(readOrderType('food'), 'FOOD');
  assert.equal(readOrderType('MARKET'), 'MARKET');
  assert.equal(readOrderType('pharmacy'), 'PHARMACY');
  assert.equal(readOrderType('FUEL'), null);
  assert.equal(readOrderType('GENERAL_DELIVERY'), null);
  assert.equal(readOrderType('weird'), null);
});

// ---- mock Firestore for createCommerceOrder ----
function makeDb(promos = {}) {
  const writes = [];
  const state = { promotions: { ...promos }, redemptions: {} };
  const products = {
    p1: { name: 'Jollof', price: 1500, active: true, vendorId: 'v1' },
    p2: { name: 'Market Item', price: 700, isAvailable: true, vendorId: 'v2' },
    p3: { name: 'Big Food Combo', price: 10000, active: true, vendorId: 'v1' },
    p4: { name: 'Out of Stock Item', basePrice: 2000, availability: 'unavailable' },
    p5: { name: 'BasePrice Only Item', basePrice: 3000, active: true },
  };
  const pricing = { platformFeeRateFood: 0.1, platformFeeRateParcel: 0.1, launchMode: true, launchBaseFee: 1000, launchIncludedKm: 2, launchPerKmAfterIncluded: 150, minimumDeliveryFee: 1000, maximumDeliveryFee: 6000 };
  return {
    writes,
    state,
    // No-op transaction: exists so redeemPromotion can resolve without throwing.
    // (Atomic increments are covered by the dedicated redeemPromotion unit test.)
    runTransaction: async (cb) => {
      const t = {
        get: async () => ({ exists: false, data: () => ({}) }),
        set: async () => {},
        update: async () => {},
        delete: async () => {},
      };
      await cb(t);
    },
    doc(path) {
      if (path === 'pricingSettings/current') {
        return { get: async () => ({ exists: true, data: () => pricing }) };
      }
      throw new Error('unexpected doc ' + path);
    },
    collection(name) {
      if (name === 'vendors') {
        return {
          doc(vendorId) {
            return {
              collection: () => ({
                doc: (pid) => ({
                  get: async () => ({ exists: !!products[pid], data: () => products[pid] || {} }),
                }),
              }),
            };
          },
        };
      }
      if (name === 'products') {
        return { doc: (pid) => ({ get: async () => ({ exists: !!products[pid], data: () => products[pid] || {} }) }) };
      }
      if (name === 'pricingSettings') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => pricing }) }) };
      }
      if (name === 'deliveryZones') {
        return { get: async () => ({ docs: [] }) };
      }
      if (name === 'promotions') {
        return {
          doc: (code) => ({
            get: async () => ({
              exists: !!state.promotions[code],
              data: () => state.promotions[code] || {},
            }),
          }),
        };
      }
      if (name === 'promotionRedemptions') {
        return {
          doc: (orderId) => ({
            set: async (data) => {
              state.redemptions[orderId] = data;
            },
          }),
        };
      }
      if (name === 'orders') {
        return {
          doc: (id) => ({ set: async (data) => writes.push({ id, data }) }),
          where: (field, op, val) => ({
            limit: () => ({
              get: async () => {
                const found = writes.find((w) => w.data[field] === val);
                const docs = found
                  ? [{ id: found.id, data: () => found.data }]
                  : [];
                return { empty: docs.length === 0, docs, size: docs.length };
              },
            }),
          }),
        };
      }
      throw new Error('unexpected collection ' + name);
    },
  };
}
const fieldValue = { serverTimestamp: () => 'TS' };

const baseParams = {
  orderType: 'FOOD',
  items: [{ productId: 'p1', vendorId: 'v1', quantity: 1 }],
  customer: { email: 'a@b.c', phone: '0800', name: 'A' },
  destinationCoords: { lat: 7.13, lng: 3.34 }, // valid Abeokuta
  pickupCoords: { lat: 7.15, lng: 3.35 },
  paymentMethod: 'cash',
};

function rejectCode(err, code) {
  assert.ok(err instanceof AuthFeeError, `expected AuthFeeError, got ${err && err.constructor && err.constructor.name}`);
  assert.equal(err.code, code, `expected code ${code}, got ${err.code}`);
}

test('FOOD valid order → created with authoritative fee (no client fee needed)', async () => {
  const db = makeDb();
  const res = await createCommerceOrder({ ...baseParams }, { db, uid: 'u1', fieldValue });
  assert.equal(res.success, true);
  assert.equal(res.orderType, 'FOOD');
  assert.ok(res.deliveryFee > 0);
  assert.ok(res.grandTotal === res.subtotal + res.deliveryFee + res.platformFee);
  assert.equal(db.writes.length, 1);
  const doc = db.writes[0].data;
  assert.equal(doc.orderType, 'FOOD');
  assert.equal(doc.deliveryFee, res.deliveryFee);
  assert.ok(doc.pricingConfigVersion);
});

test('FOOD tampered deliveryFee (₦10) → REJECTED, no order written', async () => {
  const db = makeDb();
  try {
    await createCommerceOrder({ ...baseParams, deliveryFee: 10 }, { db, uid: 'u1', fieldValue });
    assert.fail('should have thrown');
  } catch (e) {
    rejectCode(e, 'manipulated-delivery-fee');
  }
  assert.equal(db.writes.length, 0);
});

test('FOOD tampered distance → REJECTED', async () => {
  const db = makeDb();
  try {
    await createCommerceOrder({ ...baseParams, distanceKm: 250 }, { db, uid: 'u1', fieldValue });
    assert.fail('should have thrown');
  } catch (e) {
    rejectCode(e, 'manipulated-distance');
  }
});

test('FOOD tampered zone → REJECTED', async () => {
  const db = makeDb();
  try {
    await createCommerceOrder({ ...baseParams, zoneId: 'funaab' }, { db, uid: 'u1', fieldValue });
    assert.fail('should have thrown');
  } catch (e) {
    rejectCode(e, 'manipulated-zone');
  }
});

test('tampered orderType (FUEL) → REJECTED (not routed through commerce)', async () => {
  const db = makeDb();
  try {
    await createCommerceOrder({ ...baseParams, orderType: 'FUEL' }, { db, uid: 'u1', fieldValue });
    assert.fail('should have thrown');
  } catch (e) {
    rejectCode(e, 'invalid-order-type');
  }
});

test('unknown orderType → REJECTED', async () => {
  const db = makeDb();
  try {
    await createCommerceOrder({ ...baseParams, orderType: 'WEIRD' }, { db, uid: 'u1', fieldValue });
    assert.fail('should have thrown');
  } catch (e) {
    rejectCode(e, 'invalid-order-type');
  }
});

test('unauthenticated → REJECTED', async () => {
  const db = makeDb();
  try {
    await createCommerceOrder(baseParams, { db, uid: null, fieldValue });
    assert.fail('should have thrown');
  } catch (e) {
    rejectCode(e, 'unauthenticated');
  }
});

test('invalid / 0,0 destination → REJECTED', async () => {
  const db = makeDb();
  try {
    await createCommerceOrder({ ...baseParams, destinationCoords: { lat: 0, lng: 0 } }, { db, uid: 'u1', fieldValue });
    assert.fail('should have thrown');
  } catch (e) {
    rejectCode(e, 'invalid-coordinates');
  }
});

test('missing items → REJECTED', async () => {
  const db = makeDb();
  try {
    await createCommerceOrder({ ...baseParams, items: [] }, { db, uid: 'u1', fieldValue });
    assert.fail('should have thrown');
  } catch (e) {
    rejectCode(e, 'invalid-argument');
  }
});

// =====================================================================
// Confirmed FOOD business model — server-authoritative
//   grandTotal = subtotal + packagingFee + deliveryFee + platformFee - discounts
//   platformFee = 10% of subtotal (FOOD only)
//   packagingFee = server-owned constant (₦500) when giftPackaging is requested
//   discounts = never trusted from the client (ignored / 0)
// =====================================================================

/** Build a FOOD commerce request with a resolved ₦10,000 product (p3). */
function foodParams(overrides = {}) {
  return {
    orderType: 'FOOD',
    items: [{ productId: 'p3', vendorId: 'v1', quantity: 1 }], // price 10000
    customer: { email: 'a@b.c', phone: '0800', name: 'A' },
    destinationCoords: { lat: 7.13, lng: 3.34 },
    pickupCoords: { lat: 7.15, lng: 3.35 },
    paymentMethod: 'cash',
    ...overrides,
  };
}

function moneyOf(item, key) {
  const data = item && item.data ? item.data : item;
  return data[key];
}

function lastWrite(db) {
  return db.writes[db.writes.length - 1];
}

test('FOOD model: platformFee = 10% of authoritative subtotal, grandTotal formula', async () => {
  const db = makeDb();
  const res = await createCommerceOrder(foodParams(), { db, uid: 'u1', fieldValue });
  assert.equal(res.success, true);
  assert.equal(res.subtotal, 10000);
  assert.equal(res.platformFee, Math.round(10000 * 0.1));
  assert.equal(res.platformFee, 1000);
  assert.equal(res.packagingFee, 0); // no gift packaging requested
  assert.equal(res.promoDiscount, 0);
  assert.equal(res.itemDiscounts, 0);
  assert.equal(
    res.grandTotal,
    res.subtotal + res.packagingFee + res.deliveryFee + res.platformFee - res.promoDiscount - res.itemDiscounts
  );
  assert.ok(res.grandTotal > res.subtotal);
});

test('FOOD model: gift packaging (boolean) → server-owned ₦500 packaging fee, not client amount', async () => {
  const db = makeDb();
  const res = await createCommerceOrder(foodParams({ giftPackaging: true, packagingFee: 1 }), {
    db,
    uid: 'u1',
    fieldValue,
  });
  assert.equal(res.packagingFee, 500); // server constant, client monetary value ignored
  assert.equal(res.grandTotal, res.subtotal + 500 + res.deliveryFee + res.platformFee);
  const doc = lastWrite(db).data;
  assert.equal(doc.packagingFee, 500);
});

test('FOOD model: zero packaging fee still calculates correctly', async () => {
  const db = makeDb();
  const res = await createCommerceOrder(foodParams(), { db, uid: 'u1', fieldValue });
  assert.equal(res.packagingFee, 0);
  assert.equal(res.grandTotal, res.subtotal + res.deliveryFee + res.platformFee);
});

test('FOOD model: client promoDiscount/itemDiscounts are NOT applied (no server discount engine)', async () => {
  const db = makeDb();
  const res = await createCommerceOrder(
    foodParams({ promoDiscount: 5000, itemDiscounts: 1000, discount: 2000 }),
    { db, uid: 'u1', fieldValue }
  );
  assert.equal(res.promoDiscount, 0);
  assert.equal(res.itemDiscounts, 0);
  assert.equal(
    res.grandTotal,
    res.subtotal + res.packagingFee + res.deliveryFee + res.platformFee
  );
  const doc = lastWrite(db).data;
  assert.equal(doc.promoDiscount, 0);
});

test('FOOD model: client cannot manipulate platformFee', async () => {
  const db = makeDb();
  const res = await createCommerceOrder(foodParams({ platformFee: 1 }), { db, uid: 'u1', fieldValue });
  assert.equal(res.platformFee, Math.round(res.subtotal * 0.1));
  assert.notEqual(res.platformFee, 1);
  const doc = lastWrite(db).data;
  assert.equal(doc.platformFee, Math.round(doc.subtotal * 0.1));
});

test('FOOD model: client cannot manipulate grandTotal/totalAmount', async () => {
  const db = makeDb();
  const res = await createCommerceOrder(foodParams({ grandTotal: 1, totalAmount: 1 }), {
    db,
    uid: 'u1',
    fieldValue,
  });
  const doc = lastWrite(db).data;
  assert.equal(doc.grandTotal, doc.subtotal + doc.packagingFee + doc.deliveryFee + doc.platformFee);
  assert.ok(doc.grandTotal > 1);
});

test('FOOD model: idempotent duplicate submit returns same order, no duplicate write', async () => {
  const db = makeDb();
  const opts = { db, uid: 'u1', fieldValue };
  const first = await createCommerceOrder({ ...foodParams(), idempotencyKey: 'k1' }, opts);
  const second = await createCommerceOrder({ ...foodParams(), idempotencyKey: 'k1' }, opts);
  assert.equal(second.alreadyExists, true);
  assert.equal(second.orderId, first.orderId);
  assert.equal(db.writes.length, 1); // no duplicate order written
});

// =====================================================================
// Product resolution (fix 4): authoritative when resolvable, non-fatal
// fallback (client line preserved + priceVerified=false) when not, and
// availability/price field handling matching the marketplace data model.
// =====================================================================

test('product resolution: marketplace product resolves authoritatively (priceVerified=true)', async () => {
  const db = makeDb();
  const res = await createCommerceOrder(foodParams({ items: [{ productId: 'p3', vendorId: 'v1', quantity: 2 }] }), {
    db,
    uid: 'u1',
    fieldValue,
  });
  assert.equal(res.subtotal, 20000); // 2 × ₦10,000 server price
  const line = lastWrite(db).data.items[0];
  assert.equal(line.priceVerified, true);
  assert.equal(line.unitPrice, 10000);
});

test('product resolution: basePrice-only product resolves to basePrice', async () => {
  const db = makeDb();
  const res = await createCommerceOrder(
    foodParams({ items: [{ productId: 'p5', vendorId: 'v1', quantity: 1 }] }),
    { db, uid: 'u1', fieldValue }
  );
  assert.equal(res.subtotal, 3000);
});

test('product resolution: unavailable product (availability=unavailable) → REJECTED', async () => {
  const db = makeDb();
  try {
    await createCommerceOrder(foodParams({ items: [{ productId: 'p4', vendorId: 'v1', quantity: 1 }] }), {
      db,
      uid: 'u1',
      fieldValue,
    });
    assert.fail('should have thrown');
  } catch (e) {
    rejectCode(e, 'invalid-argument');
  }
  assert.equal(db.writes.length, 0);
});

test('product resolution: unresolvable product does NOT reject — client line preserved + priceVerified=false', async () => {
  const db = makeDb();
  const res = await createCommerceOrder(
    foodParams({ items: [{ productId: 'nope', vendorId: 'v1', quantity: 1, price: 900, name: 'Transient Combo' }] }),
    { db, uid: 'u1', fieldValue }
  );
  assert.equal(res.success, true);
  assert.equal(res.subtotal, 900); // client line preserved
  const line = lastWrite(db).data.items[0];
  assert.equal(line.priceVerified, false);
  assert.equal(line.unitPrice, 900);
  assert.equal(line.name, 'Transient Combo');
});

// =====================================================================
// Server-authoritative PROMOTION / DISCOUNT engine
// =====================================================================

const PROMO_FIXED_1000 = {
  code: 'GO7TEST',
  active: true,
  type: 'fixed',
  value: 1000,
  minimumOrder: 5000,
  maximumDiscount: 1000,
  eligibleOrderTypes: ['FOOD'],
  perCustomerLimit: 5,
};

function promoParams(overrides = {}) {
  return foodParams({ promotionCode: 'GO7TEST', ...overrides });
}

// ---- pure calculation / validation ----

test('promo: fixed ₦1000 on ₦10,000 → discount ₦1000', () => {
  const r = calculatePromotionDiscount({ promo: PROMO_FIXED_1000, subtotal: 10000, orderType: 'FOOD' });
  assert.equal(r.valid, true);
  assert.equal(r.discount, 1000);
});

test('promo: percentage 10% of ₦10,000 → ₦1000', () => {
  const promo = { ...PROMO_FIXED_1000, type: 'percentage', value: 10, maximumDiscount: 0 };
  const r = calculatePromotionDiscount({ promo, subtotal: 10000, orderType: 'FOOD' });
  assert.equal(r.valid, true);
  assert.equal(r.discount, 1000);
});

test('promo: percentage 20% with max ₦1500 cap → never exceeds ₦1500', () => {
  const promo = { ...PROMO_FIXED_1000, type: 'percentage', value: 20, maximumDiscount: 1500 };
  const r = calculatePromotionDiscount({ promo, subtotal: 10000, orderType: 'FOOD' });
  assert.equal(r.discount, 1500);
});

test('promo: fixed discount cap applied (maximumDiscount)', () => {
  const promo = { ...PROMO_FIXED_1000, value: 5000, maximumDiscount: 2000 };
  const r = calculatePromotionDiscount({ promo, subtotal: 10000, orderType: 'FOOD' });
  assert.equal(r.valid, true);
  assert.equal(r.discount, 2000);
});

test('promo: discount cannot exceed order value (never negative grandTotal)', () => {
  const promo = { ...PROMO_FIXED_1000, value: 500000, maximumDiscount: 0 };
  const r = calculatePromotionDiscount({ promo, subtotal: 10000, orderType: 'FOOD' });
  assert.equal(r.valid, true);
  assert.equal(r.discount, 10000); // capped at subtotal
});

test('promo: below minimum order → not applied', () => {
  const r = calculatePromotionDiscount({ promo: PROMO_FIXED_1000, subtotal: 3000, orderType: 'FOOD' });
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'below-minimum-order');
});

test('promo: expired → rejected', () => {
  const promo = { ...PROMO_FIXED_1000, expiresAt: Date.now() - 1000 };
  const r = calculatePromotionDiscount({ promo, subtotal: 10000, orderType: 'FOOD', now: Date.now() });
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'promotion-expired');
});

test('promo: not-yet-active → rejected', () => {
  const promo = { ...PROMO_FIXED_1000, startsAt: Date.now() + 100000 };
  const r = calculatePromotionDiscount({ promo, subtotal: 10000, orderType: 'FOOD', now: Date.now() });
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'promotion-not-started');
});

test('promo: inactive (active=false) → rejected', () => {
  const promo = { ...PROMO_FIXED_1000, active: false };
  const r = calculatePromotionDiscount({ promo, subtotal: 10000, orderType: 'FOOD' });
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'promotion-inactive');
});

test('promo: FOOD-only promotion applied to FOOD succeeds; MARKET rejected', () => {
  const food = calculatePromotionDiscount({ promo: PROMO_FIXED_1000, subtotal: 10000, orderType: 'FOOD' });
  assert.equal(food.valid, true);
  const market = calculatePromotionDiscount({ promo: PROMO_FIXED_1000, subtotal: 10000, orderType: 'MARKET' });
  assert.equal(market.valid, false);
  assert.equal(market.reason, 'order-type-not-eligible');
});

test('promo: first-order promotion → first order ok, subsequent rejected', () => {
  const promo = { ...PROMO_FIXED_1000, firstOrderOnly: true, perCustomerLimit: 1 };
  const first = calculatePromotionDiscount({ promo, subtotal: 10000, orderType: 'FOOD', priorOrderCount: 0 });
  assert.equal(first.valid, true);
  const second = calculatePromotionDiscount({ promo, subtotal: 10000, orderType: 'FOOD', priorOrderCount: 2 });
  assert.equal(second.valid, false);
  assert.equal(second.reason, 'not-first-order');
});

test('promo: per-customer usage limit enforced', () => {
  const r = calculatePromotionDiscount({
    promo: { ...PROMO_FIXED_1000, perCustomerLimit: 2 },
    subtotal: 10000,
    orderType: 'FOOD',
    customerUsageCount: 2,
  });
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'per-customer-limit-reached');
});

test('promo: global usage limit enforced', () => {
  const r = calculatePromotionDiscount({
    promo: { ...PROMO_FIXED_1000, totalUsageLimit: 100, usageCount: 100 },
    subtotal: 10000,
    orderType: 'FOOD',
  });
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'total-usage-limit-reached');
});

test('promo: vendor eligibility', () => {
  const promo = { ...PROMO_FIXED_1000, vendorIds: ['v1'] };
  const ok = calculatePromotionDiscount({ promo, subtotal: 10000, orderType: 'FOOD', vendorId: 'v1' });
  assert.equal(ok.valid, true);
  const bad = calculatePromotionDiscount({ promo, subtotal: 10000, orderType: 'FOOD', vendorId: 'v9' });
  assert.equal(bad.valid, false);
});

test('promo: product eligibility', () => {
  const promo = { ...PROMO_FIXED_1000, productIds: ['p3'] };
  const ok = calculatePromotionDiscount({ promo, subtotal: 10000, orderType: 'FOOD', itemProductIds: ['p3'] });
  assert.equal(ok.valid, true);
  const bad = calculatePromotionDiscount({ promo, subtotal: 10000, orderType: 'FOOD', itemProductIds: ['p1'] });
  assert.equal(bad.valid, false);
});

// ---- integration in createCommerceOrder ----

test('FOOD + valid promo integrates: authoritative discount in order + response', async () => {
  const db = makeDb({ GO7TEST: PROMO_FIXED_1000 });
  const res = await createCommerceOrder(promoParams(), { db, uid: 'u1', fieldValue });
  assert.equal(res.success, true);
  assert.equal(res.subtotal, 10000);
  assert.equal(res.platformFee, 1000); // 10% of subtotal (never reduced by promo)
  assert.equal(res.promoDiscount, 1000);
  assert.equal(res.promoCode, 'GO7TEST');
  assert.equal(
    res.grandTotal,
    res.subtotal + res.packagingFee + res.deliveryFee + res.platformFee - res.promoDiscount
  );
  const doc = db.writes[0].data;
  assert.equal(doc.promotionCode, 'GO7TEST');
  assert.equal(doc.promotionDiscount, 1000);
  assert.ok(doc.promotionSnapshot);
  assert.ok(doc.promotionAppliedAt);
});

test('FOOD: client fake promoDiscount=₦5000 is ignored (no code → 0 discount)', async () => {
  const db = makeDb();
  const res = await createCommerceOrder(
    foodParams({ promoDiscount: 5000, promotionDiscount: 5000 }),
    { db, uid: 'u1', fieldValue }
  );
  assert.equal(res.promoDiscount, 0);
  assert.equal(res.grandTotal, res.subtotal + res.packagingFee + res.deliveryFee + res.platformFee);
});

test('FOOD: unknown promotion code → REJECTED', async () => {
  const db = makeDb();
  try {
    await createCommerceOrder(foodParams({ promotionCode: 'NOPE' }), { db, uid: 'u1', fieldValue });
    assert.fail('should have thrown');
  } catch (e) {
    rejectCode(e, 'invalid-promotion-code');
  }
  assert.equal(db.writes.length, 0);
});

test('FOOD: FOOD-only code sent on MARKET order → REJECTED (invalid-promotion)', async () => {
  const db = makeDb({ GO7TEST: PROMO_FIXED_1000 });
  try {
    await createCommerceOrder(
      { ...foodParams({ promotionCode: 'GO7TEST' }), orderType: 'MARKET' },
      { db, uid: 'u1', fieldValue }
    );
    assert.fail('should have thrown');
  } catch (e) {
    rejectCode(e, 'invalid-promotion');
  }
});

test('FOOD: idempotent duplicate with promo does not create a second order', async () => {
  const db = makeDb({ GO7TEST: PROMO_FIXED_1000 });
  const opts = { db, uid: 'u1', fieldValue };
  const first = await createCommerceOrder({ ...promoParams(), idempotencyKey: 'pk1' }, opts);
  const second = await createCommerceOrder({ ...promoParams(), idempotencyKey: 'pk1' }, opts);
  assert.equal(second.alreadyExists, true);
  assert.equal(second.promoDiscount, first.promoDiscount);
  assert.equal(db.writes.length, 1); // no duplicate order write
});

// ---- atomic redemption ----

test('redeemPromotion increments usage atomically (with a real transaction mock)', async () => {
  const promo = { ...PROMO_FIXED_1000, usageCount: 0, customerUsage: {} };
  let promoState = { ...promo };
  const redemptions = {};
  const db = {
    collection(name) {
      if (name === 'promotions') {
        return { doc: (code) => ({ get: async () => ({ exists: true, data: () => promoState }) }) };
      }
      if (name === 'promotionRedemptions') {
        return { doc: (id) => ({ set: async (d) => { redemptions[id] = d; } }) };
      }
      return {};
    },
    async runTransaction(cb) {
      let getCalls = 0;
      await cb({
        // 1st get = redemption lookup (not present), 2nd get = promo doc (present)
        get: async () => {
          getCalls += 1;
          return getCalls === 1
            ? { exists: false, data: () => ({}) }
            : { exists: true, data: () => promoState };
        },
        set: async (ref, data) => {
          if (data && data.orderId) redemptions[data.orderId] = data;
          promoState = { ...promoState, ...data };
        },
      });
    },
  };
  await redeemPromotion({
    db,
    promotion: { id: 'GO7TEST', code: 'GO7TEST' },
    userId: 'u1',
    orderId: 'GO7-AAAA',
    idempotencyKey: 'k',
    now: 1234,
  });
  assert.equal(promoState.usageCount, 1);
  assert.equal(promoState.customerUsage.u1, 1);
  assert.ok(redemptions['GO7-AAAA']);
});

// =====================================================================
// Promotion preview (verifyPromotionQuote) + hardened first-order
// eligibility (fail-safe — never grant on an unverifiable lookup).
// =====================================================================

const FIRST_PROMO = { ...PROMO_FIXED_1000, code: 'GO7FIRST', firstOrderOnly: true, perCustomerLimit: 1 };

test('promo: verifyPromotionQuote preview returns discount without redeeming', async () => {
  const db = makeDb({ GO7TEST: PROMO_FIXED_1000 });
  const r = await verifyPromotionQuote(db, { code: 'GO7TEST', orderType: 'FOOD', subtotal: 10000, userId: 'u1' });
  assert.equal(r.ok, true);
  assert.equal(r.discount, 1000);
  assert.equal(Object.keys(db.state.redemptions).length, 0); // preview never redeems
});

test('promo: verifyPromotionQuote unknown code → invalid (generic)', async () => {
  const db = makeDb();
  const r = await verifyPromotionQuote(db, { code: 'NOPE', orderType: 'FOOD', subtotal: 10000, userId: 'u1' });
  assert.equal(r.ok, false);
  assert.equal(r.messageKey, 'invalid');
});

test('promo: firstOrderOnly granted when eligibility verified (fresh user, no prior orders)', async () => {
  const db = makeDb({ GO7FIRST: FIRST_PROMO });
  const res = await createCommerceOrder(foodParams({ promotionCode: 'GO7FIRST' }), {
    db,
    uid: 'u1',
    fieldValue,
  });
  assert.equal(res.success, true);
  assert.equal(res.promoDiscount, 1000);
});

test('promo: first-order query failure → fail-safe, promotion NOT granted', async () => {
  const db = {
    collection(name) {
      if (name === 'promotions') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => FIRST_PROMO }) }) };
      }
      if (name === 'orders') {
        return {
          where: () => ({
            limit: () => ({ get: async () => { throw new Error('missing composite index'); } }),
          }),
        };
      }
      return {};
    },
  };
  const r = await verifyPromotionQuote(db, { code: 'GO7FIRST', orderType: 'FOOD', subtotal: 10000, userId: 'u1' });
  assert.equal(r.ok, false);
  assert.equal(r.messageKey, 'first-order-eligibility-unavailable');
});

test('promo: firstOrderOnly rejects a customer with prior qualifying order (pure)', () => {
  const r = calculatePromotionDiscount({
    promo: FIRST_PROMO,
    subtotal: 10000,
    orderType: 'FOOD',
    priorOrderCount: 1,
    customerUsageCount: 0,
  });
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'not-first-order');
});
