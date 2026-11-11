import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { createOrderWithVendorCheck } from './vendorOfflineService';
import { calculateDeliveryFeeSplit } from '../utils/deliveryFeeSplit';

// Order status constants
export const ORDER_STATUS = {
  PENDING: 'pending',
  PENDING_VENDOR: 'pending_vendor',
  QUEUED_VENDOR_OFFLINE: 'queued_vendor_offline',
  AUTO_REFUNDED: 'auto_refunded',
  ACCEPTED: 'accepted',
  PICKED_UP: 'picked_up',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

// Order status display names
export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'Order Placed',
  [ORDER_STATUS.ACCEPTED]: 'Order Accepted',
  [ORDER_STATUS.PICKED_UP]: 'Picked Up',
  [ORDER_STATUS.ON_THE_WAY]: 'On The Way',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELLED]: 'Cancelled'
};

/**
 * Generate unique order ID
 */
export function generateOrderId() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `GO7${timestamp}${random}`;
}

/**
 * Create a new order in Firebase with real-time tracking structure
 * @param {object} orderData - Order data object
 * @returns {Promise<string>} Order ID
 */
export async function createOrder(orderData) {
  try {
    const orderId = generateOrderId();
    
    const order = {
      orderId,
      userId: orderData.userId,
      vendorId: orderData.vendorId,
      riderId: null, // Assigned later
      
      // Customer and vendor information
      customer: {
        name: orderData.customer?.name || 'Customer',
        phone: orderData.customer?.phone || '',
        email: orderData.customer?.email || ''
      },
      
      vendor: {
        name: orderData.vendor?.name || 'Vendor',
        phone: orderData.vendor?.phone || '',
        address: orderData.vendor?.address || '',
        coordinates: orderData.vendor?.coordinates || null
      },
      
      // Location data for tracking
      pickup: {
        lat: orderData.pickup?.lat || 0,
        lng: orderData.pickup?.lng || 0,
        address: orderData.pickup?.address || '',
        name: orderData.pickup?.name || 'Pickup Location'
      },
      
      dropoff: {
        lat: orderData.dropoff?.lat || 0,
        lng: orderData.dropoff?.lng || 0,
        address: orderData.dropoff?.address || '',
        name: orderData.dropoff?.name || 'Delivery Address'
      },
      
      // Real-time rider tracking
      riderLocation: null, // Updated by rider app
      rider: null, // Rider details when assigned
      
      // Order details
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      deliveryFee: orderData.deliveryFee || 0,
      total: orderData.total || 0,
      distance: orderData.distance || 0,
      
      // Status and timestamps - Use orderStatus from vendorOfflineService if provided
      status: orderData.orderStatus || ORDER_STATUS.PENDING,
      orderStatus: orderData.orderStatus || ORDER_STATUS.PENDING,
      vendorStatus: orderData.vendorStatus || null,
      vendorLastSeen: orderData.vendorLastSeen || null,
      queuedAt: orderData.queuedAt || null,
      autoTimeoutAt: orderData.autoTimeoutAt || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      
      // Timeline tracking for live updates
      timeline: [
        {
          status: orderData.orderStatus || ORDER_STATUS.PENDING,
          timestamp: serverTimestamp(),
          message: orderData.orderStatus === ORDER_STATUS.QUEUED_VENDOR_OFFLINE 
            ? 'Order queued - Vendor offline' 
            : 'Order placed successfully'
        }
      ],
      
      // Delivery tracking
      estimatedDeliveryTime: orderData.estimatedDeliveryTime || null,
      actualDeliveryTime: null,
      
      // Special instructions
      instructions: orderData.instructions || '',
      
      // Payment information
      paymentMethod: orderData.paymentMethod || 'cash',
      paymentStatus: 'pending',
      
      // 💰 Delivery fee split (rider gets 50%, platform keeps 50%)
      ...calculateDeliveryFeeSplit(orderData.deliveryFee || 0)
    };

    const docRef = await addDoc(collection(db, 'orders'), order);
    
    // Update document with its Firebase ID
    await updateDoc(docRef, {
      firebaseId: docRef.id
    });
    
    console.log('✅ Order created successfully:', orderId);
    return { orderId, firebaseId: docRef.id };
    
  } catch (error) {
    console.error('❌ Error creating order:', error);
    throw new Error('Failed to create order');
  }
}

/**
 * Create order with vendor availability check
 * This is the recommended function to use for all new orders
 * @param {object} orderData - Order data object
 * @returns {Promise<{success: boolean, orderId: string, status: string}>}
 */
export async function createOrderWithVendorAvailability(orderData) {
  return await createOrderWithVendorCheck(orderData, createOrder);
}

/**
 * Legacy getOrder function for backward compatibility
 */
export const getOrder = async (orderId) => {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (orderDoc.exists()) {
      return { id: orderDoc.id, ...orderDoc.data() };
    } else {
      throw new Error('Order not found');
    }
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
};

/**
 * Legacy updateOrder function for backward compatibility
 */
export const updateOrder = async (orderId, updates) => {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
};

/**
 * Update order status and add timeline entry for live tracking
 * @param {string} firebaseId - Firebase document ID
 * @param {string} status - New order status
 * @param {string} message - Status update message
 * @param {object} additionalData - Additional data to update
 */
export async function updateOrderStatus(firebaseId, status, message = '', additionalData = {}) {
  try {
    const orderRef = doc(db, 'orders', firebaseId);
    
    // Get current timeline
    const orderDoc = await getDoc(orderRef);
    const currentTimeline = orderDoc.data()?.timeline || [];
    
    // Create new timeline entry
    const timelineEntry = {
      status,
      timestamp: serverTimestamp(),
      message: message || ORDER_STATUS_LABELS[status]
    };
    
    // Update order with new status and timeline
    await updateDoc(orderRef, {
      status,
      updatedAt: serverTimestamp(),
      timeline: [...currentTimeline, timelineEntry],
      ...additionalData
    });
    
    console.log(`✅ Order ${orderDoc.data()?.orderId} status updated to: ${status}`);

    // Award GO7 coins/XP once when order is delivered (idempotent in gamificationService)
    if (status === ORDER_STATUS.DELIVERED) {
      try {
        const data = orderDoc.data() || {};
        const uid = data.userId || data.customerId || data.uid || data.customer?.uid;
        const amount = data.total ?? data.grandTotal ?? data.amount ?? data.totalAmount ?? 0;
        if (uid) {
          const { awardCoinsForOrder } = await import('./gamificationService.js');
          await awardCoinsForOrder(uid, amount, firebaseId);
        }
      } catch (gamificationError) {
        console.warn('Gamification award skipped:', gamificationError?.message || gamificationError);
      }
    }
    
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    throw new Error('Failed to update order status');
  }
}

/**
 * Update rider location for live tracking
 * @param {string} firebaseId - Firebase document ID
 * @param {object} location - { lat, lng }
 */
export async function updateRiderLocation(firebaseId, location) {
  try {
    const orderRef = doc(db, 'orders', firebaseId);
    
    await updateDoc(orderRef, {
      riderLocation: {
        lat: location.lat,
        lng: location.lng,
        timestamp: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });
    
  } catch (error) {
    console.error('❌ Error updating rider location:', error);
    throw new Error('Failed to update rider location');
  }
}

/**
 * Subscribe to real-time order updates
 * @param {string} firebaseId - Firebase document ID
 * @param {function} callback - Callback function for updates
 * @returns {function} Unsubscribe function
 */
export function subscribeToOrder(firebaseId, callback) {
  const orderRef = doc(db, 'orders', firebaseId);
  
  return onSnapshot(orderRef, (docSnap) => {
    if (docSnap.exists()) {
      const orderData = docSnap.data();
      callback(orderData);
    } else {
      console.error('Order not found:', firebaseId);
      callback(null);
    }
  }, (error) => {
    console.error('❌ Error subscribing to order:', error);
    callback(null);
  });
}

/**
 * Get user's orders with real-time updates
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of orders
 */
export const getUserOrders = async (userId) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ firebaseId: doc.id, id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw error;
  }
};

/**
 * Assign rider to order
 * @param {string} firebaseId - Firebase document ID
 * @param {object} riderData - Rider information
 */
export async function assignRider(firebaseId, riderData) {
  try {
    await updateOrderStatus(firebaseId, ORDER_STATUS.ACCEPTED, `Order accepted by ${riderData.name}`, {
      riderId: riderData.id,
      rider: {
        id: riderData.id,
        name: riderData.name,
        phone: riderData.phone,
        vehicle: riderData.vehicle || 'bike',
        rating: riderData.rating || 5.0
      }
    });
    
  } catch (error) {
    console.error('❌ Error assigning rider:', error);
    throw new Error('Failed to assign rider');
  }
}

/**
 * Mark order as delivered
 * @param {string} firebaseId - Firebase document ID
 * @param {string} deliveryCode - Optional delivery verification code
 */
export async function markOrderDelivered(firebaseId, deliveryCode = null) {
  try {
    const additionalData = {
      actualDeliveryTime: serverTimestamp()
    };
    
    if (deliveryCode) {
      additionalData.deliveryCode = deliveryCode;
    }
    
    await updateOrderStatus(firebaseId, ORDER_STATUS.DELIVERED, 'Order delivered successfully', additionalData);
    
  } catch (error) {
    console.error('❌ Error marking order as delivered:', error);
    throw new Error('Failed to mark order as delivered');
  }
}

export default {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  createOrder,
  createOrderWithVendorAvailability,
  getOrder,
  updateOrder,
  updateOrderStatus,
  updateRiderLocation,
  assignRider,
  subscribeToOrder,
  getUserOrders,
  markOrderDelivered,
  generateOrderId
};