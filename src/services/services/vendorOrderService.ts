import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  addDoc,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Order } from '../types/marketplace';
import { VendorOrder, VendorOrderStatus, VendorOrderEvent } from '../types/vendorOrder';
import { toast } from 'react-hot-toast';

/**
 * Service for handling vendor order operations
 */

/**
 * Get orders for a specific vendor
 * @param vendorId - The vendor's ID
 * @param statusFilter - Optional status filter
 * @returns Promise<Order[]>
 */
export const getVendorOrders = async (vendorId: string, statusFilter?: string): Promise<Order[]> => {
  try {
    let ordersQuery = query(
      collection(db, 'orders'),
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc')
    );

    if (statusFilter && statusFilter !== 'all') {
      ordersQuery = query(
        collection(db, 'orders'),
        where('vendorId', '==', vendorId),
        where('status', '==', statusFilter),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(ordersQuery);
    const orders: Order[] = [];

    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      } as Order);
    });

    return orders;
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    throw error;
  }
};

/**
 * Get a specific order by ID
 * @param orderId - The order ID
 * @returns Promise<Order | null>
 */
export const getOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    
    if (orderDoc.exists()) {
      return {
        id: orderDoc.id,
        ...orderDoc.data()
      } as Order;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
};

/**
 * Update order status
 * @param orderId - The order ID
 * @param newStatus - The new status
 * @returns Promise<void>
 */
export const updateOrderStatus = async (
  orderId: string, 
  newStatus: 'new' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled' | 'ready' | 'completed' | 'delivery_scheduled'
): Promise<void> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    await updateDoc(orderRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

/**
 * Cancel an order with reason
 * @param orderId - The order ID
 * @param reason - Cancellation reason
 * @returns Promise<void>
 */
export const cancelOrder = async (orderId: string, reason: string): Promise<void> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    await updateDoc(orderRef, {
      status: 'cancelled',
      cancelReason: reason,
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
};

/**
 * Process refund for an order
 * @param orderId - The order ID
 * @returns Promise<void>
 */
export const processRefund = async (orderId: string): Promise<void> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    await updateDoc(orderRef, {
      'payment.status': 'refunded',
      refundedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
};

/**
 * Get vendor earnings statistics
 * @param vendorId - The vendor's ID
 * @param timeframe - Time period ('today', '7d', '30d')
 * @returns Promise<EarningsStats>
 */
export interface EarningsStats {
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  topProducts: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
}

export const getVendorEarnings = async (
  vendorId: string, 
  timeframe: 'today' | '7d' | '30d' = 'today'
): Promise<EarningsStats> => {
  try {
    // Calculate start date based on timeframe
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
    }

    // Query orders within timeframe
    const ordersQuery = query(
      collection(db, 'orders'),
      where('vendorId', '==', vendorId),
      where('status', '==', 'delivered'),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(ordersQuery);
    const orders: Order[] = [];

    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      } as Order);
    });

    // Calculate statistics
    const totalSales = orders.reduce((sum, order) => {
      return sum + (order.subtotal || 0) + (order.deliveryFee || 0);
    }, 0);

    const orderCount = orders.length;
    const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

    // Calculate top products
    const productCounts: Record<string, { name: string; count: number; revenue: number }> = {};
    
    orders.forEach(order => {
      order.items?.forEach(item => {
        const key = item.name || 'Unknown Product';
        if (!productCounts[key]) {
          productCounts[key] = { name: key, count: 0, revenue: 0 };
        }
        productCounts[key].count += item.qty || 0;
        productCounts[key].revenue += (item.price || 0) * (item.qty || 0);
      });
    });

    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalSales,
      orderCount,
      averageOrderValue,
      topProducts
    };
  } catch (error) {
    console.error('Error fetching vendor earnings:', error);
    throw error;
  }
};

/**
 * Get order statistics for the vendor dashboard
 * @param vendorId - The vendor's ID
 * @returns Promise<OrderStats>
 */
export interface OrderStats {
  new: number;
  accepted: number;
  picked_up: number;
  delivered: number;
  cancelled: number;
  total: number;
}

export const getOrderStats = async (vendorId: string): Promise<OrderStats> => {
  try {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('vendorId', '==', vendorId)
    );

    const querySnapshot = await getDocs(ordersQuery);
    const stats: OrderStats = {
      new: 0,
      accepted: 0,
      picked_up: 0,
      delivered: 0,
      cancelled: 0,
      total: 0
    };

    querySnapshot.forEach((doc) => {
      const order = doc.data() as Order;
      const status = order.status;
      
      if (status in stats) {
        stats[status as keyof OrderStats]++;
      }
      stats.total++;
    });

    return stats;
  } catch (error) {
    console.error('Error fetching order stats:', error);
    throw error;
  }
};

/**
 * Enhanced vendor order management methods
 */

/**
 * Listen to vendor orders in real-time
 */
export const subscribeToVendorOrders = (
  vendorId: string,
  callback: (orders: VendorOrder[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const ordersRef = collection(db, 'vendors', vendorId, 'orders');
  const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    ordersQuery,
    (snapshot) => {
      const orders: VendorOrder[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          acceptedAt: data.acceptedAt?.toDate(),
          readyAt: data.readyAt?.toDate(),
          pickedUpAt: data.pickedUpAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
          cancelledAt: data.cancelledAt?.toDate(),
        } as VendorOrder);
      });

      callback(orders);
    },
    (error) => {
      console.error('Error listening to vendor orders:', error);
      onError?.(error);
      toast.error('Failed to load orders');
    }
  );
};

/**
 * Update order status with validation
 */
export const updateVendorOrderStatus = async (
  vendorId: string,
  orderId: string,
  newStatus: VendorOrderStatus,
  actorId: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const orderRef = doc(db, 'vendors', vendorId, 'orders', orderId);
    
    const updateData: any = {
      status: newStatus,
      updatedAt: serverTimestamp(),
      actor: 'vendor'
    };

    // Add timestamp for specific status changes
    const now = serverTimestamp();
    switch (newStatus) {
      case 'accepted':
        updateData.acceptedAt = now;
        break;
      case 'ready':
        updateData.readyAt = now;
        break;
      case 'picked_up':
        updateData.pickedUpAt = now;
        break;
      case 'completed':
        updateData.completedAt = now;
        break;
      case 'cancelled':
        updateData.cancelledAt = now;
        if (metadata?.reason) {
          updateData.cancelReason = metadata.reason;
        }
        break;
    }

    await updateDoc(orderRef, updateData);

    // Log the event
    await logOrderEvent(orderId, newStatus, actorId, metadata);

    toast.success(`Order ${newStatus} successfully`);
  } catch (error) {
    console.error('Error updating order status:', error);
    toast.error('Failed to update order status');
    throw error;
  }
};

/**
 * Accept an order
 */
export const acceptVendorOrder = async (
  vendorId: string,
  orderId: string,
  actorId: string,
  estimatedPickupTime?: Date
): Promise<void> => {
  const updateData: any = {
    status: 'accepted',
    updatedAt: serverTimestamp(),
    acceptedAt: serverTimestamp(),
    actor: 'vendor'
  };

  if (estimatedPickupTime) {
    updateData.estimatedPickupTime = Timestamp.fromDate(estimatedPickupTime);
  }

  const orderRef = doc(db, 'vendors', vendorId, 'orders', orderId);
  await updateDoc(orderRef, updateData);

  await logOrderEvent(orderId, 'accepted', actorId, { estimatedPickupTime });
  toast.success('Order accepted successfully');
};

/**
 * Decline an order
 */
export const declineVendorOrder = async (
  vendorId: string,
  orderId: string,
  actorId: string,
  reason?: string
): Promise<void> => {
  const updateData = {
    status: 'cancelled' as VendorOrderStatus,
    updatedAt: serverTimestamp(),
    cancelledAt: serverTimestamp(),
    cancelReason: reason || 'Declined by vendor',
    actor: 'vendor'
  };

  const orderRef = doc(db, 'vendors', vendorId, 'orders', orderId);
  await updateDoc(orderRef, updateData);

  await logOrderEvent(orderId, 'declined', actorId, { reason });
  toast.success('Order declined');
};

/**
 * Mark order as ready for pickup
 */
export const markVendorOrderReady = async (
  vendorId: string,
  orderId: string,
  actorId: string
): Promise<void> => {
  await updateVendorOrderStatus(vendorId, orderId, 'ready', actorId);
};

/**
 * Mark order as picked up
 */
export const markVendorOrderPickedUp = async (
  vendorId: string,
  orderId: string,
  actorId: string
): Promise<void> => {
  await updateVendorOrderStatus(vendorId, orderId, 'picked_up', actorId);
};

/**
 * Complete an order
 */
export const completeVendorOrder = async (
  vendorId: string,
  orderId: string,
  actorId: string
): Promise<void> => {
  await updateVendorOrderStatus(vendorId, orderId, 'completed', actorId);
};

/**
 * Cancel an order
 */
export const cancelVendorOrder = async (
  vendorId: string,
  orderId: string,
  actorId: string,
  reason: string
): Promise<void> => {
  await updateVendorOrderStatus(vendorId, orderId, 'cancelled', actorId, { reason });
};

/**
 * Log order event to timeline
 */
const logOrderEvent = async (
  orderId: string,
  type: VendorOrderEvent['type'],
  actorId: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const eventsRef = collection(db, 'orders', orderId, 'events');
    
    await addDoc(eventsRef, {
      type,
      actor: 'vendor',
      actorId,
      timestamp: serverTimestamp(),
      metadata: metadata || {},
      message: getEventMessage(type, metadata)
    });
  } catch (error) {
    console.error('Error logging order event:', error);
    // Don't throw error for event logging failures
  }
};

/**
 * Get order events timeline
 */
export const subscribeToOrderEvents = (
  orderId: string,
  callback: (events: VendorOrderEvent[]) => void
): Unsubscribe => {
  const eventsRef = collection(db, 'orders', orderId, 'events');
  const eventsQuery = query(eventsRef, orderBy('timestamp', 'desc'));

  return onSnapshot(eventsQuery, (snapshot) => {
    const events: VendorOrderEvent[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        orderId,
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as VendorOrderEvent);
    });

    callback(events);
  });
};

/**
 * Generate event message
 */
const getEventMessage = (
  type: VendorOrderEvent['type'],
  metadata?: Record<string, any>
): string => {
  switch (type) {
    case 'created':
      return 'Order placed by customer';
    case 'accepted':
      return metadata?.estimatedPickupTime 
        ? `Order accepted. Estimated pickup: ${new Date(metadata.estimatedPickupTime).toLocaleTimeString()}`
        : 'Order accepted by vendor';
    case 'declined':
      return `Order declined: ${metadata?.reason || 'No reason provided'}`;
    case 'ready':
      return 'Order ready for pickup';
    case 'picked_up':
      return 'Order picked up by customer';
    case 'completed':
      return 'Order completed';
    case 'cancelled':
      return `Order cancelled: ${metadata?.reason || 'No reason provided'}`;
    default:
      return `Order ${type}`;
  }
};

/**
 * Calculate vendor order statistics
 */
export const calculateVendorOrderStats = (orders: VendorOrder[]) => {
  return {
    total: orders.length,
    new: orders.filter(o => o.status === 'new').length,
    accepted: orders.filter(o => o.status === 'accepted').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };
};

/**
 * Filter vendor orders based on criteria
 */
export const filterVendorOrders = (
  orders: VendorOrder[],
  filters: {
    status?: VendorOrderStatus | 'all';
    dateRange?: 'today' | 'week' | 'month' | 'all';
    search?: string;
  }
): VendorOrder[] => {
  let filtered = [...orders];

  // Status filter
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter(order => order.status === filters.status);
  }

  // Date range filter
  if (filters.dateRange && filters.dateRange !== 'all') {
    const now = new Date();
    let startDate: Date;

    switch (filters.dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    filtered = filtered.filter(order => order.createdAt >= startDate);
  }

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(order => 
      order.id.toLowerCase().includes(searchLower) ||
      order.customer.name.toLowerCase().includes(searchLower) ||
      order.customer.phone.includes(searchLower) ||
      order.items.some(item => item.title.toLowerCase().includes(searchLower))
    );
  }

  return filtered;
};
