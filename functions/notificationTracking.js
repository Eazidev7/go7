/**
 * 📊 WHATSAPP NOTIFICATION TRACKING
 * Admin dashboard functions for viewing WhatsApp notification logs
 * Date: October 23, 2025
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Get all WhatsApp notifications with filtering and pagination
 * HTTP Callable Function
 */
exports.getWhatsAppNotifications = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  // TODO: Add admin role check
  // if (!context.auth.token.admin) {
  //   throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  // }

  try {
    const {
      limit = 50,
      status = null, // SENT, FAILED, RETRIED
      messageType = null, // CONFIRMED, OUT_FOR_DELIVERY, DELIVERED, VENDOR_NEW_ORDER
      orderId = null,
      recipientType = null, // customer | vendor
      startAfter = null // For pagination
    } = data;

    let query = db.collection('notifications').orderBy('timestamp', 'desc');

    // Apply filters
    if (status) {
      query = query.where('status', '==', status);
    }

    if (messageType) {
      query = query.where('messageType', '==', messageType);
    }

    if (orderId) {
      query = query.where('orderId', '==', orderId);
    }

    if (recipientType) {
      query = query.where('recipientType', '==', recipientType);
    }

    // Pagination
    if (startAfter) {
      const startDoc = await db.collection('notifications').doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    // Limit results
    query = query.limit(limit);

    const snapshot = await query.get();

    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toISOString() || null
      });
    });

    // Get total count for pagination
    let totalCount = 0;
    try {
      const countQuery = db.collection('notifications');
      const countSnapshot = await countQuery.count().get();
      totalCount = countSnapshot.data().count;
    } catch (error) {
      console.warn('Count query not supported, using snapshot size');
      totalCount = notifications.length;
    }

    return {
      success: true,
      notifications,
      count: notifications.length,
      totalCount,
      hasMore: snapshot.size === limit
    };

  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get notification statistics for dashboard
 * HTTP Callable Function
 */
exports.getNotificationStats = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  try {
    const { timeRange = '24h' } = data;

    // Calculate time filter
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get notifications in time range
    const snapshot = await db.collection('notifications')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startTime))
      .get();

    // Calculate statistics
    const stats = {
      total: 0,
      sent: 0,
      failed: 0,
      retried: 0,
      byMessageType: {
        CONFIRMED: 0,
        OUT_FOR_DELIVERY: 0,
        DELIVERED: 0
      },
      recentFailures: []
    };

    snapshot.forEach(doc => {
      const data = doc.data();
      stats.total++;

      // Count by status
      if (data.status === 'SENT') stats.sent++;
      if (data.status === 'FAILED') stats.failed++;
      if (data.status === 'RETRIED') stats.retried++;

      // Count by message type
      if (data.messageType in stats.byMessageType) {
        stats.byMessageType[data.messageType]++;
      }

      // Collect recent failures
      if (data.status === 'FAILED' && stats.recentFailures.length < 10) {
        stats.recentFailures.push({
          id: doc.id,
          orderId: data.orderId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          messageType: data.messageType,
          details: data.details,
          timestamp: data.timestamp?.toDate().toISOString() || null
        });
      }
    });

    // Calculate success rate
    const totalAttempts = stats.sent + stats.failed;
    stats.successRate = totalAttempts > 0 
      ? ((stats.sent / totalAttempts) * 100).toFixed(2) 
      : 0;

    return {
      success: true,
      stats,
      timeRange
    };

  } catch (error) {
    console.error('❌ Error calculating stats:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get notifications for a specific order
 * HTTP Callable Function
 */
exports.getOrderNotifications = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { orderId } = data;

  if (!orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId is required');
  }

  try {
    const snapshot = await db.collection('notifications')
      .where('orderId', '==', orderId)
      .orderBy('timestamp', 'desc')
      .get();

    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toISOString() || null
      });
    });

    return {
      success: true,
      orderId,
      notifications,
      count: notifications.length
    };

  } catch (error) {
    console.error('❌ Error fetching order notifications:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Retry failed notification
 * HTTP Callable Function
 */
exports.retryFailedNotification = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { notificationId } = data;

  if (!notificationId) {
    throw new functions.https.HttpsError('invalid-argument', 'notificationId is required');
  }

  try {
    // Get notification document
    const notificationDoc = await db.collection('notifications').doc(notificationId).get();

    if (!notificationDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Notification not found');
    }

    const notification = notificationDoc.data();

    // Only retry failed notifications
    if (notification.status !== 'FAILED') {
      throw new functions.https.HttpsError('failed-precondition', 'Only failed notifications can be retried');
    }

    // Get order data
    const orderDoc = await db.collection('orders').doc(notification.orderId).get();

    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found');
    }

    const orderData = orderDoc.data();

    // Import and call sendWhatsApp
    const { sendWhatsApp } = require('./whatsappNotifier');

    const result = await sendWhatsApp(
      notification.customerPhone,
      notification.messageType,
      notification.orderId,
      {
        customerName: notification.customerName,
        orderType: orderData.orderType || orderData.serviceType,
        orderAmount: orderData.total || orderData.orderAmount
      }
    );

    return {
      success: result.success,
      result,
      message: result.success 
        ? 'Notification resent successfully' 
        : 'Retry failed: ' + result.error
    };

  } catch (error) {
    console.error('❌ Error retrying notification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

module.exports = {
  getWhatsAppNotifications: exports.getWhatsAppNotifications,
  getNotificationStats: exports.getNotificationStats,
  getOrderNotifications: exports.getOrderNotifications,
  retryFailedNotification: exports.retryFailedNotification
};
