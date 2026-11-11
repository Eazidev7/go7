/**
 * Go7 server-authoritative PROMOTION / DISCOUNT engine (FOOD foundation).
 *
 * The client may submit a `promotionCode` / `promotionId` — NEVER a trusted
 * monetary discount (e.g. `promoDiscount = 1000`). The server resolves the
 * promotion and computes the authoritative discount.
 *
 * NO promotion is activated by the engine existing: a promotion only applies if
 * its Firestore document is explicitly configured with `active: true`.
 *
 * Data model: promotions are keyed by their (uppercased) code:
 *   promotions/{CODE}
 *     code, type: "fixed"|"percentage", value,
 *     minimumOrder, maximumDiscount,
 *     eligibleOrderTypes: ["FOOD"], vendorIds?, productIds?,
 *     firstOrderOnly?, perCustomerLimit?, totalUsageLimit?,
 *     startsAt?, expiresAt?, active: false (default)
 *     usageCount (global), customerUsage: { [uid]: count }
 *
 * Redemptions are recorded under promotionRedemptions/{orderId} via a Firestore
 * transaction so duplicate submission / concurrent requests cannot consume a
 * promotion more than once.
 */
const { AuthFeeError } = require('./deliveryFeeService');

const CODE_MAX = 60;

function normalizeCode(raw) {
  return String(raw || '').trim().toUpperCase().slice(0, CODE_MAX);
}

/**
 * Pure, deterministic promotion validation + discount calculation.
 * Returns { valid:true, discount, promotion } or { valid:false, reason }.
 *
 * params:
 *   promo            - promotion document data
 *   subtotal         - server-authoritative food subtotal
 *   orderType        - 'FOOD' etc
 *   vendorId         - optional vendor filter
 *   itemProductIds   - optional product-eligibility check
 *   userId           - authenticated user id
 *   customerUsageCount - current per-customer usage (from promo doc)
 *   priorOrderCount  - number of the user's prior orders (for firstOrderOnly)
 *   now              - timestamp ms
 */
function calculatePromotionDiscount(params) {
  const promo = params.promo;
  const reason = (r) => ({ valid: false, reason: r });

  if (!promo || typeof promo !== 'object') return reason('promotion-not-found');
  if (promo.active !== true) return reason('promotion-inactive');

  const now = params.now || Date.now();
  if (promo.startsAt && typeof promo.startsAt === 'number' && now < promo.startsAt) {
    return reason('promotion-not-started');
  }
  if (promo.expiresAt && typeof promo.expiresAt === 'number' && now > promo.expiresAt) {
    return reason('promotion-expired');
  }

  const orderType = String(params.orderType || '').toUpperCase();
  if (
    Array.isArray(promo.eligibleOrderTypes) &&
    promo.eligibleOrderTypes.length > 0 &&
    !promo.eligibleOrderTypes.includes(orderType)
  ) {
    return reason('order-type-not-eligible');
  }

  if (
    Array.isArray(promo.vendorIds) &&
    promo.vendorIds.length > 0 &&
    !promo.vendorIds.includes(String(params.vendorId || ''))
  ) {
    return reason('vendor-not-eligible');
  }

  if (
    Array.isArray(promo.productIds) &&
    promo.productIds.length > 0 &&
    !(params.itemProductIds || []).some((id) => promo.productIds.includes(String(id)))
  ) {
    return reason('products-not-eligible');
  }

  const subtotal = Math.max(0, Number(params.subtotal) || 0);

  // Minimum order requirement.
  const minimumOrder = Number(promo.minimumOrder) || 0;
  if (minimumOrder > 0 && subtotal < minimumOrder) return reason('below-minimum-order');

  // First-order-only promotion.
  if (promo.firstOrderOnly === true && Number(params.priorOrderCount || 0) > 0) {
    return reason('not-first-order');
  }

  // Per-customer usage limit.
  const perCustomerLimit = Number(promo.perCustomerLimit) || 0;
  if (perCustomerLimit > 0 && Number(params.customerUsageCount || 0) >= perCustomerLimit) {
    return reason('per-customer-limit-reached');
  }

  // Global usage limit.
  const totalUsageLimit = Number(promo.totalUsageLimit) || 0;
  if (totalUsageLimit > 0 && Number(promo.usageCount || 0) >= totalUsageLimit) {
    return reason('total-usage-limit-reached');
  }

  // ---- Calculate authoritative discount ----
  let discount;
  if (promo.type === 'percentage') {
    discount = Math.round(subtotal * (Number(promo.value) || 0) / 100);
  } else {
    // fixed amount
    discount = Number(promo.value) || 0;
  }

  // Maximum discount cap.
  const maximumDiscount = Number(promo.maximumDiscount);
  if (Number.isFinite(maximumDiscount) && maximumDiscount > 0 && discount > maximumDiscount) {
    discount = maximumDiscount;
  }

  // Discount can never exceed the eligible order value nor be negative.
  discount = Math.max(0, Math.min(Math.round(discount), subtotal));

  if (discount <= 0) return reason('no-discount');

  return { valid: true, discount, promotion: promo };
}

/** Resolve a promotion by its user-facing code (doc id = uppercased code). */
async function resolvePromotion(db, rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const snap = await db.collection('promotions').doc(code).get().catch(() => null);
  if (!snap || !snap.exists) return null;
  return { id: code, code, data: snap.data() || {} };
}

/**
 * Determine a user's prior QUALIFYING order state for first-order promotions.
 *
 * FAIL-SAFE: if the query cannot be run (missing index / transient error), it
 * returns { ok:false } so a first-order promotion is NEVER granted on an
 * unverifiable lookup. The caller must reject when ok === false and the promo
 * is firstOrderOnly.
 *
 * Qualifying order = a prior order for this user that is NOT cancelled/failed.
 * This is a documented conservative default; confirm with business before
 * production use (Go7 order statuses: pending/confirmed/preparing/ready/
 * picked_up/on_the_way/delivered/cancelled).
 */
async function getPriorOrderState(db, userId) {
  if (!db || !userId) return { ok: false, count: 0 };
  let snap;
  try {
    snap = await db.collection('orders').where('userId', '==', userId).limit(100).get();
  } catch (e) {
    return { ok: false, count: 0 };
  }
  if (!snap || !snap.docs) return { ok: true, count: 0 };
  let count = 0;
  for (const d of snap.docs) {
    const data = typeof d.data === 'function' ? d.data() : d;
    const status = String((data && data.status) || '').toLowerCase();
    if (status !== 'cancelled' && status !== 'failed') count += 1;
  }
  return { ok: true, count };
}

/**
 * Resolve prior-order state for firstOrderOnly promotions, throwing when the
 * lookup cannot be verified (fail-safe: never grant on unverifiable eligibility).
 */
async function resolveFirstOrderEligibility(db, userId) {
  const state = await getPriorOrderState(db, userId);
  if (!state.ok) {
    throw new AuthFeeError(
      'first-order-eligibility-unavailable',
      'Could not verify first-order eligibility'
    );
  }
  return state.count;
}

/**
 * ATOMIC redemption. Called only when creating a NEW order (never on the
 * idempotent alreadyExists path). Re-validates limits inside a Firestore
 * transaction to avoid race conditions, increments global + per-customer usage,
 * and records a redemption under promotionRedemptions/{orderId} so a duplicate
 * submission cannot consume the promotion twice.
 *
 * Throws AuthFeeError('invalid-promotion', ...) if the promotion is exhausted.
 */
async function redeemPromotion({ db, runTx, promotion, userId, orderId, idempotencyKey, now }) {
  const txFn = runTx || ((cb) => db.runTransaction(cb));
  const redemptionRef = db.collection('promotionRedemptions').doc(orderId);
  const promoRef = db.collection('promotions').doc(promotion.id || promotion.code);

  await txFn(async (t) => {
    // Idempotency: if this order already redeemed, do nothing.
    const existingRedemption = await t.get(redemptionRef).catch(() => null);
    if (existingRedemption && existingRedemption.exists) return;

    const nowMs = now || Date.now();
    const promoSnap = await t.get(promoRef).catch(() => null);
    if (!promoSnap || !promoSnap.exists) return;
    const promo = promoSnap.data() || {};

    const perCustomerLimit = Number(promo.perCustomerLimit) || 0;
    const custCount = (promo.customerUsage && promo.customerUsage[userId]) || 0;
    if (perCustomerLimit > 0 && custCount >= perCustomerLimit) {
      throw new AuthFeeError('invalid-promotion', 'Promotion per-customer limit reached');
    }
    const totalUsageLimit = Number(promo.totalUsageLimit) || 0;
    if (totalUsageLimit > 0 && Number(promo.usageCount || 0) >= totalUsageLimit) {
      throw new AuthFeeError('invalid-promotion', 'Promotion usage limit reached');
    }

    await t.set(promoRef, {
      usageCount: (Number(promo.usageCount) || 0) + 1,
      customerUsage: { ...(promo.customerUsage || {}), [userId]: custCount + 1 },
      lastRedeemedAt: nowMs,
    }, { merge: true });

    await t.set(redemptionRef, {
      promotionId: promotion.id || promotion.code,
      promotionCode: promotion.code,
      userId,
      orderId,
      idempotencyKey: idempotencyKey || null,
      redeemedAt: nowMs,
    });
  });
}

/** Map internal validation reasons to safe, customer-friendly categories. */
function mapMessageKey(reason) {
  switch (reason) {
    case 'promotion-expired':
      return 'expired';
    case 'promotion-not-started':
    case 'promotion-inactive':
      return 'not-active';
    case 'below-minimum-order':
      return 'below-minimum';
    case 'order-type-not-eligible':
    case 'vendor-not-eligible':
    case 'products-not-eligible':
      return 'not-eligible';
    case 'per-customer-limit-reached':
    case 'total-usage-limit-reached':
      return 'limit-reached';
    case 'not-first-order':
      return 'first-order-used';
    case 'first-order-eligibility-unavailable':
      return 'first-order-eligibility-unavailable';
    default:
      return 'invalid';
  }
}

/**
 * PREVIEW-ONLY validation (no redemption, no order creation).
 * Lets the checkout show whether a code is valid + the discount, but the final
 * createCommerceOrder always revalidates and redeems atomically.
 *
 * Returns { ok, promotionCode, discount?, messageKey? } — never exposes
 * internal DB details.
 */
async function verifyPromotionQuote(db, { code, orderType, subtotal, userId, vendorId, itemProductIds }) {
  const promo = await resolvePromotion(db, code || '');
  if (!promo) return { ok: false, messageKey: 'invalid' };

  const customerUsageCount =
    (promo.data.customerUsage && promo.data.customerUsage[userId]) || 0;
  let priorOrderCount = 0;
  if (promo.data.firstOrderOnly === true) {
    const state = await getPriorOrderState(db, userId);
    if (!state.ok) {
      return { ok: false, messageKey: 'first-order-eligibility-unavailable' };
    }
    priorOrderCount = state.count;
  }

  const calc = calculatePromotionDiscount({
    promo: promo.data,
    subtotal: Math.max(0, Number(subtotal) || 0),
    orderType,
    userId,
    vendorId: vendorId || null,
    itemProductIds: itemProductIds || [],
    customerUsageCount,
    priorOrderCount,
    now: Date.now(),
  });

  if (!calc.valid) {
    return { ok: false, messageKey: mapMessageKey(calc.reason) };
  }
  return {
    ok: true,
    promotionCode: promo.code,
    promotionId: promo.id,
    discount: calc.discount,
  };
}

module.exports = {
  calculatePromotionDiscount,
  resolvePromotion,
  redeemPromotion,
  getPriorOrderState,
  resolveFirstOrderEligibility,
  verifyPromotionQuote,
  normalizeCode,
};
