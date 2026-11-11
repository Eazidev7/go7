/**
 * GO7 Fuel & CNG Delivery Triggers
 * Firestore triggers for fuel order lifecycle events
 */

const functions = require('firebase-functions/v1');
const admin = require('./adminInit');
const { db } = admin;

/**
 * Trigger: When a fuel order is created
 * - Send notification to admin
 * - Update station metrics
 * - Create initial chat message
 */
exports.onFuelOrderCreated = functions.firestore.document('fuelOrders/{orderId}')
  .onCreate(async (snap, context) => {
    const orderData = snap.data();
    const orderId = context.params.orderId;

    console.log(`Fuel order created: ${orderId}`);

    try {
      // Update station order count
      if (orderData.stationId) {
        const stationRef = db.collection('fuelStations').doc(orderData.stationId);
        await stationRef.update({
          totalOrders: admin.firestore.FieldValue.increment(1),
          lastOrderAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // Send admin notification (optional)
      const adminNotificationRef = db.collection('adminNotifications').doc();
      await adminNotificationRef.set({
        type: 'fuel_order',
        orderId,
        customerId: orderData.customerId,
        amount: orderData.totalAmount,
        fuelType: orderData.fuelType,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });

      return null;

    } catch (error) {
      console.error('Error in onFuelOrderCreated:', error);
      return null;
    }
  });

/**
 * Trigger: When fuel order status changes
 * - Send appropriate notifications
 * - Update rider metrics
 * - Handle payment refunds if cancelled
 */
exports.onFuelOrderStatusChanged = functions.firestore.document('fuelOrders/{orderId}')
  .onUpdate(async (change, context) => {
    const orderData = change.after.data();
    const previousData = change.before.data();
    const orderId = context.params.orderId;

    const statusChanged = previousData.status !== orderData.status;

    if (!statusChanged) {
      return null;
    }

    console.log(`Fuel order ${orderId} status changed: ${previousData.status} -> ${orderData.status}`);

    try {
      // Handle rider assignment
      if (orderData.status === 'confirmed' && orderData.riderId && !previousData.riderId) {
        await updateRiderMetrics(orderData.riderId, 'assigned');
      }

      // Handle order completion
      if (orderData.status === 'delivered' && previousData.status !== 'delivered') {
        await updateRiderMetrics(orderData.riderId, 'completed');
        await updateStationMetrics(orderData.stationId, orderData.totalAmount);
      }

      // Handle order cancellation
      if (orderData.status === 'cancelled' && previousData.paymentStatus === 'paid') {
        await processRefund(orderData);
      }

      return null;

    } catch (error) {
      console.error('Error in onFuelOrderStatusChanged:', error);
      return null;
    }
  });

/**
 * Update rider metrics
 */
async function updateRiderMetrics(riderId, action) {
  if (!riderId) return;

  const riderRef = db.collection('riders').doc(riderId);

  if (action === 'assigned') {
    await riderRef.update({
      activeOrders: admin.firestore.FieldValue.increment(1),
      totalOrders: admin.firestore.FieldValue.increment(1),
      lastAssignmentAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  if (action === 'completed') {
    await riderRef.update({
      activeOrders: admin.firestore.FieldValue.increment(-1),
      completedOrders: admin.firestore.FieldValue.increment(1),
      lastCompletedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}

/**
 * Update station metrics
 */
async function updateStationMetrics(stationId, orderAmount) {
  if (!stationId) return;

  const stationRef = db.collection('fuelStations').doc(stationId);
  await stationRef.update({
    totalRevenue: admin.firestore.FieldValue.increment(orderAmount),
    lastOrderAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Process refund for cancelled orders
 */
async function processRefund(orderData) {
  if (orderData.paymentMethod !== 'wallet') {
    return; // Only refund wallet payments
  }

  const { customerId, totalAmount, orderId } = orderData;

  const walletRef = db.collection('wallets').doc(customerId);
  const userRef = db.collection('users').doc(customerId);

  await db.runTransaction(async (transaction) => {
    const walletDoc = await transaction.get(walletRef);
    const currentBalance = walletDoc.exists ? Number(walletDoc.data().balance) || 0 : 0;
    const refundedBalance = currentBalance + totalAmount;

    transaction.set(walletRef, {
      balance: refundedBalance,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    transaction.set(userRef, {
      walletBalance: refundedBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    transaction.set(walletRef.collection('transactions').doc(`refund_${orderId}`), {
      type: 'credit',
      amount: totalAmount,
      description: `Refund: Cancelled fuel order ${orderId}`,
      previousBalance: currentBalance,
      newBalance: refundedBalance,
      category: 'refund',
      status: 'completed',
      source: 'fuel_order_refund',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { orderId, reason: 'Order cancelled' }
    });
  });

  // Update order refund status
  await db.collection('fuelOrders').doc(orderId).update({
    paymentStatus: 'refunded',
    refundedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Trigger: Clean up old completed fuel orders (scheduled)
 * Runs daily at midnight
 */
exports.cleanupOldFuelOrders = functions.pubsub.schedule('0 0 * * *')
  .timeZone('Africa/Lagos')
  .onRun(async (context) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

    try {
      const snapshot = await db.collection('fuelOrders')
        .where('status', '==', 'delivered')
        .where('deliveredAt', '<', cutoffDate)
        .limit(100)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Cleaned up ${snapshot.docs.length} old fuel orders`);

      return null;

    } catch (error) {
      console.error('Error in cleanupOldFuelOrders:', error);
      return null;
    }
  });