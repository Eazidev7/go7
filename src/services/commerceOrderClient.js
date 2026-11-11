/**
 * Client integration for authoritative commerce order creation.
 *
 * PURPOSE: the ONLY way a production FOOD/MARKET/PHARMACY order should be
 * created is via createCommerceOrder (server-authoritative). This helper:
 *  - calls the createCommerceOrder callable
 *  - sends an idempotency key so retries / double-clicks never duplicate orders
 *  - returns the authoritative order + amountToPay (to drive payment UI)
 *  - NEVER falls back to direct client order creation
 *
 * The client may still SHOW a preview, but only the returned server values
 * may be persisted or charged.
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

const createCommerceOrderFn = httpsCallable(functions, 'createCommerceOrder');
const verifyPromotionFn = httpsCallable(functions, 'verifyPromotion');
const checkReferralDiscountFn = httpsCallable(functions, 'checkReferralDiscount');

const IDEM_KEY = 'go7_checkout_idempotency_key';

function currentIdempotencyKey() {
  let key = sessionStorage.getItem(IDEM_KEY);
  if (!key) {
    key = `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(IDEM_KEY, key);
  }
  return key;
}

export function resetIdempotencyKey() {
  sessionStorage.removeItem(IDEM_KEY);
}

/**
 * @param {object} payload
 * - orderType: 'FOOD' | 'MARKET' | 'PHARMACY'
 * - items: [{ productId, vendorId, quantity, ...metadata }]
 * - customer: { name, phone, email }
 * - destinationCoords / coordinates: { lat, lng }
 * - pickupCoords (optional)
 * - paymentMethod: 'cash' | 'wallet' | 'paystack'
 * - referralCode/referrerId/promotionId/promoCreditApplied (optional)
 * @returns {Promise<{orderId, orderNumber, orderType, subtotal, deliveryFee,
 *          platformFee, grandTotal, amountToPay, distanceKm, zoneId, zoneName,
 *          pricingConfigVersion, paymentMethod, breakdown}>}
 */
export async function submitCommerceOrder(payload) {
  const res = await createCommerceOrderFn({
    ...payload,
    idempotencyKey: currentIdempotencyKey(),
  });
  const data = res.data || {};
  if (!data || !data.orderId) {
    throw new Error(data?.error || 'Order creation failed');
  }
  // A brand-new order was created — clear the key so the NEXT checkout starts fresh.
  if (data.alreadyExists !== true) resetIdempotencyKey();
  return data;
}

/**
 * PREVIEW-ONLY promotion validation. Returns { ok, promotionCode, discount?,
 * messageKey? }. The final amount is ALWAYS set by createCommerceOrder — never
 * trust a preview discount as financial authority.
 *
 * @param {{promotionCode:string, orderType?:string, subtotal:number,
 *          vendorId?:string, itemProductIds?:string[]}} payload
 */
export async function verifyPromotionCode(payload) {
  const res = await verifyPromotionFn({
    promotionCode: payload.promotionCode,
    orderType: payload.orderType,
    subtotal: payload.subtotal,
    vendorId: payload.vendorId,
    itemProductIds: payload.itemProductIds,
  });
  return res.data || {};
}

/**
 * PREVIEW-ONLY referral first-order discount check. Returns
 * { eligible, discountKobo?, reason? }. The discount is applied
 * authoritatively inside createCommerceOrder when
 * `applyReferralDiscount: true` is sent — never trust this preview.
 */
export async function checkReferralDiscount() {
  const res = await checkReferralDiscountFn({});
  return res.data || {};
}
