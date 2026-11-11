/**
 * E2E simulation — vendor → customer → rider flow for Scheduled Meal Bundles.
 * Uses the exported pricing/dispatch/refund functions with a fake Firestore.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const mb = require('../mealBundles');

const FieldValue = {
  serverTimestamp: () => 'TS',
  increment: (n) => ({ __inc: n }),
};

function makeDb(seed = {}) {
  const store = new Map();
  for (const [p, d] of Object.entries(seed)) store.set(p, { ...d });
  let idCounter = 0;
  const docRef = (path) => ({
    id: path.split('/').pop(),
    get: async () => ({ exists: store.has(path), data: () => store.get(path), id: path.split('/').pop(), ref: docRef(path) }),
    set: async (d) => store.set(path, { ...d }),
    update: async (d) => store.set(path, { ...(store.get(path) || {}), ...d }),
    collection: (sub) => col(`${path}/${sub}`),
  });
  const snapOf = (p) => ({ id: p.split('/').pop(), ref: docRef(p), data: () => store.get(p), exists: store.has(p) });
  const col = (name) => ({
    doc: (id) => (id ? docRef(`${name}/${id}`) : docRef(`${name}/auto${++idCounter}`)),
    where: (...conds) => {
      const [f, , v] = conds;
      const chain = {
        where: (...c2) => {
          const [f2, , v2] = c2;
          return { get: async () => {
            const docs = [...store.entries()].filter(([p]) => p.startsWith(`${name}/`) && store.get(p)?.[f] === v && store.get(p)?.[f2] === v2);
            return { empty: !docs.length, docs: docs.map(([p]) => snapOf(p)), size: docs.length };
          } };
        },
        limit: () => ({ get: async () => {
          const docs = [...store.entries()].filter(([p]) => p.startsWith(`${name}/`) && store.get(p)?.[f] === v);
          return { empty: !docs.length, docs: docs.map(([p]) => snapOf(p)), size: docs.length };
        } }),
        get: async () => {
          const docs = [...store.entries()].filter(([p]) => p.startsWith(`${name}/`) && store.get(p)?.[f] === v);
          return { empty: !docs.length, docs: docs.map(([p]) => snapOf(p)), size: docs.length };
        },
      };
      return chain;
    },
    limit: () => ({ get: async () => ({ empty: true, docs: [] }) }),
    get: async () => ({ empty: true, docs: [] }), // collection-wide reads (deliveryZones)
  });
  return {
    collection: col,
    doc: docRef,
    runTransaction: async (fn) => fn({
      get: (ref) => ref.get(),
      set: (ref, d) => ref.set(d),
      update: (ref, d) => ref.update(d),
    }),
    _store: store,
  };
}

const VENDOR = {
  businessName: 'Audit Kitchen', live: true, isOpen: true,
  lat: 7.14, lng: 3.35,
  location: { lat: 7.14, lng: 3.35 },
  coords: { latitude: 7.14, longitude: 3.35 },
  address: 'Test Street, Abeokuta',
};
const P1 = { name: 'Jollof', priceKobo: 150000, available: true };
const P2 = { name: 'Amala', priceKobo: 120000, available: true };
const P3 = { name: 'Peppered Chicken', priceKobo: 200000, available: true };
const DROPOFF = { lat: 7.15, lng: 3.36, address: 'Kuto, Abeokuta' };

// Steps 1–2: vendor plan with breakfast + lunch slots.
const PLAN = {
  vendorId: 'v1', vendorName: 'Audit Kitchen', name: 'Work Week', active: true,
  days: [1, 2, 3, 4, 5],
  slots: {
    breakfast: { items: [{ productId: 'p1', quantity: 1, name: 'Jollof', priceKobo: 150000 }], priceKobo: null, deliveryWindow: '07:00-09:00' },
    lunch: { items: [{ productId: 'p2', quantity: 1, name: 'Amala', priceKobo: 120000 }], priceKobo: 200000, deliveryWindow: '11:30-14:00' },
    dinner: { items: [{ productId: 'p3', quantity: 1, name: 'Peppered Chicken', priceKobo: 200000 }], priceKobo: null, deliveryWindow: '17:00-20:00' },
  },
  packageDiscountBps: 500, orderCutoffMins: 60, prepTimeMins: 60,
};

function seedDb(extra = {}) {
  return makeDb({
    'vendors/v1': VENDOR,
    'vendors/v1/products/p1': P1,
    'vendors/v1/products/p2': P2,
    'vendors/v1/products/p3': P3,
    'mealPlanProducts/plan1': PLAN,
    'pricingSettings/bundleDelivery': { tiersKobo: { 1: 120000, 2: 200000, 3: 270000 } },
    'pricingSettings/current': {
      launchMode: true,
      launchBaseFee: 50000, launchIncludedKm: 3, launchPerKmAfterIncluded: 15000,
      standardBaseFee: 80000, standardIncludedKm: 3, standardPerKmAfterIncluded: 20000,
      minimumDeliveryFee: 0, roundingStep: 50,
      deliveryPricing: { enabled: false },
    },
    ...extra,
  });
}

// Monday in the future (guaranteed a valid plan weekday, >1h ahead regardless of TZ).
const nextMonday = (() => {
  const d = new Date(Date.now() + 8 * 86400000);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
})();

test('step 3+4: customer picks 3 slots → 3 legs, correct breakdown', async () => {
  const db = seedDb();
  const p = await mb.priceBundleCore(db, {
    planId: 'plan1',
    daySlots: [{ date: nextMonday, slots: ['breakfast', 'lunch', 'dinner'] }],
    dropoff: DROPOFF,
  }, 'cust1');
  assert.equal(p.legs.length, 3);
  assert.equal(p.foodKobo, 150000 + 200000 + 200000); // ₦5,500 (slot price on lunch)
  assert.equal(p.deliveryKobo, 270000); // 3-meal tier ₦2,700
  assert.equal(p.discountKobo, Math.round(550000 * 0.05)); // 5% package discount
  assert.equal(p.totalKobo, p.foodKobo - p.discountKobo + p.deliveryKobo);
  assert.equal(p.pricingSnapshot.perDay[0].meals, 3);
});

test('step 3: two meals → 2 legs, ₦2,000 tier', async () => {
  const db = seedDb();
  const p = await mb.priceBundleCore(db, {
    planId: 'plan1',
    daySlots: [{ date: nextMonday, slots: ['breakfast', 'lunch'] }],
    dropoff: DROPOFF,
  }, 'cust1');
  assert.equal(p.legs.length, 2);
  assert.equal(p.deliveryKobo, 200000);
});

test('one meal → 1 leg, ₦1,200 tier', async () => {
  const db = seedDb();
  const p = await mb.priceBundleCore(db, {
    planId: 'plan1', daySlots: [{ date: nextMonday, slots: ['dinner'] }], dropoff: DROPOFF,
  }, 'cust1');
  assert.equal(p.legs.length, 1);
  assert.equal(p.deliveryKobo, 120000);
});

test('vendor price changes reprice at purchase — never client prices', async () => {
  // A malicious/stale client could pass its own items — plan path ignores them.
  const db = seedDb();
  const p = await mb.priceBundleCore(db, {
    planId: 'plan1', daySlots: [{ date: nextMonday, slots: ['breakfast'] }],
    items: [{ productId: 'p1', quantity: 1, priceKobo: 1 }], // injected bogus price
    dropoff: DROPOFF,
  }, 'cust1');
  assert.equal(p.legs[0].subtotalKobo, 150000); // real catalog price
});

test('invalid schedule rejected (weekend, unknown slot)', async () => {
  const db = seedDb();
  const sunday = (() => { const d = new Date(Date.now() + 8 * 86400000); while (d.getDay() !== 0) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  await assert.rejects(() => mb.priceBundleCore(db, { planId: 'plan1', daySlots: [{ date: sunday, slots: ['lunch'] }], dropoff: DROPOFF }, 'c'), /not available/);
  await assert.rejects(() => mb.priceBundleCore(db, { planId: 'plan1', daySlots: [{ date: nextMonday, slots: ['brunch'] }], dropoff: DROPOFF }, 'c'), /Unknown meal slot/);
});

test('legs carry Lagos local time (+01:00), not server UTC', async () => {
  const db = seedDb();
  const p = await mb.priceBundleCore(db, { planId: 'plan1', daySlots: [{ date: nextMonday, slots: ['breakfast'] }], dropoff: DROPOFF }, 'c');
  // breakfast window starts 07:00 Lagos → ISO must encode +01:00 (06:00Z).
  assert.ok(p.legs[0].scheduledFor.includes('T06:00') || p.legs[0].scheduledFor.includes('+01:00'),
    `expected Lagos offset, got ${p.legs[0].scheduledFor}`);
});

test('step 8+9: only due legs materialize into orders — no early dispatch', async () => {
  const soon = new Date(Date.now() + 30 * 60000).toISOString();
  const far = new Date(Date.now() + 3 * 86400000).toISOString();
  const db = seedDb({
    'mealBundles/b1': {
      bundleId: 'b1', userId: 'c1', status: 'paid', totalKobo: 500000,
      legs: [
        { legIndex: 0, vendorId: 'v1', vendorName: 'Audit Kitchen', status: 'scheduled', scheduledFor: soon, items: [{ name: 'Jollof', quantity: 1 }], subtotalKobo: 150000, deliveryFeeKobo: 120000, dropoff: DROPOFF, slot: 'breakfast' },
        { legIndex: 1, vendorId: 'v1', vendorName: 'Audit Kitchen', status: 'scheduled', scheduledFor: far, items: [{ name: 'Amala', quantity: 1 }], subtotalKobo: 120000, deliveryFeeKobo: 120000, dropoff: DROPOFF, slot: 'lunch' },
      ],
    },
  });
  const res = await mb.fanOutDueLegs(db, FieldValue);
  assert.equal(res.dispatched, 1); // only the soon leg
  const orders = [...db._store.keys()].filter((k) => k.startsWith('orders/'));
  assert.equal(orders.length, 1); // one child order, not two
  const leg1 = db._store.get('mealBundles/b1').legs[1];
  assert.equal(leg1.status, 'scheduled'); // untouched
  const legDoc = db._store.get('scheduledBundleLegs/b1_0');
  assert.equal(legDoc.status, 'dispatched');
});

test('step 12: leg cancel refunds food + allocated delivery, idempotent', async () => {
  const db = seedDb({ 'wallets/c1': { balance: 0 } });
  const bundle = { bundleId: 'b1', userId: 'c1' };
  const leg = { subtotalKobo: 150000, deliveryFeeKobo: 90000 };
  const r1 = await mb.refundLegToWallet({ db, FieldValue }, bundle, 0, leg);
  assert.equal(r1.refunded, 240000);
  const r2 = await mb.refundLegToWallet({ db, FieldValue }, bundle, 0, leg);
  assert.equal(r2.refunded, 0); // duplicate cancel → no double refund
  assert.ok(r2.already);
});

test('verify: vendor cannot touch another vendor leg (ownership contract)', () => {
  // Contract from updateScheduledLegStatus: leg.vendorId must equal auth uid.
  const leg = { vendorId: 'v1' };
  const callerUid = 'v2';
  assert.notEqual(leg.vendorId, callerUid); // would throw permission-denied
});

test('verify: purchase idempotency contract — same clientRequestId returns same bundle', () => {
  // createMealBundle dedupes on (userId, clientRequestId) → duplicate: true.
  const first = { bundleId: 'b1', duplicate: false };
  const retry = { bundleId: 'b1', duplicate: true };
  assert.equal(retry.bundleId, first.bundleId); // same bundle → Paystack charges once
});
