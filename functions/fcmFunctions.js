const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

/**
 * Cloud Function to send a test notification to a specific FCM token
 * This function is useful for testing FCM setup and notification display
 * 
 * Expected parameters:
 * - token: FCM token to send notification to
 * - notification: { title, body } for the notification
 * - data: Additional data payload for the notification
 */
exports.sendTestNotification = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to send test notifications'
    );
  }
  
  // Validate required parameters
  if (!data.token) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'FCM token is required'
    );
  }
  
  try {
    // Prepare message payload
    const message = {
      token: data.token,
      notification: {
        title: data.notification?.title || 'GO7 Test Notification',
        body: data.notification?.body || 'This is a test notification'
      },
      data: {
        ...data.data,
        timestamp: Date.now().toString(),
        userId: context.auth.uid
      },
      android: {
        priority: 'high',
        notification: {
          icon: 'notification_icon',
          color: '#03A9F4',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          icon: '/icons/go7-icon-192.png',
          badge: '/icons/go7-badge-72.png'
        },
        fcmOptions: {
          link: data.data?.clickAction || '/'
        }
      }
    };
    
    // Send message
    const response = await admin.messaging().send(message);
    
    // Log success for analytics
    functions.logger.info('Test notification sent', {
      messageId: response,
      userId: context.auth.uid,
      token: data.token.substring(0, 10) + '...',
      notificationType: data.data?.type || 'test'
    });
    
    // Return success response
    return {
      success: true,
      messageId: response
    };
    
  } catch (error) {
    // Log error
    functions.logger.error('Error sending test notification', {
      error: error.message,
      userId: context.auth.uid,
      token: data.token.substring(0, 10) + '...'
    });
    
    // Return error response
    throw new functions.https.HttpsError(
      'internal',
      'Error sending notification: ' + error.message
    );
  }
});

/**
 * Cloud Function to update a user's FCM token
 * This function is called when a user gets a new FCM token
 * 
 * Expected parameters:
 * - fcmToken: The FCM token to save
 * - platform: The platform (web, android, ios)
 */
exports.updateFCMToken = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to update FCM token'
    );
  }
  
  // Validate required parameters
  if (!data.fcmToken) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'FCM token is required'
    );
  }
  
  try {
    const userId = context.auth.uid;
    const tokenData = {
      token: data.fcmToken,
      platform: data.platform || 'web',
      userId: userId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      deviceInfo: data.deviceInfo || {}
    };
    
    // Store token in the user's tokens collection
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('fcm_tokens')
      .doc(data.fcmToken)
      .set(tokenData);
      
    // Also store in global tokens collection with userId reference
    await admin.firestore()
      .collection('fcm_tokens')
      .doc(data.fcmToken)
      .set({
        ...tokenData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    // Return success
    return { success: true };
    
  } catch (error) {
    // Log error
    functions.logger.error('Error updating FCM token', {
      error: error.message,
      userId: context.auth.uid
    });
    
    // Return error
    throw new functions.https.HttpsError(
      'internal',
      'Error updating FCM token: ' + error.message
    );
  }
});