/**
 * 🚚 GO7 BOOK DELIVERY — server-authoritative order creation + payment confirm.
 *
 * Single authoritative path shared by the manual Book Delivery page and any
 * future orchestration layer (AI chat). The client never writes `orders` or
 * `bookings` directly and never marks a payment as paid.
 *
 * Flow:
 *   createBookDeliveryOrder   -> pendingBookings/{id} (server-only doc) +
 *                                authoritative quote (fee/distance/zone/total)
 *   <customer pays: Paystack popup | wallet debit | POD>
 *   confirmBookDeliveryPayment -> server verifies the payment, creates the real
 *                                bookings/{id} + orders/{id} docs (which fire
 *                                the existing notifyOnBooking trigger), then
 *                                dispatches the nearest rider server-side.
 *
 * Nothing monetary is trusted from the client: fee/distance/zone/orderType are
 * recomputed by deliveryFeeService.computeDeliveryFee and any client-supplied
 * values outside tolerance abort the booking.
 */

const functions = require('firebase-functions/v1');
const admin = require('./adminInit');
const deliveryFeeService = require('./deliveryFeeService');
const { normalizeVehicleType } = require('./vehicleType');

const firestore = admin.firestore();
const { FieldValue } = require('firebase-admin/firestore');

const BOOK_DELIVERY_ORDER_TYPE = 'GENERAL_DELIVERY';
const PENDING_COLLECTION = 'pendingBookings';

// Same defaults as src/constants/platformPricing.js — read once per call so
// admin edits to pricingSettings/current take effect without redeploy.
const DEFAULT_PLATFORM_FEE_RATE_PARCEL = 0.1;
const DEFAULT_RIDER_DELIVERY_SHARE = 0.5;

// Same matching window as src/utils/riderMatching.js
const MAX_RIDER_RADIUS_KM = 5;
const RIDER_ACTIVE_WINDOW_MINUTES = 10;
const BIKE_ALIASES = new Set(['bike', 'motorcycle', 'scooter', 'rider', 'motorbike', 'motor']);

const toHttpsError = (err) => {
  if (err instanceof functions.https.HttpsError) return err;
  const code = err && err.code ? String(err.code) : '';
  if (code === 'invalid-coordinates' || code === 'invalid-order-type') {
    return new functions.https.HttpsError('invalid-argument', err.message);
  }
  if (code === 'outside-service-area' || code === 'manipulated-delivery-fee' ||
      code === 'manipulated-distance' || code === 'manipulated-zone' ||
      code === 'manipulated-order-type' || code === 'beyond-max-distance') {
    return new functions.https.HttpsError('failed-precondition', err.message);
  }
  return new functions.https.HttpsError('internal', err.message || 'Booking failed');
};

// ---------------------------------------------------------------------------
// IDs / pins (server-generated — never client-supplied)
// ---------------------------------------------------------------------------
function generateBookingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Go7-${code}`;
}

async function generateUniqueBookingId() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = generateBookingCode();
    const existing = await firestore.collection('bookings').doc(id).get();
    if (!existing.exists) return id;
  }
  throw new functions.https.HttpsError('resource-exhausted', 'Could not allocate a booking ID — retry');
}

function generateDeliveryPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ---------------------------------------------------------------------------
// Server-side order pricing split (mirrors src/utils/orderPricing.js — the
// client copy is display-only; these are the authoritative stored values).
// ---------------------------------------------------------------------------
async function loadPlatformRates(db) {
  try {
    const snap = await db.collection('pricingSettings').doc('current').get();
    const s = snap.exists ? snap.data() || {} : {};
    return {
      platformFeeRateParcel: Number.isFinite(Number(s.platformFeeRateParcel))
        ? Number(s.platformFeeRateParcel)
        : DEFAULT_PLATFORM_FEE_RATE_PARCEL,
      riderDeliveryShare: Number.isFinite(Number(s.defaultRiderDeliveryShare))
        ? Number(s.defaultRiderDeliveryShare)
        : DEFAULT_RIDER_DELIVERY_SHARE,
    };
  } catch (err) {
    console.warn('[bookDeliveryOrder] pricingSettings read failed, using defaults:', err.message);
    return {
      platformFeeRateParcel: DEFAULT_PLATFORM_FEE_RATE_PARCEL,
      riderDeliveryShare: DEFAULT_RIDER_DELIVERY_SHARE,
    };
  }
}

function roundNaira(v) {
  return Math.round(Math.max(0, Number(v) || 0));
}

async function loadDispatchSettings(db) {
  try {
    const snap = await db.collection('pricingSettings').doc('current').get();
    const s = snap.exists ? snap.data() || {} : {};
    return {
      fallbackRiderId: String(s.fallbackRiderId || '').trim() || null,
    };
  } catch (err) {
    console.warn('[bookDeliveryOrder] loadDispatchSettings failed:', err.message);
    return { fallbackRiderId: null };
  }
}

function buildServerOrderPricing(deliveryFee, rates, quote) {
  const fee = roundNaira(deliveryFee);
  const platformFee = roundNaira(fee * rates.platformFeeRateParcel);
  const grandTotal = fee + platformFee;
  const riderShareRate = Number.isFinite(Number(quote?.riderShareRate))
    ? Math.max(0, Math.min(1, Number(quote.riderShareRate)))
    : rates.riderDeliveryShare;
  const riderPayout = roundNaira(fee * riderShareRate);
  const go7DeliveryShare = fee - riderPayout;
  const platformShareRate = Number.isFinite(Number(quote?.platformShareRate))
    ? Math.max(0, Math.min(1, Number(quote.platformShareRate)))
    : Number((1 - riderShareRate).toFixed(4));
  const vehicleType = quote?.vehicleType || null;
  const preferredVehicleType = quote?.preferredVehicleType || null;
  const eligibleVehicles = Array.isArray(quote?.eligibleVehicles) ? quote.eligibleVehicles : [];
  const allowedVehicleTypes = Array.isArray(quote?.allowedVehicleTypes) && quote.allowedVehicleTypes.length
    ? quote.allowedVehicleTypes
    : eligibleVehicles;
  const vehicleSelectionReason = quote?.vehicleSelectionReason || null;
  const riderShareRule = quote?.riderShareRule || null;
  const corridorId = quote?.corridorId || null;
  const corridorName = quote?.corridorName || null;
  const pricingSource = quote?.pricingSource || (corridorId ? 'corridor' : 'distance');
  const go7Contribution = quote?.go7Contribution || null;

  return {
    orderType: BOOK_DELIVERY_ORDER_TYPE,
    itemTotal: 0,
    deliveryFee: fee,
    platformFee,
    platformFeeRate: rates.platformFeeRateParcel,
    platformFeeBasis: 'delivery_fee',
    platformFeeBasisAmount: fee,
    grandTotal,
    total: grandTotal,
    vehicleType,
    preferredVehicleType,
    eligibleVehicles,
    allowedVehicleTypes,
    vehicleSelectionReason,
    corridorId,
    corridorName,
    pricingSource,
    go7Contribution,
    riderShareRate,
    platformShareRate,
    riderShareRule,
    riderPayout,
    go7DeliveryShare,
    platformDeliveryShare: go7DeliveryShare,
    riderDeliveryShareRate: riderShareRate,
    go7DeliveryShareRate: platformShareRate,
    riderPercentage: riderShareRate * 100,
    feeBreakdown: {
      itemTotal: 0,
      deliveryFee: fee,
      rider: riderPayout,
      platform: go7DeliveryShare,
      platformFee,
      platformFeeRate: rates.platformFeeRateParcel,
      platformFeeBasis: 'delivery_fee',
      vehicleType,
      preferredVehicleType,
      vehicleSelectionReason,
      riderShareRate,
      riderShareRule,
      riderPayout,
      go7DeliveryShare,
      riderDeliveryShareRate: riderShareRate,
      grandTotal,
      pricingVersion: 1,
      calculatedAt: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
function str(v, max = 300) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function requireSenderRecipient(data) {
  const sender = {
    name: str(data.sender?.name),
    phone: str(data.sender?.phone),
    email: str(data.sender?.email),
  };
  const recipient = {
    name: str(data.recipient?.name),
    phone: str(data.recipient?.phone),
    email: str(data.recipient?.email),
  };
  if (!sender.phone && !sender.name) {
    throw new functions.https.HttpsError('invalid-argument', 'Sender name or phone is required');
  }
  if (!recipient.phone && !recipient.name) {
    throw new functions.https.HttpsError('invalid-argument', 'Recipient name or phone is required');
  }
  return { sender, recipient };
}

const ALLOWED_PAYMENT_METHODS = new Set(['paystack', 'wallet', 'pod']);

// ---------------------------------------------------------------------------
// createBookDeliveryOrder — callable delegates to createForUser so the AI tool
// registry can run the identical code path server-side.
// ---------------------------------------------------------------------------
exports.createBookDeliveryOrder = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in is required to book a delivery');
    }
    return await createForUser(context.auth.uid, data || {}, context.auth.token?.email || null);
  } catch (err) {
    console.error('[createBookDeliveryOrder] failed:', err);
    throw toHttpsError(err);
  }
});

async function createForUser(uid, input, authEmail = null) {
    input = input || {};

    // Authoritative coordinates — rejects non-finite / out-of-range / 0,0.
    const pickupCoords = deliveryFeeService.validateCoordinates(input.pickup, 'pickup');
    const dropoffCoords = deliveryFeeService.validateCoordinates(input.dropoff, 'dropoff');

    const pickupAddress = str(input.pickup?.address) || str(input.pickupAddress);
    const dropoffAddress = str(input.dropoff?.address) || str(input.dropoffAddress);
    if (!pickupAddress || !dropoffAddress) {
      throw new functions.https.HttpsError('invalid-argument', 'Pickup and dropoff addresses are required');
    }

    const { sender, recipient } = requireSenderRecipient(input);

    const paymentMethod = str(input.paymentMethod || 'paystack').toLowerCase();
    if (!ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
      throw new functions.https.HttpsError('invalid-argument', `Unsupported payment method: ${paymentMethod}`);
    }
    if (paymentMethod === 'pod') {
      const isVendor = await isVendorUser(uid);
      if (!isVendor) {
        throw new functions.https.HttpsError('permission-denied', 'Pay on Delivery is only available for verified vendors');
      }
    }

    // 🔒 Authoritative quote — server recomputes distance/zone/fee and rejects
    // manipulated client values or out-of-service-area destinations.
    const quote = await deliveryFeeService.computeDeliveryFee(
      {
        orderType: BOOK_DELIVERY_ORDER_TYPE,
        pickup: pickupCoords,
        destination: dropoffCoords,
        clientFee: Number.isFinite(Number(input.clientFee)) ? Number(input.clientFee) : undefined,
        clientDistanceKm: Number.isFinite(Number(input.clientDistanceKm)) ? Number(input.clientDistanceKm) : undefined,
        clientZoneId: input.clientZoneId != null ? String(input.clientZoneId) : undefined,
        clientCorridorId: input.clientCorridorId != null ? String(input.clientCorridorId) : undefined,
        clientOrderType: BOOK_DELIVERY_ORDER_TYPE,
      },
      { db: firestore }
    );

    // Preserve the exact quoted amount the customer saw when the server
    // recompute stays inside the allowed tolerance band. This prevents Paystack
    // charging a slightly different total than the quote card displayed.
    if (Number.isFinite(Number(input.clientFee))) {
      const clientFee = Math.round(Number(input.clientFee));
      if (Math.abs(clientFee - quote.deliveryFee) <= deliveryFeeService.FEE_TOLERANCE) {
        quote.deliveryFee = clientFee;
        if (quote.breakdown) quote.breakdown.deliveryFee = clientFee;
      }
    }
    const rates = await loadPlatformRates(firestore);
    const pricing = buildServerOrderPricing(quote.deliveryFee, rates, quote);

    const bookingId = await generateUniqueBookingId();
    const deliveryPin = generateDeliveryPin();

    const pkg = input.packageDetails || {};
    const distanceKm = quote.distanceKm;
    const orderPayload = {
      bookingId,
      id: bookingId,
      jobId: bookingId,
      pickup: {
        address: pickupAddress,
        coordinates: pickupCoords,
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
        source: str(input.pickupLocationSource) || null,
      },
      dropoff: {
        address: dropoffAddress,
        coordinates: dropoffCoords,
        lat: dropoffCoords.lat,
        lng: dropoffCoords.lng,
        source: str(input.dropoffLocationSource) || null,
      },
      pickupAddress,
      dropoffAddress,
      pickupCoords,
      dropoffCoords,
      sender,
      recipient,
      itemDescription: str(input.itemDescription) || 'Package delivery',
      packageDetails: {
        name: str(pkg.name),
        size: str(pkg.size) || 'small',
        weight: str(pkg.weight) || 'under_5kg',
        type: str(pkg.type) || 'document',
        multiplier: Number.isFinite(Number(pkg.multiplier)) ? Number(pkg.multiplier) : 1,
      },
      deliveryMode: str(input.deliveryMode) || 'standard',
      specialNotes: str(input.specialNotes || input.note, 1000),
      paymentMethod,
      paymentType: str(input.paymentType) || 'pay_now',
      customerId: uid,
      userId: uid,
      userEmail: str(authEmail || input.sender?.email) || null,
      customer: {
        uid,
        name: sender.name,
        phone: sender.phone,
        email: sender.email,
      },
      phoneNumber: sender.phone,
      recipientNumber: recipient.phone,
      distance: distanceKm,
      distanceKm,
      durationMin: Math.round((distanceKm / 30) * 60),
      fare: pricing.deliveryFee,
      finalFare: pricing.deliveryFee,
      estimatedFare: pricing.deliveryFee,
      deliveryFee: pricing.deliveryFee,
      ...pickPricingFields(pricing),
      totalKobo: pricing.grandTotal * 100,
      orderType: BOOK_DELIVERY_ORDER_TYPE,
      pricingConfigVersion: quote.pricingConfigVersion,
      distanceMethod: quote.distanceMethod || null,
      dropoffZone: quote.zoneName || null,
      pickupZone: null,
      // PIN lives in deliverySecrets/{bookingId} (owner+admin read only) —
      // never in public bookings/orders/deliveries docs that riders can read.
      requiresDeliveryPin: true,
      deliveryPINVerified: false,
      estimatedDeliveryTime:
        `${Math.ceil(distanceKm * 3)}-${Math.ceil(distanceKm * 4)} minutes`,
      paymentStatus: 'awaiting_payment',
      status: 'awaiting_payment',
      dispatchStatus: 'awaiting_payment',
      orderStatus: 'awaiting_payment',
      riderId: null,
      referralCode: str(input.referralCode) || null,
      referrerId: str(input.referrerId) || null,
      promotionId: str(input.promotionId) || null,
      promoCreditApplied: input.promoCreditApplied ?? input.prePromoCredit ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      timestamp: new Date().toISOString(),
      createdVia: 'server-callable',
    };

    // Strip undefined values so Firestore never receives them.
    const cleanPayload = stripUndefined(orderPayload);

    // Server-only staging doc — the catch-all rules deny all client access and
    // no client ever needs to read it (the callable returns everything needed).
    await firestore.collection(PENDING_COLLECTION).doc(bookingId).set({
      ...cleanPayload,
      confirmAttempts: 0,
    });

    // Private PIN store — only the ordering customer (+admin) can read it via
    // rules; riders verify through the verifyDeliveryPin callable instead.
    await firestore.collection('deliverySecrets').doc(bookingId).set({
      pin: deliveryPin,
      customerId: uid,
      orderId: bookingId,
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`📝 [createBookDeliveryOrder] pending booking ${bookingId} | fee ₦${pricing.deliveryFee} | total ₦${pricing.grandTotal} | ${distanceKm}km | uid ${uid}`);

    return {
      success: true,
      bookingId,
      orderId: bookingId,
      deliveryFee: pricing.deliveryFee,
      platformFee: pricing.platformFee,
      grandTotal: pricing.grandTotal,
      total: pricing.grandTotal,
      totalKobo: pricing.grandTotal * 100,
      distanceKm,
      zoneName: quote.zoneName || null,
      vehicleType: quote.vehicleType || null,
      preferredVehicleType: quote.preferredVehicleType || null,
      eligibleVehicles: quote.eligibleVehicles || [],
      allowedVehicleTypes: Array.isArray(quote.allowedVehicleTypes) && quote.allowedVehicleTypes.length
        ? quote.allowedVehicleTypes
        : quote.eligibleVehicles || [],
      vehicleSelectionReason: quote.vehicleSelectionReason || null,
      corridorId: quote.corridorId || null,
      pricingSource: quote.pricingSource || null,
      riderShareRate: quote.riderShareRate || null,
      platformShareRate: quote.platformShareRate || null,
      riderShareRule: quote.riderShareRule || null,
      riderPayout: pricing.riderPayout,
      go7DeliveryShare: pricing.go7DeliveryShare,
      pricingConfigVersion: quote.pricingConfigVersion,
      paymentStatus: 'awaiting_payment',
    };
}

function pickPricingFields(pricing) {
  return {
    itemTotal: pricing.itemTotal,
    platformFee: pricing.platformFee,
    platformFeeRate: pricing.platformFeeRate,
    platformFeeBasis: pricing.platformFeeBasis,
    platformFeeBasisAmount: pricing.platformFeeBasisAmount,
    grandTotal: pricing.grandTotal,
    total: pricing.total,
    vehicleType: pricing.vehicleType,
    preferredVehicleType: pricing.preferredVehicleType,
    eligibleVehicles: pricing.eligibleVehicles,
    allowedVehicleTypes: pricing.allowedVehicleTypes,
    vehicleSelectionReason: pricing.vehicleSelectionReason,
    corridorId: pricing.corridorId,
    corridorName: pricing.corridorName,
    pricingSource: pricing.pricingSource,
    riderShareRate: pricing.riderShareRate,
    platformShareRate: pricing.platformShareRate,
    riderShareRule: pricing.riderShareRule,
    riderPayout: pricing.riderPayout,
    go7DeliveryShare: pricing.go7DeliveryShare,
    platformDeliveryShare: pricing.platformDeliveryShare,
    riderDeliveryShareRate: pricing.riderDeliveryShareRate,
    go7DeliveryShareRate: pricing.go7DeliveryShareRate,
    riderPercentage: pricing.riderPercentage,
    feeBreakdown: pricing.feeBreakdown,
  };
}

function stripUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Vendor check (POD gate) — same signals the app uses: users/{uid}.role or a
// vendors/{uid} document.
// ---------------------------------------------------------------------------
async function isVendorUser(uid) {
  try {
    const [userSnap, vendorSnap] = await Promise.all([
      firestore.collection('users').doc(uid).get(),
      firestore.collection('vendors').doc(uid).get(),
    ]);
    const role = userSnap.exists ? str(userSnap.data().role) : '';
    return role === 'vendor' || vendorSnap.exists;
  } catch (err) {
    console.warn('[bookDeliveryOrder] vendor check failed:', err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Payment verification — server-side only
// ---------------------------------------------------------------------------
function getPaystackSecret() {
  // Same fallbacks as index.js / wallet.js — functions.config, env params, env vars.
  try {
    const { defineString } = require('firebase-functions/params');
    const viaParam =
      defineString('PAYSTACK_SECRET_KEY').value() ||
      defineString('PAYSTACK_SECRET').value();
    if (viaParam) return viaParam;
  } catch (_) { /* params not available on this runtime */ }
  return (
    functions.config().paystack?.secret ||
    process.env.PAYSTACK_SECRET_KEY ||
    process.env.PAYSTACK_SECRET ||
    null
  );
}

async function verifyPaystackReference(reference) {
  const secret = getPaystackSecret();
  if (!secret) {
    throw new functions.https.HttpsError('failed-precondition', 'Payment verification is not configured');
  }
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || !body.status) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Payment verification failed: ${(body && body.message) || res.status}`
    );
  }
  return body.data;
}

async function walletDebitExists(uid, bookingId, requiredAmount) {
  const ref = firestore
    .collection('wallets').doc(uid)
    .collection('transactions').doc(`delivery_${bookingId}`);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const amount = Number(snap.data().amount) || 0;
  return amount >= requiredAmount;
}

// ---------------------------------------------------------------------------
// Server-side dispatch — ported from src/utils/riderMatching.js so the same
// assignment behavior runs inside a trusted boundary instead of the browser.
// ---------------------------------------------------------------------------
function haversineKmLocal(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Dispatch-aware vehicle normalization. In this codebase legacy rider records
 * use 'bike' to mean motorcycle; canonical aliases (bicycle/ebike/motorcycle)
 * map to their canonical type.
 */
function normalizeDispatchVehicleType(type) {
  const t = String(type || 'bike').toLowerCase();
  if (t === 'bike' || BIKE_ALIASES.has(t)) return 'MOTORCYCLE';
  return normalizeVehicleType(t) || 'MOTORCYCLE';
}

function riderMatchesVehicle(riderVehicleType, vehiclePref) {
  if (!vehiclePref) return true;
  if (Array.isArray(vehiclePref)) {
    return vehiclePref.some((p) => riderMatchesVehicle(riderVehicleType, p));
  }
  const pref = String(vehiclePref).toLowerCase();
  if (pref === 'any') return true;
  // Backward-compat: 'bike' and its aliases mean motorcycle-family in dispatch.
  if (pref === 'bike' || BIKE_ALIASES.has(pref)) {
    return normalizeDispatchVehicleType(riderVehicleType) === 'MOTORCYCLE';
  }
  return normalizeDispatchVehicleType(riderVehicleType) === normalizeVehicleType(pref);
}

/**
 * Resolve the vehicle types dispatch may use. The booking's stored
 * `eligibleVehicles` / `preferredVehicleType` (computed at pricing time) win;
 * 'ANY' allows every vehicle; otherwise the caller's preference (legacy 'bike')
 * is used so existing bookings keep working.
 */
function getAllowedVehicleTypes(orderPayload, vehiclePref) {
  // Dispatch-allowed set (policy + configured fallback) wins over the
  // policy-only eligible list.
  const av = orderPayload && orderPayload.allowedVehicleTypes;
  if (Array.isArray(av) && av.length) return av;
  const ev = orderPayload && orderPayload.eligibleVehicles;
  if (Array.isArray(ev) && ev.length) return ev;
  const vt = orderPayload && orderPayload.vehicleType;
  if (vt && vt !== 'ANY') return [String(vt).toUpperCase()];
  if (vt === 'ANY') return ['ANY'];
  return vehiclePref ? [vehiclePref] : ['bike'];
}

/** All currently-available riders near pickup, sorted by distance. */
async function findAvailableRiders(pickupCoords) {
  const snap = await firestore.collection('riders').get();
  const now = Date.now();
  const candidates = [];

  for (const d of snap.docs) {
    const r = d.data();
    const isAvailable =
      r.status === 'available' ||
      r.available === true ||
      (r.status === 'online' && r.isAvailable !== false);
    if (!isAvailable) continue;

    const lat = r.latitude ?? r.lat ?? r.currentLocation?.lat;
    const lng = r.longitude ?? r.lng ?? r.currentLocation?.lng;
    if (lat == null || lng == null) continue;

    const lastActive = r.lastActive?.toMillis ? r.lastActive.toMillis() : Number(r.lastActive);
    if (!Number.isFinite(lastActive) || now - lastActive > RIDER_ACTIVE_WINDOW_MINUTES * 60000) continue;

    const distance = haversineKmLocal(pickupCoords, { lat: Number(lat), lng: Number(lng) });
    if (distance > MAX_RIDER_RADIUS_KM) continue;

    candidates.push({
      id: d.id,
      name: r.name || r.fullName || 'Rider',
      phone: r.phone || r.phoneNumber || null,
      vehicleType: r.vehicleType || 'bike',
      vehicleOwnership: r.vehicleOwnership || r.vehicleOwner || null,
      distance,
      distanceFormatted: `${distance.toFixed(2)} km`,
      latitude: Number(lat),
      longitude: Number(lng),
    });
  }

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates;
}

async function seedTrackingDocs(orderId, rider, db = firestore) {
  const batch = db.batch();
  const ts = FieldValue.serverTimestamp();
  batch.set(
    db.collection('deliveryTracking').doc(orderId),
    {
      orderId,
      riderId: rider.id,
      currentLocation: { lat: rider.latitude, lng: rider.longitude },
      riderLocation: { lat: rider.latitude, lng: rider.longitude },
      updatedAt: ts,
    },
    { merge: true }
  );
  batch.set(
    db.collection('rider_locations').doc(orderId),
    {
      lat: rider.latitude,
      lng: rider.longitude,
      latitude: rider.latitude,
      longitude: rider.longitude,
      riderId: rider.id,
      status: 'assigned',
      updatedAt: Date.now(),
      timestamp: Date.now(),
    },
    { merge: true }
  );
  await batch.commit();
}

// Authoritative assignment-time economics. Pure function (no Firestore) so the
// exact math written into bookings/orders at dispatch is directly testable.
// Customer fare never changes here — only the rider payout / Go7 split and the
// contribution estimate are recomputed for the concrete assigned rider.
function computeAssignmentEconomics(orderPayload, rider, config) {
  const pricingCore = require('./pricingCore');
  const { normalizeVehicleOwnership } = require('./vehicleType');
  if (!orderPayload || !Number(orderPayload.deliveryFee)) return null;
  const vehicleOwnership = normalizeVehicleOwnership(rider.vehicleOwnership) || 'RIDER_OWNED';
  const share = pricingCore.getRiderShare({
    orderType: orderPayload.orderType || BOOK_DELIVERY_ORDER_TYPE,
    distanceKm: Number(orderPayload.distanceKm) || 0,
    vehicleType: rider.vehicleType,
    vehicleOwnership,
    corridorId: orderPayload.corridorId || null,
    config,
  });
  const fee = roundNaira(orderPayload.deliveryFee);
  const riderPayout = roundNaira(fee * share.riderShareRate);
  const go7DeliveryShare = fee - riderPayout;
  const go7Contribution = pricingCore.calculateGo7DeliveryContribution({
    deliveryFee: fee,
    riderPayout,
    serviceFee: roundNaira(orderPayload.platformFee || 0),
    distanceKm: Number(orderPayload.distanceKm) || 0,
    vehicleType: rider.vehicleType,
    vehicleOwnership,
    orderType: orderPayload.orderType || BOOK_DELIVERY_ORDER_TYPE,
    grandTotal: Number(orderPayload.grandTotal) || undefined,
    config,
  });
  return {
    go7Contribution,
    contributionStatus: go7Contribution.contributionStatus,
    riderShareRate: share.riderShareRate,
    platformShareRate: share.platformShareRate,
    riderShareRule: share.rule,
    riderPayout,
    go7DeliveryShare,
    platformDeliveryShare: go7DeliveryShare,
    riderDeliveryShareRate: share.riderShareRate,
    go7DeliveryShareRate: share.platformShareRate,
    riderPercentage: share.riderShareRate * 100,
    riderVehicleOwnership: vehicleOwnership,
    // Nested map — set(merge:true) deep-merges into the existing feeBreakdown.
    feeBreakdown: {
      rider: riderPayout,
      platform: go7DeliveryShare,
      riderShareRate: share.riderShareRate,
      riderShareRule: share.rule,
      riderPayout,
      go7DeliveryShare,
      riderDeliveryShareRate: share.riderShareRate,
      vehicleOwnership,
    },
  };
}

async function assignRiderToBooking(bookingId, rider, options = {}) {
  const { isFallback = false, releasePreviousRiderId = null, orderPayload = null, db = firestore } = options;
  const batch = db.batch();
  const bookingRef = db.collection('bookings').doc(bookingId);
  const orderRef = db.collection('orders').doc(bookingId);
  const ts = FieldValue.serverTimestamp();

  // Final rider-share economics depend on WHO owns the dispatched vehicle —
  // recompute the payout now that a concrete rider (with vehicleOwnership)
  // is assigned. The quote-time riderPayout was a rider-owned estimate.
  let ownershipShare = null;
  try {
    if (orderPayload && orderPayload.deliveryFee) {
      const { loadCanonicalDeliveryPricing } = require('./pricingConfig');
      const { config } = await loadCanonicalDeliveryPricing(firestore);
      ownershipShare = computeAssignmentEconomics(orderPayload, rider, config);
    }
  } catch (shareErr) {
    console.warn('[dispatch] ownership-aware share recompute failed (keeping quote estimate):', shareErr.message);
  }

  const patch = {
    riderId: rider.id,
    riderName: rider.name,
    riderPhone: rider.phone,
    riderVehicle: rider.vehicleType,
    riderDistance: rider.distance,
    ...(ownershipShare || {}),
    assignedRider: {
      id: rider.id,
      name: rider.name,
      phone: rider.phone,
      vehicleType: rider.vehicleType,
      vehicleOwnership: rider.vehicleOwnership || (ownershipShare && ownershipShare.riderVehicleOwnership) || undefined,
    },
    status: 'assigned',
    dispatchStatus: isFallback ? 'fallback' : 'assigned',
    orderStatus: 'assigned',
    isFallback: isFallback ? true : FieldValue.delete(),
    assignedAt: ts,
    assignmentTime: ts,
    updatedAt: ts,
  };
  batch.set(bookingRef, patch, { merge: true });
  batch.set(orderRef, patch, { merge: true });
  // The rider app's job list reads deliveries/{bookingId} — the quote-time
  // riderPayout there was a rider-owned ESTIMATE. Overwrite it with the
  // authoritative payout for THIS rider's ownership so the app never shows
  // a stale rate (e.g. 60% on a Go7-owned bike that actually pays 40%).
  batch.set(
    db.collection('deliveries').doc(bookingId),
    {
      riderId: rider.id,
      riderName: rider.name,
      riderVehicle: rider.vehicleType,
      status: 'assigned',
      ...(ownershipShare
        ? {
            riderPayout: ownershipShare.riderPayout,
            platformFee: ownershipShare.go7DeliveryShare,
            riderPercentage: ownershipShare.riderPercentage,
            riderShareRate: ownershipShare.riderShareRate,
            riderVehicleOwnership: ownershipShare.riderVehicleOwnership,
          }
        : {}),
      updatedAt: ts,
    },
    { merge: true }
  );
  batch.set(
    db.collection('riders').doc(rider.id),
    {
      currentJobId: bookingId,
      currentOrder: bookingId,
      currentOrderId: bookingId,
      status: 'busy',
      updatedAt: ts,
    },
    { merge: true }
  );
  if (releasePreviousRiderId && releasePreviousRiderId !== rider.id) {
    batch.set(
      db.collection('riders').doc(releasePreviousRiderId),
      {
        currentJobId: FieldValue.delete(),
        currentOrder: FieldValue.delete(),
        currentOrderId: FieldValue.delete(),
        status: 'available',
        available: true,
        updatedAt: ts,
      },
      { merge: true }
    );
  }
  await batch.commit();

  try {
    await seedTrackingDocs(bookingId, rider, db);
  } catch (seedErr) {
    console.warn('[dispatch] tracking seed failed (non-critical):', seedErr.message);
  }

  return { assigned: true, rider, isFallback };
}

async function tryFallbackRiderAssignment(bookingId, orderPayload, vehiclePref = 'bike') {
  const settings = await loadDispatchSettings(firestore);
  const fallbackId = settings.fallbackRiderId;
  if (!fallbackId) return { assigned: false, reason: 'no-fallback-configured' };

  const fallbackSnap = await firestore.collection('riders').doc(fallbackId).get();
  if (!fallbackSnap.exists) {
    console.warn(`[fallback] configured rider ${fallbackId} not found`);
    return { assigned: false, reason: 'fallback-rider-missing' };
  }
  const r = fallbackSnap.data();
  const lat = r.latitude ?? r.lat ?? r.currentLocation?.lat;
  const lng = r.longitude ?? r.lng ?? r.currentLocation?.lng;
  if (lat == null || lng == null) {
    return { assigned: false, reason: 'fallback-rider-no-location' };
  }
  const pickupCoords = orderPayload.pickupCoords || orderPayload.pickup?.coordinates || null;
  const distance = pickupCoords ? haversineKmLocal(pickupCoords, { lat: Number(lat), lng: Number(lng) }) : 0;
  const rider = {
    id: fallbackId,
    name: r.name || r.fullName || 'Go7 Rider',
    phone: r.phone || r.phoneNumber || null,
    vehicleType: r.vehicleType || 'bike',
    vehicleOwnership: r.vehicleOwnership || r.vehicleOwner || null,
    distance,
    distanceFormatted: `${distance.toFixed(2)} km`,
    latitude: Number(lat),
    longitude: Number(lng),
  };
  await assignRiderToBooking(bookingId, rider, { isFallback: true, orderPayload });
  console.log(`[fallback] assigned ${fallbackId} to ${bookingId}; will auto-transfer when real rider is available`);
  return { assigned: true, rider, isFallback: true, reason: 'fallback-assigned' };
}

async function tryUpgradeFallbackRider(bookingId, orderPayload, vehiclePref = 'bike') {
  const pickupCoords = orderPayload.pickupCoords || orderPayload.pickup?.coordinates || null;
  if (!pickupCoords) return { assigned: false, reason: 'no-pickup-coords' };
  const allRiders = await findAvailableRiders(pickupCoords);
  const allowed = getAllowedVehicleTypes(orderPayload, vehiclePref);
  const preferredType = orderPayload.preferredVehicleType || null;
  const eligible = allRiders.filter((r) => riderMatchesVehicle(r.vehicleType, allowed));
  const preferredRiders = preferredType
    ? eligible.filter((r) => normalizeDispatchVehicleType(r.vehicleType) === preferredType)
    : [];
  const realRider = (preferredRiders.length ? preferredRiders : eligible)[0] || null;
  if (!realRider) return { assigned: false, reason: 'no-real-rider-yet' };

  const existingBooking = await firestore.collection('bookings').doc(bookingId).get();
  const previousRiderId = existingBooking.exists ? existingBooking.data()?.riderId : null;

  await assignRiderToBooking(bookingId, realRider, { isFallback: false, releasePreviousRiderId: previousRiderId, orderPayload });
  console.log(`[fallback-upgrade] transferred ${bookingId} from ${previousRiderId || '-'} to ${realRider.id}`);
  return { assigned: true, rider: realRider, isFallback: false, reason: 'real-rider-assigned' };
}

async function dispatchBookDeliveryOrder(bookingId, orderPayload, vehiclePref = 'bike') {
  const pickupCoords = orderPayload.pickupCoords || orderPayload.pickup?.coordinates || null;
  const results = { assigned: false, rider: null, reason: null };

  if (!pickupCoords) {
    results.reason = 'no-pickup-coords';
    return results;
  }

  const allRiders = await findAvailableRiders(pickupCoords);
  const allowed = getAllowedVehicleTypes(orderPayload, vehiclePref);
  const preferredType = orderPayload.preferredVehicleType || null;
  const eligible = allRiders.filter((r) => riderMatchesVehicle(r.vehicleType, allowed));
  const preferredRiders = preferredType
    ? eligible.filter((r) => normalizeDispatchVehicleType(r.vehicleType) === preferredType)
    : [];
  const rider = (preferredRiders.length ? preferredRiders : eligible)[0] || null;
  if (rider) {
    return await assignRiderToBooking(bookingId, rider, { isFallback: false, orderPayload });
  }

  const fallback = await tryFallbackRiderAssignment(bookingId, orderPayload, vehiclePref);
  if (fallback.assigned) {
    return fallback;
  }

  const attempts = (Number(orderPayload.riderSearchAttempts) || 0) + 1;
  const ts = FieldValue.serverTimestamp();
  const bookingRef = firestore.collection('bookings').doc(bookingId);
  const orderRef = firestore.collection('orders').doc(bookingId);
  const patch = {
    status: 'searching_rider',
    dispatchStatus: 'searching',
    riderSearchAttempts: attempts,
    lastRiderSearchTime: ts,
    noRiderReason: 'No available riders within range',
    updatedAt: ts,
  };
  const batch = firestore.batch();
  batch.set(bookingRef, patch, { merge: true });
  batch.set(orderRef, patch, { merge: true });
  await batch.commit();
  results.reason = 'no-rider-in-range';
  return results;
}

// ---------------------------------------------------------------------------
// confirmBookDeliveryPayment
// ---------------------------------------------------------------------------
exports.confirmBookDeliveryPayment = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in is required');
    }
    return await confirmForUser(context.auth.uid, data || {});
  } catch (err) {
    console.error('[confirmBookDeliveryPayment] failed:', err);
    throw toHttpsError(err);
  }
});

async function confirmForUser(uid, data) {
    const bookingId = str(data?.bookingId);
    const method = str(data?.method || 'paystack').toLowerCase();
    const reference = str(data?.reference);

    if (!bookingId || !/^Go7-[A-Z0-9]{7}$/.test(bookingId)) {
      throw new functions.https.HttpsError('invalid-argument', 'A valid booking ID is required');
    }
    if (!ALLOWED_PAYMENT_METHODS.has(method)) {
      throw new functions.https.HttpsError('invalid-argument', `Unsupported payment method: ${method}`);
    }

    // Idempotent fast-path: booking already confirmed.
    const bookingRef = firestore.collection('bookings').doc(bookingId);
    const existingBooking = await bookingRef.get();
    if (existingBooking.exists) {
      const b = existingBooking.data();
      const alreadyPaid = b.paymentStatus === 'paid' || b.paymentStatus === 'pay_on_delivery';
      if (!alreadyPaid) {
        // Doc exists but not marked paid — treat as unpaid, do not dispatch.
        return { success: false, bookingId, paymentStatus: b.paymentStatus || 'unpaid' };
      }
      if (b.dispatchStatus === 'awaiting_payment') {
        const dispatch = await dispatchBookDeliveryOrder(bookingId, b, 'bike');
        return { success: true, bookingId, paymentStatus: b.paymentStatus, dispatch };
      }
      return {
        success: true,
        bookingId,
        paymentStatus: b.paymentStatus,
        dispatch: { assigned: Boolean(b.riderId), riderName: b.riderName || null },
        idempotent: true,
      };
    }

    const pendingRef = firestore.collection(PENDING_COLLECTION).doc(bookingId);
    const pendingSnap = await pendingRef.get();
    if (!pendingSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Booking not found. Start the booking again.');
    }
    const pending = pendingSnap.data();

    if (pending.userId !== uid && pending.customer?.uid !== uid && pending.customerId !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'You can only confirm your own booking');
    }
    if (pending.paymentMethod && pending.paymentMethod !== method) {
      console.warn(`[confirm] method mismatch for ${bookingId}: stored ${pending.paymentMethod}, got ${method}`);
    }

    // ---- Server-side verification per method ----
    let paymentStatus = 'paid';
    let paymentReference = null;

    if (method === 'paystack') {
      if (!reference) {
        throw new functions.https.HttpsError('invalid-argument', 'Payment reference is required');
      }
      const verified = await verifyPaystackReference(reference);
      if (verified.status !== 'success') {
        throw new functions.https.HttpsError('failed-precondition', 'Payment was not successful');
      }
      if (verified.currency && verified.currency !== 'NGN') {
        throw new functions.https.HttpsError('failed-precondition', 'Payment currency mismatch');
      }
      // Replay guard: the client stamps metadata.bookingId at PaystackPop
      // setup — a reference bound to a different booking cannot confirm this one.
      const metaBookingId = str(verified.metadata?.bookingId);
      if (metaBookingId && metaBookingId !== bookingId) {
        throw new functions.https.HttpsError('failed-precondition', 'Payment reference belongs to a different booking');
      }
      const requiredKobo = Number(pending.totalKobo) || Math.round((Number(pending.grandTotal) || 0) * 100);
      // Exact equality: the quote is a fixed authoritative amount — the client
      // always opens Paystack at exactly totalKobo, so anything else means a
      // manipulated/reused reference. No legitimate overpayment path exists.
      if (Number(verified.amount) !== requiredKobo) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Paid amount (₦${Number(verified.amount) / 100}) does not match the order total (₦${requiredKobo / 100})`
        );
      }
      paymentReference = verified.reference || reference;
    } else if (method === 'wallet') {
      const paid = await walletDebitExists(uid, bookingId, Number(pending.grandTotal) || 0);
      if (!paid) {
        throw new functions.https.HttpsError('failed-precondition', 'Wallet payment not found for this booking');
      }
      paymentReference = `wallet:delivery_${bookingId}`;
    } else if (method === 'pod') {
      const isVendor = await isVendorUser(uid);
      if (!isVendor) {
        throw new functions.https.HttpsError('permission-denied', 'Pay on Delivery is only available for verified vendors');
      }
      paymentStatus = 'pay_on_delivery';
    }

    // ---- Create the authoritative bookings + orders docs (fires the existing
    // notifyOnBooking trigger: email/SMS + deliveries record + admin alert). ----
    const now = FieldValue.serverTimestamp();
    const orderDoc = {
      ...pending,
      paymentStatus,
      paymentReference,
      paidAt: now,
      status: 'searching_rider',
      dispatchStatus: 'searching',
      orderStatus: 'searching_rider',
      updatedAt: now,
    };
    delete orderDoc.confirmAttempts;

    const batch = firestore.batch();
    batch.set(bookingRef, orderDoc);
    batch.set(firestore.collection('orders').doc(bookingId), orderDoc);
    batch.set(pendingRef, { confirmed: true, confirmedAt: now }, { merge: true });
    await batch.commit();

    console.log(`✅ [confirmBookDeliveryPayment] ${bookingId} verified (${method}) → paid → dispatching`);

    // ---- Server-side dispatch ----
    let dispatch = { assigned: false, reason: 'dispatch-error' };
    try {
      dispatch = await dispatchBookDeliveryOrder(bookingId, orderDoc, 'bike');
    } catch (dispatchErr) {
      console.error('[confirm] dispatch failed:', dispatchErr);
    }

    return {
      success: true,
      bookingId,
      orderId: bookingId,
      paymentStatus,
      paymentReference,
      dispatch,
    };
}

// Exposed for tests + the AI tool registry (server-side only — these are the
// same code paths the deployed callables run).
module.exports.createForUser = createForUser;
module.exports.confirmForUser = confirmForUser;
module.exports.dispatchBookDeliveryOrder = dispatchBookDeliveryOrder;
module.exports.assignRiderToBooking = assignRiderToBooking;
module.exports.tryFallbackRiderAssignment = tryFallbackRiderAssignment;
module.exports.tryUpgradeFallbackRider = tryUpgradeFallbackRider;
module.exports.buildServerOrderPricing = buildServerOrderPricing;
module.exports.computeAssignmentEconomics = computeAssignmentEconomics;
module.exports.riderMatchesVehicle = riderMatchesVehicle;
module.exports.getAllowedVehicleTypes = getAllowedVehicleTypes;
module.exports.findAvailableRiders = findAvailableRiders;
module.exports.PENDING_COLLECTION = PENDING_COLLECTION;
