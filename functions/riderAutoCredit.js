/**
 * Go7 idempotent RIDER EARNINGS AUTO-CREDIT (prevent recurrence).
 *
 * Problem it fixes: rider payouts were only credited by the app's client-side
 * completeDelivery / completeFuelDelivery. Any delivery completed server-side or
 * by an admin never credited rider_earnings, so "done jobs" showed with ₦0 /
 * didn't appear in the rider's balance, and we had to backfill manually.
 *
 * Adds Firestore triggers that credit rider_earnings EXACTLY ONCE when an order
 * or fuelOrder transitions to status 'delivered' and carries a riderId +
 * riderPayout, guarded by the `riderEarningsCredited` flag so it can never
 * double-credit alongside the client path.
 *
 * The pure credit logic takes an injected { db, FieldValue } so it is unit-testable
 * without initializing Firebase. The triggers construct the real admin client
 * only inside the event handler (cloud-only), never at module load.
 *
 * NOT deployed automatically — see final report.
 */
const admin = require('firebase-admin');
const functions = require('firebase-functions/v1');

function toNaira(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function statusOf(x) {
  return String((x && x.status) || '').toLowerCase();
}

function riderKey(x) {
  return String((x && (x.riderId || (x.rider && x.rider.id))) || '').trim() || null;
}

/**
 * Idempotent credit. Reads both docs inside a transaction; if the order is
 * already credited it does nothing. Otherwise increments the rider earnings
 * ledger with the payout + a completed-delivery count and marks the order.
 * Returns { credited: boolean, orderId }.
 *
 * @param {{db, FieldValue}} ctx  injected Firestore + FieldValue (testable)
 * @param {string} orderId
 * @param {object} orderData       the order/fuelOrder doc data
 * @param {string} collectionName  'orders' | 'fuelOrders'
 */
async function creditRiderIfEligible(ctx, orderId, orderData, collectionName) {
  const { db } = ctx;
  const FieldValue = ctx.FieldValue || admin.firestore.FieldValue;

  const payout = toNaira(orderData.riderPayout || orderData.riderEarnings);
  const riderId = riderKey(orderData);
  if (!riderId || payout <= 0) {
    return { credited: false, reason: 'no-rider-or-payout' };
  }

  const orderRef = db.collection(collectionName).doc(orderId);
  const earningsRef = db.collection('rider_earnings').doc(riderId);
  const fieldValue = FieldValue || admin.firestore.FieldValue;
  const now = fieldValue.serverTimestamp();

  let result = { credited: false, reason: 'already-credited' };
  await db.runTransaction(async (t) => {
    const orderSnap = await t.get(orderRef);
    if (!orderSnap.exists) return;
    const od = orderSnap.data() || {};
    if (od.riderEarningsCredited) return; // already credited → never double-pay

    await t.set(
      earningsRef,
      {
        riderId,
        totalEarned: fieldValue.increment(payout),
        availableBalance: fieldValue.increment(payout),
        deliveryCount: fieldValue.increment(1),
        completedDeliveries: fieldValue.increment(1),
        lastDeliveryCompleted: now,
        lastUpdated: now,
      },
      { merge: true }
    );
    await t.update(orderRef, {
      riderEarningsCredited: true,
      riderPayoutCredited: payout,
      creditedAt: Date.now(),
    });
    result = { credited: true, orderId };
  });
  return result;
}

/** Trigger: order marked delivered → auto-credit rider earnings once. */
const onOrderDelivered = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    if (!(statusOf(before) !== 'delivered' && statusOf(after) === 'delivered')) return null;
    try {
      const r = await creditRiderIfEligible(
        { db: admin.firestore(), FieldValue: admin.firestore.FieldValue },
        context.params.orderId,
        after,
        'orders'
      );
      if (r.credited) console.log(`[riderAutoCredit] credited order ${r.orderId}`);
      return null;
    } catch (e) {
      console.error('[riderAutoCredit] orders failed:', e.message);
      return null;
    }
  });

/** Trigger: fuel order marked delivered → auto-credit rider earnings once. */
const onFuelOrderDelivered = functions.firestore
  .document('fuelOrders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    if (!(statusOf(before) !== 'delivered' && statusOf(after) === 'delivered')) return null;
    try {
      const r = await creditRiderIfEligible(
        { db: admin.firestore(), FieldValue: admin.firestore.FieldValue },
        context.params.orderId,
        after,
        'fuelOrders'
      );
      if (r.credited) console.log(`[riderAutoCredit] credited fuel ${r.orderId}`);
      return null;
    } catch (e) {
      console.error('[riderAutoCredit] fuelOrders failed:', e.message);
      return null;
    }
  });

module.exports = { creditRiderIfEligible, onOrderDelivered, onFuelOrderDelivered };
