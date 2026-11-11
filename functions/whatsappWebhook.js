/**
 * 🔗 WHATSAPP WEBHOOK ENDPOINT
 * Handles incoming WhatsApp status updates and delivery receipts
 * Optional endpoint: /api/whatsapp/status
 * Date: October 23, 2025
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

// Webhook verification token - Load from process.env OR Firebase Functions config
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN 
                     || functions.config().whatsapp?.verify_token 
                     || 'GO7_WEBHOOK_2025';

/**
 * Webhook verification endpoint (GET)
 * WhatsApp requires this to verify your webhook URL
 */
exports.whatsappWebhookVerify = functions.https.onRequest((req, res) => {

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.error('❌ Webhook verification failed');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(404);
  }
});

/**
 * Webhook handler endpoint (POST)
 * Receives WhatsApp message status updates
 */
exports.whatsappWebhookStatus = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.sendStatus(405); // Method not allowed
  }

  try {
    const body = req.body;

    // Acknowledge receipt immediately
    res.sendStatus(200);

    // Process webhook data asynchronously
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            await processWhatsAppStatus(change.value);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.sendStatus(500);
  }
});

/**
 * Process WhatsApp message status
 * @param {object} value - WhatsApp webhook value object
 */
async function processWhatsAppStatus(value) {
  const statuses = value.statuses || [];

  for (const status of statuses) {
    const {
      id: messageId,
      status: deliveryStatus,
      timestamp,
      recipient_id: recipientPhone,
      errors
    } = status;

    console.log(`📊 WhatsApp Status: ${messageId} → ${deliveryStatus}`);

    // Find order by phone number and update notification status
    try {
      const ordersRef = admin.firestore().collection('orders');
      
      // Query for orders with this phone number
      const snapshot = await ordersRef
        .where('customerPhone', '==', recipientPhone)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      if (snapshot.empty) {
        console.warn(`⚠️ No orders found for phone ${recipientPhone}`);
        return;
      }

      // Update notification status for matching message
      for (const doc of snapshot.docs) {
        const orderData = doc.data();
        const notifications = orderData.notifications?.whatsappCloud || [];

        // Find notification with matching message ID
        const notificationIndex = notifications.findIndex(n => n.messageId === messageId);

        if (notificationIndex !== -1) {
          // Update notification status
          notifications[notificationIndex].deliveryStatus = deliveryStatus;
          notifications[notificationIndex].deliveryTimestamp = new Date(parseInt(timestamp) * 1000);
          
          if (errors) {
            notifications[notificationIndex].errors = errors;
          }

          await doc.ref.update({
            'notifications.whatsappCloud': notifications
          });

          console.log(`✅ Updated order ${doc.id} notification status: ${deliveryStatus}`);
          break; // Found the order, stop searching
        }
      }
    } catch (error) {
      console.error('❌ Error updating order notification status:', error);
    }
  }
}

/**
 * Manual webhook test endpoint
 * POST with order ID to simulate status update
 */
exports.testWhatsappWebhook = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { orderId, status } = data;

  if (!orderId || !status) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId and status required');
  }

  try {
    const orderRef = admin.firestore().collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found');
    }

    // Simulate webhook status update
    const mockStatus = {
      id: `wamid.test_${Date.now()}`,
      status: status,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      recipient_id: orderDoc.data().customerPhone || '2348012345678'
    };

    await processWhatsAppStatus({
      statuses: [mockStatus]
    });

    return {
      success: true,
      message: 'Webhook test completed',
      status: mockStatus
    };
  } catch (error) {
    console.error('Webhook test error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

module.exports = {
  whatsappWebhookVerify: exports.whatsappWebhookVerify,
  whatsappWebhookStatus: exports.whatsappWebhookStatus,
  testWhatsappWebhook: exports.testWhatsappWebhook,
  processWhatsAppStatus
};
