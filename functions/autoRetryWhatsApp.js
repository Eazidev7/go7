/**
 * 🔄 GO7 WHATSAPP AUTO-RETRY SYSTEM
 * Automatically retries failed WhatsApp notifications every 2 minutes
 * Location: Abeokuta, Nigeria
 * Date: October 23, 2025
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { sendWhatsApp } = require('./whatsappNotifier');

const db = admin.firestore();

/**
 * 🔄 AUTO-RETRY FAILED WHATSAPP NOTIFICATIONS
 * Runs every 2 minutes via Cloud Scheduler (Pub/Sub)
 * 
 * LOGIC:
 * - Fetch all FAILED notifications with retryCount < 3
 * - Attempt to resend each message
 * - Update status to RETRIED on success, increment retryCount on failure
 * - Maximum 3 retry attempts per notification
 * 
 * SETUP REQUIRED:
 * 1. Enable Cloud Scheduler API in Google Cloud Console
 * 2. Deploy this function: firebase deploy --only functions:autoRetryWhatsApp
 * 3. Cloud Scheduler will auto-create "every 2 minutes" job
 */
exports.autoRetryWhatsApp = functions.pubsub
  .schedule('every 10 minutes')
  .timeZone('Africa/Lagos') // Nigerian timezone
  .onRun(async (context) => {
    console.log('🔄 Starting auto-retry job for failed WhatsApp notifications...');

    try {
      // Query failed notifications — 1 auto-retry max (each retry is a paid message)
      const failedSnapshot = await db.collection('notifications')
        .where('status', '==', 'FAILED')
        .where('retryCount', '<', 1)
        .get();

      if (failedSnapshot.empty) {
        console.log('✅ No failed notifications to retry');
        return null;
      }

      console.log(`📊 Found ${failedSnapshot.size} failed notifications to retry`);

      // Process each failed notification
      const retryPromises = failedSnapshot.docs.map(async (doc) => {
        const notificationId = doc.id;
        const data = doc.data();
        const { orderId, customerPhone, messageType, retryCount, customerName } = data;

        try {
          console.log(`🔄 Retrying notification ${notificationId} for order ${orderId} (Retry ${retryCount + 1}/1)`);

          // Fetch order data for context
          let orderData = { customerName };
          try {
            const orderDoc = await db.collection('orders').doc(orderId).get();
            if (orderDoc.exists) {
              orderData = orderDoc.data();
            }
          } catch (err) {
            console.warn(`⚠️ Could not fetch order ${orderId}, using notification data`);
          }

          // Attempt to send WhatsApp message
          const result = await sendWhatsApp(
            customerPhone,
            messageType,
            orderId,
            orderData,
            1 // Single attempt (not 3, since this is a scheduled retry)
          );

          if (result.success) {
            // SUCCESS - Update notification to RETRIED
            await doc.ref.update({
              status: 'RETRIED',
              retryCount: admin.firestore.FieldValue.increment(1),
              lastRetry: admin.firestore.FieldValue.serverTimestamp(),
              details: `Auto-retry succeeded on attempt ${retryCount + 1}`,
              messageId: result.messageId || null
            });

            console.log(`✅ Successfully retried notification ${notificationId} for order ${orderId}`);
            return { success: true, notificationId, orderId };

          } else {
            // FAILED AGAIN - Increment retry count, keep status FAILED
            await doc.ref.update({
              retryCount: admin.firestore.FieldValue.increment(1),
              lastRetry: admin.firestore.FieldValue.serverTimestamp(),
              details: `Auto-retry attempt ${retryCount + 1}/1 failed: ${result.error || 'Unknown error'}`
            });

            console.warn(`⚠️ Auto-retry failed for notification ${notificationId} (${retryCount + 1}/1)`);
            return { success: false, notificationId, orderId, error: result.error };
          }

        } catch (error) {
          console.error(`❌ Error processing notification ${notificationId}:`, error);

          // Update retry count even on exception
          await doc.ref.update({
            retryCount: admin.firestore.FieldValue.increment(1),
            lastRetry: admin.firestore.FieldValue.serverTimestamp(),
            details: `Auto-retry error: ${error.message}`
          });

          return { success: false, notificationId, orderId, error: error.message };
        }
      });

      // Wait for all retry attempts to complete
      const results = await Promise.allSettled(retryPromises);

      // Count successes and failures
      const successes = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failures = results.filter(r => r.status === 'rejected' || !r.value?.success).length;

      console.log(`✅ Auto-retry job completed:`);
      console.log(`   - Total processed: ${failedSnapshot.size}`);
      console.log(`   - Successes: ${successes}`);
      console.log(`   - Failures: ${failures}`);

      return {
        processed: failedSnapshot.size,
        successes,
        failures,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Auto-retry job failed:', error);
      throw error;
    }
  });

/**
 * 🧪 MANUAL TRIGGER FOR AUTO-RETRY (HTTP Callable)
 * Allows admins to manually trigger the auto-retry job for testing
 * 
 * Usage from frontend:
 * const triggerRetry = httpsCallable(functions, 'triggerAutoRetryWhatsApp');
 * const result = await triggerRetry();
 */
exports.triggerAutoRetryWhatsApp = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be logged in to trigger auto-retry'
    );
  }

  // TODO: Uncomment for admin-only access
  // if (!context.auth.token.admin) {
  //   throw new functions.https.HttpsError(
  //     'permission-denied',
  //     'Only admins can manually trigger auto-retry'
  //   );
  // }

  console.log(`🔧 Manual auto-retry triggered by user ${context.auth.uid}`);

  try {
    // Query failed notifications — 1 auto-retry max (each retry is a paid message)
    const failedSnapshot = await db.collection('notifications')
      .where('status', '==', 'FAILED')
      .where('retryCount', '<', 1)
      .get();

    if (failedSnapshot.empty) {
      return {
        success: true,
        message: 'No failed notifications to retry',
        processed: 0
      };
    }

    console.log(`📊 Found ${failedSnapshot.size} failed notifications to retry`);

    // Process each failed notification (same logic as scheduled function)
    const retryPromises = failedSnapshot.docs.map(async (doc) => {
      const notificationId = doc.id;
      const data = doc.data();
      const { orderId, customerPhone, messageType, retryCount, customerName } = data;

      try {
        // Fetch order data
        let orderData = { customerName };
        try {
          const orderDoc = await db.collection('orders').doc(orderId).get();
          if (orderDoc.exists) {
            orderData = orderDoc.data();
          }
        } catch (err) {
          console.warn(`⚠️ Could not fetch order ${orderId}`);
        }

        // Attempt to send WhatsApp
        const result = await sendWhatsApp(customerPhone, messageType, orderId, orderData, 1);

        if (result.success) {
          await doc.ref.update({
            status: 'RETRIED',
            retryCount: admin.firestore.FieldValue.increment(1),
            lastRetry: admin.firestore.FieldValue.serverTimestamp(),
            details: `Manual retry succeeded on attempt ${retryCount + 1}`,
            messageId: result.messageId || null
          });

          return { success: true, notificationId, orderId };
        } else {
          await doc.ref.update({
            retryCount: admin.firestore.FieldValue.increment(1),
            lastRetry: admin.firestore.FieldValue.serverTimestamp(),
            details: `Manual retry attempt ${retryCount + 1}/1 failed: ${result.error}`
          });

          return { success: false, notificationId, orderId, error: result.error };
        }

      } catch (error) {
        await doc.ref.update({
          retryCount: admin.firestore.FieldValue.increment(1),
          lastRetry: admin.firestore.FieldValue.serverTimestamp(),
          details: `Manual retry error: ${error.message}`
        });

        return { success: false, notificationId, orderId, error: error.message };
      }
    });

    const results = await Promise.allSettled(retryPromises);
    const successes = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failures = results.filter(r => r.status === 'rejected' || !r.value?.success).length;

    return {
      success: true,
      message: `Processed ${failedSnapshot.size} failed notifications`,
      processed: failedSnapshot.size,
      successes,
      failures,
      details: results.map(r => r.value || { error: r.reason })
    };

  } catch (error) {
    console.error('❌ Manual auto-retry failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
