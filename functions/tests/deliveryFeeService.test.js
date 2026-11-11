/**
 * Server-side authoritative delivery-fee tests (Node built-in test runner).
 * Run: node --test tests/deliveryFeeService.test.js   (from functions/)
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateDeliveryFee,
  normalizePricingConfig,
  DEFAULT_PRICING_CONFIG,
  ORDER_TYPES,
} = require('../pricingCore');
const {
  validateCoordinates,
  recomputeAuthFee,
  AuthFeeError,
} = require('../deliveryFeeService');

function square(latC, lngC, half) {
  return [
    [latC - half, lngC - half],
    [latC - half, lngC + half],
    [latC + half, lngC + half],
    [latC + half, lngC - half],
  ];
}

const FUNAAB = { lat: 7.22, lng: 3.44 }; // destination inside FUNAAB zone
const CAMP = { lat: 7.148, lng: 3.36 }; // inside Camp zone
const PICKUP = { lat: 7.15, lng: 3.35 };

function buildConfig(enabled, orderOverrides = {}, zoneOverrides = []) {
  return normalizePricingConfig({
    enabled,
    roundingStepping: 50,
    global: { distanceMode: 'linear', baseFee: 1000, includedKm: 2, perKmAfterIncluded: 150, minimumFee: 1000, maximumFee: 6000 },
    zones: [
      { id: 'funaab', name: 'FUNAAB', priority: 1, baseFee: null, polygon: square(7.22, 3.44, 0.02) },
      { id: 'camp', name: 'Camp / Abule Mecho', priority: 1, baseFee: null, polygon: square(7.148, 3.36, 0.02) },
      ...zoneOverrides,
    ],
    orderTypes: {
      FOOD: {
        distanceMode: 'bands',
        bands: [
          { minKm: 0, maxKm: 2, fee: 700 },
          { minKm: 2, maxKm: 4, fee: 900 },
          { minKm: 4, maxKm: 6, fee: 1100 },
        ],
        minimumFee: 500,
        maximumFee: 6000,
      },
      MARKET: { distanceMode: 'linear', baseFee: 400, includedKm: 0, perKmAfterIncluded: 100, minimumFee: 400, maximumFee: 6000 },
      PHARMACY: { distanceMode: 'linear', baseFee: 350, perKmAfterIncluded: 90, minimumFee: 350 },
      GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 1000, includedKm: 2, perKmAfterIncluded: 150 },
      ...orderOverrides,
    },
  });
}

// ---- core: legacy & configured ----
test('FOOD legacy ₦500 when disabled', () => {
  const r = calculateDeliveryFee({ orderType: 'FOOD', distanceKm: 3, config: buildConfig(false) });
  assert.equal(r.legacy, true);
  assert.equal(r.deliveryFee, 500);
});
test('FOOD configured pricing (bands) when enabled', () => {
  const r = calculateDeliveryFee({ orderType: 'FOOD', distanceKm: 3, config: buildConfig(true) });
  assert.equal(r.appliedRule, 'distance-bands');
  assert.equal(r.deliveryFee, 900);
});
test('distance bands 0–2 → ₦700', () => {
  const r = calculateDeliveryFee({ orderType: 'FOOD', distanceKm: 1, config: buildConfig(true) });
  assert.equal(r.deliveryFee, 700);
});
test('MARKET linear pricing', () => {
  const r = calculateDeliveryFee({ orderType: 'MARKET', distanceKm: 3, config: buildConfig(true) });
  assert.equal(r.deliveryFee, 700);
});
test('minimum clamp', () => {
  const cfg = buildConfig(true, { FOOD: { distanceMode: 'flat', flatFee: 100, minimumFee: 500 } }, []);
  assert.equal(calculateDeliveryFee({ orderType: 'FOOD', distanceKm: 0, config: cfg }).deliveryFee, 500);
});
test('maximum clamp', () => {
  const cfg = buildConfig(true, { GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 1000, perKmAfterIncluded: 5000, maximumFee: 6000 } }, []);
  assert.equal(calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 20, config: cfg }).deliveryFee, 6000);
});

// ---- core: zone pricing ----
test('zone-specific price when destination inside zone with baseFee', () => {
  const cfg = buildConfig(true, {}, [{ id: 'z-800', name: 'Z800', priority: 10, baseFee: 800, polygon: square(7.22, 3.44, 0.02) }]);
  const r = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 3, latitude: 7.22, longitude: 3.44, config: cfg });
  assert.equal(r.appliedRule, 'zone');
  assert.equal(r.zoneFee, 800);
  assert.equal(r.deliveryFee, 800);
});
test('disabled zone does not match', () => {
  const cfg = buildConfig(true, {}, [{ id: 'off', name: 'Off', priority: 1, baseFee: 800, enabled: false, polygon: square(7.1, 3.2, 0.02) }]);
  const r = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 1, latitude: 7.1, longitude: 3.2, config: cfg });
  assert.equal(r.inZone, false);
});
test('overlapping zones resolve by priority', () => {
  const cfg = buildConfig(true, {}, [
    { id: 'low', name: 'Low', priority: 1, baseFee: 700, polygon: square(7.22, 3.44, 0.02) },
    { id: 'high', name: 'High', priority: 10, baseFee: 900, polygon: square(7.22, 3.44, 0.02) },
  ]);
  const r = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 1, latitude: 7.22, longitude: 3.44, config: cfg });
  assert.equal(r.zoneId, 'high');
  assert.equal(r.deliveryFee, 900);
});
test('invalid polygon is filtered out (no match)', () => {
  const cfg = buildConfig(true, {}, [{ id: 'bad', name: 'Bad', priority: 1, polygon: [[7.1, 3.2], [7.1, 3.21]] }]);
  const r = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 1, latitude: 7.1, longitude: 3.2, config: cfg });
  assert.equal(r.inZone, false);
});
test('normalised polygon still matches after cleaning', () => {
  const raw = [{ id: 'funaab', name: 'FUNAAB', priority: 1, polygon: [['bad', 3.44], [7.21, 3.43], [7.21, 3.45], [7.23, 3.45], [7.23, 3.43]] }];
  const cfg = normalizePricingConfig({ enabled: true, zones: raw, orderTypes: { GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 300 } } });
  const r = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 1, latitude: 7.22, longitude: 3.44, config: cfg });
  assert.equal(r.zoneId, 'funaab');
});
test('outside service area when order type disabled', () => {
  const cfg = buildConfig(true, { FOOD: { enabled: false } }, []);
  const r = calculateDeliveryFee({ orderType: 'FOOD', distanceKm: 3, config: cfg });
  assert.equal(r.outsideServiceArea, true);
  assert.equal(r.deliveryFee, 0);
  assert.ok(r.outsideMessage);
});
test('missing pricing config → safe legacy default', () => {
  const r = calculateDeliveryFee({ orderType: 'FOOD', distanceKm: 3 });
  assert.equal(r.legacy, true);
  assert.equal(r.deliveryFee, 500);
});
test('malformed pricing config → safe defaults', () => {
  const r = calculateDeliveryFee({ orderType: 'FOOD', distanceKm: 3, config: null });
  assert.equal(r.deliveryFee, 500);
});

// ---- coordinate validation ----
test('valid coordinates pass', () => {
  assert.deepEqual(validateCoordinates({ lat: 7.15, lng: 3.35 }), { lat: 7.15, lng: 3.35 });
});
test('out of range coordinates rejected', () => {
  assert.throws(() => validateCoordinates({ lat: 200, lng: 3 }), (e) => e.code === 'invalid-coordinates');
});
test('zero/placeholder coordinates rejected', () => {
  assert.throws(() => validateCoordinates({ lat: 0, lng: 0 }), (e) => e.code === 'invalid-coordinates');
});
test('non-finite coordinates rejected', () => {
  assert.throws(() => validateCoordinates({ lat: NaN, lng: 3 }), (e) => e.code === 'invalid-coordinates');
});

// ---- authoritative recomputation: accept / reject ----
const authParams = (over = {}) => {
  const config = buildConfig(true);
  return Object.assign(
    {
      orderType: 'FOOD',
      orderTypeCtx: 'FOOD',
      pickup: PICKUP,
      destination: { lat: 7.10, lng: 3.30 }, // not inside any zone → distance pricing
      authoritativeDistanceKm: 1.5,
      config,
    },
    over
  );
};

test('client fee matches server fee → accept', () => {
  const p = authParams({ clientFee: 700 });
  const r = recomputeAuthFee(p);
  assert.equal(r.serverFee, 700);
});
test('client fee lower than server fee → reject', () => {
  assert.throws(
    () => recomputeAuthFee(authParams({ clientFee: 50 })),
    (e) => e.code === 'manipulated-delivery-fee'
  );
});
test('client fee higher than server fee → reject', () => {
  assert.throws(
    () => recomputeAuthFee(authParams({ clientFee: 99999 })),
    (e) => e.code === 'manipulated-delivery-fee'
  );
});
test('manipulated zone → reject', () => {
  assert.throws(
    () => recomputeAuthFee(authParams({ clientZoneId: 'funaab' })),
    (e) => e.code === 'manipulated-zone'
  );
});
test('manipulated distance → reject', () => {
  assert.throws(
    () => recomputeAuthFee(authParams({ clientDistanceKm: 20 })),
    (e) => e.code === 'manipulated-distance'
  );
});
test('manipulated orderType → reject', () => {
  assert.throws(
    () => recomputeAuthFee(authParams({ clientOrderType: 'MARKET' })),
    (e) => e.code === 'manipulated-order-type'
  );
});
test('server derives zone from destination (zone accepted)', () => {
  const config = buildConfig(true);
  const p = {
    orderType: 'GENERAL_DELIVERY',
    pickup: PICKUP,
    destination: FUNAAB,
    authoritativeDistanceKm: 3,
    clientZoneId: 'funaab',
    config,
  };
  const r = recomputeAuthFee(p);
  assert.equal(r.serverZoneId, 'funaab');
});
test('deliveryFee:false client blocked even when zone matches', () => {
  const config = buildConfig(true, {}, [{ id: 'z800', name: 'Z', priority: 10, baseFee: 800, polygon: square(7.22, 3.44, 0.02) }]);
  assert.throws(
    () => recomputeAuthFee({ orderType: 'GENERAL_DELIVERY', pickup: PICKUP, destination: FUNAAB, authoritativeDistanceKm: 3, clientFee: 50, config }),
    (e) => e.code === 'manipulated-delivery-fee'
  );
});

// ---- service area: named zones are optional, NOT the boundary ----
const saConfig = () =>
  normalizePricingConfig({
    enabled: true,
    serviceArea: {
      enabled: true,
      bounds: { south: 6.72, north: 7.58, west: 2.92, east: 3.88 },
      center: { lat: 7.1475, lng: 3.3619 },
      maxRadiusKm: 48,
    },
    zones: [{ id: 'funaab', name: 'FUNAAB', priority: 1, baseFee: null, polygon: square(7.22, 3.44, 0.02) }],
    orderTypes: { GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 1000, includedKm: 2, perKmAfterIncluded: 150, minimumFee: 1000, maximumFee: 6000 } },
  });

test('Abeokuta destination with NO named zone → default distance pricing (accepted, not rejected)', () => {
  const r = recomputeAuthFee({
    orderType: 'GENERAL_DELIVERY',
    pickup: PICKUP,
    destination: { lat: 7.1, lng: 3.3 },
    authoritativeDistanceKm: 0,
    config: saConfig(),
  });
  assert.equal(r.serverZoneId, null);
  assert.equal(r.serverFee, 1000);
});
test('destination outside Abeokuta service area → rejected', () => {
  assert.throws(
    () => recomputeAuthFee({ orderType: 'GENERAL_DELIVERY', pickup: PICKUP, destination: { lat: 6.0, lng: 3.0 }, authoritativeDistanceKm: 5, config: saConfig() }),
    (e) => e.code === 'outside-service-area'
  );
});
test('named zone inside Abeokuta still identified for dispatch (not a boundary)', () => {
  const r = recomputeAuthFee({ orderType: 'GENERAL_DELIVERY', pickup: PICKUP, destination: FUNAAB, authoritativeDistanceKm: 3, config: saConfig() });
  assert.equal(r.serverZoneId, 'funaab');
});

// ---- BOOK DELIVERY launch pricing (base ₦400 + ₦100/km, min ₦500) ----
const { normalizeVehicleType, preferredVehicleForDistance, VEHICLE_TYPES } = require('../vehicleType');

const bdConfig = () =>
  normalizePricingConfig({
    enabled: true,
    roundingStepping: 50,
    serviceArea: { enabled: true, bounds: { south: 6.72, north: 7.58, west: 2.92, east: 3.88 }, center: { lat: 7.1475, lng: 3.3619 }, maxRadiusKm: 48 },
    zones: [
      { id: 'funaab', name: 'FUNAAB', priority: 1, baseFee: null, polygon: square(7.22, 3.44, 0.02) },
      { id: 'camp', name: 'Camp / Abule Mecho', priority: 1, baseFee: null, polygon: square(7.148, 3.36, 0.01) },
    ],
    orderTypes: { GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 400, includedKm: 0, perKmAfterIncluded: 100, minimumFee: 500, maximumFee: 6000, roundingStepping: 1 } },
  });

const bdAuth = (km, dest) => ({ orderType: 'GENERAL_DELIVERY', pickup: PICKUP, destination: dest, authoritativeDistanceKm: km, config: bdConfig() });

test('BOOK DELIVERY legacy (disabled) → ₦500', () => {
  assert.equal(calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 3, config: normalizePricingConfig({ ...bdConfig(), enabled: false }) }).deliveryFee, 500);
});
[
  [0.5, 500],
  [1, 500],
  [2, 600],
  [3, 700],
  [5, 900],
  [8, 1200],
  [10, 1400],
  [2.4, 640],
].forEach(([km, expectFee]) => {
  test(`BOOK DELIVERY ${km} km → ₦${expectFee}`, () => {
    const r = recomputeAuthFee(bdAuth(km, { lat: 7.13, lng: 3.34 }));
    assert.equal(r.serverFee, expectFee);
  });
});
test('BOOK DELIVERY outside Abeokuta → rejected', () => {
  assert.throws(() => recomputeAuthFee(bdAuth(5, { lat: 6.0, lng: 3.0 })), (e) => e.code === 'outside-service-area');
});
test('BOOK DELIVERY: Abeokuta dest, no named zone → accepted (distance pricing)', () => {
  const r = recomputeAuthFee(bdAuth(3, { lat: 7.13, lng: 3.34 }));
  assert.equal(r.serverZoneId, null);
  assert.equal(r.serverFee, 700);
});
test('BOOK DELIVERY: FUNAAB dest accepted', () => {
  assert.doesNotThrow(() => recomputeAuthFee(bdAuth(2, FUNAAB)));
});
test('BOOK DELIVERY: manipulate deliveryFee → rejected', () => {
  assert.throws(() => recomputeAuthFee({ ...bdAuth(3, { lat: 7.13, lng: 3.34 }), clientFee: 50 }), (e) => e.code === 'manipulated-delivery-fee');
});
test('BOOK DELIVERY: manipulate distance → rejected', () => {
  assert.throws(() => recomputeAuthFee({ ...bdAuth(3, { lat: 7.13, lng: 3.34 }), clientDistanceKm: 25 }), (e) => e.code === 'manipulated-distance');
});
test('BOOK DELIVERY: manipulate orderType → rejected', () => {
  assert.throws(() => recomputeAuthFee({ ...bdAuth(3, { lat: 7.13, lng: 3.34 }), clientOrderType: 'MARKET' }), (e) => e.code === 'manipulated-order-type');
});

// ---- vehicle metadata + historical fee retention ----
test('vehicle type normalization (bicycle / e-bike / motorcycle)', () => {
  assert.equal(normalizeVehicleType('bicycle'), VEHICLE_TYPES.BICYCLE);
  assert.equal(normalizeVehicleType('e-bike'), VEHICLE_TYPES.EBIKE);
  assert.equal(normalizeVehicleType('motorcycle'), VEHICLE_TYPES.MOTORCYCLE);
});
test('dispatch preference by distance', () => {
  assert.equal(preferredVehicleForDistance(2), VEHICLE_TYPES.BICYCLE);
  assert.equal(preferredVehicleForDistance(6), VEHICLE_TYPES.EBIKE);
  assert.equal(preferredVehicleForDistance(9), VEHICLE_TYPES.MOTORCYCLE);
});
test('historical order retains its original delivery fee after config changes', () => {
  // An order is created storing ₦700 at 3 km under the launch config.
  const storedOrderFee = recomputeAuthFee(bdAuth(3, { lat: 7.13, lng: 3.34 })).serverFee;
  // Later the config raises the per-km rate — the stored order fee stays ₦700.
  const changedConfig = normalizePricingConfig({ ...bdConfig(), orderTypes: { GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 1000, includedKm: 1, perKmAfterIncluded: 200, minimumFee: 1000 } } });
  const laterFee = recomputeAuthFee({ orderType: 'GENERAL_DELIVERY', pickup: PICKUP, destination: { lat: 7.13, lng: 3.34 }, authoritativeDistanceKm: 3, config: changedConfig }).serverFee;
  assert.equal(storedOrderFee, 700);
  assert.notEqual(storedOrderFee, laterFee); // price changed, but the stored 700 is untouched
});
test('referral credit is separate from delivery fee', () => {
  const fee = recomputeAuthFee(bdAuth(3, { lat: 7.13, lng: 3.34 })).serverFee; // 700
  const promoCreditApplied = 200;
  assert.equal(fee, 700);
  assert.equal(fee - promoCreditApplied, 500); // customer pays 500; ledger keeps 700
});

// ---- cross order-type authoritative validation (canonical engine) ----
const crossTypes = ['FOOD', 'MARKET', 'PHARMACY', 'GENERAL_DELIVERY'];
const crossConfig = () =>
  normalizePricingConfig({
    enabled: true,
    serviceArea: { enabled: true, bounds: { south: 6.72, north: 7.58, west: 2.92, east: 3.88 } },
    orderTypes: {
      FOOD: { distanceMode: 'bands', bands: [{ minKm: 0, maxKm: 99, fee: 700 }], minimumFee: 500 },
      MARKET: { distanceMode: 'linear', baseFee: 400, includedKm: 0, perKmAfterIncluded: 100, minimumFee: 400 },
      PHARMACY: { distanceMode: 'linear', baseFee: 350, includedKm: 0, perKmAfterIncluded: 90, minimumFee: 350 },
      GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 400, includedKm: 0, perKmAfterIncluded: 100, minimumFee: 500, maximumFee: 6000 },
    },
  });
crossTypes.forEach((ot) => {
  test(`${ot}: server computes a real fee and rejects a tampered (₦10) client fee`, () => {
    const config = crossConfig();
    const server = recomputeAuthFee({ orderType: ot, pickup: PICKUP, destination: { lat: 7.1, lng: 3.3 }, authoritativeDistanceKm: 2, config });
    assert.ok(server.serverFee > 0);
    assert.throws(
      () => recomputeAuthFee({ orderType: ot, pickup: PICKUP, destination: { lat: 7.1, lng: 3.3 }, authoritativeDistanceKm: 2, clientFee: 10, config }),
      (e) => e.code === 'manipulated-delivery-fee'
    );
  });
});
// FUEL must stay isolated — not priced by the general engine.
test('FUEL is not priced by the general Abeokuta engine', () => {
  const config = crossConfig(); // FUEL not defined here -> falls back to disabled -> outside-service-area
  const r = calculateDeliveryFee({ orderType: 'FUEL', distanceKm: 3, latitude: 7.1, longitude: 3.3, config });
  assert.equal(r.outsideServiceArea, true); // general engine refuses to price FUEL
});
