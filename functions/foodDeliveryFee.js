/**
 * Server-side food delivery fee verification.
 * Uses the same pricingSettings/current formula as Book Delivery (not the old ₦500/5km/₦100).
 */
const functions = require('firebase-functions/v1');
const axios = require('axios');
const admin = require('./adminInit');
const {
  loadPricingSettingsFromFirestore,
  calculateGo7DeliveryFare,
} = require('./fareCalculator');

const db = admin.firestore();
const MAX_KM = 20;
const FEE_TOLERANCE = 50;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_DISTANCE_MATRIX_SERVER_KEY;

function toCoords(raw) {
  if (!raw) return null;
  const lat = Number(raw.lat ?? raw.latitude);
  const lng = Number(raw.lng ?? raw.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  if (Math.abs(lat - 7.1475) < 0.0002 && Math.abs(lng - 3.3619) < 0.0002) return null;
  if (Math.abs(lat - 7.1575) < 0.0002 && Math.abs(lng - 3.347) < 0.0002) return null;
  return { lat, lng };
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function extractVendorCoords(vendorData) {
  return (
    toCoords(vendorData?.coordinates) ||
    toCoords(vendorData?.location?.coordinates) ||
    toCoords(vendorData?.location) ||
    toCoords(vendorData?.pickupCoords) ||
    toCoords(vendorData)
  );
}

async function roadDistanceKm(origin, destination) {
  if (!GOOGLE_MAPS_API_KEY) return null;
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
    `${origin.lat},${origin.lng}`
  )}&destinations=${encodeURIComponent(
    `${destination.lat},${destination.lng}`
  )}&mode=driving&units=metric&region=ng&key=${GOOGLE_MAPS_API_KEY}`;
  const response = await axios.get(url, { timeout: 8000 });
  const element = response.data?.rows?.[0]?.elements?.[0];
  if (response.data?.status !== 'OK' || element?.status !== 'OK') return null;
  return element.distance.value / 1000;
}

/**
 * Checkout delivery quote: restaurant pin (from the vendor record) → customer pin,
 * priced with pricingSettings/current. Shared by verifyFoodDeliveryFee (what the
 * checkout screen shows) and createCommerceOrder (what Paystack/wallet charges).
 */
async function quoteFoodDelivery(dbArg, vendorIdRaw, customerRaw) {
  const fdb = dbArg || db;
  const vendorId = String(vendorIdRaw || '').trim();
  const customer = toCoords(customerRaw);

  if (!vendorId || !customer) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Vendor and customer map pins are required to price delivery'
    );
  }

  const vendorSnap = await fdb.collection('vendors').doc(vendorId).get();
  if (!vendorSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Vendor not found');
  }
  const vendorCoords = extractVendorCoords(vendorSnap.data() || {});
  if (!vendorCoords) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'This vendor has no verified landmark pin yet'
    );
  }

  let distanceKm = null;
  let method = 'haversine';
  try {
    distanceKm = await roadDistanceKm(vendorCoords, customer);
    if (typeof distanceKm === 'number') method = 'google';
  } catch (err) {
    console.warn('verifyFoodDeliveryFee matrix failed:', err?.message);
  }

  if (distanceKm == null) {
    distanceKm = Math.round(haversineKm(vendorCoords, customer) * 1.2 * 10) / 10;
    method = 'haversine';
  }

  if (!(distanceKm > 0)) {
    throw new functions.https.HttpsError('failed-precondition', 'Could not calculate delivery distance');
  }
  if (distanceKm > MAX_KM) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Delivery not available beyond ${MAX_KM} km (${distanceKm.toFixed(1)} km)`
    );
  }

  const pricing = await loadPricingSettingsFromFirestore(fdb);
  const breakdown = calculateGo7DeliveryFare(pricing, { distanceKm });
  return { vendorCoords, customer, distanceKm, method, fee: breakdown.total, breakdown, pricing };
}

exports.quoteFoodDelivery = quoteFoodDelivery;

exports.verifyFoodDeliveryFee = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }

  const clientFee = Number(data?.clientFee);
  const { distanceKm, method, fee, breakdown, pricing } = await quoteFoodDelivery(
    db,
    data?.vendorId,
    data?.customer || data?.dropoff || data?.deliveryAddress
  );
  const ok = Number.isFinite(clientFee) && Math.abs(clientFee - fee) <= FEE_TOLERANCE;

  return {
    ok,
    distanceKm,
    fee,
    method,
    clientFee: Number.isFinite(clientFee) ? clientFee : null,
    baseFee: breakdown.baseFee,
    includedKm: breakdown.includedKm,
    perKmAfterIncluded: pricing.launchMode
      ? pricing.launchPerKmAfterIncluded
      : pricing.standardPerKmAfterIncluded,
    pricingMode: breakdown.pricingMode,
    message: ok
      ? 'Delivery fee verified'
      : `Delivery fee mismatch. Expected ₦${fee}, got ₦${clientFee || 0}`,
  };
});
