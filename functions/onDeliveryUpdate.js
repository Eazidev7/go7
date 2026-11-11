const functions = require('firebase-functions/v1');
const { defineString } = require('firebase-functions/params');
const { sendGo7Email } = require('./go7Mail');
const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin
admin.initializeApp();

// Termii API configuration
const TERMII_API_KEY = defineString('TERMII_API_KEY');
const TERMII_SENDER_ID = defineString('TERMII_SENDER_ID');

// Resend API configuration  
// (uses go7Mail.sendGo7Email — RESEND_API_KEY read inside go7Mail.js)

// Delivery status change notification
exports.onDeliveryUpdate = functions.firestore
  .document('deliveries/{deliveryId}')
  .onUpdate(async (change, context) => {
    const deliveryId = context.params.deliveryId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    console.log(`📦 Delivery ${deliveryId} updated from ${beforeData.status} to ${afterData.status}`);

    // Check if status changed
    if (beforeData.status === afterData.status) {
      return null; // No status change, exit
    }

    const statusChanged = {
      from: beforeData.status,
      to: afterData.status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      deliveryId: deliveryId
    };

    try {
      // Send notifications based on new status
      await Promise.all([
        sendSMSNotification(afterData, statusChanged),
        sendEmailNotification(afterData, statusChanged),
        sendPushNotification(afterData, statusChanged)
      ]);

      // Log notification sent
      await admin.firestore()
        .collection('notifications')
        .doc(deliveryId)
        .collection('logs')
        .add({
          type: 'status_change',
          statusChange: statusChanged,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          success: true
        });

      console.log(`✅ Notifications sent for delivery ${deliveryId}`);
      
    } catch (error) {
      console.error(`❌ Failed to send notifications for delivery ${deliveryId}:`, error);
      
      // Log error
      await admin.firestore()
        .collection('notifications')
        .doc(deliveryId)
        .collection('logs')
        .add({
          type: 'status_change',
          statusChange: statusChanged,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          success: false,
          error: error.message
        });
    }

    return null;
  });

// Send SMS via Termii
async function sendSMSNotification(delivery, statusChange) {
  if (!delivery.customer?.phone || !TERMII_API_KEY) {
    console.log('Skipping SMS: missing phone or API key');
    return;
  }

  const message = getStatusMessage(statusChange.to, delivery);
  
  const smsPayload = {
    to: delivery.customer.phone,
    from: TERMII_SENDER_ID,
    sms: message,
    type: "plain",
    api_key: TERMII_API_KEY,
    channel: "generic"
  };

  try {
    const response = await axios.post('https://api.ng.termii.com/api/sms/send', smsPayload);
    console.log(`📱 SMS sent successfully:`, response.data);
    return response.data;
  } catch (error) {
    console.error('❌ SMS sending failed:', error.response?.data || error.message);
    throw error;
  }
}

// Send Email via Resend
async function sendEmailNotification(delivery, statusChange) {
  if (!delivery.customer?.email) {
    console.log('Skipping Email: missing customer email');
    return;
  }

  const subject = getEmailSubject(statusChange.to, delivery);
  const htmlContent = getEmailContent(statusChange.to, delivery, statusChange.deliveryId);

  const result = await sendGo7Email({
    to: delivery.customer.email,
    subject,
    html: htmlContent,
  });

  if (!result.success) {
    throw new Error(result.error || 'Email send failed');
  }

  console.log(`📧 Email sent successfully via ${result.from}:`, result.id);
  return { id: result.id };
}

// Send Push Notification via FCM
async function sendPushNotification(delivery, statusChange) {
  if (!delivery.customer?.fcmToken) {
    console.log('Skipping Push: missing FCM token');
    return;
  }

  const notification = {
    title: getPushTitle(statusChange.to),
    body: getStatusMessage(statusChange.to, delivery),
    icon: '/assets/icons/go7-logo.png'
  };

  const data = {
    type: 'delivery_status',
    deliveryId: statusChange.deliveryId,
    status: statusChange.to,
    timestamp: Date.now().toString()
  };

  const message = {
    token: delivery.customer.fcmToken,
    notification: notification,
    data: data,
    android: {
      priority: 'high',
      notification: {
        channelId: 'delivery_updates',
        priority: 'high',
        defaultSound: true
      }
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: notification.title,
            body: notification.body
          },
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`🔔 Push notification sent successfully:`, response);
    return response;
  } catch (error) {
    console.error('❌ Push notification failed:', error);
    throw error;
  }
}

// Helper functions for message content
function getStatusMessage(status, delivery) {
  const messages = {
    'assigned': `🏍️ Great! Your Go7 rider has been assigned and is heading to pickup your order from ${delivery.pickup?.address || 'pickup location'}.`,
    'en_route': `🛣️ Your Go7 rider is on the way to collect your order. Track live progress in the app!`,
    'picked_up': `📦 Your order has been picked up! Your Go7 rider is now heading to ${delivery.dropoff?.address || 'your location'}.`,
    'delivered': `🎉 Delivered! Your Go7 order has been successfully delivered. Thank you for choosing Go7 Logistics!`
  };
  
  return messages[status] || `📦 Your Go7 delivery status has been updated to: ${status}`;
}

function getPushTitle(status) {
  const titles = {
    'assigned': 'Rider Assigned! 🏍️',
    'en_route': 'Rider En Route 🛣️',
    'picked_up': 'Order Picked Up! 📦',
    'delivered': 'Delivered! 🎉'
  };
  
  return titles[status] || 'Delivery Update 📦';
}

function getEmailSubject(status, delivery) {
  const subjects = {
    'assigned': 'Your Go7 Rider Has Been Assigned! 🏍️',
    'en_route': 'Your Go7 Rider is On the Way 🛣️',
    'picked_up': 'Your Order Has Been Picked Up! 📦',
    'delivered': 'Your Go7 Order Has Been Delivered! 🎉'
  };
  
  return subjects[status] || 'Go7 Delivery Update 📦';
}

function getEmailContent(status, delivery, deliveryId) {
  const baseUrl = 'https://go7logistics.com';
  const trackingUrl = `${baseUrl}/track/${deliveryId}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Go7 Delivery Update</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${baseUrl}/assets/logos/go7-logo-red.png" alt="Go7 Logistics" style="height: 50px;">
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h2 style="color: #E0001B; margin: 0 0 10px 0;">${getEmailSubject(status, delivery)}</h2>
        <p style="margin: 0; font-size: 16px;">${getStatusMessage(status, delivery)}</p>
      </div>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #333;">Delivery Details</h3>
        <p><strong>Delivery ID:</strong> ${deliveryId}</p>
        <p><strong>From:</strong> ${delivery.pickup?.address || 'Pickup location'}</p>
        <p><strong>To:</strong> ${delivery.dropoff?.address || 'Dropoff location'}</p>
        ${delivery.rider ? `<p><strong>Rider:</strong> ${delivery.rider.name} ⭐ ${delivery.rider.rating || '4.9'}</p>` : ''}
        ${delivery.eta ? `<p><strong>ETA:</strong> ${new Date(delivery.eta.seconds * 1000).toLocaleString()}</p>` : ''}
      </div>

      <div style="text-align: center; margin-bottom: 20px;">
        <a href="${trackingUrl}" 
           style="background: #E0001B; color: white; padding: 15px 30px; border-radius: 25px; text-decoration: none; font-weight: 600; display: inline-block;">
          🗺️ Track Live
        </a>
      </div>

      <div style="text-align: center; font-size: 14px; color: #666;">
        <p>Need help? Contact Go7 Support</p>
        <p>📞 +234-800-GO7-HELP | 📧 support@go7logistics.com</p>
      </div>

    </body>
    </html>
  `;
}