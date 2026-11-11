/**
 * FOOD pricing finalization — boundary-exact band matrix, ownership shares,
 * customer bill math, contribution per band, corridor isolation, and
 * band-config validation. FOOD only; Book Delivery untouched.
 *
 * All assertions run against the REAL defaults (DEFAULT_PRICING_CONFIG with
 * enabled=true) and the real commerce bill helpers — no reimplemented math.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const pricingCore = require('../pricingCore');
const { platformFeeFor } = require('../commerceOrderService');
const { VENDOR_COMMISSION_RATE } = require('../vendorPayouts');

const {
  calculateDeliveryFee,
  getRiderShare,
  calculateGo7DeliveryContribution,
  resolveCorridor,
  validateDistanceBands,
  validateDeliveryPricingConfig,
  DEFAULT_PRICING_CONFIG,
} = pricingCore;

const ENABLED = { ...DEFAULT_PRICING_CONFIG, enabled: true };
const fee = (km) => calculateDeliveryFee({ orderType: 'FOOD', distanceKm: km, config: ENABLED }).deliveryFee;
const bd = (km) => calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: km, config: ENABLED }).deliveryFee;

// ---------------------------------------------------------------------------
// 1. Full boundary matrix — convention: contiguous, UPPER-INCLUSIVE.
//    "0–2 = 600" covers 2.0 exactly; 2.01 falls into >2–4 = 800.
// ---------------------------------------------------------------------------
const FOOD_MATRIX = [
  [0, 600], [0.5, 600], [1, 600], [2, 600],
  [2.01, 800], [3, 800], [4, 800],
  [4.01, 1000], [5, 1000], [6, 1000],
  [6.01, 1200], [7, 1200], [8, 1200],
  [8.01, 1500], [9, 1500], [10, 1500],
  [10.01, 1800], [12, 1800], [15, 1800],
  [15.01, 2200], [16, 2300], [20, 2700], [25, 3200], [30, 3700], [40, 4700],
];
for (const [km, expected] of FOOD_MATRIX) {
  test(`FOOD ${km} km -> ₦${expected} (exactly one fee)`, () => {
    const r = calculateDeliveryFee({ orderType: 'FOOD', distanceKm: km, config: ENABLED });
    assert.equal(r.deliveryFee, expected);
    assert.equal(r.appliedRule, 'distance-bands');
    // Determinism: identical inputs always produce the identical fee.
    assert.equal(calculateDeliveryFee({ orderType: 'FOOD', distanceKm: km, config: ENABLED }).deliveryFee, expected);
  });
}

test('FOOD >15 km formula: fee = 2200 + round((km - 15) * 100), then ₦50 rounding', () => {
  assert.equal(fee(15.01), 2200);  // 2200 + 1 → rounds to 2200
  assert.equal(fee(15.5), 2250);   // 2250 exact
  assert.equal(fee(17), 2400);
  assert.equal(fee(22.3), 2950);   // 2200 + 730 = 2930 → 2950 (₦50 rounding)
});

test('no two bands claim the same distance (default FOOD bands validate clean)', () => {
  const bands = DEFAULT_PRICING_CONFIG.orderTypes.FOOD.bands;
  assert.equal(validateDistanceBands(bands, 'FOOD').valid, true);
});

test('FOOD bands never leak Book Delivery fares', () => {
  for (const km of [1, 5, 10, 15]) assert.notEqual(fee(km), bd(km));
});

// ---------------------------------------------------------------------------
// 2. Ownership matrix on FOOD bands
// ---------------------------------------------------------------------------
const foodShare = (km, own, vt) =>
  getRiderShare({ orderType: 'FOOD', distanceKm: km, vehicleType: vt, vehicleOwnership: own });

test('FOOD GO7-owned bicycle/motorcycle -> 40% (never above 50%)', () => {
  for (const vt of ['BICYCLE', 'MOTORCYCLE']) {
    for (const km of [1, 5, 10, 16]) {
      const s = foodShare(km, 'GO7_OWNED', vt);
      assert.equal(s.riderShareRate, 0.4);
      assert.ok(s.riderShareRate <= 0.5);
    }
  }
});

test('FOOD rider-owned <=15 km -> 60%, >15 km -> 65%', () => {
  for (const vt of ['BICYCLE', 'MOTORCYCLE']) {
    assert.equal(foodShare(10, 'RIDER_OWNED', vt).riderShareRate, 0.6);
    assert.equal(foodShare(15, 'RIDER_OWNED', vt).riderShareRate, 0.6);
    assert.equal(foodShare(15.01, 'RIDER_OWNED', vt).riderShareRate, 0.65);
    assert.equal(foodShare(20, 'RIDER_OWNED', vt).riderShareRate, 0.65);
  }
});

test('FOOD missing ownership defaults to rider-owned', () => {
  const s = getRiderShare({ orderType: 'FOOD', distanceKm: 5, vehicleType: 'BICYCLE' });
  assert.equal(s.vehicleOwnership, 'RIDER_OWNED');
  assert.equal(s.riderShareRate, 0.6);
});

// ---------------------------------------------------------------------------
// 3. Customer bill — subtotal + FOOD platform fee + delivery fee, independent
// ---------------------------------------------------------------------------
test('FOOD bill: platform fee is on subtotal, commission on subtotal, delivery separate', () => {
  const SETTINGS = { platformFeeRateFood: 0.1, platformFeeRateParcel: 0.1 };
  for (const subtotal of [2000, 5000, 10000]) {
    for (const km of [2, 5, 10, 15, 20]) {
      const dFee = fee(km);
      const pFee = platformFeeFor('FOOD', subtotal, dFee, SETTINGS);
      assert.equal(pFee, Math.round(subtotal * 0.1), `platformFee @ ${subtotal}/${km}km`);
      const commission = Math.round(subtotal * VENDOR_COMMISSION_RATE);
      const total = subtotal + pFee + dFee;
      // All four figures independent — platform fee ignores deliveryFee:
      assert.equal(platformFeeFor('FOOD', subtotal, 99999, SETTINGS), pFee);
      assert.equal(Math.round(subtotal * 0.08), commission);
      assert.ok(Number.isInteger(total));
    }
  }
});

test('FOOD platform fee NEVER uses parcel rate on deliveryFee', () => {
  const s = { platformFeeRateFood: 0.1, platformFeeRateParcel: 0.1 };
  // ₦5,000 subtotal, 10 km -> delivery ₦1,500: FOOD fee ₦500 (on subtotal),
  // NOT ₦150 (parcel-style 10% of delivery fee).
  assert.equal(platformFeeFor('FOOD', 5000, 1500, s), 500);
  assert.equal(platformFeeFor('GENERAL_DELIVERY', 5000, 1500, s), 150);
});

// ---------------------------------------------------------------------------
// 4. Corridor isolation
// ---------------------------------------------------------------------------
const CORRIDOR_CFG = {
  corridors: [{
    id: 'CAMP_FUNAAB', enabled: true, orderTypes: ['GENERAL_DELIVERY'],
    pickupAreas: ['camp'], dropoffAreas: ['funaab'], bidirectional: true,
    maxDistanceKm: 18, deliveryFee: 950,
  }],
};

test('FOOD must NOT match the Camp ↔ FUNAAB corridor', () => {
  const camp = { lat: 7.2227, lng: 3.3540 };
  const funaab = { lat: 7.2290, lng: 3.4390 };
  for (const [pickup, dropoff] of [[camp, funaab], [funaab, camp]]) {
    const c = resolveCorridor({
      pickup, dropoff, distanceKm: 12,
      orderType: 'FOOD', corridors: CORRIDOR_CFG.corridors, locationLookup: {},
    });
    assert.equal(c, null);
  }
});

test('FOOD at corridor distance uses FOOD band price, not ₦950 corridor fare', () => {
  assert.equal(fee(12), 1800); // FOOD 10–15 km band, not the ₦950 corridor
});

// ---------------------------------------------------------------------------
// 5. Contribution per band (both ownerships, motorcycle + bicycle)
// ---------------------------------------------------------------------------
test('FOOD contribution fields present per band', () => {
  for (const km of [1, 3, 5, 7, 9, 12, 16]) {
    const f = fee(km);
    for (const own of ['RIDER_OWNED', 'GO7_OWNED']) {
      const s = foodShare(km, own, 'MOTORCYCLE');
      const payout = Math.round(f * s.riderShareRate);
      const c = calculateGo7DeliveryContribution({
        deliveryFee: f, riderPayout: payout, serviceFee: 0,
        distanceKm: km, vehicleType: 'MOTORCYCLE', vehicleOwnership: own,
        orderType: 'FOOD', config: ENABLED,
      });
      assert.equal(c.go7DeliveryShare, f - payout);
      assert.ok(['HEALTHY', 'LOW_CONTRIBUTION', 'LOSS_RISK'].includes(c.contributionStatus));
      assert.ok(c.estimatedOperatingCost >= 0);
    }
  }
});

// ---------------------------------------------------------------------------
// 6. Band-config validation (admin save-time gate)
// ---------------------------------------------------------------------------
test('validator rejects overlapping bands', () => {
  const r = validateDistanceBands([{ minKm: 0, maxKm: 4, fee: 600 }, { minKm: 2, maxKm: 6, fee: 800 }]);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('overlap')));
});

test('validator rejects gaps between bands', () => {
  const r = validateDistanceBands([{ minKm: 0, maxKm: 2, fee: 600 }, { minKm: 5, maxKm: 8, fee: 800 }]);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('gap')));
});

test('validator rejects negative fees and non-zero origin', () => {
  const r = validateDistanceBands([{ minKm: 1, maxKm: 3, fee: -50 }]);
  assert.equal(r.valid, false);
});

test('validator rejects perKmBeyond on a closed band', () => {
  const r = validateDistanceBands([
    { minKm: 0, maxKm: 5, fee: 600, perKmBeyond: 100 },
    { minKm: 5, fee: 1000, perKmBeyond: 100 },
  ]);
  assert.equal(r.valid, false);
});

test('validator accepts the real FOOD + Book Delivery defaults', () => {
  const r = validateDeliveryPricingConfig({ orderTypes: DEFAULT_PRICING_CONFIG.orderTypes });
  assert.equal(r.valid, true, r.errors.join('; '));
});
