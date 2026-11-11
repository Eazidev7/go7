/**
 * Final production verification for the approved delivery-pricing model.
 * Loads the REAL pricingSettings/current.deliveryPricing (enabled:false in prod),
 * forces enabled:true in memory only, and exercises the canonical engine.
 */
process.env.GCLOUD_PROJECT = 'go7-app-209e4';
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.go7-app-209e4' });
const admin = require('./adminInit');
const db = admin.firestore();
const { loadCanonicalDeliveryPricing } = require('./pricingConfig');
const { calculateDeliveryFee, getRiderShare, resolveCorridor, ORDER_TYPES } = require('./pricingCore');
const { buildCorridorLocationLookup } = require('./pricingCore');
const { loadLocations } = require('./locationResolver');

const ABEOKUTA = { latitude: 7.1475, longitude: 3.3619 };
let pass = 0, fail = 0;
function check(label, got, want) {
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: got ${got}${ok ? '' : ` want ${want}`}`);
}

(async () => {
  const { config } = await loadCanonicalDeliveryPricing(db);
  config.enabled = true; // activation preview — in-memory only

  console.log('=== FOOD bands (₦50 rounding) ===');
  const food = (km) => calculateDeliveryFee({ config, orderType: 'FOOD', distanceKm: km, ...ABEOKUTA, subtotal: 0 }).deliveryFee;
  check('FOOD 0.5km', food(0.5), 600);
  check('FOOD 2.0km', food(2), 600);
  check('FOOD 2.1km', food(2.1), 800);
  check('FOOD 4.0km', food(4), 800);
  check('FOOD 4.1km', food(4.1), 1000);
  check('FOOD 6.0km', food(6), 1000);
  check('FOOD 6.1km', food(6.1), 1200);
  check('FOOD 8.0km', food(8), 1200);
  check('FOOD 8.1km', food(8.1), 1500);
  check('FOOD 10km', food(10), 1500);
  check('FOOD 10.1km', food(10.1), 1800);
  check('FOOD 15km', food(15), 1800);
  check('FOOD 15.1km (2200+10 → round50)', food(15.1), 2200 + Math.round(0.1 * 100)); // engine: 2210 → does it round to 50?
  check('FOOD 22.3km (spec: 2930 → 2950)', food(22.3), 2950);

  console.log('=== BOOK DELIVERY (GENERAL_DELIVERY) bands ===');
  const bd = (km) => calculateDeliveryFee({ config, orderType: 'GENERAL_DELIVERY', distanceKm: km, ...ABEOKUTA, subtotal: 0 }).deliveryFee;
  check('BD 1.5km', bd(1.5), 900);
  check('BD 3.0km', bd(3), 900);
  check('BD 3.1km', bd(3.1), 1050);
  check('BD 5.0km', bd(5), 1050);
  check('BD 5.1km', bd(5.1), 1350);
  check('BD 8.0km', bd(8), 1350);
  check('BD 8.1km', bd(8.1), 2500);
  check('BD 10km', bd(10), 2500);
  check('BD 10.1km', bd(10.1), 3000);
  check('BD 15km', bd(15), 3000);
  check('BD 15.1km', bd(15.1), 3650);
  check('BD 20km', bd(20), 3650);
  check('BD 20.1km', bd(20.1), 5150);
  check('BD 25km', bd(25), 5150);
  check('BD 25.1km', bd(25.1), 6050);
  check('BD 30km', bd(30), 6050);
  check('BD 32km (6050+400)', bd(32), 6450);
  check('BD 11.3km (Sapon→7Linkz)', bd(11.3), 3000);

  console.log('=== Corridor: Camp ↔ FUNAAB ===');
  const locs = await loadLocations();
  const lookup = buildCorridorLocationLookup(locs, config.corridors);
  const camp = (locs.areas || []).find((a) => a.id === 'camp');
  const funaab = (locs.areas || []).find((a) => a.id === 'funaab');
  console.log('  camp pin:', camp && `${camp.lat},${camp.lng}`, '| funaab pin:', funaab && `${funaab.lat},${funaab.lng}`);
  const corr = resolveCorridor({
    corridors: config.corridors, orderType: 'GENERAL_DELIVERY', distanceKm: 11,
    pickup: { lat: camp.lat, lng: camp.lng }, dropoff: { lat: funaab.lat, lng: funaab.lng },
    pickupKey: 'camp', dropoffKey: 'funaab', locationLookup: lookup,
  });
  check('corridor resolved', corr && corr.id, 'CAMP_FUNAAB');
  check('corridor fee', corr && corr.deliveryFee, 950);
  const corrRev = resolveCorridor({
    corridors: config.corridors, orderType: 'GENERAL_DELIVERY', distanceKm: 11,
    pickup: { lat: funaab.lat, lng: funaab.lng }, dropoff: { lat: camp.lat, lng: camp.lng },
    pickupKey: 'funaab', dropoffKey: 'camp', locationLookup: lookup,
  });
  check('corridor bidirectional', corrRev && corrRev.id, 'CAMP_FUNAAB');
  const corrFood = resolveCorridor({
    corridors: config.corridors, orderType: 'FOOD', distanceKm: 11,
    pickup: { lat: camp.lat, lng: camp.lng }, dropoff: { lat: funaab.lat, lng: funaab.lng },
    pickupKey: 'camp', dropoffKey: 'funaab', locationLookup: lookup,
  });
  check('corridor NOT for FOOD', corrFood, null);
  const corrFar = resolveCorridor({
    corridors: config.corridors, orderType: 'GENERAL_DELIVERY', distanceKm: 19,
    pickup: { lat: camp.lat, lng: camp.lng }, dropoff: { lat: funaab.lat, lng: funaab.lng },
    pickupKey: 'camp', dropoffKey: 'funaab', locationLookup: lookup,
  });
  check('corridor maxDistance 18km gate', corrFar, null);
  // Service fee on corridor: 10% of 950 = 95
  const pfRate = config.platformFeeRateParcel;
  check('corridor service fee (10% of 950)', Math.round(950 * pfRate), 95);

  console.log('=== Rider share model ===');
  const share = (ot, km, vt, own) => getRiderShare({ orderType: ot, distanceKm: km, vehicleType: vt, vehicleOwnership: own, config });
  check('GO7-owned moto 10km → 40%', share('GENERAL_DELIVERY', 10, 'MOTORCYCLE', 'GO7_OWNED').riderShareRate, 0.4);
  check('Rider bicycle 3km → 60%', share('GENERAL_DELIVERY', 3, 'BICYCLE', 'RIDER_OWNED').riderShareRate, 0.6);
  check('Rider moto 10km → 60%', share('GENERAL_DELIVERY', 10, 'MOTORCYCLE', 'RIDER_OWNED').riderShareRate, 0.6);
  check('Rider moto 16km → 65%', share('GENERAL_DELIVERY', 16, 'MOTORCYCLE', 'RIDER_OWNED').riderShareRate, 0.65);
  check('Rider moto 15km boundary → 60%', share('GENERAL_DELIVERY', 15, 'MOTORCYCLE', 'RIDER_OWNED').riderShareRate, 0.6);

  console.log('=== Platform/service fee rates ===');
  check('parcel service fee rate', config.platformFeeRateParcel, 0.1);
  const s = await db.doc('pricingSettings/current').get();
  check('food platform fee rate (of subtotal)', s.data().platformFeeRateFood, 0.1);
  check('vendor commission rate', s.data().vendorCommissionRate, 0.08);

  console.log(`\n==== ${pass} PASS / ${fail} FAIL ====`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('ERR', e); process.exit(1); });
