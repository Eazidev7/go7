/**
 * Vendor Scheduled Meal Plans — server-side management.
 *
 * Vendors author sellable "plan" products (breakfast/lunch/dinner slots with
 * per-slot items, prices, delivery windows, day availability, daily limits and
 * cutoffs). All validation is server-side: ownership, item ownership, slot
 * shapes, numeric bounds. Prices stored here are FOOD prices only — delivery
 * fees, platform fees and rider payouts are computed by existing Go7 services
 * and can never be set through this module.
 *
 * Gated by appConfig/features → mealPlansEnabled (admin-controlled flag).
 */
const functions = require('firebase-functions');
const { initAdminIfNeeded } = require('./adminInit');

const normStr = (v) => (typeof v === 'string' ? v.trim() : '');
const SLOT_NAMES = ['breakfast', 'lunch', 'dinner'];
const MAX_ITEMS_PER_SLOT = 15;
const MAX_PLAN_PRICE_KOBO = 50000000; // ₦500k sanity bound (food only)
const LEG_FLOW = ['scheduled', 'confirmed', 'preparing', 'ready'];

let ctx = null;
function getCtx() {
  if (!ctx) {
    const admin = initAdminIfNeeded();
    ctx = { db: admin.firestore(), FieldValue: admin.firestore.FieldValue, admin };
  }
  return ctx;
}

async function featureEnabled(db) {
  const snap = await db.collection('appConfig').doc('features').get();
  return snap.exists && snap.data().mealPlansEnabled === true;
}

const hhmm = (v) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(normStr(v)) ? normStr(v) : null;
const minsBetween = (v) => Number.isInteger(v) && v >= 15 && v <= 720 ? v : null;

function sanitizeItems(raw, productMap) {
  const items = [];
  for (const it of Array.isArray(raw) ? raw : []) {
    const productId = normStr(it && it.productId);
    const quantity = Number(it && it.quantity);
    const p = productMap.get(productId);
    if (!p) throw new functions.https.HttpsError('invalid-argument', `Item ${productId} is not on your menu`);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new functions.https.HttpsError('invalid-argument', `Bad quantity for ${p.name || productId}`);
    }
    items.push({
      productId,
      quantity,
      name: p.name || '',
      priceKobo: Math.round(Number(p.priceKobo ?? (p.price || 0) * 100) || 0),
      imageUrl: p.imageUrl || p.image || null,
    });
  }
  return items;
}

function sanitizeSlot(rawSlot, productMap) {
  if (rawSlot == null) return null; // slot disabled
  const items = sanitizeItems(rawSlot.items, productMap);
  if (!items.length) {
    throw new functions.https.HttpsError('invalid-argument', 'An enabled slot needs at least one menu item');
  }
  const priceKobo = rawSlot.priceKobo == null ? null : Math.round(Number(rawSlot.priceKobo));
  if (priceKobo != null && (!Number.isFinite(priceKobo) || priceKobo <= 0 || priceKobo > MAX_PLAN_PRICE_KOBO)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid slot price');
  }
  const [ws, we] = String(rawSlot.deliveryWindow || '').split('-').map((s) => normStr(s));
  const windowStart = hhmm(ws); const windowEnd = hhmm(we);
  if (!windowStart || !windowEnd || windowStart >= windowEnd) {
    throw new functions.https.HttpsError('invalid-argument', 'Delivery window must be HH:MM-HH:MM (e.g. 07:00-09:00)');
  }
  return { items, priceKobo, deliveryWindow: `${windowStart}-${windowEnd}` };
}

/**
 * upsertMealPlan — create or update a vendor plan.
 * data: { planId?, name, description, imageUrl, days[], slots{breakfast?,lunch?,dinner?},
 *         packageDiscountBps?, maxOrdersPerDay?, orderCutoffMins?, prepTimeMins?, active? }
 */
const upsertMealPlan = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const { db, FieldValue } = getCtx();
  if (!(await featureEnabled(db))) {
    throw new functions.https.HttpsError('failed-precondition', 'Meal plans are not enabled yet');
  }
  const uid = context.auth.uid;

  // Vendor must exist (doc id = auth uid, matching existing vendor rules).
  const vendorSnap = await db.collection('vendors').doc(uid).get();
  if (!vendorSnap.exists) throw new functions.https.HttpsError('permission-denied', 'Not a vendor account');
  const vendor = vendorSnap.data();
  if (vendor.suspended === true || vendor.disabled === true) {
    throw new functions.https.HttpsError('permission-denied', 'Vendor account is suspended');
  }

  // Load the vendor's own menu — items MUST come from it (no duplicates).
  const menuSnap = await db.collection('vendors').doc(uid).collection('products').get();
  const productMap = new Map(menuSnap.docs.map((d) => [d.id, d.data()]));

  const name = normStr(data && data.name);
  if (name.length < 2 || name.length > 80) throw new functions.https.HttpsError('invalid-argument', 'Name must be 2–80 characters');
  const description = normStr(data && data.description).slice(0, 400);

  const days = [...new Set((Array.isArray(data && data.days) ? data.days : [])
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  if (!days.length) throw new functions.https.HttpsError('invalid-argument', 'Pick at least one available day');

  const slots = {};
  let hasSlot = false;
  for (const s of SLOT_NAMES) {
    const slot = sanitizeSlot(data && data.slots && data.slots[s], productMap);
    if (slot) { slots[s] = slot; hasSlot = true; }
  }
  if (!hasSlot) throw new functions.https.HttpsError('invalid-argument', 'Enable at least one meal slot');

  const packageDiscountBps = Math.min(Math.max(Number(data && data.packageDiscountBps) || 0, 0), 5000); // ≤50%
  const maxOrdersPerDay = minsBetween(data && data.maxOrdersPerDay);
  const orderCutoffMins = minsBetween(data && data.orderCutoffMins) || 120;
  const prepTimeMins = minsBetween(data && data.prepTimeMins) || 60;
  const imageUrl = normStr(data && data.imageUrl).slice(0, 500) ||
    Object.values(slots).flatMap((s) => s.items).find((i) => i.imageUrl)?.imageUrl || null;

  const planId = normStr(data && data.planId);
  const col = db.collection('mealPlanProducts');
  const now = FieldValue.serverTimestamp();

  if (planId) {
    const ref = col.doc(planId);
    const snap = await ref.get();
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Plan not found');
    if (snap.data().vendorId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not your plan');
    await ref.update({
      name, description, days, slots, packageDiscountBps, maxOrdersPerDay,
      orderCutoffMins, prepTimeMins, imageUrl,
      active: data && data.active !== undefined ? data.active === true : snap.data().active !== false,
      updatedAt: now,
    });
    return { ok: true, planId, updated: true };
  }

  const ref = col.doc();
  await ref.set({
    vendorId: uid,
    vendorName: vendor.businessName || vendor.name || '',
    name, description, days, slots, packageDiscountBps, maxOrdersPerDay,
    orderCutoffMins, prepTimeMins, imageUrl,
    active: data && data.active !== undefined ? data.active === true : true,
    createdAt: now, updatedAt: now,
  });
  return { ok: true, planId: ref.id };
});

/**
 * updateScheduledLegStatus — vendor confirms / prepares / readies a scheduled leg.
 * 'completed' is NOT reachable here — Go7's delivery completion flow owns it.
 * data: { legDocId, action: 'confirm'|'preparing'|'ready' }
 */
const updateScheduledLegStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const { db, FieldValue } = getCtx();
  const uid = context.auth.uid;
  const legDocId = normStr(data && data.legDocId);
  const action = normStr(data && data.action);
  const next = { confirm: 'confirmed', preparing: 'preparing', ready: 'ready' }[action];
  if (!legDocId || !next) throw new functions.https.HttpsError('invalid-argument', 'legDocId + action required');

  const ref = db.collection('scheduledBundleLegs').doc(legDocId);
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Leg not found');
    const leg = snap.data();
    if (leg.vendorId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not your order');
    if (leg.status === 'cancelled') throw new functions.https.HttpsError('failed-precondition', 'Leg is cancelled');
    if (leg.status === 'dispatched') throw new functions.https.HttpsError('failed-precondition', 'Already an order — use normal order flow');
    const cur = LEG_FLOW.indexOf(leg.status || 'scheduled');
    const nxt = LEG_FLOW.indexOf(next);
    if (nxt <= cur) return { ok: true, status: leg.status, unchanged: true };
    t.update(ref, { status: next, [`statusLog.${next}`]: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return { ok: true, status: next, bundleId: leg.bundleId, legIndex: leg.legIndex };
  }).then(async (r) => {
    // Keep the customer-facing bundle doc in sync — the embedded legs[] status
    // must mirror the vendor leg doc or "My Plans" shows a stale state.
    if (r && r.bundleId && r.legIndex != null && !r.unchanged) {
      try {
        await db.collection('mealBundles').doc(r.bundleId).update({
          [`legs.${r.legIndex}.status`]: r.status, [`legs.${r.legIndex}.vendorStatus`]: r.status,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (e) { console.warn('bundle leg status sync failed:', e.message); }
    }
    return r;
  });
});

module.exports = { upsertMealPlan, updateScheduledLegStatus };
