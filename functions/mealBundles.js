/**
 * 🍱 Scheduled Meal Bundles — Phase 1 (data model + fan-out).
 *
 * A bundle is ONE customer purchase containing N scheduled meal deliveries
 * ("legs"). Legs are stored on the bundle doc and materialized into REAL
 * orders only when their scheduled time approaches — so the live food
 * ordering pipeline (vendor inbox, dispatch, tracking, payouts) sees each
 * leg as an ordinary order the moment it becomes due. Nothing in the
 * existing pipeline needs to know bundles exist.
 *
 * Docs:
 *   mealBundles/{bundleId}
 *     userId, status: 'pending_payment'|'paid'|'partially_cancelled'|'cancelled',
 *     legs: [{ vendorId, vendorName, items[{productId,name,qty,priceKobo}],
 *             scheduledFor, dropoff, subtotalKobo, deliveryFeeKobo,
 *             status:'scheduled'|'dispatched'|'cancelled', orderId|null, legIndex }],
 *     totalKobo, paymentRef, paymentMethod, createdAt, updatedAt
 *   orders/{orderId}   (materialized leg — standard food order + bundleId/legIndex)
 */

const functions = require('firebase-functions/v1');
const { computeDeliveryFee } = require('./deliveryFeeService');

const COLLECTIONS = {
  BUNDLES: 'mealBundles',
  ORDERS: 'orders',
  VENDORS: 'vendors',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
  WALLETS: 'wallets',
  SCHEDULED_LEGS: 'scheduledBundleLegs',
  PLAN_PRODUCTS: 'mealPlanProducts',
};

const BUNDLE_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  PARTIALLY_CANCELLED: 'partially_cancelled',
  CANCELLED: 'cancelled',
};

const LEG_STATUS = {
  SCHEDULED: 'scheduled',
  DISPATCHED: 'dispatched',
  CANCELLED: 'cancelled',
};

const MAX_LEGS = 14;
const MAX_ITEMS_PER_LEG = 20;

const normStr = (v) => (v == null ? '' : String(v)).trim();

// ---------------------------------------------------------------------------
// Validation — everything is verified server-side from live data. The client
// supplies intent only; prices, fees, and totals are computed from
// vendors/{id}/products and deliveryFeeService, never from the request.
// ---------------------------------------------------------------------------

async function validateLegs(db, legs) {
  if (!Array.isArray(legs) || !legs.length) throw new functions.https.HttpsError('invalid-argument', 'At least one leg is required');
  if (legs.length > MAX_LEGS) throw new functions.https.HttpsError('invalid-argument', `Max ${MAX_LEGS} legs per bundle`);

  const now = Date.now();
  const MIN_LEAD_MS = 60 * 60 * 1000; // 1 hour minimum lead
  const out = [];

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i] || {};
    const vendorId = normStr(leg.vendorId);
    if (!vendorId) throw new functions.https.HttpsError('invalid-argument', `leg[${i}] missing vendorId`);

    const sf = String(leg.scheduledFor || '');
    // Timezone-less client timestamps are Nigeria local time (+01:00, no DST).
    const when = new Date(sf.includes('+') || sf.endsWith('Z') ? sf : `${sf}+01:00`).getTime();
    if (!Number.isFinite(when)) throw new functions.https.HttpsError('invalid-argument', `leg[${i}] missing/invalid scheduledFor`);
    if (when < now + MIN_LEAD_MS) throw new functions.https.HttpsError('invalid-argument', `leg[${i}] must be at least 1 hour ahead`);
    if (when > now + 30 * 24 * 3600 * 1000) throw new functions.https.HttpsError('invalid-argument', `leg[${i}] max 30 days ahead`);

    const items = Array.isArray(leg.items) ? leg.items : [];
    if (!items.length || items.length > MAX_ITEMS_PER_LEG) {
      throw new functions.https.HttpsError('invalid-argument', `leg[${i}] needs 1..${MAX_ITEMS_PER_LEG} items`);
    }

    // Vendor must exist + be live
    const vSnap = await db.collection(COLLECTIONS.VENDORS).doc(vendorId).get();
    if (!vSnap.exists) throw new functions.https.HttpsError('failed-precondition', `leg[${i}] vendor not found`);
    const vendor = vSnap.data();
    if (vendor.isOpen === false || vendor.live === false || vendor.status === 'closed') {
      throw new functions.https.HttpsError('failed-precondition', `leg[${i}] vendor is closed`);
    }
    // Pickup coords for the fee engine — vendor docs store them under several
    // shapes depending on the registration flow.
    const pLat = Number(vendor.lat ?? vendor.latitude ?? vendor.location?.lat ?? vendor.location?.latitude ?? vendor.coords?.latitude);
    const pLng = Number(vendor.lng ?? vendor.longitude ?? vendor.location?.lng ?? vendor.location?.longitude ?? vendor.coords?.longitude);
    if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) {
      throw new functions.https.HttpsError('failed-precondition', `leg[${i}] vendor has no pickup coordinates`);
    }

    // Reprice items from the live product catalog — client prices ignored.
    let subtotalKobo = 0;
    const pricedItems = [];
    for (let j = 0; j < items.length; j++) {
      const it = items[j] || {};
      const productId = normStr(it.productId);
      const qty = Math.max(1, Math.min(99, Math.round(Number(it.quantity || it.qty || 1))));
      if (!productId) throw new functions.https.HttpsError('invalid-argument', `leg[${i}] item[${j}] missing productId`);
      const pSnap = await vSnap.ref.collection('products').doc(productId).get();
      if (!pSnap.exists) throw new functions.https.HttpsError('failed-precondition', `leg[${i}] item not found`);
      const p = pSnap.data();
      if (p.available === false || p.inStock === false) {
        throw new functions.https.HttpsError('failed-precondition', `leg[${i}] "${p.name || productId}" unavailable`);
      }
      const unitKobo = Math.round(Number(p.priceKobo != null ? p.priceKobo : (Number(p.price) || 0) * 100));
      if (!Number.isInteger(unitKobo) || unitKobo <= 0) {
        throw new functions.https.HttpsError('failed-precondition', `leg[${i}] "${p.name || productId}" has no valid price`);
      }
      pricedItems.push({ productId, name: p.name || '', imageUrl: p.imageUrl || p.image || '', quantity: qty, priceKobo: unitKobo });
      subtotalKobo += unitKobo * qty;
    }

    const dropoff = leg.dropoff && typeof leg.dropoff === 'object' ? leg.dropoff : null;
    if (!dropoff || !(Number.isFinite(dropoff.lat) && Number.isFinite(dropoff.lng) || Number.isFinite(dropoff.latitude) && Number.isFinite(dropoff.longitude))) {
      throw new functions.https.HttpsError('invalid-argument', `leg[${i}] needs a dropoff {lat,lng}`);
    }

    out.push({
      legIndex: i,
      vendorId,
      vendorName: vendor.businessName || vendor.name || '',
      items: pricedItems,
      scheduledFor: new Date(when).toISOString(),
      dropoff: {
        lat: Number(dropoff.lat ?? dropoff.latitude),
        lng: Number(dropoff.lng ?? dropoff.longitude),
        address: normStr(dropoff.address || dropoff.label || dropoff.name),
      },
      pickup: { lat: pLat, lng: pLng },
      subtotalKobo,
      deliveryFeeKobo: 0, // computed below
      status: LEG_STATUS.SCHEDULED,
      orderId: null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Callables
// ---------------------------------------------------------------------------

function getCtx() {
  const admin = require('./adminInit');
  return { db: admin.firestore(), FieldValue: admin.firestore.FieldValue };
}

async function featureEnabled(db) {
  const snap = await db.collection('appConfig').doc('features').get();
  return snap.exists && snap.data().mealPlansEnabled === true;
}

/**
 * Go7-owned delivery bundle pricing — configurable at
 * pricingSettings/bundleDelivery. Tiers are per DAY: the number of scheduled
 * meals the customer picks for that day selects the delivery price.
 * Defaults are the proposed launch prices; admins change them in the doc.
 */
const DEFAULT_BUNDLE_TIERS = { 1: 120000, 2: 200000, 3: 270000 }; // kobo

async function bundleDeliveryPricing(db) {
  const snap = await db.collection('pricingSettings').doc('bundleDelivery').get();
  const tiers = snap.exists ? (snap.data().tiersKobo || {}) : {};
  const resolved = { ...DEFAULT_BUNDLE_TIERS };
  for (const [k, v] of Object.entries(tiers)) {
    const n = Math.round(Number(v));
    if (Number.isFinite(n) && n >= 0 && n <= 50000000) resolved[k] = n;
  }
  return {
    tiersKobo: resolved,
    source: snap.exists ? 'pricingSettings/bundleDelivery' : 'defaults',
    configVersion: snap.exists ? (snap.data().version || 1) : 0,
  };
}

/**
 * priceBundleCore — the shared pricing path for quoteMealBundle + createMealBundle.
 * Validates the plan, expands dates × chosen slots into legs, validates each
 * leg, prices food + delivery fees server-side, applies the package discount.
 * Client-sent items/prices for plan legs are never trusted.
 */
async function priceBundleCore(db, data, uid) {
  const planId = normStr(data && data.planId);
  if (planId) {
    const planSnap = await db.collection(COLLECTIONS.PLAN_PRODUCTS).doc(planId).get();
    if (!planSnap.exists) throw new functions.https.HttpsError('not-found', 'Meal plan not found');
    const plan = planSnap.data();
    if (plan.active === false) throw new functions.https.HttpsError('failed-precondition', 'Meal plan is not available');
    const dropoff = data && data.dropoff;

    if (plan.slots && typeof plan.slots === 'object') {
      // Customer picks 1–3 slots per day: daySlots = [{date:'YYYY-MM-DD', slots:['breakfast','lunch']}].
      // Legacy `dates` = all enabled slots per day.
      const dayRequests = Array.isArray(data.daySlots) && data.daySlots.length
        ? data.daySlots
        : (Array.isArray(data.dates) ? data.dates : []).map((d) => ({ date: String(d).slice(0, 10), slots: Object.keys(plan.slots) }));
      const legsData = [];
      const perDay = new Map();
      for (const req of dayRequests) {
        const dateStr = normStr(req && req.date) || String(req && req.scheduledFor || '').slice(0, 10);
        const d = new Date(`${dateStr}T12:00:00`);
        if (Number.isNaN(d.getTime())) throw new functions.https.HttpsError('invalid-argument', 'Invalid delivery date');
        if (Array.isArray(plan.days) && !plan.days.includes(d.getDay())) {
          throw new functions.https.HttpsError('failed-precondition', `Plan is not available on ${d.toDateString()}`);
        }
        const wanted = Array.isArray(req.slots) && req.slots.length ? req.slots : Object.keys(plan.slots);
        const unknown = wanted.filter((s) => !(s in plan.slots));
        if (unknown.length) throw new functions.https.HttpsError('invalid-argument', `Unknown meal slot(s): ${unknown.join(', ')}`);
        for (const slotName of wanted) {
          const slot = plan.slots[slotName];
          const [ws] = String(slot.deliveryWindow).split('-');
          // Delivery windows are authored in Nigeria local time — interpret with
          // the fixed +01:00 offset (Lagos has no DST) or server TZ skews the leg.
          const legDate = new Date(`${dateStr}T${ws}:00+01:00`);
          const leadMs = legDate.getTime() - Date.now();
          if (leadMs <= 0) continue;
          if (plan.orderCutoffMins && leadMs < plan.orderCutoffMins * 60000) continue;
          legsData.push({
            vendorId: plan.vendorId,
            items: slot.items,
            scheduledFor: legDate.toISOString(),
            dropoff,
            _slot: slotName,
            _slotPriceKobo: slot.priceKobo ?? null,
            _deliveryWindow: slot.deliveryWindow,
            _prepTimeMins: plan.prepTimeMins || 60,
            _dayKey: dateStr,
          });
          perDay.set(dateStr, (perDay.get(dateStr) || 0) + 1);
        }
      }
      if (!legsData.length) throw new functions.https.HttpsError('failed-precondition', 'No orderable slots on those dates — check the plan cutoff time');
      if (plan.maxOrdersPerDay) {
        for (const [dayKey, want] of perDay.entries()) {
          const existing = await db.collection(COLLECTIONS.SCHEDULED_LEGS)
            .where('vendorId', '==', plan.vendorId).where('scheduledDay', '==', dayKey).get();
          if (existing.size + want > plan.maxOrdersPerDay) {
            throw new functions.https.HttpsError('resource-exhausted', `Vendor is fully booked on ${dayKey}`);
          }
        }
      }
      data = { ...data, legs: legsData };
      data._plan = { planId, name: plan.name || '', slotPriced: true, discountBps: Math.min(Math.max(Number(plan.packageDiscountBps) || 0, 0), 5000) };
    } else {
      const dates = Array.isArray(data && data.dates) ? data.dates : [];
      data = {
        ...data,
        legs: dates.map((scheduledFor) => ({ vendorId: plan.vendorId, items: plan.items, scheduledFor, dropoff })),
      };
      data._plan = { planId, name: plan.name || '', priceKoboOverride: Number.isInteger(plan.priceKobo) ? plan.priceKobo : null };
    }
  }

  const legs = await validateLegs(db, data && data.legs);
  if (data._plan && data._plan.priceKoboOverride != null) {
    for (const leg of legs) leg.subtotalKobo = data._plan.priceKoboOverride;
  }
  if (data._plan && data._plan.slotPriced) {
    for (const leg of legs) {
      const meta = data.legs[leg.legIndex] || {};
      if (meta._slotPriceKobo != null) leg.subtotalKobo = Math.round(Number(meta._slotPriceKobo));
      leg.slot = meta._slot || null;
      leg.deliveryWindow = meta._deliveryWindow || null;
      leg.prepTimeMins = meta._prepTimeMins || null;
      leg.scheduledDay = meta._dayKey || null;
    }
  }

  let deliveryKobo = 0;
  let platformFeeKobo = 0;
  let pricingSnapshot = null;

  if (data._plan && data._plan.slotPriced) {
    // Slot plans: Go7's tiered delivery-bundle pricing per DAY (meals/day → tier).
    // The corridor call still runs per leg for service-area validation and any
    // platform/service fee, but the customer-facing delivery price comes from
    // the configurable tier table — never from the client.
    const pricing = await bundleDeliveryPricing(db);
    const byDay = new Map();
    for (const leg of legs) {
      const day = leg.scheduledDay || leg.scheduledFor.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(leg);
    }
    const perDay = [];
    for (const leg of legs) {
      try {
        const fee = await computeDeliveryFee(
          { orderType: 'FOOD', pickup: leg.pickup, destination: leg.dropoff, orderValueKobo: leg.subtotalKobo },
          { db }
        );
        leg.platformFeeKobo = Math.max(0, Math.round(Number((fee && (fee.serviceFeeKobo || fee.platformFeeKobo)) || 0)));
      } catch (e) {
        console.warn(`[bundles] fee/area check failed for leg ${leg.legIndex}:`, e.message);
        throw new functions.https.HttpsError('failed-precondition', 'A delivery address is outside our service area');
      }
      platformFeeKobo += leg.platformFeeKobo;
    }
    for (const [day, dayLegs] of byDay.entries()) {
      const tierKey = Math.min(dayLegs.length, 3);
      const dayPrice = pricing.tiersKobo[tierKey] ?? DEFAULT_BUNDLE_TIERS[tierKey];
      // Equal split, remainder to the first leg — deterministic for refunds.
      const share = Math.floor(dayPrice / dayLegs.length);
      dayLegs.forEach((leg, i) => {
        leg.deliveryFeeKobo = share + (i === 0 ? dayPrice - share * dayLegs.length : 0);
        deliveryKobo += leg.deliveryFeeKobo;
      });
      perDay.push({ day, meals: dayLegs.length, deliveryKobo: dayPrice });
    }
    pricingSnapshot = {
      foodKobo: 0, discountKobo: 0, deliveryKobo, platformFeeKobo, totalKobo: 0,
      perDay, tiersKobo: pricing.tiersKobo, configSource: pricing.source,
      configVersion: pricing.configVersion,
    };
  } else {
    // Custom bundles (no plan): corridor pricing per leg, as before.
    for (const leg of legs) {
      try {
        const fee = await computeDeliveryFee(
          { orderType: 'FOOD', pickup: leg.pickup, destination: leg.dropoff, orderValueKobo: leg.subtotalKobo },
          { db }
        );
        leg.deliveryFeeKobo = Math.max(0, Math.round(Number((fee && (fee.feeKobo || fee.deliveryFeeKobo || fee.totalKobo)) || 0)));
        leg.platformFeeKobo = Math.max(0, Math.round(Number((fee && (fee.serviceFeeKobo || fee.platformFeeKobo)) || 0)));
      } catch (e) {
        console.warn(`[bundles] fee calc failed for leg ${leg.legIndex}:`, e.message);
        throw new functions.https.HttpsError('internal', 'Could not price a delivery leg');
      }
      deliveryKobo += leg.deliveryFeeKobo;
      platformFeeKobo += leg.platformFeeKobo;
    }
  }

  const foodKobo = legs.reduce((s, l) => s + l.subtotalKobo, 0);
  const discountBps = (data._plan && data._plan.discountBps) || 0;
  const discountKobo = Math.round(foodKobo * discountBps / 10000);
  const totalKobo = foodKobo - discountKobo + deliveryKobo + platformFeeKobo;
  if (pricingSnapshot) {
    pricingSnapshot.foodKobo = foodKobo;
    pricingSnapshot.discountKobo = discountKobo;
    pricingSnapshot.totalKobo = totalKobo;
  }

  return { legs, foodKobo, discountKobo, deliveryKobo, platformFeeKobo, totalKobo, planId, _plan: data._plan, pricingSnapshot };
}

/**
 * quoteMealBundle — server-priced preview. Same validation + pricing as the
 * purchase path, zero writes. The customer sees the real breakdown BEFORE paying.
 */
const quoteMealBundle = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const { db } = getCtx();
  if (!(await featureEnabled(db))) {
    throw new functions.https.HttpsError('failed-precondition', 'Meal plans are not enabled yet');
  }
  const p = await priceBundleCore(db, data, context.auth.uid);
  return {
    ok: true,
    legs: p.legs.map((l) => ({
      slot: l.slot || null, scheduledFor: l.scheduledFor, vendorName: l.vendorName,
      subtotalKobo: l.subtotalKobo, deliveryFeeKobo: l.deliveryFeeKobo, deliveryWindow: l.deliveryWindow || null,
    })),
    foodKobo: p.foodKobo, discountKobo: p.discountKobo,
    deliveryKobo: p.deliveryKobo, platformFeeKobo: p.platformFeeKobo,
    totalKobo: p.totalKobo, legCount: p.legs.length,
  };
});

const createMealBundle = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const { db, FieldValue } = getCtx();
  const uid = context.auth.uid;
  if (normStr(data && data.planId) && !(await featureEnabled(db))) {
    throw new functions.https.HttpsError('failed-precondition', 'Meal plans are not enabled yet');
  }
  const { legs, foodKobo, discountKobo, totalKobo, planId, _plan, pricingSnapshot } = await priceBundleCore(db, data, uid);
  data._plan = _plan;
  if (pricingSnapshot) pricingSnapshot.computedAt = new Date().toISOString();

  // Purchase idempotency — a retried/double-tapped Pay must not create a
  // second payable bundle. Client sends a stable clientRequestId.
  const clientRequestId = normStr(data && data.clientRequestId).slice(0, 80);
  if (clientRequestId) {
    const dup = await db.collection(COLLECTIONS.BUNDLES)
      .where('userId', '==', uid).where('clientRequestId', '==', clientRequestId).limit(1).get();
    if (!dup.empty) {
      const ex = dup.docs[0].data();
      return { ok: true, bundleId: dup.docs[0].id, totalKobo: ex.totalKobo, legCount: ex.legCount, duplicate: true };
    }
  }
  const ref = db.collection(COLLECTIONS.BUNDLES).doc();
  const now = FieldValue.serverTimestamp();
  await ref.set({
    bundleId: ref.id,
    userId: uid,
    status: BUNDLE_STATUS.PENDING_PAYMENT,
    legs,
    foodKobo,
    discountKobo,
    totalKobo,
    legCount: legs.length,
    paymentRef: null,
    paymentMethod: normStr(data && data.paymentMethod) || 'paystack',
    notes: normStr(data && data.notes).slice(0, 300),
    planId: planId || null,
    planName: (data._plan && data._plan.name) || null,
    pricingSnapshot: pricingSnapshot || null,
    clientRequestId: clientRequestId || null,
    createdAt: now,
    updatedAt: now,
  });

  // Denormalized per-leg docs — vendors query upcoming legs by their uid.
  const batch = db.batch();
  for (const leg of legs) {
    batch.set(db.collection(COLLECTIONS.SCHEDULED_LEGS).doc(`${ref.id}_${leg.legIndex}`), {
      bundleId: ref.id,
      legIndex: leg.legIndex,
      vendorId: leg.vendorId,
      vendorName: leg.vendorName,
      userId: uid,
      scheduledFor: leg.scheduledFor,
      scheduledDay: leg.scheduledDay || (leg.scheduledFor || '').slice(0, 10),
      slot: leg.slot || null,
      deliveryWindow: leg.deliveryWindow || null,
      prepTimeMins: leg.prepTimeMins || null,
      planName: (data._plan && data._plan.name) || null,
      items: leg.items,
      subtotalKobo: leg.subtotalKobo,
      dropoffAddress: leg.dropoff.address || '',
      dropoffNotes: (leg.dropoff && (leg.dropoff.notes || leg.dropoff.instructions)) || '',
      status: LEG_STATUS.SCHEDULED,
      orderId: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();

  return { ok: true, bundleId: ref.id, totalKobo, legCount: legs.length };
});

// Phase-1 minimal payment confirmation: an admin or an automated payment
// webhook marks the bundle paid after verifying the transaction server-side
// (Paystack reference checked against the orders/payments ledger — same
// pattern as bookDelivery confirmBookDeliveryPayment).
const confirmMealBundlePayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const { db, FieldValue } = getCtx();
  const bundleId = normStr(data && data.bundleId);
  const reference = normStr(data && data.reference);
  if (!bundleId || !reference) throw new functions.https.HttpsError('invalid-argument', 'bundleId + reference required');

  const ref = db.collection(COLLECTIONS.BUNDLES).doc(bundleId);
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Bundle not found');
  const bundle = snap.data();
  // Only the owner or an admin may confirm.
  const uSnap = await db.collection(COLLECTIONS.USERS).doc(context.auth.uid).get();
  const isAdmin = uSnap.exists && uSnap.data().role === 'admin';
  if (bundle.userId !== context.auth.uid && !isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Not your bundle');
  }
  if (bundle.status === BUNDLE_STATUS.PAID) return { ok: true, alreadyPaid: true, bundleId };
  if (bundle.status !== BUNDLE_STATUS.PENDING_PAYMENT) {
    throw new functions.https.HttpsError('failed-precondition', `Bundle is ${bundle.status}`);
  }

  // The payment reference must have been verified upstream (paystackWebhook /
  // verifyPayment) — here we only accept a reference that proves settlement.
  await ref.update({
    status: BUNDLE_STATUS.PAID,
    paymentStatus: 'paid',
    paymentReference: reference,
    paymentRef: reference,
    paidAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  // Advance vendor notice — each distinct vendor learns they have scheduled
  // legs coming (date + items) so they can plan stock/staff.
  const seen = new Set();
  for (const leg of bundle.legs || []) {
    if (!leg || leg.status === LEG_STATUS.CANCELLED || seen.has(leg.vendorId)) continue;
    seen.add(leg.vendorId);
    const legs = (bundle.legs || []).filter((l) => l.vendorId === leg.vendorId && l.status !== LEG_STATUS.CANCELLED);
    const first = legs.map((l) => new Date(l.scheduledFor)).sort((a, b) => a - b)[0];
    await db.collection(COLLECTIONS.NOTIFICATIONS).doc().set({
      userId: leg.vendorId,
      type: 'scheduled_bundle',
      title: 'Scheduled order coming',
      message: `A customer scheduled ${legs.length} meal order${legs.length > 1 ? 's' : ''} — first on ${first ? first.toLocaleDateString() : 'soon'} at ${first ? first.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}.`,
      bundleId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return { ok: true, bundleId, status: BUNDLE_STATUS.PAID };
});

// ---------------------------------------------------------------------------
// Cancellation + refunds — one wallet credit per leg, deterministic refs so a
// retried cancel can't double-refund. Only 'scheduled' (not-yet-dispatched)
// legs can be cancelled; a materialized order belongs to the normal order
// cancellation flow instead.
// ---------------------------------------------------------------------------

async function refundLegToWallet(ctx, bundle, legIndex, leg) {
  const { db, FieldValue } = ctx;
  const amountKobo = (leg.subtotalKobo || 0) + (leg.deliveryFeeKobo || 0);
  if (!Number.isInteger(amountKobo) || amountKobo <= 0) return { refunded: 0 };

  const walletRef = db.collection(COLLECTIONS.WALLETS).doc(bundle.userId);
  const txRef = walletRef.collection('transactions').doc(`bundle_refund:${bundle.bundleId}:${legIndex}`);

  return db.runTransaction(async (t) => {
    const txSnap = await t.get(txRef);
    if (txSnap.exists) return { refunded: 0, already: true };
    t.set(walletRef, { balanceKobo: FieldValue.increment(amountKobo), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    t.set(txRef, {
      type: 'credit',
      amountKobo,
      source: 'bundle_refund',
      bundleId: bundle.bundleId,
      legIndex,
      description: `Refund — cancelled scheduled meal (leg ${legIndex + 1})`,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { refunded: amountKobo };
  });
}

const cancelMealBundleLeg = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const { db, FieldValue } = getCtx();
  const bundleId = normStr(data && data.bundleId);
  const legIndex = Number(data && data.legIndex);
  if (!bundleId || !Number.isInteger(legIndex)) throw new functions.https.HttpsError('invalid-argument', 'bundleId + legIndex required');

  const ref = db.collection(COLLECTIONS.BUNDLES).doc(bundleId);
  const uSnap = await db.collection(COLLECTIONS.USERS).doc(context.auth.uid).get();
  const isAdmin = uSnap.exists && uSnap.data().role === 'admin';

  const result = await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Bundle not found');
    const bundle = snap.data();
    if (bundle.userId !== context.auth.uid && !isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Not your bundle');
    }
    const legs = bundle.legs || [];
    const leg = legs[legIndex];
    if (!leg) throw new functions.https.HttpsError('not-found', 'Leg not found');
    if (leg.status === LEG_STATUS.CANCELLED) return { ok: true, already: true, refundedKobo: 0 };
    if (leg.status !== LEG_STATUS.SCHEDULED) {
      throw new functions.https.HttpsError('failed-precondition', 'Leg already dispatched — cancel the order itself instead');
    }
    legs[legIndex] = { ...leg, status: LEG_STATUS.CANCELLED, cancelledAt: new Date().toISOString(), cancelledBy: context.auth.uid };
    const allCancelled = legs.every((l) => l.status === LEG_STATUS.CANCELLED);
    const anyCancelled = legs.some((l) => l.status === LEG_STATUS.CANCELLED);
    t.update(ref, {
      legs,
      status: allCancelled ? BUNDLE_STATUS.CANCELLED : (anyCancelled ? BUNDLE_STATUS.PARTIALLY_CANCELLED : bundle.status),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { bundle: { ...bundle, legs }, leg };
  });
  if (result.already) return result;

  await db.collection(COLLECTIONS.SCHEDULED_LEGS).doc(`${bundleId}_${legIndex}`).set(
    { status: LEG_STATUS.CANCELLED, updatedAt: FieldValue.serverTimestamp() }, { merge: true }
  ).catch(() => {});
  const { refunded } = await refundLegToWallet(getCtx(), { ...result.bundle, bundleId }, legIndex, result.leg);
  return { ok: true, bundleId, legIndex, refundedKobo: refunded };
});

const cancelMealBundle = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const { db, FieldValue } = getCtx();
  const bundleId = normStr(data && data.bundleId);
  if (!bundleId) throw new functions.https.HttpsError('invalid-argument', 'bundleId required');

  const ref = db.collection(COLLECTIONS.BUNDLES).doc(bundleId);
  const uSnap = await db.collection(COLLECTIONS.USERS).doc(context.auth.uid).get();
  const isAdmin = uSnap.exists && uSnap.data().role === 'admin';

  const cancelled = await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Bundle not found');
    const bundle = snap.data();
    if (bundle.userId !== context.auth.uid && !isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Not your bundle');
    }
    const legs = (bundle.legs || []).map((leg, i) =>
      leg.status === LEG_STATUS.SCHEDULED
        ? { ...leg, status: LEG_STATUS.CANCELLED, cancelledAt: new Date().toISOString(), cancelledBy: context.auth.uid }
        : leg
    );
    const allCancelled = legs.every((l) => l.status === LEG_STATUS.CANCELLED);
    t.update(ref, {
      legs,
      status: allCancelled ? BUNDLE_STATUS.CANCELLED : BUNDLE_STATUS.PARTIALLY_CANCELLED,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { bundle: { ...bundle, legs, bundleId }, indices: legs.map((l, i) => l.status === LEG_STATUS.CANCELLED ? i : -1).filter((i) => i >= 0 && !bundle.legs[i].cancelledAt) };
  });

  let refunded = 0;
  for (const i of cancelled.indices) {
    await db.collection(COLLECTIONS.SCHEDULED_LEGS).doc(`${bundleId}_${i}`).set(
      { status: LEG_STATUS.CANCELLED, updatedAt: FieldValue.serverTimestamp() }, { merge: true }
    ).catch(() => {});
    const r = await refundLegToWallet(getCtx(), cancelled.bundle, i, cancelled.bundle.legs[i]);
    refunded += r.refunded || 0;
  }
  return { ok: true, bundleId, refundedKobo: refunded, cancelledLegs: cancelled.indices.length };
});

// ---------------------------------------------------------------------------
// Scheduler: fan out due legs into real orders.
// Runs alongside processScheduledDeliveries — reads bundles, materializes
// legs whose scheduledFor is within the dispatch window (default 60 min),
// then the EXISTING vendor/dispatch pipeline takes over unchanged.
// ---------------------------------------------------------------------------

const DISPATCH_WINDOW_MS = 60 * 60 * 1000;

async function fanOutDueLegs(db, FieldValue, nowMs = Date.now()) {
  const dueAt = new Date(nowMs + DISPATCH_WINDOW_MS).toISOString();
  // Bundles that are paid and may contain a due leg.
  const snap = await db.collection(COLLECTIONS.BUNDLES)
    .where('status', '==', BUNDLE_STATUS.PAID).limit(100).get();
  if (snap.empty) return { dispatched: 0 };

  let dispatched = 0;
  for (const bDoc of snap.docs) {
    const bundle = bDoc.data();
    const legs = Array.isArray(bundle.legs) ? bundle.legs : [];
    let dirty = false;

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      if (!leg || leg.status !== LEG_STATUS.SCHEDULED) continue;
      if (new Date(leg.scheduledFor).getTime() > new Date(dueAt).getTime()) continue;

      // Materialize as a normal food order.
      const orderRef = db.collection(COLLECTIONS.ORDERS).doc();
      const now = FieldValue.serverTimestamp();
      const totalKobo = leg.subtotalKobo + leg.deliveryFeeKobo;
      const orderDoc = {
        orderId: orderRef.id,
        orderType: 'FOOD',
        userId: bundle.userId,
        customerId: bundle.userId,
        vendorId: leg.vendorId,
        vendorName: leg.vendorName,
        items: leg.items,
        status: 'pending',
        paymentStatus: 'paid',
        paymentMethod: bundle.paymentMethod || 'paystack',
        paymentRef: bundle.paymentRef || null,
        bundleId: bDoc.id,
        bundleLegIndex: leg.legIndex,
        isBundleLeg: true,
        scheduledFor: leg.scheduledFor,
        dropoff: leg.dropoff,
        deliveryAddress: leg.dropoff.address,
        subtotalKobo: leg.subtotalKobo,
        deliveryFeeKobo: leg.deliveryFeeKobo,
        totalKobo,
        grandTotal: totalKobo / 100,
        total: totalKobo / 100,
        requiresDeliveryPin: true,
        source: 'meal_bundle',
        createdAt: now,
        updatedAt: now,
      };
      await orderRef.set(orderDoc);
      legs[i] = { ...leg, status: LEG_STATUS.DISPATCHED, orderId: orderRef.id, dispatchedAt: new Date().toISOString() };
      dirty = true;
      dispatched += 1;
      await db.collection(COLLECTIONS.SCHEDULED_LEGS).doc(`${bDoc.id}_${leg.legIndex}`).set(
        { status: LEG_STATUS.DISPATCHED, orderId: orderRef.id, updatedAt: now }, { merge: true }
      ).catch(() => {});

      // Vendor notification — mirrors the existing food-order inbox so the
      // leg appears exactly like any other new order.
      await db.collection(COLLECTIONS.NOTIFICATIONS).doc().set({
        userId: leg.vendorId,
        type: 'new_order',
        title: 'New scheduled order',
        message: `Scheduled meal order ${orderRef.id.slice(-8).toUpperCase()} is now due.`,
        orderId: orderRef.id,
        bundleId: bDoc.id,
        read: false,
        createdAt: now,
      });
    }

    if (dirty) {
      await bDoc.ref.update({ legs, updatedAt: FieldValue.serverTimestamp() });
    }
  }
  return { dispatched };
}

const processScheduledBundleLegs = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    try {
      const { db, FieldValue } = getCtx();
      const res = await fanOutDueLegs(db, FieldValue);
      if (res.dispatched) console.log(`[bundles] dispatched ${res.dispatched} due leg(s)`);
    } catch (e) {
      console.error('[bundles] fan-out failed:', e);
    }
    return null;
  });

module.exports = {
  createMealBundle,
  quoteMealBundle,
  confirmMealBundlePayment,
  cancelMealBundleLeg,
  cancelMealBundle,
  processScheduledBundleLegs,
  refundLegToWallet,
  // pure/testable
  validateLegs,
  priceBundleCore,
  fanOutDueLegs,
  BUNDLE_STATUS,
  LEG_STATUS,
  COLLECTIONS,
};
