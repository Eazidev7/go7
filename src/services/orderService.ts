import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Order Status Types
export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

// Order Item Interface
export interface OrderItem {
  productId: string;
  name: string;
  variantId?: string;
  variantName?: string;
  qty: number;
  price: number; // Price per unit at time of order
  selectedAddons?: { id: string; name: string; price: number; qty: number }[];
  imageUrl?: string;
}

// Tracking Event Interface
export interface TrackingEvent {
  id?: string;
  status: OrderStatus;
  message: string;
  timestamp: Timestamp;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  actorId?: string; // ID of person who triggered this event
  actorRole?: 'customer' | 'vendor' | 'rider' | 'system';
}

// Order Interface
export interface Order {
  id?: string;
  userId: string;
  vendorId: string;
  vendorName?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee?: number;
  taxes?: number;
  total: number;
  status: OrderStatus;
  
  // Delivery Information
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    instructions?: string;
  };
  
  // Contact Information
  customerPhone: string;
  customerName: string;
  
  // Fulfillment
  estimatedDeliveryTime?: number; // minutes from now
  actualDeliveryTime?: Timestamp;
  assignedRiderId?: string;
  riderName?: string;
  riderPhone?: string;
  
  // Payment
  paymentMethod: 'card' | 'cash' | 'wallet';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentReference?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Tracking
  trackingEvents: TrackingEvent[];
  
  // Special Instructions
  specialInstructions?: string;
  
  // Ratings (after delivery)
  customerRating?: {
    vendorRating: number;
    riderRating: number;
    comment?: string;
  };
}

// Order Summary for vendor dashboard
export interface OrderSummary {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

class OrderService {
  private ordersCollection = collection(db, 'orders');

  // Create a new order
  async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'trackingEvents'>): Promise<string> {
    try {
      const initialTrackingEvent: TrackingEvent = {
        status: 'pending',
        message: 'Order placed successfully',
        timestamp: serverTimestamp() as Timestamp,
        actorRole: 'customer'
      };

      const docRef = await addDoc(this.ordersCollection, {
        ...orderData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        trackingEvents: [initialTrackingEvent]
      });

      console.log('Order created successfully:', docRef.id);
      
      // Update vendor's order statistics
      await this.updateVendorOrderStats(orderData.vendorId, orderData.total);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  // Get order by ID
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const docRef = doc(this.ordersCollection, orderId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Order;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting order:', error);
      throw error;
    }
  }

  // Get user's orders
  async getUserOrders(userId: string, limitCount: number = 50): Promise<Order[]> {
    try {
      const q = query(
        this.ordersCollection,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
    } catch (error) {
      console.error('Error getting user orders:', error);
      throw error;
    }
  }

  // Get vendor's orders
  async getVendorOrders(vendorId: string, status?: OrderStatus, limitCount: number = 50): Promise<Order[]> {
    try {
      let q = query(
        this.ordersCollection,
        where('vendorId', '==', vendorId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (status) {
        q = query(
          this.ordersCollection,
          where('vendorId', '==', vendorId),
          where('status', '==', status),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
    } catch (error) {
      console.error('Error getting vendor orders:', error);
      throw error;
    }
  }

  // Update order status
  async updateOrderStatus(
    orderId: string, 
    newStatus: OrderStatus, 
    message: string,
    actorId?: string,
    actorRole?: 'customer' | 'vendor' | 'rider' | 'system',
    location?: { lat: number; lng: number; address?: string }
  ): Promise<void> {
    try {
      const orderRef = doc(this.ordersCollection, orderId);
      
      const trackingEvent: TrackingEvent = {
        status: newStatus,
        message,
        timestamp: serverTimestamp() as Timestamp,
        location,
        actorId,
        actorRole
      };

      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      // Set delivery time if delivered
      if (newStatus === 'delivered') {
        updateData.actualDeliveryTime = serverTimestamp();
      }

      // Add tracking event to subcollection
      const trackingRef = collection(orderRef, 'trackingEvents');
      await addDoc(trackingRef, trackingEvent);

      // Update order document
      await updateDoc(orderRef, updateData);

      console.log('Order status updated successfully');
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  // Assign rider to order
  async assignRider(orderId: string, riderId: string, riderName: string, riderPhone: string): Promise<void> {
    try {
      const orderRef = doc(this.ordersCollection, orderId);
      
      await updateDoc(orderRef, {
        assignedRiderId: riderId,
        riderName,
        riderPhone,
        updatedAt: serverTimestamp()
      });

      // Add tracking event
      await this.updateOrderStatus(
        orderId,
        'out_for_delivery',
        `Rider ${riderName} has been assigned to your order`,
        riderId,
        'rider'
      );

      console.log('Rider assigned successfully');
    } catch (error) {
      console.error('Error assigning rider:', error);
      throw error;
    }
  }

  // Cancel order
  async cancelOrder(orderId: string, reason: string, cancelledBy: 'customer' | 'vendor' | 'system'): Promise<void> {
    try {
      const orderRef = doc(this.ordersCollection, orderId);
      
      await updateDoc(orderRef, {
        status: 'cancelled',
        cancelReason: reason,
        cancelledBy,
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Add tracking event
      await this.updateOrderStatus(
        orderId,
        'cancelled',
        `Order cancelled: ${reason}`,
        undefined,
        cancelledBy === 'customer' ? 'customer' : cancelledBy === 'vendor' ? 'vendor' : 'system'
      );

      // Handle refund if payment was made
      const order = await this.getOrder(orderId);
      if (order && order.paymentStatus === 'paid') {
        await this.processRefund(orderId, order.total);
      }

      console.log('Order cancelled successfully');
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  // Process refund
  private async processRefund(orderId: string, amount: number): Promise<void> {
    try {
      const orderRef = doc(this.ordersCollection, orderId);
      
      // This would typically call a payment service
      // For now, just update the payment status
      await updateDoc(orderRef, {
        paymentStatus: 'refunded',
        refundAmount: amount,
        refundedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Refund processed for order:', orderId);
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  // Add customer rating
  async addCustomerRating(
    orderId: string, 
    vendorRating: number, 
    riderRating: number, 
    comment?: string
  ): Promise<void> {
    try {
      const orderRef = doc(this.ordersCollection, orderId);
      
      await updateDoc(orderRef, {
        customerRating: {
          vendorRating,
          riderRating,
          comment,
          ratedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });

      console.log('Customer rating added successfully');
    } catch (error) {
      console.error('Error adding customer rating:', error);
      throw error;
    }
  }

  // Get order tracking events
  async getOrderTracking(orderId: string): Promise<TrackingEvent[]> {
    try {
      const trackingRef = collection(db, 'orders', orderId, 'trackingEvents');
      const q = query(trackingRef, orderBy('timestamp', 'asc'));
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TrackingEvent[];
    } catch (error) {
      console.error('Error getting order tracking:', error);
      throw error;
    }
  }

  // Get vendor order summary
  async getVendorOrderSummary(vendorId: string, days: number = 30): Promise<OrderSummary> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const q = query(
        this.ordersCollection,
        where('vendorId', '==', vendorId),
        where('createdAt', '>=', cutoffDate)
      );
      
      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map(doc => doc.data()) as Order[];
      
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length;
      const completedOrders = orders.filter(o => o.status === 'delivered').length;
      const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
      const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0);
      const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;
      
      return {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
        averageOrderValue
      };
    } catch (error) {
      console.error('Error getting vendor order summary:', error);
      throw error;
    }
  }

  // Real-time order subscription
  subscribeToOrder(orderId: string, callback: (order: Order | null) => void): () => void {
    const docRef = doc(this.ordersCollection, orderId);
    
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as Order);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error in order subscription:', error);
      callback(null);
    });
  }

  // Real-time vendor orders subscription
  subscribeToVendorOrders(
    vendorId: string, 
    callback: (orders: Order[]) => void,
    status?: OrderStatus
  ): () => void {
    let q = query(
      this.ordersCollection,
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    if (status) {
      q = query(
        this.ordersCollection,
        where('vendorId', '==', vendorId),
        where('status', '==', status),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }
    
    return onSnapshot(q, (querySnapshot) => {
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      callback(orders);
    }, (error) => {
      console.error('Error in vendor orders subscription:', error);
      callback([]);
    });
  }

  // Update vendor order statistics (helper method)
  private async updateVendorOrderStats(vendorId: string, orderValue: number): Promise<void> {
    try {
      const vendorRef = doc(db, 'vendors', vendorId);
      await updateDoc(vendorRef, {
        totalOrders: increment(1),
        totalRevenue: increment(orderValue),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating vendor stats:', error);
      // Don't throw here as this is a secondary operation
    }
  }

  // Calculate estimated delivery time based on vendor and distance
  calculateEstimatedDeliveryTime(
    vendorDeliveryTime: number, 
    distanceKm: number, 
    trafficFactor: number = 1.2
  ): number {
    const baseDeliveryTime = vendorDeliveryTime; // Vendor preparation time
    const travelTime = (distanceKm * 3) * trafficFactor; // Assume 3 minutes per km with traffic
    return Math.ceil(baseDeliveryTime + travelTime);
  }
}

export const orderService = new OrderService();