import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { CustomerEvent, CustomerEventType, CustomerEventMeta, CustomerEventQuery } from '../types/audit';

export class CustomerEventService {
  /**
   * Log a customer event
   */
  static async logEvent(
    orderId: string, 
    type: CustomerEventType, 
    meta: CustomerEventMeta,
    options?: {
      actorType?: 'customer' | 'vendor' | 'admin' | 'system' | 'rider';
      actorId?: string;
      actorName?: string;
      visible?: boolean;
    }
  ): Promise<string> {
    try {
      const event: Omit<CustomerEvent, 'id'> = {
        orderId,
        timestamp: new Date(),
        type,
        meta,
        actorType: options?.actorType || 'system',
        actorId: options?.actorId,
        actorName: options?.actorName,
        visible: options?.visible ?? true
      };

      const eventsRef = collection(db, 'events_orders', orderId, 'events');
      const docRef = await addDoc(eventsRef, {
        ...event,
        timestamp: Timestamp.fromDate(event.timestamp)
      });

      console.log('Customer event logged:', docRef.id, type);
      return docRef.id;
    } catch (error) {
      console.error('Error logging customer event:', error);
      throw error;
    }
  }

  /**
   * Order lifecycle events
   */
  static async logOrderPlaced(orderId: string, orderData: any): Promise<void> {
    await this.logEvent(orderId, 'order_placed', {
      message: 'Order has been placed successfully',
      orderStatus: 'new',
      amount: orderData.subtotal,
      description: `Order placed for ${orderData.items?.length || 0} item(s)`
    }, {
      actorType: 'customer',
      actorId: orderData.customerId,
      actorName: orderData.customer?.name
    });
  }

  static async logOrderAccepted(orderId: string, vendorId: string, vendorName: string, estimatedTime?: number): Promise<void> {
    await this.logEvent(orderId, 'order_accepted', {
      message: 'Your order has been accepted by the vendor',
      description: `${vendorName} has confirmed your order and started preparation`,
      orderStatus: 'accepted',
      previousStatus: 'new',
      estimatedTime
    }, {
      actorType: 'vendor',
      actorId: vendorId,
      actorName: vendorName
    });
  }

  static async logOrderRejected(orderId: string, vendorId: string, vendorName: string, reason?: string): Promise<void> {
    await this.logEvent(orderId, 'order_rejected', {
      message: 'Your order has been declined',
      description: reason || 'The vendor is unable to fulfill this order at the moment',
      orderStatus: 'cancelled',
      previousStatus: 'new',
      reason
    }, {
      actorType: 'vendor',
      actorId: vendorId,
      actorName: vendorName
    });
  }

  /**
   * Payment events
   */
  static async logPaymentInitiated(orderId: string, amount: number, method: string, gateway?: string): Promise<void> {
    await this.logEvent(orderId, 'payment_initiated', {
      message: 'Payment processing has started',
      description: `Initiating ${method} payment`,
      amount,
      paymentMethod: method,
      gateway
    }, {
      actorType: 'customer'
    });
  }

  static async logPaymentCompleted(orderId: string, amount: number, transactionId: string, gateway: string): Promise<void> {
    await this.logEvent(orderId, 'payment_completed', {
      message: 'Payment completed successfully',
      description: 'Your payment has been processed and confirmed',
      amount,
      transactionId,
      gateway
    }, {
      actorType: 'system'
    });
  }

  static async logPaymentFailed(orderId: string, reason: string, gateway?: string): Promise<void> {
    await this.logEvent(orderId, 'payment_failed', {
      message: 'Payment failed',
      description: reason,
      gateway,
      reason
    }, {
      actorType: 'system'
    });
  }

  /**
   * Delivery events
   */
  static async logRiderAssigned(
    orderId: string, 
    riderId: string, 
    riderName: string, 
    riderPhone: string, 
    eta?: number
  ): Promise<void> {
    await this.logEvent(orderId, 'rider_assigned', {
      message: 'Delivery rider has been assigned',
      description: `${riderName} will be handling your delivery`,
      riderId,
      riderName,
      riderPhone,
      eta,
      orderStatus: 'rider_assigned'
    }, {
      actorType: 'system'
    });
  }

  static async logPickupStarted(orderId: string, riderId: string, riderName: string): Promise<void> {
    await this.logEvent(orderId, 'pickup_started', {
      message: 'Rider is heading to pickup location',
      description: `${riderName} is on the way to collect your order`,
      riderId,
      riderName,
      orderStatus: 'pickup_started'
    }, {
      actorType: 'rider',
      actorId: riderId,
      actorName: riderName
    });
  }

  static async logOrderPickedUp(orderId: string, riderId: string, riderName: string, eta?: number): Promise<void> {
    await this.logEvent(orderId, 'order_picked_up', {
      message: 'Order has been picked up',
      description: `${riderName} has collected your order and is heading your way`,
      riderId,
      riderName,
      eta,
      orderStatus: 'picked_up'
    }, {
      actorType: 'rider',
      actorId: riderId,
      actorName: riderName
    });
  }

  static async logInTransit(orderId: string, riderId: string, riderName: string, location?: { lat: number; lng: number; address?: string }): Promise<void> {
    await this.logEvent(orderId, 'in_transit', {
      message: 'Order is on the way',
      description: 'Your order is being delivered',
      riderId,
      riderName,
      location,
      orderStatus: 'in_transit'
    }, {
      actorType: 'rider',
      actorId: riderId,
      actorName: riderName
    });
  }

  static async logDelivered(orderId: string, riderId: string, riderName: string): Promise<void> {
    await this.logEvent(orderId, 'delivered', {
      message: 'Order delivered successfully',
      description: 'Your order has been delivered. Thank you for choosing our service!',
      riderId,
      riderName,
      orderStatus: 'delivered'
    }, {
      actorType: 'rider',
      actorId: riderId,
      actorName: riderName
    });
  }

  /**
   * Communication events
   */
  static async logVendorCalled(orderId: string, vendorId: string, vendorName: string, phone: string): Promise<void> {
    await this.logEvent(orderId, 'vendor_called', {
      message: 'Vendor contacted',
      description: `Called ${vendorName}`,
      phoneNumber: phone
    }, {
      actorType: 'customer',
      visible: false // Internal tracking
    });
  }

  static async logCustomerCalled(orderId: string, customerId: string, customerName: string, phone: string, callerType: 'vendor' | 'rider'): Promise<void> {
    await this.logEvent(orderId, 'customer_called', {
      message: `${callerType === 'vendor' ? 'Vendor' : 'Rider'} called you`,
      description: 'Contact attempt made',
      phoneNumber: phone
    }, {
      actorType: callerType
    });
  }

  static async logNotificationSent(orderId: string, type: 'sms' | 'push' | 'email', message: string): Promise<void> {
    await this.logEvent(orderId, 'notification_sent', {
      message: 'Notification sent',
      description: message,
      messageType: type
    }, {
      actorType: 'system',
      visible: false
    });
  }

  /**
   * Support events
   */
  static async logSupportTicket(orderId: string, ticketId: string, category: string, priority: 'low' | 'medium' | 'high' | 'urgent'): Promise<void> {
    await this.logEvent(orderId, 'support_ticket_created', {
      message: 'Support ticket created',
      description: `Issue reported: ${category}`,
      ticketId,
      category,
      priority
    }, {
      actorType: 'customer'
    });
  }

  static async logIssueResolved(orderId: string, ticketId: string, resolution: string): Promise<void> {
    await this.logEvent(orderId, 'issue_resolved', {
      message: 'Issue resolved',
      description: resolution,
      ticketId
    }, {
      actorType: 'admin'
    });
  }

  /**
   * Query customer events
   */
  static async queryEvents(queryParams: CustomerEventQuery): Promise<CustomerEvent[]> {
    try {
      if (!queryParams.orderId) {
        throw new Error('OrderId is required for querying customer events');
      }

      const eventsRef = collection(db, 'events_orders', queryParams.orderId, 'events');
      let q = query(eventsRef);

      // Add filters
      if (queryParams.type) {
        if (Array.isArray(queryParams.type)) {
          q = query(q, where('type', 'in', queryParams.type));
        } else {
          q = query(q, where('type', '==', queryParams.type));
        }
      }
      if (queryParams.actorType) {
        q = query(q, where('actorType', '==', queryParams.actorType));
      }
      if (queryParams.visibleOnly) {
        q = query(q, where('visible', '==', true));
      }
      if (queryParams.startDate) {
        q = query(q, where('timestamp', '>=', Timestamp.fromDate(queryParams.startDate)));
      }
      if (queryParams.endDate) {
        q = query(q, where('timestamp', '<=', Timestamp.fromDate(queryParams.endDate)));
      }

      // Add ordering and limit
      q = query(q, orderBy('timestamp', 'asc')); // Chronological order for timeline
      if (queryParams.limit) {
        q = query(q, firestoreLimit(queryParams.limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      })) as CustomerEvent[];
    } catch (error) {
      console.error('Error querying customer events:', error);
      throw error;
    }
  }

  /**
   * Get order timeline (visible events only)
   */
  static async getOrderTimeline(orderId: string): Promise<CustomerEvent[]> {
    return this.queryEvents({
      orderId,
      visibleOnly: true
    });
  }

  /**
   * Get all order events (including internal)
   */
  static async getAllOrderEvents(orderId: string): Promise<CustomerEvent[]> {
    return this.queryEvents({
      orderId
    });
  }

  /**
   * Get events by type
   */
  static async getEventsByType(orderId: string, type: CustomerEventType | CustomerEventType[]): Promise<CustomerEvent[]> {
    return this.queryEvents({
      orderId,
      type
    });
  }

  /**
   * Get recent events for timeline display
   */
  static async getRecentEvents(orderId: string, limit: number = 20): Promise<CustomerEvent[]> {
    return this.queryEvents({
      orderId,
      visibleOnly: true,
      limit
    });
  }

  /**
   * Get delivery tracking events
   */
  static async getDeliveryEvents(orderId: string): Promise<CustomerEvent[]> {
    const deliveryTypes: CustomerEventType[] = [
      'rider_assigned',
      'pickup_started', 
      'order_picked_up',
      'in_transit',
      'delivered'
    ];
    
    return this.queryEvents({
      orderId,
      type: deliveryTypes
    });
  }

  /**
   * Get payment events
   */
  static async getPaymentEvents(orderId: string): Promise<CustomerEvent[]> {
    const paymentTypes: CustomerEventType[] = [
      'payment_initiated',
      'payment_completed',
      'payment_failed',
      'payment_refunded'
    ];
    
    return this.queryEvents({
      orderId,
      type: paymentTypes
    });
  }
}
