// 🚚 Go7 Live Delivery Tracking - Firebase Functions
// Handles real-time rider updates, ETA calculation, and notifications

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin if not already done
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const GOOGLE_ETA_REFRESH_MS = 90000;
const GOOGLE_ETA_REFRESH_DISTANCE_METERS = 150;

function locationPoint(value) {
  const lat = Number(value?.lat ?? value?.latitude);
  const lng = Number(value?.lng ?? value?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function distanceMeters(a, b) {
  const from = locationPoint(a);
  const to = locationPoint(b);
  if (!from || !to) return Infinity;
  const rad = (value) => (value * Math.PI) / 180;
  const dLat = rad(to.lat - from.lat);
  const dLng = rad(to.lng - from.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function shouldRefreshGoogleEta(delivery, riderLocation) {
  const lastAt = delivery.lastGoogleEtaAt?.toMillis?.() || 0;
  const elapsed = Date.now() - lastAt;
  if (elapsed >= GOOGLE_ETA_REFRESH_MS) return true;
  return distanceMeters(delivery.lastGoogleEtaLocation, riderLocation) >=
    GOOGLE_ETA_REFRESH_DISTANCE_METERS;
}

// 🔹 1️⃣ RIDER LOCATION UPDATE TRIGGER
// When rider location changes → update delivery ETA + notify user
exports.onRiderLocationUpdate = functions.firestore
  .document('riders/{riderId}')
  .onUpdate(async (change, context) => {
    try {
      const newData = change.after.data();
      const oldData = change.before.data();
      const riderId = context.params.riderId;
      
      // Only process if location actually changed
      if (!newData.location || 
          (oldData.location && 
           newData.location.lat === oldData.location.lat && 
           newData.location.lng === oldData.location.lng)) {
        return null;
      }

      console.log(`🚴‍♂️ Rider ${riderId} location updated:`, newData.location);

      // Get active deliveries for this rider
      const deliveriesSnap = await db.collection('deliveries')
        .where('riderId', '==', riderId)
        .where('status', 'in', ['assigned', 'enroute', 'pickup_complete'])
        .get();

      if (deliveriesSnap.empty) {
        console.log(`No active deliveries found for rider ${riderId}`);
        return null;
      }

      // Process each active delivery
      const updatePromises = deliveriesSnap.docs.map(async (deliveryDoc) => {
        const deliveryData = deliveryDoc.data();
        const deliveryId = deliveryDoc.id;

        try {
          const refreshEta = shouldRefreshGoogleEta(deliveryData, newData.location);

          if (!refreshEta) {
            await deliveryDoc.ref.update({
              currentRiderLocation: newData.location,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              lastLocationUpdate: admin.firestore.FieldValue.serverTimestamp()
            });
            return { deliveryId, eta: deliveryData.etaText || 'unchanged' };
          }

          // Calculate new ETA using Google Distance Matrix
          const eta = await calculateETA(
            newData.location,
            deliveryData.dropoffLocation || deliveryData.dropoffAddress
          );

          // Update delivery with new ETA and rider location
          await deliveryDoc.ref.update({
            currentRiderLocation: newData.location,
            eta: eta.duration,
            etaText: eta.durationText,
            distance: eta.distance,
            distanceText: eta.distanceText,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLocationUpdate: admin.firestore.FieldValue.serverTimestamp(),
            lastGoogleEtaAt: admin.firestore.FieldValue.serverTimestamp(),
            lastGoogleEtaLocation: newData.location
          });

          console.log(`📍 Updated delivery ${deliveryId} - ETA: ${eta.durationText}, Distance: ${eta.distanceText}`);

          // Send proximity notifications
          await checkProximityNotifications(deliveryData, eta, deliveryId);

          return { deliveryId, eta: eta.durationText };
        } catch (error) {
          console.error(`Error updating delivery ${deliveryId}:`, error);
          return null;
        }
      });

      const results = await Promise.all(updatePromises);
      console.log(`✅ Updated ${results.filter(r => r).length} deliveries for rider ${riderId}`);
      
      return results;
    } catch (error) {
      console.error('Error in onRiderLocationUpdate:', error);
      throw error;
    }
  });

// 🔹 2️⃣ DELIVERY STATUS CHANGE TRIGGER  
// When delivery status changes → send notifications
exports.onDeliveryStatusChange = functions.firestore
  .document('deliveries/{orderId}')
  .onUpdate(async (change, context) => {
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();
      const orderId = context.params.orderId;

      // Only process if status actually changed
      if (beforeData.status === afterData.status) {
        return null;
      }

      console.log(`📦 Delivery ${orderId} status changed: ${beforeData.status} → ${afterData.status}`);

      // Define status messages
      const statusMessages = {
        assigned: {
          title: "Rider Assigned! 🚴‍♂️",
          body: "A rider has been assigned to your delivery and is heading to pickup your order.",
          icon: "🚴‍♂️"
        },
        pickup_complete: {
          title: "Order Picked Up! 📦", 
          body: "Your rider has picked up your order and is now heading to you.",
          icon: "📦"
        },
        enroute: {
          title: "On the Way! 🛣️",
          body: "Your rider is now on the way to your delivery location.",
          icon: "🛣️"
        },
        delivered: {
          title: "Delivered! ✅",
          body: "Your order has been successfully delivered. Thank you for choosing Go7!",
          icon: "✅"
        },
        cancelled: {
          title: "Order Cancelled ❌",
          body: "Your delivery has been cancelled. Any charges will be refunded.",
          icon: "❌"
        }
      };

      const message = statusMessages[afterData.status];
      if (!message) {
        console.log(`No notification message defined for status: ${afterData.status}`);
        return null;
      }

      // Send notification to user
      await sendUserNotification(afterData.userId, message.title, message.body, {
        orderId,
        status: afterData.status,
        type: 'delivery_status_update'
      });

      // Handle delivery completion
      if (afterData.status === 'delivered') {
        await handleDeliveryCompletion(orderId, afterData);
      }

      return { orderId, status: afterData.status, notificationSent: true };
    } catch (error) {
      console.error('Error in onDeliveryStatusChange:', error);
      throw error;
    }
  });

// 🔹 3️⃣ ETA CALCULATION SERVICE
async function calculateETA(origin, destination) {
  try {
    const { defineString } = require('firebase-functions/params');
    const apiKey = defineString('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    // Handle different destination formats
    let destinationString;
    if (typeof destination === 'object' && destination.lat && destination.lng) {
      destinationString = `${destination.lat},${destination.lng}`;
    } else {
      destinationString = destination;
    }

    const originString = `${origin.lat},${origin.lng}`;
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
      `origins=${encodeURIComponent(originString)}&` +
      `destinations=${encodeURIComponent(destinationString)}&` +
      `mode=driving&` +
      `traffic_model=best_guess&` +
      `departure_time=now&` +
      `key=${apiKey}`;

    const response = await axios.get(url);
    
    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const element = response.data.rows[0]?.elements[0];
    if (!element || element.status !== 'OK') {
      throw new Error(`Distance Matrix element error: ${element?.status}`);
    }

    return {
      duration: element.duration_in_traffic?.value || element.duration.value, // seconds
      durationText: element.duration_in_traffic?.text || element.duration.text,
      distance: element.distance.value, // meters
      distanceText: element.distance.text
    };
  } catch (error) {
    console.error('Error calculating ETA:', error);
    // Return fallback values
    return {
      duration: 900, // 15 minutes fallback
      durationText: '15 mins',
      distance: 5000, // 5km fallback
      distanceText: '5.0 km'
    };
  }
}

// 🔹 4️⃣ PROXIMITY NOTIFICATIONS
async function checkProximityNotifications(deliveryData, eta, deliveryId) {
  try {
    const durationMinutes = Math.round(eta.duration / 60);
    const distanceMeters = eta.distance;

    // 5-minute warning notification
    if (durationMinutes <= 5 && durationMinutes > 3 && !deliveryData.notified5min) {
      await sendUserNotification(
        deliveryData.userId,
        "Almost There! 🚴‍♂️",
        `Your rider is just ${eta.durationText} away!`,
        { orderId: deliveryId, type: 'proximity_5min' }
      );
      
      await db.collection('deliveries').doc(deliveryId).update({
        notified5min: true
      });
      console.log(`🔔 Sent 5-minute notification for delivery ${deliveryId}`);
    }

    // 2-minute warning notification
    if (durationMinutes <= 2 && !deliveryData.notified2min) {
      await sendUserNotification(
        deliveryData.userId,
        "Arriving Now! 📍",
        `Your rider is ${eta.durationText} away. Please be ready!`,
        { orderId: deliveryId, type: 'proximity_2min' }
      );
      
      await db.collection('deliveries').doc(deliveryId).update({
        notified2min: true
      });
      console.log(`🔔 Sent 2-minute notification for delivery ${deliveryId}`);
    }

    // Very close notification (within 100 meters)
    if (distanceMeters <= 100 && !deliveryData.notifiedArrived) {
      await sendUserNotification(
        deliveryData.userId,
        "Rider Has Arrived! 🎉",
        "Your Go7 rider is outside. Please collect your order.",
        { orderId: deliveryId, type: 'arrived' }
      );
      
      await db.collection('deliveries').doc(deliveryId).update({
        notifiedArrived: true,
        status: 'arrived'
      });
      console.log(`🔔 Sent arrival notification for delivery ${deliveryId}`);
    }
  } catch (error) {
    console.error('Error in proximity notifications:', error);
  }
}

// 🔹 5️⃣ PUSH NOTIFICATION SERVICE
async function sendUserNotification(userId, title, body, data = {}) {
  try {
    // Get user's FCM token
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.error(`User ${userId} not found`);
      return false;
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;
    
    if (!fcmToken) {
      console.log(`No FCM token for user ${userId}`);
      return false;
    }

    // Send FCM notification
    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
        icon: '/icon-192.png',
        badge: '/icon-72.png'
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      android: {
        notification: {
          channel_id: 'delivery_updates',
          priority: 'high',
          default_sound: true,
          default_vibrate_timings: true
        }
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
            'content-available': 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log(`📱 Notification sent to user ${userId}:`, response);

    // Log notification in Firestore for tracking (customer inbox fields)
    await db.collection('notifications').add({
      uid: userId,
      userId,
      title,
      body,
      message: body,
      type: (data && data.type) || 'delivery_status',
      orderId: (data && (data.orderId || data.deliveryId)) || null,
      status: (data && data.status) || null,
      read: false,
      data,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      fcmResponse: response
    });

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

// 🔹 6️⃣ DELIVERY COMPLETION HANDLER
async function handleDeliveryCompletion(orderId, deliveryData) {
  try {
    console.log(`🎉 Processing delivery completion for order ${orderId}`);

    // Update delivery with completion timestamp
    await db.collection('deliveries').doc(orderId).update({
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      finalLocation: deliveryData.currentRiderLocation
    });

    // Send completion notification with confetti trigger
    await sendUserNotification(
      deliveryData.userId,
      "Delivered Successfully! 🎉",
      "Your Go7 order has been delivered. Rate your experience!",
      { 
        orderId, 
        type: 'delivery_completed',
        showConfetti: true 
      }
    );

    // TODO: Send email receipt via Brevo/Resend
    // await sendEmailReceipt(deliveryData.userId, orderId);

    console.log(`✅ Delivery completion processed for order ${orderId}`);
    return true;
  } catch (error) {
    console.error('Error handling delivery completion:', error);
    return false;
  }
}

// 🔹 7️⃣ MANUAL ETA UPDATE ENDPOINT
exports.updateDeliveryETA = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { orderId, riderLocation } = data;
    if (!orderId || !riderLocation) {
      throw new functions.https.HttpsError('invalid-argument', 'orderId and riderLocation required');
    }

    // Get delivery document
    const deliveryDoc = await db.collection('deliveries').doc(orderId).get();
    if (!deliveryDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Delivery not found');
    }

    const deliveryData = deliveryDoc.data();
    
    // Calculate new ETA
    const eta = await calculateETA(riderLocation, deliveryData.dropoffLocation);
    
    // Update delivery
    await deliveryDoc.ref.update({
      currentRiderLocation: riderLocation,
      eta: eta.duration,
      etaText: eta.durationText,
      distance: eta.distance,
      distanceText: eta.distanceText,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      eta: eta.durationText,
      distance: eta.distanceText
    };
  } catch (error) {
    console.error('Error updating delivery ETA:', error);
    throw error;
  }
});

module.exports = {
  onRiderLocationUpdate: exports.onRiderLocationUpdate,
  onDeliveryStatusChange: exports.onDeliveryStatusChange,
  updateDeliveryETA: exports.updateDeliveryETA
};