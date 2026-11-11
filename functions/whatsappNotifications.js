/**
 * 📱 WHATSAPP NOTIFICATIONS MODULE
 * Sends WhatsApp messages via Meta WhatsApp Business Cloud API
 * Triggers on order status updates in Firebase
 * Date: October 23, 2025
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const axios = require('axios');

// Get environment variables - Load from process.env OR Firebase Functions config
// Priority: process.env (local .env) → functions.config() (Firebase production)
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID 
                          || functions.config().whatsapp?.phone_id;

const META_TOKEN = process.env.META_TOKEN 
                   || functions.config().whatsapp?.meta_token;

/**
 * Format phone number to E.164 format (+234XXXXXXXXXX)
 * Handles various input formats:
 * - 08012345678 → +2348012345678
 * - 2348012345678 → +2348012345678
 * - +2348012345678 → +2348012345678
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 234
  if (cleaned.startsWith('0')) {
    return `+234${cleaned.slice(1)}`;
  }
  
  // If starts with 234, add +
  if (cleaned.startsWith('234')) {
    return `+${cleaned}`;
  }
  
  // Default: assume it's a local number without 0
  return `+234${cleaned}`;
};

/**
 * Get customer-friendly status message
 */
const getStatusMessage = (status) => {
  const statusMap = {
    'Pending': 'Your order has been received and is being processed.',
    'Confirmed': 'Your order has been confirmed and will be picked up soon.',
    'Assigned': 'A rider has been assigned to your order.',
    'Picked Up': 'Your order has been picked up and is on the way!',
    'In Transit': 'Your order is on the way to you.',
    'Delivered': 'Your order has been delivered. Thank you for using Go7!',
    'Cancelled': 'Your order has been cancelled.',
    'Failed': 'There was an issue with your order. Please contact support.'
  };
  
  return statusMap[status] || `Order status updated to: ${status}`;
};

/**
 * Send WhatsApp message using Meta Cloud API
 * Uses template message format for compliance
 */
const sendWhatsAppMessage = async (phone, name, orderCode, status, trackingUrl) => {
  if (!WHATSAPP_PHONE_ID || !META_TOKEN) {
    console.warn('⚠️ WhatsApp credentials not configured. Skipping notification.');
    return { success: false, reason: 'credentials_missing' };
  }

  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone) {
    console.warn('⚠️ Invalid phone number provided:', phone);
    return { success: false, reason: 'invalid_phone' };
  }

  try {
    // Template-based message for compliance
    // Note: You need to create this template in Meta Business Manager first
    const payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: "order_update", // Must match approved template name
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: name },
              { type: "text", text: orderCode },
              { type: "text", text: status },
              { type: "text", text: trackingUrl }
            ]
          }
        ]
      }
    };

    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${META_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ WhatsApp message sent to ${formattedPhone}:`, response.data);
    return { success: true, messageId: response.data.messages?.[0]?.id };

  } catch (error) {
    console.error('❌ WhatsApp API error:', {
      phone: formattedPhone,
      status,
      error: error.response?.data || error.message
    });
    return { 
      success: false, 
      reason: 'api_error',
      error: error.response?.data || error.message 
    };
  }
};

/**
 * Alternative: Send simple text message (for testing or fallback)
 * Note: This requires WhatsApp Business API approval for text messages
 */
const sendSimpleTextMessage = async (phone, message) => {
  if (!WHATSAPP_PHONE_ID || !META_TOKEN) {
    console.warn('⚠️ WhatsApp credentials not configured.');
    return { success: false, reason: 'credentials_missing' };
  }

  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone) {
    return { success: false, reason: 'invalid_phone' };
  }

  try {
    const payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "text",
      text: { body: message }
    };

    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${META_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ WhatsApp text sent to ${formattedPhone}`);
    return { success: true, messageId: response.data.messages?.[0]?.id };

  } catch (error) {
    console.error('❌ WhatsApp text message error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
};

/**
 * 🚀 MAIN FUNCTION: Firebase Trigger
 * Listens for order status updates and sends WhatsApp notifications
 */
exports.sendWhatsAppOrderUpdate = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // Only trigger when status changes
    if (before.status === after.status) {
      console.log(`ℹ️ Order ${orderId} updated but status unchanged. Skipping WhatsApp.`);
      return null;
    }

    console.log(`📊 Order ${orderId} status changed: ${before.status} → ${after.status}`);

    // Extract customer details
    const phone = after.recipientInfo?.phone 
                  || after.deliveryDetails?.phone 
                  || after.userPhone 
                  || after.pickup?.phone;
    
    if (!phone) {
      console.warn(`⚠️ No phone number found for order ${orderId}. Cannot send WhatsApp.`);
      return null;
    }

    const name = after.recipientInfo?.name 
                 || after.deliveryDetails?.name 
                 || after.userName 
                 || 'Customer';
    
    const orderCode = after.orderCode || `GO7-${orderId.slice(-6).toUpperCase()}`;
    const status = after.status;
    const trackingUrl = `https://go7.ng/track/${orderCode}`;

    // Log notification attempt
    console.log(`📱 Sending WhatsApp to ${phone} for order ${orderCode} (${status})`);

    // Send WhatsApp notification
    const result = await sendWhatsAppMessage(phone, name, orderCode, status, trackingUrl);

    // Log result to Firestore for tracking
    try {
      await change.after.ref.update({
        'notifications.whatsapp': admin.firestore.FieldValue.arrayUnion({
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: after.status,
          phone: formatPhoneNumber(phone),
          success: result.success,
          messageId: result.messageId || null,
          reason: result.reason || null
        })
      });
    } catch (logError) {
      console.error('Failed to log WhatsApp notification:', logError);
    }

    return result;
  });

/**
 * 📲 MANUAL TRIGGER: Send WhatsApp notification via HTTP
 * Usage: POST https://your-region-your-project.cloudfunctions.net/sendManualWhatsApp
 * Body: { orderId: "abc123" }
 */
exports.sendManualWhatsApp = functions.https.onCall(async (data, context) => {
  const { orderId } = data;

  if (!orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId is required');
  }

  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  try {
    const orderRef = admin.firestore().collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found');
    }

    const orderData = orderSnap.data();
    const phone = orderData.recipientInfo?.phone 
                  || orderData.deliveryDetails?.phone 
                  || orderData.userPhone;
    
    if (!phone) {
      throw new functions.https.HttpsError('failed-precondition', 'No phone number on order');
    }

    const name = orderData.recipientInfo?.name || 'Customer';
    const orderCode = orderData.orderCode || `GO7-${orderId.slice(-6).toUpperCase()}`;
    const status = orderData.status;
    const trackingUrl = `https://go7.ng/track/${orderCode}`;

    const result = await sendWhatsAppMessage(phone, name, orderCode, status, trackingUrl);

    return {
      success: result.success,
      messageId: result.messageId,
      phone: formatPhoneNumber(phone),
      orderCode
    };

  } catch (error) {
    console.error('Manual WhatsApp send error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Export helper functions for use in other modules
module.exports = {
  sendWhatsAppOrderUpdate: exports.sendWhatsAppOrderUpdate,
  sendManualWhatsApp: exports.sendManualWhatsApp,
  sendWhatsAppMessage,
  sendSimpleTextMessage,
  formatPhoneNumber,
  getStatusMessage
};
