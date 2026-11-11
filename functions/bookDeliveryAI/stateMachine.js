/**
 * Controlled state machine for the AI Book Delivery conversation.
 * The LLM interprets language — it NEVER moves the state directly.
 */

const STATES = {
  COLLECTING_PICKUP: 'COLLECTING_PICKUP',
  CONFIRMING_PICKUP: 'CONFIRMING_PICKUP',
  COLLECTING_DROPOFF: 'COLLECTING_DROPOFF',
  CONFIRMING_DROPOFF: 'CONFIRMING_DROPOFF',
  COLLECTING_PACKAGE: 'COLLECTING_PACKAGE',
  COLLECTING_RECIPIENT: 'COLLECTING_RECIPIENT',
  READY_FOR_QUOTE: 'READY_FOR_QUOTE',
  QUOTE_PRESENTED: 'QUOTE_PRESENTED',
  AWAITING_PAYMENT_METHOD: 'AWAITING_PAYMENT_METHOD',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAYMENT_PROCESSING: 'PAYMENT_PROCESSING',
  FINDING_RIDER: 'FINDING_RIDER',
  RIDER_ASSIGNED: 'RIDER_ASSIGNED',
  TRACKING: 'TRACKING',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

/**
 * Recompute the correct state from session facts (server-authoritative — the
 * LLM output never sets this; transitions derive from filled/confirmed data).
 */
function deriveState(session) {
  const s = session.status;
  // Terminal/pinned states
  if ([STATES.CANCELLED, STATES.DELIVERED].includes(s)) return s;
  if (session.paymentStatus === 'paid' || session.paymentStatus === 'pay_on_delivery') {
    if (session.riderStatus === 'assigned') return STATES.TRACKING;
    return STATES.FINDING_RIDER;
  }
  if (s === STATES.AWAITING_PAYMENT || s === STATES.PAYMENT_PROCESSING) return s;
  if (s === STATES.AWAITING_PAYMENT_METHOD) return s;

  if (!session.pickup.confirmed) {
    return session.pickup.query ? STATES.CONFIRMING_PICKUP : STATES.COLLECTING_PICKUP;
  }
  if (!session.dropoff.confirmed) {
    return session.dropoff.query ? STATES.CONFIRMING_DROPOFF : STATES.COLLECTING_DROPOFF;
  }
  if (!session.package.description) return STATES.COLLECTING_PACKAGE;
  if (!session.recipient.name && !session.recipient.phone) return STATES.COLLECTING_RECIPIENT;
  if (!session.quote) return STATES.READY_FOR_QUOTE;
  return STATES.QUOTE_PRESENTED;
}

module.exports = { STATES, deriveState };
