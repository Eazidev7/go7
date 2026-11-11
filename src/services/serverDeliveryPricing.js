/**
 * Server-authoritative Book Delivery pricing/order client.
 *
 * The client may SHOW a preview, but the authoritative price, distance, zone
 * and orderType come from the server (computeDeliveryFee). Any mismatch the
 * server detects (manipulated fee/distance/zone/orderType, or outside the
 * Abeokuta service area) throws and MUST abort order creation.
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

const computeDeliveryFeeFn = httpsCallable(functions, 'computeDeliveryFee');

/**
 * @param {object} payload
 * @param {string} payload.orderType  - must be the BOOK DELIVERY order type (GENERAL_DELIVERY)
 * @param {{lat:number,lng:number}} payload.pickup
 * @param {{lat:number,lng:number}} payload.destination
 * @param {number} [payload.clientFee]         - quoted fee (validated against server)
 * @param {number} [payload.clientDistanceKm]  - quoted distance (validated against server)
 * @param {string} [payload.clientZoneId]
 * @param {string} [payload.clientOrderType]
 * @returns {Promise<{deliveryFee:number, distanceKm:number, zoneId:string|null,
 *          zoneName:string|null, pricingConfigVersion:string, breakdown:object}>}
 */
export async function computeBookDeliveryFee(payload) {
  const res = await computeDeliveryFeeFn(payload || {});
  const data = res.data || {};
  if (!res.data && (!data || !Number.isFinite(data.deliveryFee))) {
    throw new Error(data?.error || 'Delivery fee unavailable');
  }
  return data;
}

export const BOOK_DELIVERY_ORDER_TYPE = 'GENERAL_DELIVERY';
