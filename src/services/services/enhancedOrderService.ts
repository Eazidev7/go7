import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy as firestoreOrderBy,
  serverTimestamp,
  runTransaction 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AuditLogService } from './auditLogService';
import { CustomerEventService } from './customerEventService';
import { Order, OrderUpdate, NewOrder } from '../types/order';

export class EnhancedOrderService {
  /**
   * Create a new order with audit logging and customer events
   */
  static async createOrder(orderData: NewOrder, actorUid?: string): Promise<Order> {
    try {
      // Generate tracking code
      const trackingCode = this.generateTrackingCode();
      
      // Create order object
      const newOrder: Omit<Order, 'id'> = {
        ...orderData,
        trackingCode,
        status: 'new',
        timestamps: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      // Add order to Firestore
      const ordersCollection = collection(db, 'orders');
      const docRef = await addDoc(ordersCollection, {
        ...newOrder,
        timestamps: {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      });

      const createdOrder: Order = {
        id: docRef.id,
        ...newOrder,
      };

      // Log audit event
      if (actorUid) {
        await AuditLogService.logOrderEvent(
          actorUid,
          orderData.vendorId,
          docRef.id,
          'order_created',
          null,
          createdOrder
        );
      }

      // Log customer event
      await CustomerEventService.logOrderPlaced(docRef.id, createdOrder);

      console.log('Order created successfully:', docRef.id);
      return createdOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Update order status with audit logging and customer events
   */
  static async updateOrderStatus(
    orderId: string,
    newStatus: string,
    actorUid?: string,
    actorType: 'customer' | 'vendor' | 'admin' | 'system' | 'rider' = 'system',
    actorName?: string,
    additionalData?: any
  ): Promise<Order> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      // Get current order
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        throw new Error(`Order ${orderId} not found`);
      }
      
      const currentOrder = { id: orderId, ...orderSnap.data() } as Order;
      const previousStatus = currentOrder.status;

      // Prepare update data
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      // Add status-specific timestamps
      const now = new Date();
      switch (newStatus) {
        case 'accepted':
          updateData['timestamps.acceptedAt'] = serverTimestamp();
          break;
        case 'picked_up':
          updateData['timestamps.pickedUpAt'] = serverTimestamp();
          break;
        case 'delivered':
          updateData['timestamps.deliveredAt'] = serverTimestamp();
          break;
        case 'cancelled':
          updateData['timestamps.cancelledAt'] = serverTimestamp();
          break;
      }

      // Update order in Firestore
      await updateDoc(orderRef, updateData);

      const updatedOrder: Order = {
        ...currentOrder,
        status: newStatus,
        timestamps: {
          ...currentOrder.timestamps,
          updatedAt: now,
          ...(updateData['timestamps.acceptedAt'] && { acceptedAt: now }),
          ...(updateData['timestamps.pickedUpAt'] && { pickedUpAt: now }),
          ...(updateData['timestamps.deliveredAt'] && { deliveredAt: now }),
          ...(updateData['timestamps.cancelledAt'] && { cancelledAt: now }),
        }
      };

      // Log audit event
      if (actorUid) {
        await AuditLogService.logOrderEvent(
          actorUid,
          currentOrder.vendorId,
          orderId,
          'order_status_changed',
          currentOrder,
          updatedOrder
        );
      }

      // Log customer events based on status
      await this.logCustomerEventForStatusChange(
        orderId,
        newStatus,
        previousStatus,
        actorType,
        actorUid,
        actorName,
        currentOrder,
        additionalData
      );

      console.log(`Order ${orderId} status updated from ${previousStatus} to ${newStatus}`);
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Accept order (vendor action)
   */
  static async acceptOrder(
    orderId: string,
    vendorId: string,
    vendorName: string,
    estimatedTime?: number,
    actorUid?: string
  ): Promise<Order> {
    const updatedOrder = await this.updateOrderStatus(
      orderId,
      'accepted',
      actorUid,
      'vendor',
      vendorName,
      { estimatedTime }
    );

    await CustomerEventService.logOrderAccepted(
      orderId,
      vendorId,
      vendorName,
      estimatedTime
    );

    return updatedOrder;
  }

  /**
   * Reject order (vendor action)
   */
  static async rejectOrder(
    orderId: string,
    vendorId: string,
    vendorName: string,
    reason?: string,
    actorUid?: string
  ): Promise<Order> {
    const updatedOrder = await this.updateOrderStatus(
      orderId,
      'rejected',
      actorUid,
      'vendor',
      vendorName,
      { reason }
    );

    await CustomerEventService.logOrderRejected(
      orderId,
      vendorId,
      vendorName,
      reason
    );

    return updatedOrder;
  }

  /**
   * Assign rider to order
   */
  static async assignRider(
    orderId: string,
    riderId: string,
    riderName: string,
    riderPhone: string,
    eta?: number,
    actorUid?: string
  ): Promise<Order> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      const updateData = {
        'delivery.riderId': riderId,
        'delivery.riderName': riderName,
        'delivery.riderPhone': riderPhone,
        ...(eta && { 'delivery.eta': eta }),
        status: 'rider_assigned',
        updatedAt: serverTimestamp()
      };

      await updateDoc(orderRef, updateData);

      // Log customer event
      await CustomerEventService.logRiderAssigned(
        orderId,
        riderId,
        riderName,
        riderPhone,
        eta
      );

      // Get updated order
      const orderSnap = await getDoc(orderRef);
      const updatedOrder = { id: orderId, ...orderSnap.data() } as Order;

      // Log audit event
      if (actorUid) {
        await AuditLogService.logOrderEvent(
          actorUid,
          updatedOrder.vendorId,
          orderId,
          'rider_assigned',
          null,
          updatedOrder
        );
      }

      console.log(`Rider ${riderName} assigned to order ${orderId}`);
      return updatedOrder;
    } catch (error) {
      console.error('Error assigning rider:', error);
      throw error;
    }
  }

  /**
   * Update order with payment information
   */
  static async updatePaymentStatus(
    orderId: string,
    paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded',
    transactionId?: string,
    gateway?: string,
    amount?: number,
    actorUid?: string
  ): Promise<Order> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      const updateData = {
        'payment.status': paymentStatus,
        ...(transactionId && { 'payment.transactionId': transactionId }),
        ...(gateway && { 'payment.gateway': gateway }),
        updatedAt: serverTimestamp()
      };

      // Add payment timestamps
      if (paymentStatus === 'completed') {
        updateData['payment.completedAt'] = serverTimestamp();
      } else if (paymentStatus === 'failed') {
        updateData['payment.failedAt'] = serverTimestamp();
      }

      await updateDoc(orderRef, updateData);

      // Get updated order
      const orderSnap = await getDoc(orderRef);
      const updatedOrder = { id: orderId, ...orderSnap.data() } as Order;

      // Log customer events
      if (paymentStatus === 'completed') {
        await CustomerEventService.logPaymentCompleted(
          orderId,
          amount || updatedOrder.total,
          transactionId || 'unknown',
          gateway || 'unknown'
        );
      } else if (paymentStatus === 'failed') {
        await CustomerEventService.logPaymentFailed(
          orderId,
          'Payment processing failed',
          gateway
        );
      }

      // Log audit event
      if (actorUid) {
        await AuditLogService.logOrderEvent(
          actorUid,
          updatedOrder.vendorId,
          orderId,
          'payment_updated',
          null,
          updatedOrder
        );
      }

      console.log(`Payment status updated for order ${orderId}: ${paymentStatus}`);
      return updatedOrder;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * Cancel order with reason
   */
  static async cancelOrder(
    orderId: string,
    reason: string,
    cancelledBy: 'customer' | 'vendor' | 'admin' | 'system',
    actorUid?: string,
    actorName?: string
  ): Promise<Order> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      const updateData = {
        status: 'cancelled',
        cancelReason: reason,
        cancelledBy,
        'timestamps.cancelledAt': serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(orderRef, updateData);

      // Get updated order
      const orderSnap = await getDoc(orderRef);
      const updatedOrder = { id: orderId, ...orderSnap.data() } as Order;

      // Log audit event
      if (actorUid) {
        await AuditLogService.logOrderEvent(
          actorUid,
          updatedOrder.vendorId,
          orderId,
          'order_cancelled',
          null,
          updatedOrder
        );
      }

      // Note: Customer event will be logged by logCustomerEventForStatusChange

      console.log(`Order ${orderId} cancelled by ${cancelledBy}: ${reason}`);
      return updatedOrder;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Get orders for a vendor with optional filters
   */
  static async getVendorOrders(
    vendorId: string,
    status?: string,
    limit?: number
  ): Promise<Order[]> {
    try {
      const ordersCollection = collection(db, 'orders');
      let q = query(ordersCollection, where('vendorId', '==', vendorId));
      
      if (status) {
        q = query(q, where('status', '==', status));
      }
      
      q = query(q, firestoreOrderBy('timestamps.createdAt', 'desc'));
      
      if (limit) {
        q = query(q, limit);
      }

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
    } catch (error) {
      console.error('Error getting vendor orders:', error);
      throw error;
    }
  }

  /**
   * Get customer orders
   */
  static async getCustomerOrders(customerPhone: string): Promise<Order[]> {
    try {
      const ordersCollection = collection(db, 'orders');
      const q = query(
        ordersCollection,
        where('customer.phone', '==', customerPhone),
        firestoreOrderBy('timestamps.createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
    } catch (error) {
      console.error('Error getting customer orders:', error);
      throw error;
    }
  }

  /**
   * Generate tracking code for orders
   */
  private static generateTrackingCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `GO7${timestamp}${random}`;
  }

  /**
   * Log customer events based on status changes
   */
  private static async logCustomerEventForStatusChange(
    orderId: string,
    newStatus: string,
    previousStatus: string,
    actorType: 'customer' | 'vendor' | 'admin' | 'system' | 'rider',
    actorUid?: string,
    actorName?: string,
    orderData?: any,
    additionalData?: any
  ): Promise<void> {
    try {
      switch (newStatus) {
        case 'accepted':
          // Already handled in acceptOrder method
          break;
        case 'rejected':
          // Already handled in rejectOrder method
          break;
        case 'pickup_started':
          if (orderData?.delivery?.riderId && orderData?.delivery?.riderName) {
            await CustomerEventService.logPickupStarted(
              orderId,
              orderData.delivery.riderId,
              orderData.delivery.riderName
            );
          }
          break;
        case 'picked_up':
          if (orderData?.delivery?.riderId && orderData?.delivery?.riderName) {
            await CustomerEventService.logOrderPickedUp(
              orderId,
              orderData.delivery.riderId,
              orderData.delivery.riderName,
              additionalData?.eta
            );
          }
          break;
        case 'in_transit':
          if (orderData?.delivery?.riderId && orderData?.delivery?.riderName) {
            await CustomerEventService.logInTransit(
              orderId,
              orderData.delivery.riderId,
              orderData.delivery.riderName,
              additionalData?.location
            );
          }
          break;
        case 'delivered':
          if (orderData?.delivery?.riderId && orderData?.delivery?.riderName) {
            await CustomerEventService.logDelivered(
              orderId,
              orderData.delivery.riderId,
              orderData.delivery.riderName
            );
          }
          break;
        case 'cancelled':
          // Customer event already logged by the specific cancel methods
          break;
      }
    } catch (error) {
      console.error('Error logging customer event for status change:', error);
      // Don't throw - customer events are supplementary
    }
  }
}
