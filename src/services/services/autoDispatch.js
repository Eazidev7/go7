/**
 * Auto-Dispatch Service
 * Frontend integration with Firebase auto-dispatch system
 */
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase.js';

/**
 * Zone definitions (matches backend)
 */
export const ZONES = {
  KUTO: 'Kuto',
  PANSEKE: 'Panseke',
  IBARA: 'Ibara', 
  ADATAN: 'Adatan',
  OMIDA: 'Omida',
  KEMTA: 'Kemta'
};

/**
 * Order status definitions
 */
export const ORDER_STATUS = {
  PENDING: 'pending',
  ASSIGNING: 'assigning',
  ASSIGNED: 'assigned',
  EN_ROUTE: 'en_route',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

/**
 * Rider status definitions
 */
export const RIDER_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  OFFLINE: 'offline'
};

/**
 * Create a new order with auto-dispatch
 */
export async function createOrder(orderData) {
  try {
    const order = {
      ...orderData,
      status: ORDER_STATUS.PENDING,
      createdAt: Timestamp.now(),
      assignmentHistory: []
    };
    
    // Validate required fields
    if (!order.pickupZone) {
      throw new Error('pickupZone is required for auto-dispatch');
    }
    
    if (!Object.values(ZONES).includes(order.pickupZone)) {
      throw new Error(`Invalid pickupZone: ${order.pickupZone}`);
    }
    
    // Add to Firestore - this will trigger auto-dispatch
    const docRef = await addDoc(collection(db, 'orders'), order);
    
    console.log('Order created with auto-dispatch:', docRef.id);
    return { id: docRef.id, ...order };
    
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Listen to order status changes for real-time updates
 */
export function subscribeToOrder(orderId, callback) {
  const orderRef = doc(db, 'orders', orderId);
  
  return onSnapshot(orderRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
}

/**
 * Listen to rider assignments for an order
 */
export function subscribeToAssignments(orderId, callback) {
  const assignmentsRef = collection(db, 'assignments');
  const q = query(
    assignmentsRef,
    where('orderId', '==', orderId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const assignments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(assignments);
  });
}

/**
 * Get available riders in a zone
 */
export function subscribeToAvailableRiders(zone, callback) {
  const ridersRef = collection(db, 'riders');
  const q = query(
    ridersRef,
    where('zone', '==', zone),
    where('status', '==', RIDER_STATUS.AVAILABLE),
    orderBy('lastPingAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const riders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(riders);
  });
}

/**
 * Rider accepts or rejects an assignment
 */
export async function handleRiderResponse(orderId, response) {
  try {
    const handleResponseFunction = httpsCallable(functions, 'handleRiderResponse');
    const result = await handleResponseFunction({ orderId, response });
    
    console.log('Rider response processed:', result.data);
    return result.data;
    
  } catch (error) {
    console.error('Error handling rider response:', error);
    throw error;
  }
}

/**
 * Update rider status (available/busy/offline)
 */
export async function updateRiderStatus(riderId, status, location = null) {
  try {
    const riderRef = doc(db, 'riders', riderId);
    const updateData = {
      status,
      lastPingAt: Timestamp.now()
    };
    
    if (location) {
      updateData.location = location;
    }
    
    await updateDoc(riderRef, updateData);
    console.log(`Rider ${riderId} status updated to ${status}`);
    
  } catch (error) {
    console.error('Error updating rider status:', error);
    throw error;
  }
}

/**
 * Initialize zones (admin function)
 */
export async function initializeZones() {
  try {
    const initZonesFunction = httpsCallable(functions, 'initializeZones');
    const result = await initZonesFunction();
    
    console.log('Zones initialized:', result.data);
    return result.data;
    
  } catch (error) {
    console.error('Error initializing zones:', error);
    throw error;
  }
}

/**
 * Get orders by status for operations dashboard
 */
export function subscribeToOrdersByStatus(status, callback) {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(orders);
  });
}

/**
 * Get rider's assigned orders
 */
export function subscribeToRiderOrders(riderId, callback) {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('assignedRiderId', '==', riderId),
    where('status', 'in', [ORDER_STATUS.ASSIGNED, ORDER_STATUS.EN_ROUTE]),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(orders);
  });
}

/**
 * Manually assign order to rider (admin function)
 */
export async function manualAssignOrder(orderId, riderId) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const riderRef = doc(db, 'riders', riderId);
    
    // Update order
    await updateDoc(orderRef, {
      status: ORDER_STATUS.ASSIGNED,
      assignedRiderId: riderId,
      assignmentHistory: [{
        riderId,
        result: 'manual_assigned',
        at: Timestamp.now()
      }]
    });
    
    // Update rider status
    await updateDoc(riderRef, {
      status: RIDER_STATUS.BUSY
    });
    
    console.log(`Order ${orderId} manually assigned to rider ${riderId}`);
    
  } catch (error) {
    console.error('Error manually assigning order:', error);
    throw error;
  }
}
