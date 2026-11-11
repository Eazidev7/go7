/**
 * 🏪 GO7 VENDOR OFFLINE AUTO-TIMEOUT CLOUD FUNCTION
 * Runs every 10 minutes to check and process queued orders
 * 
 * Deploy with: firebase deploy --only functions:processQueuedOrders
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { sendVendorTemplate } = require('./vendorOrderWhatsApp');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Scheduled function that runs every 10 minutes
 * Checks all queued orders and processes timeouts
 */
exports.processQueuedOrders = functions.pubsub
  .schedule('every 10 minutes')
  .timeZone('Africa/Lagos')
  .onRun(async (context) => {
    console.log('🕐 Starting queued orders auto-timeout check...');
    
    try {
      // Get all queued orders
      const ordersSnapshot = await db.collection('orders')
        .where('orderStatus', '==', 'queued_vendor_offline')
        .get();
      
      if (ordersSnapshot.empty) {
        console.log('✅ No queued orders found');
        return null;
      }
      
      console.log(`📦 Found ${ordersSnapshot.size} queued orders`);
      
      const now = new Date();
      const processedOrders = [];
      
      // Process each queued order
      for (const orderDoc of ordersSnapshot.docs) {
        const orderData = orderDoc.data();
        const orderId = orderDoc.id;
        
        // Check if timeout has passed
        const timeoutAt = new Date(orderData.autoTimeoutAt);
        
        if (now < timeoutAt) {
          console.log(`⏰ Order ${orderId} timeout not reached yet`);
          continue;
        }
        
        console.log(`⚠️ Order ${orderId} has reached timeout`);
        
        // Check vendor status one more time
        const vendorDoc = await db.collection('vendors').doc(orderData.vendorId).get();
        
        if (!vendorDoc.exists) {
          console.error(`❌ Vendor ${orderData.vendorId} not found`);
          continue;
        }
        
        const vendorData = vendorDoc.data();
        const isVendorOnline = vendorData.isOnline || false;
        
        if (isVendorOnline) {
          // Vendor came online, move order to pending
          await orderDoc.ref.update({
            orderStatus: 'pending_vendor',
            vendorStatus: 'online',
            processedFromQueueAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // Send alert to vendor
          await db.collection('vendors')
            .doc(orderData.vendorId)
            .collection('alerts')
            .add({
              type: 'new_order',
              orderId: orderData.orderId,
              orderTotal: orderData.total,
              customerName: orderData.customer?.name || 'Customer',
              itemCount: orderData.items?.length || 0,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
              actionRequired: true,
              message: `New order #${orderData.orderId.slice(-6)} - ₦${orderData.total?.toLocaleString()}`
            });

          const vendor = vendorData;
          const itemsText = Array.isArray(orderData.items)
            ? orderData.items.map((item) => `${item.quantity || 1}x ${item.name || item.title || 'Item'}`).join(', ')
            : 'See GO7 for full items';
          const vendorPhone = vendor.phone || vendor.whatsapp || vendor.contactPhone || orderData.vendorPhone;
          if (vendorPhone) {
            const whatsappResult = await sendVendorTemplate(vendorPhone, {
              vendorName: vendor.businessName || vendor.name || 'Vendor',
              displayId: orderData.orderId || orderId,
              itemsText,
              total: orderData.total,
            });
            await orderDoc.ref.set({
              vendorWhatsAppQueuedResult: whatsappResult,
              vendorWhatsAppQueuedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          }
          
          console.log(`✅ Order ${orderId} moved to pending_vendor`);
          processedOrders.push({ orderId, action: 'moved_to_pending' });
          
        } else {
          // Vendor still offline, process refund
          await processAutoRefund(orderDoc, orderData);
          processedOrders.push({ orderId, action: 'auto_refunded' });
          console.log(`💰 Order ${orderId} auto-refunded`);
        }
      }
      
      console.log(`✅ Processed ${processedOrders.length} queued orders`);
      return { processed: processedOrders.length, orders: processedOrders };
      
    } catch (error) {
      console.error('❌ Error processing queued orders:', error);
      throw error;
    }
  });

/**
 * Process automatic refund for order
 * @param {DocumentSnapshot} orderDoc - Order document reference
 * @param {Object} orderData - Order data
 */
async function processAutoRefund(orderDoc, orderData) {
  try {
    // Update order status to auto_refunded
    await orderDoc.ref.update({
      orderStatus: 'auto_refunded',
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      refundReason: 'Vendor unavailable - auto timeout',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Add refund transaction to user's wallet
    await db.collection('users')
      .doc(orderData.userId)
      .collection('transactions')
      .add({
        type: 'refund',
        amount: orderData.total,
        orderId: orderData.orderId,
        reason: 'Vendor unavailable',
        status: 'completed',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    // Update user's wallet balance
    const userDoc = await db.collection('users').doc(orderData.userId).get();
    
    if (userDoc.exists) {
      const currentBalance = userDoc.data().walletBalance || 0;
      await userDoc.ref.update({
        walletBalance: currentBalance + orderData.total
      });
    }
    
    // Send notification to user
    await db.collection('users')
      .doc(orderData.userId)
      .collection('notifications')
      .add({
        type: 'refund_processed',
        orderId: orderData.orderId,
        amount: orderData.total,
        title: 'Refund Processed',
        message: `₦${orderData.total.toLocaleString()} refunded to your wallet. Vendor was unavailable.`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        icon: '💰'
      });
    
    console.log(`💰 Auto-refund processed for order ${orderDoc.id}`);
    
  } catch (error) {
    console.error(`❌ Error processing refund for order ${orderDoc.id}:`, error);
    throw error;
  }
}

/**
 * Firestore trigger - Process queued orders when vendor comes online
 */
exports.handleVendorOffline = functions.firestore
  .document('vendors/{vendorId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const vendorId = context.params.vendorId;
    
    // Check if vendor just came online
    const wasOffline = !beforeData.isOnline;
    const isNowOnline = afterData.isOnline;
    
    if (wasOffline && isNowOnline) {
      console.log(`🏪 Vendor ${vendorId} came online - processing queued orders`);
      
      // Get all queued orders for this vendor
      const queuedOrders = await db.collection('orders')
        .where('vendorId', '==', vendorId)
        .where('orderStatus', '==', 'queued_vendor_offline')
        .get();
      
      if (queuedOrders.empty) {
        console.log(`✅ No queued orders for vendor ${vendorId}`);
        return null;
      }
      
      console.log(`📦 Found ${queuedOrders.size} queued orders for vendor ${vendorId}`);
      
      // Update all queued orders to pending_vendor
      const batch = db.batch();
      
      queuedOrders.docs.forEach(orderDoc => {
        batch.update(orderDoc.ref, {
          orderStatus: 'pending_vendor',
          vendorStatus: 'online',
          processedFromQueueAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
      
      // Send dashboard alerts
      for (const orderDoc of queuedOrders.docs) {
        const orderData = orderDoc.data();
        
        await db.collection('vendors')
          .doc(vendorId)
          .collection('alerts')
          .add({
            type: 'new_order',
            orderId: orderData.orderId,
            orderTotal: orderData.total,
            customerName: orderData.customer?.name || 'Customer',
            itemCount: orderData.items?.length || 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
            actionRequired: true,
            message: `New order #${orderData.orderId.slice(-6)} - ₦${orderData.total?.toLocaleString()}`
          });
      }
      
      console.log(`✅ Processed ${queuedOrders.size} queued orders for vendor ${vendorId}`);
    }
    
    return null;
  });

/**
 * HTTP function for manual timeout processing (testing/admin)
 */
exports.manualProcessQueued = functions.https.onCall(async (data, context) => {
  // Verify admin authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }
  
  // Check admin role (you should verify this from custom claims)
  // const isAdmin = context.auth.token.admin === true;
  // if (!isAdmin) {
  //   throw new functions.https.HttpsError('permission-denied', 'Must be admin');
  // }
  
  console.log('🔧 Manual queued orders processing triggered');
  
  // Get all queued orders
  const ordersSnapshot = await db.collection('orders')
    .where('orderStatus', '==', 'queued_vendor_offline')
    .get();
  
  if (ordersSnapshot.empty) {
    return { success: true, message: 'No queued orders found', processed: 0 };
  }
  
  const now = new Date();
  let processedCount = 0;
  
  for (const orderDoc of ordersSnapshot.docs) {
    const orderData = orderDoc.data();
    const timeoutAt = new Date(orderData.autoTimeoutAt);
    
    if (now >= timeoutAt) {
      const vendorDoc = await db.collection('vendors').doc(orderData.vendorId).get();
      const isVendorOnline = vendorDoc.data()?.isOnline || false;
      
      if (isVendorOnline) {
        await orderDoc.ref.update({
          orderStatus: 'pending_vendor',
          vendorStatus: 'online'
        });
      } else {
        await processAutoRefund(orderDoc, orderData);
      }
      
      processedCount++;
    }
  }
  
  return { 
    success: true, 
    message: `Processed ${processedCount} queued orders`,
    processed: processedCount 
  };
});
