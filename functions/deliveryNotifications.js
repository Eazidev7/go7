// Delivery Status Notifications
// Functions to send FCM notifications when delivery status changes

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

// Make sure to initialize admin only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const firestore = admin.firestore();
const messaging = admin.messaging();

/**
 * Send FCM notification when delivery status changes
 * Triggered by: /deliveries/{deliveryId}
 * Status notifications:
 * - "assigned" → notify rider
 * - "enroute" → notify customer "Your rider is on the way"
 * - "completed" → notify customer "Delivery completed"
 */
exports.sendDeliveryStatusNotification = functions.firestore
  .document('deliveries/{deliveryId}')
  .onUpdate(async (change, context) => {
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();
      const deliveryId = context.params.deliveryId;

      // Only proceed if status has changed
      if (beforeData.status === afterData.status) {
        return null;
      }

      console.log(`📦 Delivery ${deliveryId} status changed: ${beforeData.status} → ${afterData.status}`);

      const newStatus = afterData.status;
      let fcmToken = null;
      let userId = null;
      let notification = null;
      let userRole = null;

      // Determine recipient and notification content based on status
      switch (newStatus) {
        case 'assigned':
          // Notify rider
          userId = afterData.riderId;
          userRole = 'rider';
          notification = {
            title: 'New Delivery Assigned',
            body: `You have a new delivery to ${afterData.dropoff?.address || 'a customer'}.`,
            icon: '/icons/go7-delivery-icon.png'
          };
          break;

        case 'enroute':
          // Notify customer
          userId = afterData.userId;
          userRole = 'customer';
          notification = {
            title: 'Your Rider is on the Way',
            body: `Your GO7 rider has picked up your order and is on the way to your location.`,
            icon: '/icons/go7-rider-icon.png'
          };
          break;

        case 'completed':
          // Notify customer
          userId = afterData.userId;
          userRole = 'customer';
          notification = {
            title: 'Delivery Completed',
            body: `Your delivery has been completed. Thank you for using GO7!`,
            icon: '/icons/go7-delivery-complete-icon.png'
          };
          break;

        default:
          // No notification for other status changes
          return null;
      }

      // Get user's FCM token
      if (!userId) {
        console.log(`❌ No ${userRole} ID found for delivery ${deliveryId}`);
        return null;
      }

      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        console.log(`❌ User ${userId} not found`);
        return null;
      }

      const userData = userDoc.data();
      fcmToken = userData.fcmToken;

      if (!fcmToken) {
        console.log(`📱 No FCM token found for user ${userId}`);
        return null;
      }

      // Create data payload for app handling
      const data = {
        type: 'delivery_status',
        deliveryId: deliveryId,
        newStatus: newStatus,
        userRole: userRole,
        timestamp: Date.now().toString(),
        clickAction: `https://go7delivery.com/tracking/${deliveryId}`
      };

      // FCM message structure
      const fcmMessage = {
        token: fcmToken,
        notification: notification,
        data: data,
        android: {
          notification: {
            sound: 'default',
            priority: 'high',
            channelId: 'go7_delivery_notifications',
            color: '#3B82F6'
          },
          data: data
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              category: 'GO7_DELIVERY_UPDATE'
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
            actions: [
              {
                action: 'view',
                title: 'View Details',
                icon: '/icons/view-icon.png'
              }
            ]
          },
          fcmOptions: {
            link: `https://go7delivery.com/tracking/${deliveryId}`
          }
        }
      };

      // Send FCM notification
      const response = await messaging.send(fcmMessage);
      
      console.log(`✅ Delivery status notification sent: ${response}`);
      console.log(`📱 Sent to: ${userRole} ${userData.name || userId}`);
      console.log(`📦 Status: ${newStatus}`);

      // Customer in-app inbox (Notifications → Recent)
      if (userRole === 'customer') {
        try {
          const { writeCustomerInboxNotification } = require('./customerInbox');
          await writeCustomerInboxNotification({
            uid: userId,
            userId,
            title: notification.title,
            message: notification.body,
            type: 'delivery_status',
            orderId: deliveryId,
            status: newStatus,
          });
        } catch (inboxErr) {
          console.warn('customer inbox write failed:', inboxErr.message);
        }
      }

      // Update notification stats (optional)
      await firestore.collection('notification_stats').add({
        type: 'delivery_status',
        deliveryId: deliveryId,
        userId: userId,
        userRole: userRole,
        status: newStatus,
        fcmResponse: response,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        success: true
      });

      return response;

    } catch (error) {
      console.error('Error sending delivery status notification:', error);
      return null;
    }
  });