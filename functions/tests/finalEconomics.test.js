/**
 * GO7 final economics — distance bands, ownership matrix, GO7-owned 50% cap,
 * contribution accounting, and assignment-time payout consistency.
 *
 * All assertions run against the REAL canonical defaults (DEFAULT_PRICING_CONFIG
 * with enabled=true) plus the pure assignment-economics function used by
 * assignRiderToBooking — no reimplemented math in tests.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const pricingCore = require('../pricingCore');
const { buildServerOrderPricing, computeAssignmentEconomics } = require('../bookDeliveryOrder');

const {
  calculateDeliveryFee,
  getRiderShare,
  calculateGo7DeliveryContribution,
  validateRiderShareRules,
  DEFAULT_PRICING_CONFIG,
  DEFAULT_ECONOMICS,
  MAX_GO7_OWNED_SHARE,
} = pricingCore;

const ENABLED = { ...DEFAULT_PRICING_CONFIG, enabled: true };
const fee = (orderType, km) =>
  calculateDeliveryFee({ orderType, distanceKm: km, config: ENABLED }).deliveryFee;

// ---------------------------------------------------------------------------
// 1. BOOK DELIVERY distance bands (final launch fares)
// ---------------------------------------------------------------------------
const BD_BAND_CASES = [
  [0.5, 900], [1, 900], [3, 900],                    // 0–3 km
  [3.5, 1050], [5, 1050],                            // >3–5 km
  [6, 1350], [8, 1350],                              // >5–8 km
  [9, 2500], [10, 2500],                             // >8–10 km
  [12, 3000], [14.9, 3000], [15, 3000],              // >10–15 km
  [16.5, 3650], [20, 3650],                          // >15–20 km
  [22, 5150], [25, 5150],                            // >20–25 km
  [28, 6050], [30, 6050],                            // >25–30 km
];
for (const [km, expected] of BD_BAND_CASES) {
  test(`BD band: ${km} km -> ₦${expected}`, () => {
    assert.equal(fee('GENERAL_DELIVERY', km), expected);
  });
}

test('BD >30 km open band: perKmBeyond ₦200/km applies', () => {
  // 32 km = 6050 + 2 * 200
  assert.equal(fee('GENERAL_DELIVERY', 32), 6450);
  assert.equal(fee('GENERAL_DELIVERY', 35), 7050);
});

// ---------------------------------------------------------------------------
// 2. FOOD distance bands
// ---------------------------------------------------------------------------
const FOOD_BAND_CASES = [
  [1, 600], [2, 600],
  [3, 800], [4, 800],
  [5, 1000], [6, 1000],
  [7, 1200], [8, 1200],
  [9, 1500], [10, 1500],
  [12, 1800], [15, 1800],
];
for (const [km, expected] of FOOD_BAND_CASES) {
  test(`FOOD band: ${km} km -> ₦${expected}`, () => {
    assert.equal(fee('FOOD', km), expected);
  });
}

test('FOOD >15 km open band: ₦2200 + ₦100/km beyond 15', () => {
  assert.equal(fee('FOOD', 16), 2300);
  assert.equal(fee('FOOD', 20), 2700);
});

test('FOOD does not inherit Book Delivery bands or corridor', () => {
  assert.notEqual(fee('FOOD', 1), 900); // BD 0-3km band must not leak
  assert.equal(fee('FOOD', 1), 600);
});

// ---------------------------------------------------------------------------
// 3. Ownership-aware rider share (global default matrix)
// ---------------------------------------------------------------------------
const share = (p) => getRiderShare({ orderType: 'GENERAL_DELIVERY', ...p });

test('GO7_OWNED bicycle -> 40% rider / 60% Go7', () => {
  const s = share({ distanceKm: 5, vehicleType: 'BICYCLE', vehicleOwnership: 'GO7_OWNED' });
  assert.equal(s.riderShareRate, 0.4);
  assert.equal(s.platformShareRate, 0.6);
  assert.equal(s.vehicleOwnership, 'GO7_OWNED');
});

test('GO7_OWNED motorcycle -> 40% rider / 60% Go7', () => {
  const s = share({ distanceKm: 10, vehicleType: 'MOTORCYCLE', vehicleOwnership: 'GO7_OWNED' });
  assert.equal(s.riderShareRate, 0.4);
  assert.equal(s.platformShareRate, 0.6);
});

test('RIDER_OWNED bicycle <=15 km -> 60% rider / 40% Go7', () => {
  const s = share({ distanceKm: 5, vehicleType: 'BICYCLE', vehicleOwnership: 'RIDER_OWNED' });
  assert.equal(s.riderShareRate, 0.6);
  assert.equal(s.platformShareRate, 0.4);
});

test('RIDER_OWNED motorcycle <=15 km -> 60% rider / 40% Go7', () => {
  const s = share({ distanceKm: 14.9, vehicleType: 'MOTORCYCLE', vehicleOwnership: 'RIDER_OWNED' });
  assert.equal(s.riderShareRate, 0.6);
});

test('RIDER_OWNED motorcycle >15 km -> 65% rider / 35% Go7', () => {
  const s = share({ distanceKm: 16.5, vehicleType: 'MOTORCYCLE', vehicleOwnership: 'RIDER_OWNED' });
  assert.equal(s.riderShareRate, 0.65);
  assert.equal(s.platformShareRate, 0.35);
});

test('missing ownership defaults to RIDER_OWNED', () => {
  const s = share({ distanceKm: 10, vehicleType: 'MOTORCYCLE' });
  assert.equal(s.vehicleOwnership, 'RIDER_OWNED');
  assert.equal(s.riderShareRate, 0.6);
});

test('ownership model is GLOBAL: FOOD rider-owned also gets 60%/65%', () => {
  const s = getRiderShare({ orderType: 'FOOD', distanceKm: 5, vehicleType: 'MOTORCYCLE', vehicleOwnership: 'RIDER_OWNED' });
  assert.equal(s.riderShareRate, 0.6);
  const s7 = getRiderShare({ orderType: 'FOOD', distanceKm: 5, vehicleType: 'MOTORCYCLE', vehicleOwnership: 'GO7_OWNED' });
  assert.equal(s7.riderShareRate, 0.4);
});

// ---------------------------------------------------------------------------
// 4. GO7_OWNED hard cap (50%) — clamp + config validation
// ---------------------------------------------------------------------------
test('GO7_OWNED band configured at 90% is clamped to 50%', () => {
  const s = share({
    distanceKm: 10,
    vehicleType: 'MOTORCYCLE',
    vehicleOwnership: 'GO7_OWNED',
    config: { riderShareRules: { bands: [{ ownership: 'GO7_OWNED', share: 0.9 }] } },
  });
  assert.equal(s.riderShareRate, MAX_GO7_OWNED_SHARE);
});

test('validateRiderShareRules rejects GO7_OWNED > 50%', () => {
  const res = validateRiderShareRules({ bands: [{ ownership: 'GO7_OWNED', share: 0.9 }] });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('GO7_OWNED')));
});

test('validateRiderShareRules accepts valid ownership matrix', () => {
  const res = validateRiderShareRules(pricingCore.DEFAULT_RIDER_SHARE_RULES);
  assert.equal(res.valid, true);
});

test('corridor override obeys GO7_OWNED cap', () => {
  const s = share({
    distanceKm: 12,
    vehicleType: 'MOTORCYCLE',
    vehicleOwnership: 'GO7_OWNED',
    corridorId: 'CAMP_FUNAAB',
    config: { corridors: [{ id: 'CAMP_FUNAAB', riderShareRate: 0.9 }] },
  });
  assert.equal(s.riderShareRate, MAX_GO7_OWNED_SHARE);
});

test('corridor per-ownership override', () => {
  const cfg = { corridors: [{ id: 'X', riderShareRate: { GO7_OWNED: 0.45, RIDER_OWNED: 0.7 } }] };
  assert.equal(share({ distanceKm: 5, vehicleOwnership: 'GO7_OWNED', corridorId: 'X', config: cfg }).riderShareRate, 0.45);
  assert.equal(share({ distanceKm: 5, vehicleOwnership: 'RIDER_OWNED', corridorId: 'X', config: cfg }).riderShareRate, 0.7);
});

test('riderShareRate + platformShareRate = 1', () => {
  for (const own of ['GO7_OWNED', 'RIDER_OWNED']) {
    for (const km of [1, 14.9, 16.5, 30]) {
      const s = share({ distanceKm: km, vehicleType: 'MOTORCYCLE', vehicleOwnership: own });
      assert.equal(Number((s.riderShareRate + s.platformShareRate).toFixed(4)), 1);
    }
  }
});

// ---------------------------------------------------------------------------
// 5. Contribution economics
// ---------------------------------------------------------------------------
test('rider payout excludes service fee (60% of ₦950 = ₦570, not of ₦1045)', () => {
  const s = share({ distanceKm: 12, vehicleType: 'MOTORCYCLE', vehicleOwnership: 'RIDER_OWNED' });
  const payout = Math.round(950 * s.riderShareRate);
  assert.equal(payout, 570);
});

test('contribution: rider-owned motorcycle corridor trip is HEALTHY', () => {
  const c = calculateGo7DeliveryContribution({
    deliveryFee: 950, riderPayout: 570, serviceFee: 95,
    distanceKm: 11.9, vehicleType: 'MOTORCYCLE', vehicleOwnership: 'RIDER_OWNED',
    config: ENABLED,
  });
  assert.equal(c.grossGo7Revenue, 475);       // 380 delivery share + 95 service fee
  assert.equal(c.go7DeliveryShare, 380);
  assert.equal(c.contributionStatus, 'HEALTHY');
});

test('contribution: GO7-owned motorcycle corridor trip flags cost risk', () => {
  const c = calculateGo7DeliveryContribution({
    deliveryFee: 950, riderPayout: 380, serviceFee: 95,
    distanceKm: 11.9, vehicleType: 'MOTORCYCLE', vehicleOwnership: 'GO7_OWNED',
    config: ENABLED,
  });
  // Go7-owned: operating cost = 11.9*55 fuel + 100 maint + payment fee > revenue.
  assert.ok(c.estimatedOperatingCost > c.grossGo7Revenue);
  assert.equal(c.contributionStatus, 'LOSS_RISK');
});

test('contribution: service fee adds to Go7 revenue, not rider payout', () => {
  const c = calculateGo7DeliveryContribution({
    deliveryFee: 3650, riderPayout: 2190, serviceFee: 365,
    distanceKm: 18, vehicleType: 'MOTORCYCLE', vehicleOwnership: 'RIDER_OWNED',
    config: ENABLED,
  });
  assert.equal(c.go7DeliveryShare, 1460);
  assert.equal(c.grossGo7Revenue, 1460 + 365);
});

// ---------------------------------------------------------------------------
// 6. Assignment-time payout consistency (quote estimate vs final)
// ---------------------------------------------------------------------------
const ORDER = { orderType: 'GENERAL_DELIVERY', distanceKm: 12, deliveryFee: 950, platformFee: 95, grandTotal: 1045 };
const RIDER = { id: 'r1', vehicleType: 'MOTORCYCLE' };

test('assignment economics: rider-owned keeps 60% of delivery fee', () => {
  const ec = computeAssignmentEconomics(ORDER, { ...RIDER, vehicleOwnership: 'RIDER_OWNED' }, ENABLED);
  assert.equal(ec.riderPayout, 570);
  assert.equal(ec.go7DeliveryShare, 380);
  assert.equal(ec.platformDeliveryShare, 380);
  assert.equal(ec.feeBreakdown.rider, 570);
  assert.equal(ec.feeBreakdown.platform, 380);
  assert.equal(ec.riderShareRate, 0.6);
  assert.equal(ec.riderVehicleOwnership, 'RIDER_OWNED');
});

test('assignment economics: Go7-owned flips the same fare to 40% rider', () => {
  const ec = computeAssignmentEconomics(ORDER, { ...RIDER, vehicleOwnership: 'GO7_OWNED' }, ENABLED);
  assert.equal(ec.riderPayout, 380);
  assert.equal(ec.go7DeliveryShare, 570);
  assert.equal(ec.feeBreakdown.rider, 380);
  assert.equal(ec.riderVehicleOwnership, 'GO7_OWNED');
});

test('assignment economics: unknown ownership defaults to rider-owned', () => {
  const ec = computeAssignmentEconomics(ORDER, { ...RIDER }, ENABLED);
  assert.equal(ec.riderVehicleOwnership, 'RIDER_OWNED');
  assert.equal(ec.riderPayout, 570);
});

test('customer fare identical across ownership (same deliveryFee both ways)', () => {
  const ro = computeAssignmentEconomics(ORDER, { ...RIDER, vehicleOwnership: 'RIDER_OWNED' }, ENABLED);
  const go = computeAssignmentEconomics(ORDER, { ...RIDER, vehicleOwnership: 'GO7_OWNED' }, ENABLED);
  assert.equal(ro.riderPayout + ro.go7DeliveryShare, 950);
  assert.equal(go.riderPayout + go.go7DeliveryShare, 950);
  assert.ok(ro.go7Contribution.grossGo7Revenue < go.go7Contribution.grossGo7Revenue);
});

test('no stale 50% after assignment: every mirrored field agrees', () => {
  const ec = computeAssignmentEconomics(ORDER, { ...RIDER, vehicleOwnership: 'GO7_OWNED' }, ENABLED);
  assert.equal(ec.riderShareRate, 0.4);
  assert.equal(ec.riderPercentage, 40);
  assert.equal(ec.feeBreakdown.riderShareRate, 0.4);
  assert.equal(ec.riderDeliveryShareRate, 0.4);
  assert.equal(ec.riderPayout, ec.feeBreakdown.riderPayout);
  assert.equal(ec.go7DeliveryShare, ec.feeBreakdown.go7DeliveryShare);
});

test('buildServerOrderPricing mirrors fields consistently', () => {
  const p = buildServerOrderPricing(2000, { platformFeeRateParcel: 0.1, riderDeliveryShare: 0.5 }, {
    riderShareRate: 0.6, platformShareRate: 0.4, riderShareRule: 'RIDER_OWNED_STANDARD',
  });
  assert.equal(p.riderPayout, 1200);
  assert.equal(p.go7DeliveryShare, 800);
  assert.equal(p.platformDeliveryShare, 800);
  assert.equal(p.feeBreakdown.rider, 1200);
  assert.equal(p.feeBreakdown.platform, 800);
  assert.equal(p.riderPercentage, 60);
});
