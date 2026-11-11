/**
 * Server-authoritative Book Delivery order client.
 *
 * createBookDeliveryOrder  — stages the order server-side (pendingBookings) and
 *                            returns the authoritative bookingId + amounts.
 * confirmBookDeliveryPayment — server verifies the payment (Paystack reference,
 *                            wallet transaction record, or POD vendor check),
 *                            creates the real bookings/orders docs and
 *                            dispatches a rider. The client NEVER marks payment
 *                            as paid and NEVER writes orders/bookings directly.
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

const createFn = httpsCallable(functions, 'createBookDeliveryOrder');
const confirmFn = httpsCallable(functions, 'confirmBookDeliveryPayment');

/**
 * @returns {Promise<{bookingId:string, deliveryFee:number, platformFee:number,
 *   grandTotal:number, totalKobo:number, distanceKm:number, zoneName:string|null,
 *   pricingConfigVersion:string, paymentStatus:string}>}
 */
export async function createBookDeliveryOrder(payload) {
  const res = await createFn(payload || {});
  const data = res.data || {};
  if (!data.success || !data.bookingId) {
    throw new Error(data?.error || 'Could not create the booking');
  }
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Idempotent — safe to retry. If the customer already paid but the first
 * confirm call hit a network blip, retrying must recover the booking.
 * @param {{bookingId:string, method:'paystack'|'wallet'|'pod', reference?:string}} input
 * @returns {Promise<{success:boolean, bookingId:string, paymentStatus:string,
 *   paymentReference?:string, dispatch?:object}>}
 */
export async function confirmBookDeliveryPayment(input, { retries = 3 } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await confirmFn(input || {});
      const data = res.data || {};
      if (!data.success) {
        throw new Error(data?.error || 'Payment could not be confirmed');
      }
      return data;
    } catch (err) {
      lastError = err;
      const code = String(err?.code || '');
      // Don't retry real rejections — only transport/internal failures.
      if (/invalid-argument|permission-denied|not-found|failed-precondition/.test(code)) {
        throw err;
      }
      if (attempt < retries - 1) await sleep(1200 * (attempt + 1));
    }
  }
  throw lastError || new Error('Payment could not be confirmed');
}
