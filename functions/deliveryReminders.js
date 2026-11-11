// Delivery Reminder System
// Cloud Functions to send reminders for scheduled deliveries

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

// Make sure to initialize admin only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const firestore = admin.firestore();
const messaging = admin.messaging();

/**
 * Cloud Function that runs every minute to check for deliveries
 * that need reminders (15 min for riders, 10 min for customers)
 */
exports.sendScheduledDeliveryReminders = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    try {
      const now = new Date();
      const riderReminderTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
      const customerReminderTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
      
      console.log(`🔔 Checking for delivery reminders at ${now.toISOString()}`);
      
      // Find scheduled deliveries that need rider reminders (15 minutes before pickup)
      const riderReminders = await checkAndSendRiderReminders(riderReminderTime);
      
      // Find scheduled deliveries that need customer reminders (10 minutes before pickup)
      const customerReminders = await checkAndSendCustomerReminders(customerReminderTime);
      
      const totalSent = riderReminders.sent + customerReminders.sent;
      
      if (totalSent > 0) {
        console.log(`✅ Sent ${totalSent} reminders: ${riderReminders.sent} rider, ${customerReminders.sent} customer`);
      }
      
      return {
        riderReminders,
        customerReminders,
        totalSent
      };
      
    } catch (error) {
      console.error('❌ Error processing delivery reminders:', error);
      return null;
    }
  });

/**
 * Check and send rider reminders for deliveries 15 minutes before pickup
 */
async function checkAndSendRiderReminders(reminderTime) {
  try {
    // Find deliveries with riders assigned that need 15-minute reminders
    const deliveriesQuery = await firestore
      .collection('deliveries')
      .where('status', 'in', ['pending', 'assigned'])
      .where('riderId', '!=', null)
      .where('pickupTime', '<=', admin.firestore.Timestamp.fromDate(reminderTime))
      .where('riderReminderSent', '==', false)
      .get();
    
    if (deliveriesQuery.empty) {
      return { sent: 0, failed: 0 };
    }
    
    console.log(`🏍️ Found ${deliveriesQuery.size} deliveries needing rider reminders`);
    
    const batch = firestore.batch();
    let sent = 0;
    let failed = 0;
    
    for (const deliveryDoc of deliveriesQuery.docs) {
      const deliveryData = deliveryDoc.data();
      const deliveryId = deliveryDoc.id;
      
      try {
        // Get rider information
        const riderDoc = await firestore.collection('users').doc(deliveryData.riderId).get();
        
        if (!riderDoc.exists) {
          console.log(`⚠️ Rider ${deliveryData.riderId} not found for delivery ${deliveryId}`);
          failed++;
          continue;
        }
        
        const riderData = riderDoc.data();
        const fcmToken = riderData.fcmToken;
        
        if (fcmToken) {
          // Send FCM notification to rider
          const reminderSent = await sendRiderReminder(deliveryId, deliveryData, riderData, fcmToken);
          
          if (reminderSent) {
            sent++;
          } else {
            failed++;
          }
        } else {
          console.log(`📱 No FCM token for rider ${deliveryData.riderId}`);
          failed++;
        }
        
        // Mark reminder as sent regardless of FCM success
        batch.update(deliveryDoc.ref, {
          riderReminderSent: true,
          riderReminderSentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
      } catch (error) {
        console.error(`❌ Error processing rider reminder for delivery ${deliveryId}:`, error);
        failed++;
      }
    }
    
    // Commit all updates
    await batch.commit();
    
    return { sent, failed };
    
  } catch (error) {
    console.error('❌ Error checking rider reminders:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Check and send customer reminders for deliveries 10 minutes before pickup
 */
async function checkAndSendCustomerReminders(reminderTime) {
  try {
    // Find scheduled deliveries that need 10-minute customer reminders
    const deliveriesQuery = await firestore
      .collection('deliveries')
      .where('status', 'in', ['scheduled', 'pending', 'assigned'])
      .where('pickupTime', '<=', admin.firestore.Timestamp.fromDate(reminderTime))
      .where('customerReminderSent', '==', false)
      .get();
    
    if (deliveriesQuery.empty) {
      return { sent: 0, failed: 0 };
    }
    
    console.log(`👤 Found ${deliveriesQuery.size} deliveries needing customer reminders`);
    
    const batch = firestore.batch();
    let sent = 0;
    let failed = 0;
    
    for (const deliveryDoc of deliveriesQuery.docs) {
      const deliveryData = deliveryDoc.data();
      const deliveryId = deliveryDoc.id;
      
      try {
        // Get customer information
        const customerId = deliveryData.customerId || deliveryData.userId;
        
        if (!customerId) {
          console.log(`⚠️ No customer ID found for delivery ${deliveryId}`);
          failed++;
          continue;
        }
        
        const customerDoc = await firestore.collection('users').doc(customerId).get();
        
        if (!customerDoc.exists) {
          console.log(`⚠️ Customer ${customerId} not found for delivery ${deliveryId}`);
          failed++;
          continue;
        }
        
        const customerData = customerDoc.data();
        const fcmToken = customerData.fcmToken;
        
        if (fcmToken) {
          // Send FCM notification to customer
          const reminderSent = await sendCustomerReminder(deliveryId, deliveryData, customerData, fcmToken);
          
          if (reminderSent) {
            sent++;
          } else {
            failed++;
          }
        } else {
          console.log(`📱 No FCM token for customer ${customerId}`);
          failed++;
        }
        
        // Mark reminder as sent regardless of FCM success
        batch.update(deliveryDoc.ref, {
          customerReminderSent: true,
          customerReminderSentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
      } catch (error) {
        console.error(`❌ Error processing customer reminder for delivery ${deliveryId}:`, error);
        failed++;
      }
    }
    
    // Commit all updates
    await batch.commit();
    
    return { sent, failed };
    
  } catch (error) {
    console.error('❌ Error checking customer reminders:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send reminder notification to rider
 */
async function sendRiderReminder(deliveryId, deliveryData, riderData, fcmToken) {
  try {
    const pickupTime = deliveryData.pickupTime?.toDate() || new Date(deliveryData.scheduledPickupTime);
    
    const notification = {
      title: '🏍️ Upcoming Pickup Reminder',
      body: `Pickup in 15 minutes at ${deliveryData.pickupAddress || 'pickup location'}`,
      icon: '/icons/go7-rider-icon.png'
    };
    
    const data = {
      type: 'pickup_reminder',
      deliveryId: deliveryId,
      reminderType: 'rider_15min',
      pickupTime: pickupTime.toISOString(),
      pickupAddress: deliveryData.pickupAddress || '',
      clickAction: `https://go7delivery.com/rider/delivery/${deliveryId}`
    };
    
    const fcmMessage = createFCMMessage(fcmToken, notification, data);
    
    const response = await messaging.send(fcmMessage);
    
    console.log(`✅ Rider reminder sent for delivery ${deliveryId}: ${response}`);
    
    // Log reminder
    await firestore.collection('reminder_logs').add({
      type: 'rider_pickup_reminder',
      deliveryId: deliveryId,
      recipientId: riderData.uid || deliveryData.riderId,
      recipientType: 'rider',
      fcmResponse: response,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      success: true
    });
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error sending rider reminder for delivery ${deliveryId}:`, error);
    
    // Log error
    await firestore.collection('reminder_logs').add({
      type: 'rider_pickup_reminder',
      deliveryId: deliveryId,
      error: error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      success: false
    });
    
    return false;
  }
}

/**
 * Send reminder notification to customer
 */
async function sendCustomerReminder(deliveryId, deliveryData, customerData, fcmToken) {
  try {
    const pickupTime = deliveryData.pickupTime?.toDate() || new Date(deliveryData.scheduledPickupTime);
    
    const notification = {
      title: '📦 Pickup Starting Soon',
      body: `Your delivery pickup starts in 10 minutes from ${deliveryData.pickupAddress || 'pickup location'}`,
      icon: '/icons/go7-delivery-icon.png'
    };
    
    const data = {
      type: 'pickup_reminder',
      deliveryId: deliveryId,
      reminderType: 'customer_10min',
      pickupTime: pickupTime.toISOString(),
      pickupAddress: deliveryData.pickupAddress || '',
      clickAction: `https://go7delivery.com/track/${deliveryId}`
    };
    
    const fcmMessage = createFCMMessage(fcmToken, notification, data);
    
    const response = await messaging.send(fcmMessage);
    
    console.log(`✅ Customer reminder sent for delivery ${deliveryId}: ${response}`);
    
    // Log reminder
    await firestore.collection('reminder_logs').add({
      type: 'customer_pickup_reminder',
      deliveryId: deliveryId,
      recipientId: customerData.uid || deliveryData.customerId,
      recipientType: 'customer',
      fcmResponse: response,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      success: true
    });
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error sending customer reminder for delivery ${deliveryId}:`, error);
    
    // Log error
    await firestore.collection('reminder_logs').add({
      type: 'customer_pickup_reminder',
      deliveryId: deliveryId,
      error: error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      success: false
    });
    
    return false;
  }
}

/**
 * Helper function to create FCM message structure
 */
function createFCMMessage(token, notification, data) {
  return {
    token: token,
    notification: notification,
    data: data,
    android: {
      notification: {
        sound: 'default',
        priority: 'high',
        channelId: 'go7_delivery_reminders',
        color: '#3B82F6'
      },
      data: data
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          category: 'GO7_REMINDER'
        }
      },
      fcmOptions: {
        imageUrl: '/icons/go7-icon-192.png'
      }
    },
    webpush: {
      notification: {
        ...notification,
        image: '/icons/go7-icon-512.png',
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View Details',
            icon: '/icons/view-icon.png'
          }
        ]
      },
      fcmOptions: {
        link: data.clickAction
      }
    }
  };
}