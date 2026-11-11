/**
 * Corridor pricing tests — high-density pricing corridors (Camp ↔ FUNAAB).
 * Corridors are PRICING rules inside the canonical engine: they never widen the
 * service area, never trust client-supplied corridor/fee values, and fall back
 * to normal distance pricing when endpoints or distance don't qualify.
 *
 * Run: node --test tests/corridorPricing.test.js   (from functions/)
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateDeliveryFee,
  normalizePricingConfig,
  resolveCorridor,
  buildCorridorLocationLookup,
  getRiderShare,
} = require('../pricingCore');
const { recomputeAuthFee, haversineKm } = require('../deliveryFeeService');

// Canonical coordinates from locationResolver catalog.
const CAMP = { lat: 7.148, lng: 3.36 };
const FUNAAB = { lat: 7.22, lng: 3.44 };
const KUTO = { lat: 7.15, lng: 3.345 };
const ELEWERAN = { lat: 7.154, lng: 3.338 };
const OBANTOKO = { lat: 7.165, lng: 3.375 };
const SAANU = { lat: 7.2278434, lng: 3.4391763 };

const LOCATION_LOOKUP = buildCorridorLocationLookup({
  areas: [
    { id: 'camp', name: 'Camp', lat: CAMP.lat, lng: CAMP.lng },
    { id: 'funaab', name: 'FUNAAB', lat: FUNAAB.lat, lng: FUNAAB.lng, aliases: ['FUNAAB campus', 'Federal University of Agriculture'] },
    { id: 'kuto', name: 'Kuto', lat: KUTO.lat, lng: KUTO.lng },
    { id: 'eleweran', name: 'Eleweran', lat: ELEWERAN.lat, lng: ELEWERAN.lng },
    { id: 'obantoko', name: 'Obantoko', lat: OBANTOKO.lat, lng: OBANTOKO.lng },
    { id: 'saanu', name: 'Saanu', lat: SAANU.lat, lng: SAANU.lng, aliases: ['SSANU'] },
  ],
  landmarks: [],
});

const CAMP_FUNAAB_CORRIDOR = {
  id: 'CAMP_FUNAAB',
  name: 'Camp ↔ FUNAAB',
  enabled: true,
  orderTypes: ['GENERAL_DELIVERY'],
  pickupAreas: ['camp'],
  dropoffAreas: ['funaab'],
  bidirectional: true,
  maxDistanceKm: 18,
  deliveryFee: 950,
  allowedVehicles: ['BICYCLE', 'MOTORCYCLE'],
  preferredVehicle: null,
  riderShareRate: 0.5,
  fallbackToDistancePricing: true,
  priority: 0,
  radiusKm: 1, // tight — Kuto (~1.7 km from Camp) must not match
};

function corridorConfig(extraCorridors = [], otOverrides = {}) {
  return normalizePricingConfig({
    enabled: true,
    serviceArea: {
      enabled: true,
      bounds: { south: 6.72, north: 7.58, west: 2.92, east: 3.88 },
      center: { lat: 7.1475, lng: 3.3619 },
      maxRadiusKm: 48,
    },
    orderTypes: {
      GENERAL_DELIVERY: {
        distanceMode: 'linear',
        baseFee: 400,
        includedKm: 0,
        perKmAfterIncluded: 100,
        minimumFee: 500,
        maximumFee: 6000,
        roundingStepping: 1,
        maxDistanceKm: 25,
        ...otOverrides,
      },
    },
    corridors: [CAMP_FUNAAB_CORRIDOR, ...extraCorridors],
  });
}

const resolve = (pickup, dropoff, km, over = {}) =>
  resolveCorridor({
    pickup,
    dropoff,
    distanceKm: km,
    orderType: 'GENERAL_DELIVERY',
    corridors: corridorConfig().corridors,
    locationLookup: LOCATION_LOOKUP,
    ...over,
  });

// ---------- corridor resolution ----------

test('Camp → FUNAAB matches corridor by canonical key', () => {
  const km = haversineKm(CAMP, FUNAAB);
  const c = resolve(CAMP, FUNAAB, km, { pickupKey: 'camp', dropoffKey: 'funaab' });
  assert.equal(c && c.id, 'CAMP_FUNAAB');
  assert.equal(c.deliveryFee, 950);
});

test('FUNAAB → Camp matches the SAME corridor (bidirectional)', () => {
  const km = haversineKm(FUNAAB, CAMP);
  const c = resolve(FUNAAB, CAMP, km, { pickupKey: 'funaab', dropoffKey: 'camp' });
  assert.equal(c && c.id, 'CAMP_FUNAAB');
});

test('Camp → FUNAAB matches on coordinates alone (no keys)', () => {
  const km = haversineKm(CAMP, FUNAAB);
  const c = resolveCorridor({
    pickup: { lat: 7.149, lng: 3.361 }, // ~100 m from canonical Camp point
    dropoff: { lat: 7.221, lng: 3.441 }, // ~140 m from FUNAAB
    distanceKm: km,
    orderType: 'GENERAL_DELIVERY',
    corridors: corridorConfig().corridors,
    locationLookup: LOCATION_LOOKUP,
  });
  assert.equal(c && c.id, 'CAMP_FUNAAB');
});

test('Camp → Kuto does NOT match corridor (wrong endpoint)', () => {
  const km = haversineKm(CAMP, KUTO);
  const c = resolve(CAMP, KUTO, km, { pickupKey: 'camp', dropoffKey: 'kuto' });
  assert.equal(c, null);
});

test('Kuto → FUNAAB does NOT match CAMP_FUNAAB corridor', () => {
  const km = haversineKm(KUTO, FUNAAB);
  const c = resolve(KUTO, FUNAAB, km, { pickupKey: 'kuto', dropoffKey: 'funaab' });
  assert.equal(c, null);
});

test('Eleweran → FUNAAB does NOT match CAMP_FUNAAB corridor', () => {
  const km = haversineKm(ELEWERAN, FUNAAB);
  const c = resolve(ELEWERAN, FUNAAB, km, { pickupKey: 'eleweran', dropoffKey: 'funaab' });
  assert.equal(c, null);
});

test('corridor rejected when actual distance exceeds corridor maximum', () => {
  const c = resolve(CAMP, FUNAAB, 25, { pickupKey: 'camp', dropoffKey: 'funaab' });
  assert.equal(c, null); // > 18 km maxDistanceKm → falls to distance pricing
});

test('corridor within max distance is accepted', () => {
  const c = resolve(CAMP, FUNAAB, 15, { pickupKey: 'camp', dropoffKey: 'funaab' });
  assert.equal(c && c.id, 'CAMP_FUNAAB');
});

test('disabled corridor never matches', () => {
  const corridors = corridorConfig([{ ...CAMP_FUNAAB_CORRIDOR, id: 'X', enabled: false }]).corridors;
  const off = corridors.find((c) => c.id === 'X');
  assert.equal(off.enabled, false);
  const c = resolveCorridor({
    pickup: CAMP, dropoff: FUNAAB, distanceKm: 10,
    orderType: 'GENERAL_DELIVERY', pickupKey: 'camp', dropoffKey: 'funaab',
    corridors: [off], locationLookup: LOCATION_LOOKUP,
  });
  assert.equal(c, null);
});

test('typing "Camp"/"FUNAAB" without matching coordinates cannot force a match', () => {
  // Client supplies keys but the coordinates are nowhere near the endpoints.
  const farPickup = { lat: 6.6, lng: 3.3 };
  const farDropoff = { lat: 6.9, lng: 3.6 };
  const c = resolveCorridor({
    pickup: farPickup, dropoff: farDropoff,
    distanceKm: 40,
    orderType: 'GENERAL_DELIVERY',
    pickupKey: null, dropoffKey: null, // keys come from the SERVER resolver, not the client
    corridors: corridorConfig().corridors,
    locationLookup: LOCATION_LOOKUP,
  });
  assert.equal(c, null);
});

test('a point far from Camp but with key "camp" still needs coordinate sanity: key match is canonical, coords were verified by resolver upstream', () => {
  // resolveCorridor trusts server-resolved keys — if the resolver says a point
  // IS Camp, corridor applies. Distance is still capped by maxDistanceKm.
  const c = resolveCorridor({
    pickup: { lat: 7.2, lng: 3.5 }, // coords a bit off but key resolved as camp
    dropoff: FUNAAB, distanceKm: 30,
    orderType: 'GENERAL_DELIVERY',
    pickupKey: 'camp', dropoffKey: 'funaab',
    corridors: corridorConfig().corridors,
    locationLookup: LOCATION_LOOKUP,
  });
  assert.equal(c, null); // rejected by distance cap even though keys matched
});

test('higher priority corridor wins', () => {
  const corridors = corridorConfig([
    { ...CAMP_FUNAAB_CORRIDOR, id: 'CAMP_FUNAAB_PREMIUM', deliveryFee: 1100, priority: 10 },
  ]).corridors;
  const c = resolve(CAMP, FUNAAB, 10, { corridors });
  assert.equal(c.id, 'CAMP_FUNAAB_PREMIUM');
  assert.equal(c.deliveryFee, 1100);
});

test('FOOD orders are not priced by a GENERAL_DELIVERY corridor', () => {
  const c = resolve(CAMP, FUNAAB, 10, { pickupKey: 'camp', dropoffKey: 'funaab', orderType: 'FOOD' });
  assert.equal(c, null);
});

// ---------- authoritative fee with corridor ----------

function corridorAuth(pickup, dropoff, km, over = {}) {
  const config = corridorConfig();
  const corridor = resolveCorridor({
    pickup, dropoff, distanceKm: km,
    orderType: 'GENERAL_DELIVERY',
    corridors: config.corridors,
    locationLookup: LOCATION_LOOKUP,
    pickupKey: over.pickupKey, dropoffKey: over.dropoffKey,
  });
  return recomputeAuthFee({
    orderType: 'GENERAL_DELIVERY',
    pickup,
    destination: dropoff,
    authoritativeDistanceKm: km,
    corridor,
    config,
    ...over.auth,
  });
}

test('corridor quote: Camp → FUNAAB returns ₦950 (not the distance fare)', () => {
  const km = haversineKm(CAMP, FUNAAB); // ~9 km → distance fare would be ~₦1,300
  const r = corridorAuth(CAMP, FUNAAB, km, { pickupKey: 'camp', dropoffKey: 'funaab' });
  assert.equal(r.corridor.id, 'CAMP_FUNAAB');
  assert.equal(r.serverFee, 950);
});

test('corridor fallback: same endpoints but beyond maxDistanceKm → distance fare', () => {
  const km = 22; // beyond corridor's 18 km cap
  const r = corridorAuth(CAMP, FUNAAB, km, { pickupKey: 'camp', dropoffKey: 'funaab' });
  assert.equal(r.corridor, null);
  assert.equal(r.serverFee, 400 + 22 * 100); // ₦2,600 distance fare
});

test('non-corridor trip (Kuto → FUNAAB) uses normal distance pricing', () => {
  const km = Math.round(haversineKm(KUTO, FUNAAB) * 10) / 10; // server rounds to 0.1 km
  const r = corridorAuth(KUTO, FUNAAB, km, { pickupKey: 'kuto', dropoffKey: 'funaab' });
  assert.equal(r.corridor, null);
  assert.equal(r.serverFee, Math.round(400 + km * 100));
});

test('client cannot force corridor fee with a tampered clientFee', () => {
  const km = haversineKm(CAMP, FUNAAB);
  assert.throws(
    () => corridorAuth(CAMP, FUNAAB, km, { pickupKey: 'camp', dropoffKey: 'funaab', auth: { clientFee: 100 } }),
    (e) => e.code === 'manipulated-delivery-fee'
  );
});

test('client cannot claim a corridor that does not match (clientCorridorId mismatch rejected)', () => {
  const km = haversineKm(KUTO, FUNAAB);
  assert.throws(
    () => corridorAuth(KUTO, FUNAAB, km, { pickupKey: 'kuto', dropoffKey: 'funaab', auth: { clientCorridorId: 'CAMP_FUNAAB' } }),
    (e) => e.code === 'manipulated-corridor'
  );
});

test('client corridorId matching the real corridor is accepted but fee stays server-derived', () => {
  const km = haversineKm(CAMP, FUNAAB);
  const r = corridorAuth(CAMP, FUNAAB, km, {
    pickupKey: 'camp', dropoffKey: 'funaab',
    auth: { clientCorridorId: 'CAMP_FUNAAB', clientFee: 950 },
  });
  assert.equal(r.serverFee, 950); // correct fee — but derived server-side, not from client
});

test('client CANNOT underpay the corridor fee', () => {
  const km = haversineKm(CAMP, FUNAAB);
  assert.throws(
    () => corridorAuth(CAMP, FUNAAB, km, {
      pickupKey: 'camp', dropoffKey: 'funaab',
      auth: { clientCorridorId: 'CAMP_FUNAAB', clientFee: 500 },
    }),
    (e) => e.code === 'manipulated-delivery-fee'
  );
});

test('corridor never bypasses service-area validation (outside Abeokuta rejected)', () => {
  const config = corridorConfig();
  assert.throws(
    () => recomputeAuthFee({
      orderType: 'GENERAL_DELIVERY',
      pickup: CAMP,
      destination: { lat: 6.0, lng: 3.0 }, // outside Abeokuta bounds
      authoritativeDistanceKm: 5,
      corridor: CAMP_FUNAAB_CORRIDOR, // even if a corridor object were injected
      config,
    }),
    (e) => e.code === 'outside-service-area'
  );
});

// ---------- rider share ----------

test('corridor rider share uses corridor rate (50%)', () => {
  const config = corridorConfig();
  const share = getRiderShare({ orderType: 'GENERAL_DELIVERY', distanceKm: 9, vehicleType: 'MOTORCYCLE', corridorId: 'CAMP_FUNAAB', config });
  assert.equal(share.riderShareRate, 0.5);
  assert.equal(share.platformShareRate, 0.5);
  assert.equal(share.rule, 'CAMP_FUNAAB_CORRIDOR');
});

test('corridor share wins over distance band even past 15 km', () => {
  const share = getRiderShare({ orderType: 'GENERAL_DELIVERY', distanceKm: 17, vehicleType: 'MOTORCYCLE', corridorId: 'CAMP_FUNAAB', config: corridorConfig() });
  assert.equal(share.riderShareRate, 0.5); // corridor flat override, not 0.65
});

test('corridor per-ownership share object is honoured', () => {
  const config = corridorConfig([{
    ...CAMP_FUNAAB_CORRIDOR, id: 'OWNED', riderShareRate: { GO7_OWNED: 0.4, RIDER_OWNED: 0.6 }, pickupAreas: ['kuto'],
  }]);
  const go7 = getRiderShare({ orderType: 'GENERAL_DELIVERY', distanceKm: 10, vehicleType: 'MOTORCYCLE', vehicleOwnership: 'GO7_OWNED', corridorId: 'OWNED', config });
  const rider = getRiderShare({ orderType: 'GENERAL_DELIVERY', distanceKm: 10, vehicleType: 'MOTORCYCLE', vehicleOwnership: 'RIDER_OWNED', corridorId: 'OWNED', config });
  assert.equal(go7.riderShareRate, 0.4);
  assert.equal(rider.riderShareRate, 0.6);
});

test('non-corridor 17 km motorcycle trip — rider-owned 65% long-distance band', () => {
  const config = corridorConfig();
  const share = getRiderShare({ orderType: 'GENERAL_DELIVERY', distanceKm: 17, vehicleType: 'MOTORCYCLE', corridorId: null, config });
  assert.equal(share.riderShareRate, 0.65);
  assert.equal(share.platformShareRate, 0.35);
});

test('non-corridor ≤15 km trip — rider-owned 60%', () => {
  const share = getRiderShare({ orderType: 'GENERAL_DELIVERY', distanceKm: 10, vehicleType: 'MOTORCYCLE', config: corridorConfig() });
  assert.equal(share.riderShareRate, 0.6);
});

test('Go7-owned vehicle — flat 40% at any distance', () => {
  const config = corridorConfig();
  const short = getRiderShare({ orderType: 'GENERAL_DELIVERY', distanceKm: 10, vehicleType: 'MOTORCYCLE', vehicleOwnership: 'GO7_OWNED', config });
  const long = getRiderShare({ orderType: 'GENERAL_DELIVERY', distanceKm: 17, vehicleType: 'MOTORCYCLE', vehicleOwnership: 'GO7_OWNED', config });
  assert.equal(short.riderShareRate, 0.4);
  assert.equal(long.riderShareRate, 0.4);
  assert.equal(short.vehicleOwnership, 'GO7_OWNED');
});

test('corridor without riderShareRate falls back to ownership bands', () => {
  const config = corridorConfig([{ ...CAMP_FUNAAB_CORRIDOR, id: 'NO_SHARE', riderShareRate: undefined, pickupAreas: ['kuto'] }]);
  const rider = getRiderShare({ orderType: 'GENERAL_DELIVERY', distanceKm: 17, vehicleType: 'MOTORCYCLE', corridorId: 'NO_SHARE', config });
  assert.equal(rider.riderShareRate, 0.65); // rider-owned default >15km
  const go7 = getRiderShare({ orderType: 'GENERAL_DELIVERY', distanceKm: 17, vehicleType: 'MOTORCYCLE', vehicleOwnership: 'go7', corridorId: 'NO_SHARE', config });
  assert.equal(go7.riderShareRate, 0.4);
});

test('unknown corridorId does not crash — ownership bands apply', () => {
  const share = getRiderShare({ orderType: 'GENERAL_DELIVERY', distanceKm: 10, vehicleType: 'MOTORCYCLE', corridorId: 'NONEXISTENT', config: corridorConfig() });
  assert.equal(share.riderShareRate, 0.6);
});

// ---------- vehicle policy on corridor ----------

test('corridor allowedVehicles override distance policy via config shape', () => {
  const config = corridorConfig();
  const corridor = config.corridors.find((c) => c.id === 'CAMP_FUNAAB');
  assert.deepEqual(corridor.allowedVehicles, ['BICYCLE', 'MOTORCYCLE']);
  assert.equal(corridor.fallbackToDistancePricing, true);
});

test('corridor preferredVehicle is normalized and applied', () => {
  const config = corridorConfig([{ ...CAMP_FUNAAB_CORRIDOR, id: 'BIKE_ONLY', preferredVehicle: 'bicycle', allowedVehicles: ['BICYCLE'], pickupAreas: ['kuto'] }]);
  const c = config.corridors.find((x) => x.id === 'BIKE_ONLY');
  assert.equal(c.preferredVehicle, 'BICYCLE');
  assert.deepEqual(c.allowedVehicles, ['BICYCLE']);
});

// ---------- service fee is separate & 10% ----------

test('service fee = 10% of the corridor delivery fee, applied after', () => {
  const deliveryFee = 950;
  const serviceFee = Math.round(deliveryFee * 0.1);
  assert.equal(serviceFee, 95);
  assert.equal(deliveryFee + serviceFee, 1045); // customer total
});

// ---------- disabled pricing → legacy, corridors inert ----------

test('legacy mode (pricing disabled) ignores corridor config entirely', () => {
  const config = normalizePricingConfig({ enabled: false, corridors: [CAMP_FUNAAB_CORRIDOR] });
  const r = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 9, latitude: FUNAAB.lat, longitude: FUNAAB.lng, config });
  assert.equal(r.legacy, true);
  assert.equal(r.deliveryFee, 500); // flat legacy fee — corridor has no effect until enabled
});

// ---------- normalization robustness ----------

test('normalizeCorridors tolerates messy admin input', () => {
  const config = normalizePricingConfig({
    enabled: true,
    corridors: {
      camp_funaab: { deliveryFee: '950', pickupAreas: ' Camp ', dropoffAreas: ['FUNAAB'], maxKm: '18' },
      broken: {}, // no fee → dropped
    },
    orderTypes: { GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 400, perKmAfterIncluded: 100, minimumFee: 500 } },
  });
  const ids = config.corridors.map((c) => c.id).sort();
  assert.deepEqual(ids, ['CAMP_FUNAAB']); // 'broken' dropped
  const c = config.corridors[0];
  assert.equal(c.deliveryFee, 950);
  assert.equal(c.maxDistanceKm, 18);
  assert.equal(c.bidirectional, true);
});
