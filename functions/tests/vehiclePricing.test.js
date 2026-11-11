const test = require('node:test');
const assert = require('node:assert/strict');
const pricingCore = require('../pricingCore');
const { getEligibleVehiclePolicy, normalizeVehicleType } = require('../vehicleType');
const { riderMatchesVehicle, getAllowedVehicleTypes, buildServerOrderPricing } = require('../bookDeliveryOrder');

const BASE_CONFIG = {
  enabled: true,
  roundingStepping: 1,
  orderTypes: {
    GENERAL_DELIVERY: {
      enabled: true,
      distanceMode: 'linear',
      baseFee: 400,
      includedKm: 0,
      perKmAfterIncluded: 100,
      minimumFee: 500,
      maximumFee: 6000,
    },
  },
  vehicleRules: {
    BICYCLE: {
      enabled: true,
      preferredMinKm: 0,
      preferredMaxKm: 8,
      allowedMinKm: 0,
      allowedMaxKm: 8,
      preferred: true,
    },
    MOTORCYCLE: {
      enabled: true,
      preferredMinKm: 8,
      allowedMinKm: 5,
      allowedMaxKm: 999,
      preferred: true,
    },
    allowMotorcycleFallback: true,
  },
  riderShareRules: {
    bands: [
      { maxKm: 15, share: 0.5, rule: 'STANDARD' },
      { maxKm: 999, share: 0.55, rule: 'LONG_DISTANCE' },
    ],
  },
};

test('vehicle policy — short distances prefer bicycle', () => {
  for (const km of [1, 3, 5]) {
    const policy = getEligibleVehiclePolicy({ orderType: 'GENERAL_DELIVERY', distanceKm: km }, BASE_CONFIG);
    assert.equal(policy.preferredVehicle, 'BICYCLE');
    assert.deepEqual(policy.eligibleVehicles, ['BICYCLE']);
    assert.equal(policy.reason, 'SHORT_DISTANCE');
  }
});

test('vehicle policy — 5–8 km allows bicycle and motorcycle', () => {
  for (const km of [6, 7, 8]) {
    const policy = getEligibleVehiclePolicy({ orderType: 'GENERAL_DELIVERY', distanceKm: km }, BASE_CONFIG);
    assert.equal(policy.preferredVehicle, 'BICYCLE');
    assert.deepEqual(policy.eligibleVehicles.sort(), ['BICYCLE', 'MOTORCYCLE']);
  }
});

test('vehicle policy — long distances use motorcycle', () => {
  for (const km of [10, 15, 16.5, 25, 30]) {
    const policy = getEligibleVehiclePolicy({ orderType: 'GENERAL_DELIVERY', distanceKm: km }, BASE_CONFIG);
    assert.equal(policy.preferredVehicle, 'MOTORCYCLE');
    assert.deepEqual(policy.eligibleVehicles, ['MOTORCYCLE']);
  }
});

test('vehicle policy — falls back to motorcycle when bicycle unavailable', () => {
  const policy = getEligibleVehiclePolicy(
    { orderType: 'GENERAL_DELIVERY', distanceKm: 4, availableVehicleTypes: ['MOTORCYCLE'] },
    BASE_CONFIG
  );
  assert.equal(policy.preferredVehicle, 'MOTORCYCLE');
  assert.deepEqual(policy.eligibleVehicles, ['MOTORCYCLE']);
});

test('vehicle policy — fallback disabled keeps bicycle eligibility only', () => {
  const cfg = {
    ...BASE_CONFIG,
    vehicleRules: { ...BASE_CONFIG.vehicleRules, allowMotorcycleFallback: false },
  };
  const policy = getEligibleVehiclePolicy(
    { orderType: 'GENERAL_DELIVERY', distanceKm: 4, availableVehicleTypes: ['MOTORCYCLE'] },
    cfg
  );
  // No bicycle rider is available, so no vehicle can be assigned.
  assert.deepEqual(policy.eligibleVehicles, []);
});

test('rider share — standard up to 15 km, long distance above', () => {
  const cases = [
    [10, 0.5, 'STANDARD'],
    [15, 0.5, 'STANDARD'],
    [15.01, 0.55, 'LONG_DISTANCE'],
    [16.5, 0.55, 'LONG_DISTANCE'],
    [25, 0.55, 'LONG_DISTANCE'],
    [30, 0.55, 'LONG_DISTANCE'],
  ];
  for (const [km, expectedRate, expectedRule] of cases) {
    const share = pricingCore.getRiderShare({
      orderType: 'GENERAL_DELIVERY',
      distanceKm: km,
      vehicleType: km > 15 ? 'MOTORCYCLE' : 'BICYCLE',
      config: BASE_CONFIG,
    });
    assert.equal(share.riderShareRate, expectedRate);
    assert.equal(share.platformShareRate, Number((1 - expectedRate).toFixed(4)));
    assert.equal(share.rule, expectedRule);
  }
});

test('rider share — built-in ownership policy when rules are not configured', () => {
  // No admin config → GENERAL_DELIVERY uses built-in ownership bands:
  // rider-owned 60% ≤15 km / 65% >15 km; Go7-owned flat 40%.
  const longTrip = pricingCore.getRiderShare({
    orderType: 'GENERAL_DELIVERY',
    distanceKm: 20,
    config: { enabled: true, orderTypes: {} },
  });
  assert.equal(longTrip.riderShareRate, 0.65); // rider-owned is the default
  assert.equal(longTrip.platformShareRate, 0.35);
  assert.equal(longTrip.rule, 'RIDER_OWNED_LONG_DISTANCE');

  const shortTrip = pricingCore.getRiderShare({
    orderType: 'GENERAL_DELIVERY',
    distanceKm: 6,
    config: { enabled: true, orderTypes: {} },
  });
  assert.equal(shortTrip.riderShareRate, 0.6);
  assert.equal(shortTrip.rule, 'RIDER_OWNED_STANDARD');

  const go7Owned = pricingCore.getRiderShare({
    orderType: 'GENERAL_DELIVERY',
    distanceKm: 20,
    vehicleOwnership: 'GO7_OWNED',
    config: { enabled: true, orderTypes: {} },
  });
  assert.equal(go7Owned.riderShareRate, 0.4);
  assert.equal(go7Owned.platformShareRate, 0.6);
  assert.equal(go7Owned.rule, 'GO7_OWNED');

  // Ownership aliases normalize correctly.
  const alias = pricingCore.getRiderShare({
    orderType: 'GENERAL_DELIVERY',
    distanceKm: 6,
    vehicleOwnership: 'fleet',
    config: { enabled: true, orderTypes: {} },
  });
  assert.equal(alias.riderShareRate, 0.4);

  // The ownership matrix is GLOBAL: other order types without their own
  // configured bands get the same ownership policy (FOOD GO7-owned rider
  // gets 40%, rider-owned >15 km gets 65%).
  const food = pricingCore.getRiderShare({
    orderType: 'FOOD',
    distanceKm: 20,
    config: { enabled: true, orderTypes: {} },
  });
  assert.equal(food.riderShareRate, 0.65);
  const foodGo7 = pricingCore.getRiderShare({
    orderType: 'FOOD',
    distanceKm: 20,
    vehicleOwnership: 'GO7_OWNED',
    config: { enabled: true, orderTypes: {} },
  });
  assert.equal(foodGo7.riderShareRate, 0.4);
});

test('rider share — explicit admin config overrides built-in policy', () => {
  const flat = pricingCore.getRiderShare({
    orderType: 'GENERAL_DELIVERY',
    distanceKm: 20,
    config: {
      enabled: true,
      orderTypes: {},
      riderShareRules: { GENERAL_DELIVERY: { bands: [{ share: 0.5, rule: 'FLAT' }] } },
    },
  });
  assert.equal(flat.riderShareRate, 0.5);
  assert.equal(flat.rule, 'FLAT');
});

test('vehicle policy — built-in defaults apply without admin config', () => {
  const short = getEligibleVehiclePolicy({ orderType: 'GENERAL_DELIVERY', distanceKm: 4 }, {});
  assert.equal(short.preferredVehicle, 'BICYCLE');
  assert.deepEqual(short.eligibleVehicles, ['BICYCLE']);
  // Dispatch-allowed set includes the motorcycle fallback.
  assert.deepEqual(short.allowedVehicles, ['BICYCLE', 'MOTORCYCLE']);

  const long = getEligibleVehiclePolicy({ orderType: 'GENERAL_DELIVERY', distanceKm: 20 }, {});
  assert.equal(long.preferredVehicle, 'MOTORCYCLE');
  assert.deepEqual(long.eligibleVehicles, ['MOTORCYCLE']);
  assert.deepEqual(long.allowedVehicles, ['MOTORCYCLE']);

  // Non-delivery order types get no vehicle policy from the defaults.
  const food = getEligibleVehiclePolicy({ orderType: 'FOOD', distanceKm: 4 }, {});
  assert.deepEqual(food.eligibleVehicles, []);
});

test('vehicle policy — orderType-keyed config resolves correctly', () => {
  const cfg = { vehicleRules: { GENERAL_DELIVERY: BASE_CONFIG.vehicleRules } };
  const policy = getEligibleVehiclePolicy({ orderType: 'GENERAL_DELIVERY', distanceKm: 3 }, cfg);
  assert.equal(policy.preferredVehicle, 'BICYCLE');
  // A different order type does not inherit the GENERAL_DELIVERY rules.
  const food = getEligibleVehiclePolicy({ orderType: 'FOOD', distanceKm: 3 }, cfg);
  assert.deepEqual(food.eligibleVehicles, []);
});

test('vehicle policy — legacy band-list config still works', () => {
  const cfg = {
    vehicleRules: {
      GENERAL_DELIVERY: {
        bands: [
          { maxKm: 5, vehicleType: 'BICYCLE' },
          { maxKm: 8, vehicleType: 'ANY' },
          { maxKm: 999, vehicleType: 'MOTORCYCLE' },
        ],
      },
    },
  };
  assert.equal(getEligibleVehiclePolicy({ orderType: 'GENERAL_DELIVERY', distanceKm: 4 }, cfg).preferredVehicle, 'BICYCLE');
  assert.deepEqual(
    getEligibleVehiclePolicy({ orderType: 'GENERAL_DELIVERY', distanceKm: 6 }, cfg).eligibleVehicles.sort(),
    ['BICYCLE', 'MOTORCYCLE']
  );
  assert.equal(getEligibleVehiclePolicy({ orderType: 'GENERAL_DELIVERY', distanceKm: 12 }, cfg).preferredVehicle, 'MOTORCYCLE');
});

test('delivery fee — unchanged by vehicle rules', () => {
  for (const km of [1, 3, 5, 8, 10, 15, 16.5, 25, 30]) {
    const r = pricingCore.calculateDeliveryFee({
      orderType: 'GENERAL_DELIVERY',
      distanceKm: km,
      config: BASE_CONFIG,
    });
    assert.equal(r.deliveryFee, Math.max(500, Math.round(400 + km * 100)));
    assert.equal(r.vehicleType, km <= 5 ? 'BICYCLE' : km <= 8 ? 'BICYCLE' : 'MOTORCYCLE');
  }
});

test('rider payout — uses quote riderShareRate', () => {
  const rates = { platformFeeRateParcel: 0.1, riderDeliveryShare: 0.5 };
  const pricing = buildServerOrderPricing(2000, rates, {
    riderShareRate: 0.55,
    vehicleType: 'MOTORCYCLE',
    preferredVehicleType: 'MOTORCYCLE',
    riderShareRule: 'GENERAL_DELIVERY_MOTORCYCLE_LONG_DISTANCE',
  });
  assert.equal(pricing.riderPayout, 1100);
  assert.equal(pricing.go7DeliveryShare, 900);
  assert.equal(pricing.riderShareRate, 0.55);
  assert.equal(pricing.platformShareRate, 0.45);
  assert.equal(pricing.riderShareRule, 'GENERAL_DELIVERY_MOTORCYCLE_LONG_DISTANCE');
});

test('rider payout — falls back to global share when quote lacks riderShareRate', () => {
  const rates = { platformFeeRateParcel: 0.1, riderDeliveryShare: 0.5 };
  const pricing = buildServerOrderPricing(2000, rates, {});
  assert.equal(pricing.riderPayout, 1000);
  assert.equal(pricing.riderShareRate, 0.5);
  assert.equal(pricing.riderShareRule, null);
});

test('dispatch matching — canonical vehicle types', () => {
  assert.equal(normalizeVehicleType('bicycle'), 'BICYCLE');
  assert.equal(normalizeVehicleType('motorcycle'), 'MOTORCYCLE');
  assert.equal(normalizeVehicleType('ebike'), 'EBIKE');

  // Canonical matches
  assert.equal(riderMatchesVehicle('bicycle', 'BICYCLE'), true);
  assert.equal(riderMatchesVehicle('motorcycle', 'MOTORCYCLE'), true);
  assert.equal(riderMatchesVehicle('bicycle', 'MOTORCYCLE'), false);
  assert.equal(riderMatchesVehicle('motorcycle', 'BICYCLE'), false);

  // ANY matches everything
  assert.equal(riderMatchesVehicle('motorcycle', 'ANY'), true);
  assert.equal(riderMatchesVehicle('bicycle', 'ANY'), true);

  // Legacy 'bike' still means motorcycle-family
  assert.equal(riderMatchesVehicle('motorcycle', 'bike'), true);
  assert.equal(riderMatchesVehicle('bike', 'bike'), true);
  assert.equal(riderMatchesVehicle('bicycle', 'bike'), false);

  // 'bike' riders are motorcycles for canonical matching
  assert.equal(riderMatchesVehicle('bike', 'MOTORCYCLE'), true);
  assert.equal(riderMatchesVehicle('bike', 'BICYCLE'), false);
  assert.equal(riderMatchesVehicle('motorcycle', 'BICYCLE'), false);
});

test('dispatch matching — order eligibleVehicles wins', () => {
  const order = { eligibleVehicles: ['BICYCLE'], preferredVehicleType: 'BICYCLE' };
  assert.deepEqual(getAllowedVehicleTypes(order, 'bike'), ['BICYCLE']);

  const orderAny = { eligibleVehicles: ['BICYCLE', 'MOTORCYCLE'], preferredVehicleType: 'BICYCLE' };
  assert.deepEqual(getAllowedVehicleTypes(orderAny, 'bike'), ['BICYCLE', 'MOTORCYCLE']);

  const orderLegacy = { vehicleType: null };
  assert.deepEqual(getAllowedVehicleTypes(orderLegacy, 'bike'), ['bike']);
});

test('dispatch matching — allowedVehicleTypes (fallback set) wins over eligible', () => {
  // ≤5 km bicycle order with motorcycle fallback stored on the booking.
  const order = {
    eligibleVehicles: ['BICYCLE'],
    allowedVehicleTypes: ['BICYCLE', 'MOTORCYCLE'],
    preferredVehicleType: 'BICYCLE',
  };
  assert.deepEqual(getAllowedVehicleTypes(order, 'bike'), ['BICYCLE', 'MOTORCYCLE']);
  assert.equal(riderMatchesVehicle('bike', getAllowedVehicleTypes(order, 'bike')), true);
  assert.equal(riderMatchesVehicle('bicycle', getAllowedVehicleTypes(order, 'bike')), true);
});
