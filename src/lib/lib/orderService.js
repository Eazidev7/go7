import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Service for managing orders in the system
 */
export const OrderService = {
  /**
   * Creates a new order in Firestore
   * @param {Object} orderData - The order data
   * @returns {Promise<string>} - The ID of the created order
   */
  async createOrder(orderData) {
    try {
      const orderCollection = collection(db, 'orders');
      
      // Add timestamp
      const orderWithTimestamp = {
        ...orderData,
        createdAt: serverTimestamp(),
      };
      
      const orderRef = await addDoc(orderCollection, orderWithTimestamp);
      return orderRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  /**
   * Fetches a specific order by ID
   * @param {string} orderId - The ID of the order to fetch
   * @returns {Promise<Object>} - The order data
   */
  async getOrder(orderId) {
    try {
      const orderRef = doc(db, `orders/${orderId}`);
      const orderSnap = await getDoc(orderRef);
      
      if (!orderSnap.exists()) {
        throw new Error('Order not found');
      }
      
      return {
        id: orderSnap.id,
        ...orderSnap.data()
      };
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },

  /**
   * Updates the payment status of an order
   * @param {string} orderId - The ID of the order to update
   * @param {string} status - The new payment status ('pending', 'paid', 'failed')
   * @returns {Promise<void>}
   */
  async updatePaymentStatus(orderId, status) {
    try {
      const orderRef = doc(db, `orders/${orderId}`);
      await updateDoc(orderRef, {
        'payment.status': status
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },

  /**
   * Updates the order status
   * @param {string} orderId - The ID of the order to update
   * @param {string} status - The new order status ('new', 'accepted', 'picked_up', 'delivered', 'cancelled')
   * @returns {Promise<void>}
   */
  async updateOrderStatus(orderId, status) {
    try {
      const orderRef = doc(db, `orders/${orderId}`);
      await updateDoc(orderRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  /**
   * Gets all orders for a specific vendor
   * @param {string} vendorId - The vendor ID
   * @returns {Promise<Array>} - Array of order objects
   */
  async getVendorOrders(vendorId) {
    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('vendorId', '==', vendorId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(ordersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching vendor orders:', error);
      throw error;
    }
  },

  /**
   * Gets all orders for a specific customer (by phone)
   * @param {string} phone - The customer's phone number
   * @returns {Promise<Array>} - Array of order objects
   */
  async getCustomerOrders(phone) {
    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('customer.phone', '==', phone),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(ordersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      throw error;
    }
  }
};

export default OrderService;
