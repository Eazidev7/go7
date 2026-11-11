/**
 * 🏪 GO7 VENDOR OFFLINE HANDLING SERVICE
 * Manages vendor availability and queues orders when vendors are offline
 */

import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

/**
 * Check if vendor is currently online
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<{isOnline: boolean, lastSeen: string}>}
 */
export async function checkVendorOnlineStatus(vendorId) {
  try {
    const vendorRef = doc(db, 'vendors', vendorId);
    const vendorSnap = await getDoc(vendorRef);
    
    if (!vendorSnap.exists()) {
      console.error('❌ Vendor not found:', vendorId);
      return { isOnline: false, lastSeen: null };
    }
    
    const vendorData = vendorSnap.data();
    // Match customer listing: missing isOnline means open (legacy docs)
    const isOnline = vendorData.isOnline !== false;
    const lastSeen = vendorData.lastSeen || null;
    
    console.log(`🏪 Vendor ${vendorId} status:`, { isOnline, lastSeen });
    
    return { isOnline, lastSeen };
  } catch (error) {
    console.error('❌ Error checking vendor status:', error);
    return { isOnline: false, lastSeen: null };
  }
}

/**
 * Update vendor online status
 * @param {string} vendorId - Vendor ID
 * @param {boolean} isOnline - Online status
 */
export async function updateVendorStatus(vendorId, isOnline) {
  try {
    const vendorRef = doc(db, 'vendors', vendorId);
    
    await updateDoc(vendorRef, {
      isOnline,
      lastSeen: new Date().toISOString(),
      lastStatusUpdate: serverTimestamp()
    });
    
    console.log(`✅ Vendor ${vendorId} status updated:`, isOnline ? 'ONLINE' : 'OFFLINE');
    
    // If vendor came online, process queued orders
    if (isOnline) {
      await processQueuedOrders(vendorId);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error updating vendor status:', error);
    return false;
  }
}

/**
 * Create order with vendor availability check
 * @param {object} orderData - Order data
 * @param {function} createOrderFn - Original createOrder function
 * @returns {Promise<{success: boolean, orderId: string, status: string}>}
 */
export async function createOrderWithVendorCheck(orderData, createOrderFn) {
  try {
    const { vendorId } = orderData;
    
    if (!vendorId) {
      throw new Error('Vendor ID is required');
    }
    
    // Step 1: Check vendor online status
    const { isOnline, lastSeen } = await checkVendorOnlineStatus(vendorId);
    
    // Step 2: Set order status based on vendor availability
    let orderStatus;
    let notificationMessage;
    
    if (isOnline) {
      orderStatus = 'pending_vendor';
      notificationMessage = '✅ Order sent to vendor!';
      console.log('✅ Vendor is ONLINE - Creating pending order');
    } else {
      orderStatus = 'queued_vendor_offline';
      notificationMessage = '⏳ Vendor is offline. Order queued.';
      console.log('⚠️ Vendor is OFFLINE - Queuing order');
      
      // Show notification to user
      toast.error(`Vendor is currently offline. Your order will be processed when they return.`, {
        duration: 5000,
        icon: '⏰'
      });
    }
    
    // Step 3: Create order with appropriate status
    const enrichedOrderData = {
      ...orderData,
      orderStatus,
      vendorStatus: isOnline ? 'online' : 'offline',
      vendorLastSeen: lastSeen,
      queuedAt: !isOnline ? new Date().toISOString() : null,
      autoTimeoutAt: !isOnline ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null // 10 min timeout
    };
    
    const result = await createOrderFn(enrichedOrderData);
    
    // Step 4: Send notifications
    if (!isOnline) {
      await notifyAdminVendorOffline(result.orderId, vendorId, orderData);
      await notifyUserOrderQueued(result.orderId, orderData.userId);
    }
    
    toast.success(notificationMessage);
    
    return {
      success: true,
      orderId: result.orderId,
      status: orderStatus,
      vendorOnline: isOnline
    };
    
  } catch (error) {
    console.error('❌ Error creating order with vendor check:', error);
    toast.error('Failed to create order. Please try again.');
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process queued orders when vendor comes online
 * @param {string} vendorId - Vendor ID
 */
async function processQueuedOrders(vendorId) {
  try {
    console.log(`🔄 Processing queued orders for vendor ${vendorId}`);
    
    // Query all queued orders for this vendor
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef, 
      where('vendorId', '==', vendorId),
      where('orderStatus', '==', 'queued_vendor_offline')
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('✅ No queued orders found');
      return;
    }
    
    console.log(`📦 Found ${querySnapshot.size} queued orders`);
    
    // Update each queued order to pending
    const updatePromises = querySnapshot.docs.map(async (orderDoc) => {
      const orderId = orderDoc.id;
      const orderRef = doc(db, 'orders', orderId);
      
      await updateDoc(orderRef, {
        orderStatus: 'pending_vendor',
        vendorStatus: 'online',
        processedFromQueueAt: new Date().toISOString()
      });
      
      console.log(`✅ Order ${orderId} moved to pending_vendor`);
      
      // Send dashboard alert to vendor
      await sendVendorDashboardAlert(vendorId, orderId, orderDoc.data());
    });
    
    await Promise.all(updatePromises);
    
    toast.success(`${querySnapshot.size} queued orders sent to vendor!`, {
      icon: '📬'
    });
    
  } catch (error) {
    console.error('❌ Error processing queued orders:', error);
  }
}

/**
 * Send dashboard alert to vendor for new/queued order
 * @param {string} vendorId - Vendor ID
 * @param {string} orderId - Order ID
 * @param {object} orderData - Order data
 */
async function sendVendorDashboardAlert(vendorId, orderId, orderData) {
  try {
    const alertsRef = collection(db, 'vendors', vendorId, 'alerts');
    
    await addDoc(alertsRef, {
      type: 'new_order',
      orderId,
      orderTotal: orderData.total,
      customerName: orderData.customer?.name || 'Customer',
      itemCount: orderData.items?.length || 0,
      createdAt: serverTimestamp(),
      read: false,
      actionRequired: true,
      message: `New order #${orderId.slice(-6)} - ₦${orderData.total?.toLocaleString()}`
    });
    
    console.log(`🔔 Dashboard alert sent to vendor ${vendorId}`);
  } catch (error) {
    console.error('❌ Error sending vendor alert:', error);
  }
}

/**
 * Notify admin when vendor is offline
 * @param {string} orderId - Order ID
 * @param {string} vendorId - Vendor ID
 * @param {object} orderData - Order data
 */
async function notifyAdminVendorOffline(orderId, vendorId, orderData) {
  try {
    const notificationsRef = collection(db, 'admin_notifications');
    
    await addDoc(notificationsRef, {
      type: 'vendor_offline_order',
      orderId,
      vendorId,
      orderTotal: orderData.total,
      customerName: orderData.customer?.name || 'Customer',
      severity: 'medium',
      createdAt: serverTimestamp(),
      read: false,
      message: `Order ${orderId.slice(-6)} queued - Vendor ${vendorId} offline`
    });
    
    console.log('📧 Admin notified of offline vendor order');
  } catch (error) {
    console.error('❌ Error notifying admin:', error);
  }
}

/**
 * Notify user that their order is queued
 * @param {string} orderId - Order ID
 * @param {string} userId - User ID
 */
async function notifyUserOrderQueued(orderId, userId) {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    
    await addDoc(notificationsRef, {
      type: 'order_queued',
      orderId,
      title: 'Order Queued',
      message: 'Your order will be processed when the vendor comes online.',
      createdAt: serverTimestamp(),
      read: false,
      icon: '⏰'
    });
    
    console.log('📨 User notified of queued order');
  } catch (error) {
    console.error('❌ Error notifying user:', error);
  }
}

/**
 * Listen for vendor status changes
 * @param {string} vendorId - Vendor ID
 * @param {function} onStatusChange - Callback when status changes
 * @returns {function} Unsubscribe function
 */
export function subscribeToVendorStatus(vendorId, onStatusChange) {
  const vendorRef = doc(db, 'vendors', vendorId);
  
  const unsubscribe = onSnapshot(vendorRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      onStatusChange({
        isOnline: data.isOnline || false,
        lastSeen: data.lastSeen,
        lastStatusUpdate: data.lastStatusUpdate
      });
    }
  });
  
  return unsubscribe;
}

/**
 * Auto-timeout handler for queued orders
 * Should be called by Cloud Function every 10 minutes
 * @param {string} orderId - Order ID
 */
export async function handleOrderTimeout(orderId) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      console.error('❌ Order not found:', orderId);
      return;
    }
    
    const orderData = orderSnap.data();
    
    // Check if order is still queued
    if (orderData.orderStatus !== 'queued_vendor_offline') {
      console.log('ℹ️ Order already processed:', orderId);
      return;
    }
    
    // Check if timeout has passed
    const timeoutAt = new Date(orderData.autoTimeoutAt);
    if (new Date() < timeoutAt) {
      console.log('⏰ Timeout not reached yet for:', orderId);
      return;
    }
    
    // Check vendor status one more time
    const { isOnline } = await checkVendorOnlineStatus(orderData.vendorId);
    
    if (isOnline) {
      // Vendor came online, process order
      await updateDoc(orderRef, {
        orderStatus: 'pending_vendor',
        vendorStatus: 'online'
      });
      console.log('✅ Order moved to pending (vendor online):', orderId);
    } else {
      // Vendor still offline, auto-refund
      await updateDoc(orderRef, {
        orderStatus: 'auto_refunded',
        refundedAt: new Date().toISOString(),
        refundReason: 'Vendor unavailable - auto timeout'
      });
      
      // Process refund
      await processAutoRefund(orderData);
      
      console.log('💰 Order auto-refunded:', orderId);
    }
    
  } catch (error) {
    console.error('❌ Error handling order timeout:', error);
  }
}

/**
 * Process automatic refund
 * @param {object} orderData - Order data
 */
async function processAutoRefund(orderData) {
  try {
    const refundId = `REF-${Date.now()}-${orderData.orderId.slice(-6)}`;
    
    // 1. Create refund record in /refunds collection
    const refundsRef = collection(db, 'refunds');
    await addDoc(refundsRef, {
      refundId,
      orderId: orderData.orderId,
      userId: orderData.userId,
      vendorId: orderData.vendorId,
      amount: orderData.total,
      reason: 'Vendor unavailable - auto timeout after 10 minutes',
      status: 'completed',
      refundMethod: 'wallet',
      processedAt: serverTimestamp(),
      metadata: {
        originalOrderStatus: orderData.orderStatus,
        queuedAt: orderData.queuedAt,
        timeoutAt: orderData.autoTimeoutAt,
        vendorName: orderData.vendor?.name || 'Unknown vendor',
        itemCount: orderData.items?.length || 0
      }
    });
    
    // 2. Add refund transaction to user's wallet
    const transactionsRef = collection(db, 'users', orderData.userId, 'transactions');
    
    await addDoc(transactionsRef, {
      type: 'refund',
      amount: orderData.total,
      orderId: orderData.orderId,
      refundId, // Link to refund record
      reason: 'Vendor unavailable',
      status: 'completed',
      createdAt: serverTimestamp()
    });
    
    // 3. Update user's wallet balance
    const userRef = doc(db, 'users', orderData.userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const currentBalance = userSnap.data().walletBalance || 0;
      await updateDoc(userRef, {
        walletBalance: currentBalance + orderData.total
      });
    }
    
    // 4. Update order with refundId
    const orderRef = doc(db, 'orders', orderData.orderId);
    await updateDoc(orderRef, {
      refundId,
      refundProcessedAt: serverTimestamp()
    });
    
    // 5. Send notification to user
    const notificationsRef = collection(db, 'users', orderData.userId, 'notifications');
    await addDoc(notificationsRef, {
      type: 'refund_processed',
      orderId: orderData.orderId,
      refundId,
      amount: orderData.total,
      title: 'Refund Processed',
      message: `₦${orderData.total.toLocaleString()} refunded to your wallet. Vendor was unavailable.`,
      createdAt: serverTimestamp(),
      read: false
    });
    
    console.log(`💰 Auto-refund processed successfully - ${refundId}`);
  } catch (error) {
    console.error('❌ Error processing refund:', error);
  }
}

export default {
  checkVendorOnlineStatus,
  updateVendorStatus,
  createOrderWithVendorCheck,
  subscribeToVendorStatus,
  handleOrderTimeout
};
