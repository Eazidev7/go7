/**
 * 🔐 PAYSTACK WEBHOOK HANDLER (Backend Only)
 * This file should run on your Express/Node.js backend server
 * 
 * Setup:
 * 1. Deploy this as an Express endpoint
 * 2. Configure webhook URL in Paystack Dashboard
 * 3. Add PAYSTACK_SECRET_KEY to environment variables
 * 4. Ensure Firebase Admin SDK is initialized
 */

const express = require('express');
const crypto = require('crypto');
const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already done)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
const router = express.Router();

// Order status constants
const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  PROCESSING: 'processing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

/**
 * Verify Paystack webhook signature
 */
function verifyPaystackSignature(req) {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
    
  return hash === req.headers['x-paystack-signature'];
}

/**
 * Handle successful payment
 */
async function handleSuccessfulPayment(reference, amount, metadata) {
  try {
    const orderId = metadata.orderId || reference;
    
    console.log('✅ Processing successful payment for order:', orderId);
    
    // Get order document
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      console.error('❌ Order not found:', orderId);
      return { success: false, error: 'Order not found' };
    }
    
    const orderData = orderDoc.data();
    
    // Verify amount matches (convert from kobo to naira)
    const paidAmount = amount / 100;
    if (Math.abs(paidAmount - orderData.totalAmount) > 0.01) {
      console.error('❌ Amount mismatch:', { paid: paidAmount, expected: orderData.totalAmount });
      return { success: false, error: 'Amount mismatch' };
    }
    
    // Update order status
    await orderRef.update({
      paymentStatus: PAYMENT_STATUS.PAID,
      orderStatus: ORDER_STATUS.PAID,
      paymentVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      paystackReference: reference,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Order updated to PAID status:', orderId);
    
    // TODO: Trigger notifications
    // - Send confirmation email to customer
    // - Notify vendor of new order
    // - Send SMS confirmation
    
    return { success: true, orderId };
  } catch (error) {
    console.error('❌ Error handling successful payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle failed payment
 */
async function handleFailedPayment(reference, metadata) {
  try {
    const orderId = metadata.orderId || reference;
    
    console.log('⚠️ Processing failed payment for order:', orderId);
    
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      console.error('❌ Order not found:', orderId);
      return { success: false, error: 'Order not found' };
    }
    
    // Update order status
    await orderRef.update({
      paymentStatus: PAYMENT_STATUS.FAILED,
      orderStatus: ORDER_STATUS.CANCELLED,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Order marked as failed:', orderId);
    
    return { success: true, orderId };
  } catch (error) {
    console.error('❌ Error handling failed payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Webhook endpoint
 * POST /api/paystack/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook signature
    if (!verifyPaystackSignature(req)) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const event = req.body;
    
    console.log('📨 Paystack webhook received:', event.event);
    
    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        const { reference, amount, metadata } = event.data;
        const result = await handleSuccessfulPayment(reference, amount, metadata);
        
        if (result.success) {
          return res.status(200).json({ 
            message: 'Payment processed successfully',
            orderId: result.orderId 
          });
        } else {
          return res.status(400).json({ error: result.error });
        }
      
      case 'charge.failed':
        const failedResult = await handleFailedPayment(
          event.data.reference, 
          event.data.metadata
        );
        
        return res.status(200).json({ 
          message: 'Failed payment processed',
          orderId: failedResult.orderId 
        });
      
      default:
        console.log('ℹ️ Unhandled event type:', event.event);
        return res.status(200).json({ message: 'Event received' });
    }
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Clean up expired orders (run periodically)
 * This should be called by a cron job or scheduled function
 */
async function cleanupExpiredOrders() {
  try {
    const now = admin.firestore.Timestamp.now();
    
    const expiredOrders = await db.collection('orders')
      .where('orderStatus', '==', ORDER_STATUS.PENDING_PAYMENT)
      .where('expiresAt', '<=', now)
      .get();
    
    console.log(`🧹 Found ${expiredOrders.size} expired orders`);
    
    const batch = db.batch();
    
    expiredOrders.docs.forEach(doc => {
      batch.update(doc.ref, {
        orderStatus: ORDER_STATUS.EXPIRED,
        paymentStatus: PAYMENT_STATUS.FAILED,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    
    await batch.commit();
    
    console.log(`✅ Cleaned up ${expiredOrders.size} expired orders`);
    
    return { success: true, count: expiredOrders.size };
  } catch (error) {
    console.error('❌ Error cleaning up expired orders:', error);
    return { success: false, error: error.message };
  }
}

// Endpoint to trigger cleanup (call this from a cron job)
router.post('/cleanup-expired', async (req, res) => {
  const result = await cleanupExpiredOrders();
  res.json(result);
});

module.exports = router;
