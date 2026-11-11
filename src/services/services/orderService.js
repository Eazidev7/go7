import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  runTransaction,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Order-related service functions for the marketplace
 */

/**
 * Creates a new order in the system
 * 
 * @param {Object} orderData - The order data
 * @param {string} orderData.vendorId - ID of the vendor
 * @param {Object} orderData.customer - Customer information
 * @param {string} orderData.customer.name - Customer name
 * @param {string} orderData.customer.phone - Customer phone number
 * @param {Array} orderData.items - Order items
 * @param {number} orderData.subtotal - Order subtotal
 * @param {number} orderData.deliveryFee - Delivery fee
 * @param {boolean} orderData.isPOD - Whether it's Pay on Delivery
 * @param {string} orderData.areaFrom - Pickup area
 * @param {string} orderData.areaTo - Delivery area
 * @returns {Promise<string>} - The created order ID
 */
export const createOrder = async (orderData) => {
  try {
    // Calculate total
    const total = orderData.subtotal + orderData.deliveryFee;
    
    // Prepare order document
    const orderDoc = {
      vendorId: orderData.vendorId,
      customer: {
        name: orderData.customer.name,
        phone: orderData.customer.phone
      },
      items: orderData.items.map(item => ({
        productId: item.productId,
        title: item.product.title,
        qty: item.qty,
        unitPrice: item.product.price,
        options: item.variantKey ? { variant: item.product.variantName } : undefined
      })),
      subtotal: orderData.subtotal,
      deliveryFee: orderData.deliveryFee,
      total: total,
      payment: {
        method: orderData.isPOD ? 'POD' : 'CARD',
        status: orderData.isPOD ? 'paid' : 'pending'
      },
      status: 'new',
      areaFrom: orderData.areaFrom,
      areaTo: orderData.areaTo,
      createdAt: serverTimestamp()
    };
    
    // Add order to the orders collection
    const ordersRef = collection(db, 'orders');
    const orderRef = await addDoc(ordersRef, orderDoc);
    
    return orderRef.id;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

/**
 * Retrieves an order by its ID
 * 
 * @param {string} orderId - The order ID
 * @returns {Promise<Object|null>} - The order data or null if not found
 */
export const getOrder = async (orderId) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (orderSnap.exists()) {
      return {
        id: orderSnap.id,
        ...orderSnap.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
};

/**
 * Updates the payment status of an order
 * 
 * @param {string} orderId - The order ID
 * @param {string} status - The payment status ('paid', 'failed')
 * @returns {Promise<void>}
 */
export const updateOrderPaymentStatus = async (orderId, status) => {
  try {
    const orderRef = doc(db, `orders/${orderId}`);
    await updateDoc(orderRef, {
      'payment.status': status
    });
  } catch (error) {
    console.error('Error updating order payment status:', error);
    throw error;
  }
};

/**
 * Updates the status of an order
 * 
 * @param {string} orderId - The order ID
 * @param {string} status - The new status
 * @returns {Promise<void>}
 */
export const updateOrderStatus = async (orderId, status) => {
  try {
    const orderRef = doc(db, `orders/${orderId}`);
    await updateDoc(orderRef, {
      status: status
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

/**
 * Initiates a payment for an order using the specified payment provider
 * 
 * @param {string} orderId - The order ID
 * @param {string} provider - The payment provider ('paystack', 'flutterwave')
 * @param {Object} paymentData - Additional payment data
 * @returns {Promise<Object>} - Payment initialization result
 */
export const initiatePayment = async (orderId, provider, paymentData) => {
  try {
    // Get order details
    const orderRef = doc(db, `orders/${orderId}`);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      throw new Error('Order not found');
    }
    
    const orderData = orderSnap.data();
    
    // Choose payment provider
    switch (provider.toLowerCase()) {
      case 'paystack':
        return initiatePaystackPayment(orderId, orderData, paymentData);
      case 'flutterwave':
        return initiateFlutterwavePayment(orderId, orderData, paymentData);
      default:
        throw new Error('Unsupported payment provider');
    }
  } catch (error) {
    console.error('Error initiating payment:', error);
    throw error;
  }
};

/**
 * Initiates a Paystack payment
 * @private
 */
const initiatePaystackPayment = async (orderId, orderData, paymentData) => {
  // This would normally call the Paystack API
  // For now, we'll simulate this with a mock implementation
  
  // In a real implementation, you would:
  // 1. Call Paystack's initialize transaction API
  // 2. Return the authorization URL or payment reference
  
  return {
    success: true,
    reference: `PST_${orderId}_${Date.now()}`,
    authorizationUrl: `https://checkout.paystack.com/simulate/${orderId}`,
    message: 'Payment initialization successful'
  };
};

/**
 * Initiates a Flutterwave payment
 * @private
 */
const initiateFlutterwavePayment = async (orderId, orderData, paymentData) => {
  // This would normally call the Flutterwave API
  // For now, we'll simulate this with a mock implementation
  
  // In a real implementation, you would:
  // 1. Call Flutterwave's initialize payment API
  // 2. Return the checkout URL or payment reference
  
  return {
    success: true,
    reference: `FLW_${orderId}_${Date.now()}`,
    checkoutUrl: `https://checkout.flutterwave.com/simulate/${orderId}`,
    message: 'Payment initialization successful'
  };
};

/**
 * Verifies a payment using the specified payment provider
 * 
 * @param {string} reference - The payment reference
 * @param {string} provider - The payment provider ('paystack', 'flutterwave')
 * @returns {Promise<Object>} - Payment verification result
 */
export const verifyPayment = async (reference, provider) => {
  try {
    // Choose payment provider
    switch (provider.toLowerCase()) {
      case 'paystack':
        return verifyPaystackPayment(reference);
      case 'flutterwave':
        return verifyFlutterwavePayment(reference);
      default:
        throw new Error('Unsupported payment provider');
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

/**
 * Verifies a Paystack payment
 * @private
 */
const verifyPaystackPayment = async (reference) => {
  // This would normally call Paystack's verify transaction API
  // For now, we'll simulate this with a mock implementation
  
  // Simulating a successful payment
  return {
    success: true,
    data: {
      reference,
      status: 'success',
      amount: 10000, // In kobo (₦100.00)
      transaction_date: new Date().toISOString()
    }
  };
};

/**
 * Verifies a Flutterwave payment
 * @private
 */
const verifyFlutterwavePayment = async (reference) => {
  // This would normally call Flutterwave's verify payment API
  // For now, we'll simulate this with a mock implementation
  
  // Simulating a successful payment
  return {
    success: true,
    data: {
      tx_ref: reference,
      status: 'successful',
      amount: 100, // In naira (₦100.00)
      transaction_date: new Date().toISOString()
    }
  };
};
