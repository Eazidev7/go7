/**
 * Smoke test — Go7 delivery-zone & pricing (integrated).
 *
 * Exercises the real server-side authoritative path + canonical engine with
 * realistic Abeokuta scenarios. Run from functions/:
 *   node smoke-delivery-pricing.cjs
 * Exits non-zero if any assertion fails.
 */
const {
  calculateDeliveryFee,
  normalizePricingConfig,
  ORDER_TYPES,
} = require('./pricingCore');
const { recomputeAuthFee, AuthFeeError } = require('./deliveryFeeService');

const square = (latC, lngC, half) => [
  [latC - half, lngC - half],
  [latC - half, lngC + half],
  [latC + half, lngC + half],
  [latC + half, lngC - half],
];

// Realistic Abeokuta config: service area = whole Abeokuta; named zones optional.
const ABOKUTA = {
  serviceArea: {
    enabled: true,
    bounds: { south: 6.72, north: 7.58, west: 2.92, east: 3.88 },
    center: { lat: 7.1475, lng: 3.3619 },
    maxRadiusKm: 48,
  },
  zones: [
    { id: 'funaab', name: 'FUNAAB', priority: 1, baseFee: null, polygon: square(7.22, 3.44, 0.02) },
    { id: 'camp', name: 'Camp / Abule Mecho', priority: 1, baseFee: 800, polygon: square(7.148, 3.36, 0.02) },
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
    GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 1000, includedKm: 2, perKmAfterIncluded: 150, minimumFee: 1000, maximumFee: 6000 },
  },
};

const ENABLED = normalizePricingConfig({ enabled: true, roundingStepping: 50, ...ABOKUTA });
const DISABLED = normalizePricingConfig({ enabled: false, roundingStepping: 50, ...ABOKUTA });

let pass = 0;
let fail = 0;
const check = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${label}${extra ? ` — ${extra}` : ''}`); }
  else { fail++; console.log(`  ❌ ${label}${extra ? ` — ${extra}` : ''}`); }
};
const throwsCode = (fn, code) => { try { fn(); return false; } catch (e) { return e && e.code === code; } };

console.log('GO7 delivery pricing — SMOKE TEST\n');

console.log('1) FOOD legacy (config disabled) → ₦500 (production unchanged)');
check('FOOD disabled returns ₦500', calculateDeliveryFee({ orderType: 'FOOD', distanceKm: 3, config: DISABLED }).deliveryFee === 500);

console.log('\n2) FOOD configured (enabled, distance bands)');
check('FOOD 1km → ₦700', calculateDeliveryFee({ orderType: 'FOOD', distanceKm: 1, latitude: 7.1, longitude: 3.3, config: ENABLED }).deliveryFee === 700);
check('FOOD 3km → ₦900', calculateDeliveryFee({ orderType: 'FOOD', distanceKm: 3, latitude: 7.1, longitude: 3.3, config: ENABLED }).deliveryFee === 900);

console.log('\n3) Book Delivery — Abeokuta, NO named zone → default distance pricing');
const bd = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 3, latitude: 7.1, longitude: 3.3, config: ENABLED });
check('in Abeokuta, not rejected', bd.outsideServiceArea === false);
check(`NOT blocked for missing named zone (appliedRule=${bd.appliedRule}, fee=₦${bd.deliveryFee})`, bd.appliedRule === 'distance-linear' && bd.deliveryFee === 1150);

console.log('\n4) Named zone (Camp) → optional zone-specific price');
const zc = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 3, latitude: 7.148, longitude: 3.36, config: ENABLED });
check('Camp zone identified', zc.zoneId === 'camp');
check('Camp zone override ₦800 applied', zc.appliedRule === 'zone' && zc.deliveryFee === 800);

console.log('\n5) Outside Abeokuta → outside-service-area (blocked)');
const oa = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 5, latitude: 6.0, longitude: 3.0, config: ENABLED });
check('outside Abeokuta flagged', oa.outsideServiceArea === true);

console.log('\n6) Server-authoritative validation (Abeokuta dest, no zone → ₦1150)');
const authBase = { orderType: 'GENERAL_DELIVERY', pickup: { lat: 7.15, lng: 3.35 }, destination: { lat: 7.1, lng: 3.3 }, authoritativeDistanceKm: 3, clientZoneId: null, config: ENABLED };
const match = recomputeAuthFee({ ...authBase, clientFee: 1150 });
check('client ₦1150 == server → ACCEPT', match.serverFee === 1150);
check('client ₦50 → REJECT', throwsCode(() => recomputeAuthFee({ ...authBase, clientFee: 50 }), 'manipulated-delivery-fee'));
check('client ₦99999 → REJECT', throwsCode(() => recomputeAuthFee({ ...authBase, clientFee: 99999 }), 'manipulated-delivery-fee'));
check('tampered distance → REJECT', throwsCode(() => recomputeAuthFee({ ...authBase, clientFee: 1150, clientDistanceKm: 25 }), 'manipulated-distance'));
check('tampered orderType → REJECT', throwsCode(() => recomputeAuthFee({ ...authBase, clientFee: 1150, clientOrderType: 'MARKET' }), 'manipulated-order-type'));
check('tampered zone (claims FUNAAB) → REJECT', throwsCode(() => recomputeAuthFee({ ...authBase, clientFee: 1150, clientZoneId: 'funaab' }), 'manipulated-zone'));
check('invalid coords (0,0) → REJECT', throwsCode(() => recomputeAuthFee({ ...authBase, destination: { lat: 0, lng: 0 } }), 'invalid-coordinates'));

console.log('\n7) Outside Abeokuta destination → REJECT server-side');
check('Lagos dest → REJECT', throwsCode(() => recomputeAuthFee({ orderType: 'GENERAL_DELIVERY', pickup: { lat: 7.15, lng: 3.35 }, destination: { lat: 6.5, lng: 3.4 }, authoritativeDistanceKm: 5, clientFee: 2000, config: ENABLED }), 'outside-service-area'));

console.log('\n8.5) All real Abeokuta areas are INSIDE service area (never "out of bound")');
const { isWithinServiceArea } = require('./pricingCore');
const ABEOKUTA_AREAS = [
  ['city centre', 7.1475, 3.3619],
  ['FUNAAB', 7.22, 3.44],
  ['Camp / Abule Mecho', 7.148, 3.36],
  ['Alabata', 7.205, 3.412],
  ['Obantoko', 7.165, 3.375],
  ['Panseke', 7.158, 3.352],
  ['Kuto', 7.15, 3.345],
  ['Lafenwa', 7.152, 3.372],
  ['Elega', 7.128, 3.332],
  ['Ibara', 7.14, 3.35],
  ['Sapon', 7.1547, 3.3469],
  ['Asero', 7.1458, 3.3708],
  ['Oke Ilewo', 7.1556, 3.3498],
  ['Totoro', 7.17, 3.38],
  ['Siun', 7.098, 3.378],
  ['Owode', 7.1289, 3.3985],
];
let areaOk = 0;
let areaBad = 0;
for (const [area, lat, lng] of ABEOKUTA_AREAS) {
  const inside = isWithinServiceArea(lat, lng, ENABLED.serviceArea);
  if (inside) { areaOk++; console.log(`    ✅ ${area} (${lat},${lng}) inside`); }
  else { areaBad++; console.log(`    ❌ ${area} (${lat},${lng}) OUT OF BOUND`); }
  // Also confirm the server accepts it via recompute (no client fee, accepted).
  if (inside) {
    recomputeAuthFee({ orderType: 'GENERAL_DELIVERY', pickup: { lat: 7.15, lng: 3.35 }, destination: { lat, lng }, authoritativeDistanceKm: 1, config: ENABLED });
  } else {
    try { recomputeAuthFee({ orderType: 'GENERAL_DELIVERY', pickup: { lat: 7.15, lng: 3.35 }, destination: { lat, lng }, authoritativeDistanceKm: 1, config: ENABLED }); } catch (_) {}
  }
}
check('every real Abeokuta area inside service area', areaBad === 0, `${areaOk}/${ABEOKUTA_AREAS.length}`);

console.log('\n8) FUEL isolated — not gated by general service area');
const fuelEnabled = normalizePricingConfig({
  enabled: true,
  serviceArea: { enabled: true, bounds: { south: 6.72, north: 7.58, west: 2.92, east: 3.88 } },
  orderTypes: { FUEL: { enabled: true, distanceMode: 'flat', flatFee: 1000 } },
  zones: [],
});
const f = calculateDeliveryFee({ orderType: 'FUEL', distanceKm: 0, latitude: 6.0, longitude: 3.0, config: fuelEnabled });
check('FUEL not gated by service area', f.outsideServiceArea === false && f.deliveryFee === 1000);

console.log('\n9) BOOK DELIVERY launch pricing (base ₦400 + ₦100/km, min ₦500)');
const { preferredVehicleForDistance, VEHICLE_TYPES } = require('./vehicleType');
const gdConfig = normalizePricingConfig({
  enabled: true,
  serviceArea: { enabled: true, bounds: { south: 6.72, north: 7.58, west: 2.92, east: 3.88 }, center: { lat: 7.1475, lng: 3.3619 }, maxRadiusKm: 48 },
  zones: [{ id: 'funaab', name: 'FUNAAB', priority: 1, baseFee: null, polygon: square(7.22, 3.44, 0.02) }],
  orderTypes: { GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 400, includedKm: 0, perKmAfterIncluded: 100, minimumFee: 500, maximumFee: 6000, roundingStepping: 1 } },
});
const gdFee = (km) => calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: km, latitude: 7.13, longitude: 3.34, config: gdConfig }).deliveryFee;
check('GD 2 km → ₦600', gdFee(2) === 600);
check('GD 5 km → ₦900', gdFee(5) === 900);
check('GD 8 km → ₦1,200', gdFee(8) === 1200);
check('GD 10 km → ₦1,400', gdFee(10) === 1400);
check('GD 2.4 km → ₦640 (exact)', gdFee(2.4) === 640);
check('short trip prefers bicycle (dispatch advisory)', preferredVehicleForDistance(2) === VEHICLE_TYPES.BICYCLE);
check('far trip prefers motorcycle', preferredVehicleForDistance(9) === VEHICLE_TYPES.MOTORCYCLE);

console.log(`\n════════ RESULT: ${pass} passed, ${fail} failed ════════`);
process.exit(fail > 0 ? 1 : 0);
