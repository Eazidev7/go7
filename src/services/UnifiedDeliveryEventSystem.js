import { db } from '../../lib/firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp, 
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc
} from 'firebase/firestore';

class UnifiedDeliveryEventSystem {
  constructor() {
    this.listeners = new Map();
    this.toastCallbacks = new Map();
    this.modalCallbacks = new Map();
    this.chatHandlers = new Map();
  }

  // Initialize unified event system for customers
  subscribeToCustomerEvents(orderId, toastCallback) {
    const unsubscribe = onSnapshot(
      doc(db, 'orders', orderId),
      async (doc) => {
        if (doc.exists()) {
          const orderData = doc.data();
          const prevStatus = this.getStoredStatus(orderId);
          
          // Check for status changes
          if (prevStatus && prevStatus !== orderData.status) {
            console.log(`🔔 Status changed: ${prevStatus} → ${orderData.status}`);
            
            // Get rider info if available
            let riderInfo = null;
            if (orderData.riderId) {
              riderInfo = await this.getRiderInfo(orderData.riderId);
            }
            
            // Trigger both toast and chat message
            await this.handleStatusChange(orderId, orderData.status, {
              riderName: riderInfo?.name || orderData.riderName,
              eta: orderData.estimatedDeliveryTime,
              previousStatus: prevStatus,
              orderData
            });
            
            // Show toast notification
            if (toastCallback) {
              toastCallback(orderData.status, {
                riderName: riderInfo?.name || orderData.riderName,
                eta: orderData.estimatedDeliveryTime,
                orderData
              });
            }
          }
          
          // Store current status
          this.storeStatus(orderId, orderData.status);
        }
      },
      (error) => {
        console.error('❌ Error subscribing to customer events:', error);
      }
    );

    this.listeners.set(`customer_${orderId}`, unsubscribe);
    return unsubscribe;
  }

  // Initialize unified event system for riders
  subscribeToRiderEvents(riderId, modalCallback) {
    const unsubscribe = onSnapshot(
      doc(db, 'riders', riderId),
      async (doc) => {
        if (doc.exists()) {
          const riderData = doc.data();
          
          // Check for new order assignments
          if (riderData.assignedOrderId && riderData.orderNotified !== riderData.assignedOrderId) {
            const orderDetails = await this.getOrderDetails(riderData.assignedOrderId);
            
            if (orderDetails && modalCallback) {
              modalCallback(orderDetails);
              
              // Mark as notified
              await updateDoc(doc.ref, {
                orderNotified: riderData.assignedOrderId,
                notifiedAt: serverTimestamp()
              });
            }
          }
        }
      },
      (error) => {
        console.error('❌ Error subscribing to rider events:', error);
      }
    );

    this.listeners.set(`rider_${riderId}`, unsubscribe);
    return unsubscribe;
  }

  // Handle status changes with unified chat + toast system
  async handleStatusChange(orderId, newStatus, context = {}) {
    try {
      // Add automated chat message
      await this.addAutomatedChatMessage(orderId, newStatus, context);
      
      // Log the event
      await this.logDeliveryEvent(orderId, newStatus, context);
      
      console.log(`✅ Unified event handled: ${newStatus} for order ${orderId}`);
    } catch (error) {
      console.error('❌ Error handling status change:', error);
    }
  }

  // Add automated chat messages based on status
  async addAutomatedChatMessage(orderId, status, context = {}) {
    try {
      const { riderName, eta, previousStatus } = context;
      
      const messages = {
        accepted: {
          message: `🚀 Great news! Rider ${riderName || 'your assigned rider'} has accepted your delivery${eta ? `. Estimated delivery time: ${eta}` : ''}`,
          type: 'status_update',
          priority: 'high'
        },
        picked_up: {
          message: `🛍️ Your order has been picked up and is now on its way to you!`,
          type: 'status_update',
          priority: 'high'
        },
        en_route: {
          message: `🛵 Your rider is en route${eta ? ` with an ETA of ${eta}` : ''}. You can track their progress in real-time.`,
          type: 'status_update',
          priority: 'high'
        },
        delivered: {
          message: `🎉 Congratulations! Your order has been successfully delivered. Thank you for choosing Go7!`,
          type: 'status_update',
          priority: 'high'
        },
        cancelled: {
          message: `❌ Your order has been cancelled. If you need assistance, please contact our support team.`,
          type: 'status_update',
          priority: 'urgent'
        },
        pending: {
          message: `⏳ We're finding the best available rider for your delivery. This may take a few minutes.`,
          type: 'status_update',
          priority: 'medium'
        }
      };

      const messageConfig = messages[status];
      if (!messageConfig) return;

      const chatRef = collection(db, 'chats', orderId, 'messages');
      await addDoc(chatRef, {
        senderId: 'go7-system',
        senderName: 'Go7 Assistant',
        senderType: 'system',
        message: messageConfig.message,
        timestamp: serverTimestamp(),
        isRead: false,
        automated: true,
        status: status,
        messageType: messageConfig.type,
        priority: messageConfig.priority,
        context: {
          riderName,
          eta,
          previousStatus,
          orderId
        }
      });

      console.log(`💬 Automated chat message added for status: ${status}`);
    } catch (error) {
      console.error('❌ Error adding automated chat message:', error);
    }
  }

  // Update order status with unified event handling
  async updateOrderStatus(orderId, newStatus, additionalData = {}, triggerEvents = true) {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const updateData = {
        status: newStatus,
        [`${newStatus}At`]: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...additionalData
      };

      await updateDoc(orderRef, updateData);

      // Trigger unified events if requested
      if (triggerEvents) {
        await this.handleStatusChange(orderId, newStatus, {
          ...additionalData,
          triggeredManually: true
        });
      }

      console.log(`✅ Order status updated: ${orderId} → ${newStatus}`);
      return true;
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      return false;
    }
  }

  // Accept order with unified event handling
  async acceptOrder(orderId, riderId, riderName = null) {
    try {
      // Get current order data
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (!orderDoc.exists()) throw new Error('Order not found');
      
      const orderData = orderDoc.data();
      
      // Calculate ETA
      const eta = this.calculateETA(orderData.distance);
      
      // Update order
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'accepted',
        riderId: riderId,
        riderName: riderName,
        acceptedAt: serverTimestamp(),
        estimatedDeliveryTime: eta ? `${eta} mins` : null,
        updatedAt: serverTimestamp()
      });

      // Update rider
      const riderRef = doc(db, 'riders', riderId);
      await updateDoc(riderRef, {
        status: 'busy',
        currentOrderId: orderId,
        assignedOrderId: null,
        orderNotified: null,
        updatedAt: serverTimestamp()
      });

      // Trigger unified events
      await this.handleStatusChange(orderId, 'accepted', {
        riderName,
        eta: eta ? `${eta} mins` : null,
        riderId
      });

      console.log(`✅ Order accepted with unified events: ${orderId}`);
      return true;
    } catch (error) {
      console.error('❌ Error accepting order:', error);
      return false;
    }
  }

  // Reject order and find next rider
  async rejectOrder(orderId, riderId, reason = 'manual_reject') {
    try {
      const nextRiderId = await this.findNextAvailableRider(riderId);
      
      if (nextRiderId) {
        // Assign to next rider
        await this.assignOrderToRider(orderId, nextRiderId);
      } else {
        // No riders available
        await this.updateOrderStatus(orderId, 'pending', {
          rejectedBy: riderId,
          rejectionReason: reason,
          noRidersAvailable: true
        });
      }

      // Update current rider
      const riderRef = doc(db, 'riders', riderId);
      await updateDoc(riderRef, {
        assignedOrderId: null,
        orderNotified: null,
        status: 'available',
        updatedAt: serverTimestamp()
      });

      console.log(`❌ Order rejected: ${orderId}, reason: ${reason}`);
      return true;
    } catch (error) {
      console.error('❌ Error rejecting order:', error);
      return false;
    }
  }

  // Helper methods
  async getRiderInfo(riderId) {
    try {
      const riderDoc = await getDoc(doc(db, 'riders', riderId));
      return riderDoc.exists() ? riderDoc.data() : null;
    } catch (error) {
      console.error('❌ Error getting rider info:', error);
      return null;
    }
  }

  async getOrderDetails(orderId) {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        return { orderId, ...orderDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting order details:', error);
      return null;
    }
  }

  async assignOrderToRider(orderId, riderId) {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        assignedRiderId: riderId,
        status: 'assigned',
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const riderRef = doc(db, 'riders', riderId);
      await updateDoc(riderRef, {
        assignedOrderId: orderId,
        status: 'assigned',
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('❌ Error assigning order:', error);
      return false;
    }
  }

  async findNextAvailableRider(excludeRiderId) {
    try {
      const ridersRef = collection(db, 'riders');
      const availableRidersQuery = query(
        ridersRef,
        where('status', '==', 'available'),
        where('isOnline', '==', true),
        orderBy('lastActive', 'desc'),
        limit(10)
      );

      const ridersSnapshot = await getDocs(availableRidersQuery);
      const availableRiders = ridersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(rider => rider.id !== excludeRiderId);

      return availableRiders.length > 0 ? availableRiders[0].id : null;
    } catch (error) {
      console.error('❌ Error finding next rider:', error);
      return null;
    }
  }

  calculateETA(distance) {
    if (!distance) return null;
    const dist = parseFloat(distance);
    const averageSpeed = 25; // km/h
    return Math.round((dist / averageSpeed) * 60);
  }

  async logDeliveryEvent(orderId, status, context = {}) {
    try {
      const eventsRef = collection(db, 'deliveryEvents');
      await addDoc(eventsRef, {
        orderId,
        status,
        context,
        timestamp: serverTimestamp(),
        eventType: 'status_change'
      });
    } catch (error) {
      console.error('❌ Error logging delivery event:', error);
    }
  }

  // Status storage for change detection
  storeStatus(orderId, status) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`go7_order_status_${orderId}`, status);
    }
  }

  getStoredStatus(orderId) {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(`go7_order_status_${orderId}`);
    }
    return null;
  }

  // Cleanup
  unsubscribe(key) {
    const unsubscribe = this.listeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(key);
    }
  }

  unsubscribeAll() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }
}

// Create singleton instance
const unifiedDeliveryEvents = new UnifiedDeliveryEventSystem();

export default unifiedDeliveryEvents;