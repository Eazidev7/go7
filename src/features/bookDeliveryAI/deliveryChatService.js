/**
 * Delivery AI chat client — talks only to the server-side chat callable.
 * All authoritative state lives server-side in the delivery session; the
 * client sends messages/actions and renders the returned cards.
 *
 * Payment execution reuses the SAME production pieces as the manual page:
 *   PaystackPop (browser) → confirmBookDeliveryPayment (server verify)
 *   payForDeliveryWithWallet → confirmBookDeliveryPayment
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import { confirmBookDeliveryPayment } from '../../services/bookDeliveryOrderService';
import { payForDeliveryWithWallet } from '../../services/customerWalletService';

const chatFn = httpsCallable(functions, 'bookDeliveryAIChat');

async function send(payload) {
  const res = await chatFn(payload);
  return res.data || {};
}

export function sendMessage(sessionId, message) {
  return send({ sessionId, message });
}

export function sendAction(sessionId, action) {
  return send({ sessionId, action });
}

export function startSession() {
  return send({});
}

/**
 * Execute the payment shown on a payment card, then server-confirm.
 * Returns the confirm result — caller then notifies the chat.
 */
export async function executePayment({ method, bookingId, amountKobo, amount, user }) {
  if (method === 'pod') {
    return confirmBookDeliveryPayment({ bookingId, method: 'pod' });
  }

  if (method === 'wallet') {
    try {
      await payForDeliveryWithWallet(user.uid, bookingId, amount, 'Book Delivery (AI)');
    } catch (err) {
      // already-exists → a previous attempt already debited; confirm proceeds.
      if (!/already been paid|already-exists/i.test(String(err?.message || ''))) throw err;
    }
    return confirmBookDeliveryPayment({ bookingId, method: 'wallet' });
  }

  // paystack
  const key = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
    || 'pk_live_c04fd74b02d6034f4f1cf946887b8e3fc1a06831';
  if (!window.PaystackPop) throw new Error('Payment system is still loading — try again in a moment.');

  const response = await new Promise((resolve, reject) => {
    const handler = window.PaystackPop.setup({
      key,
      email: user?.email || 'customer@go7.ng',
      amount: amountKobo,
      ref: `go7_${Date.now()}`,
      currency: 'NGN',
      metadata: { paymentType: 'service_payment', serviceType: 'Book Delivery', bookingId },
      callback: (res) => resolve(res),
      onClose: () => reject(new Error('Payment cancelled')),
    });
    handler.openIframe();
  });

  return confirmBookDeliveryPayment({
    bookingId,
    method: 'paystack',
    reference: response?.reference || null,
  });
}
