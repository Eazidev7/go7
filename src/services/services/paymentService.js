/**
 * Payment service for handling Paystack and Flutterwave integrations
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Constants
const PAYSTACK_TEST_KEY = "pk_test_your_paystack_test_key";
const FLUTTERWAVE_TEST_KEY = "FLWPUBK_TEST-your-flutterwave-test-key";

/**
 * Initializes a Paystack payment
 * 
 * @param {Object} paymentData - Payment information
 * @param {string} paymentData.email - Customer email
 * @param {string} paymentData.amount - Amount in smallest currency unit (kobo)
 * @param {string} paymentData.reference - Unique reference (typically orderId)
 * @param {string} paymentData.callbackUrl - URL to redirect after payment
 * @returns {Promise<Object>} - The payment initialization response
 */
export const initializePaystackPayment = async (paymentData) => {
  try {
    // Convert amount to kobo (smallest currency unit for Naira)
    const amountInKobo = Math.round(paymentData.amount * 100);

    // Prepare request to Paystack API
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_TEST_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: paymentData.email,
        amount: amountInKobo,
        reference: paymentData.reference,
        callback_url: paymentData.callbackUrl,
        metadata: {
          orderId: paymentData.reference
        }
      })
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to initialize Paystack payment');
    }

    return {
      success: true,
      data: data.data,
      redirectUrl: data.data.authorization_url
    };
  } catch (error) {
    console.error('Paystack payment initialization error:', error);
    return {
      success: false,
      error: error.message || 'An error occurred while initializing payment'
    };
  }
};

/**
 * Verifies a Paystack payment
 * 
 * @param {string} reference - Payment reference (typically orderId)
 * @returns {Promise<Object>} - The payment verification response
 */
export const verifyPaystackPayment = async (reference) => {
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_TEST_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to verify Paystack payment');
    }

    return {
      success: true,
      data: data.data,
      isSuccessful: data.data.status === 'success'
    };
  } catch (error) {
    console.error('Paystack payment verification error:', error);
    return {
      success: false,
      error: error.message || 'An error occurred while verifying payment'
    };
  }
};

/**
 * Initializes a Flutterwave payment
 * 
 * @param {Object} paymentData - Payment information
 * @param {string} paymentData.email - Customer email
 * @param {string} paymentData.amount - Amount in Naira
 * @param {string} paymentData.reference - Unique reference (typically orderId)
 * @param {string} paymentData.callbackUrl - URL to redirect after payment
 * @param {Object} paymentData.customer - Customer information
 * @returns {Promise<Object>} - The payment initialization response
 */
export const initializeFlutterwavePayment = async (paymentData) => {
  try {
    // Set up Flutterwave inline payment
    const flutterwaveConfig = {
      public_key: FLUTTERWAVE_TEST_KEY,
      tx_ref: paymentData.reference,
      amount: paymentData.amount,
      currency: "NGN",
      payment_options: "card",
      customer: {
        email: paymentData.email,
        name: paymentData.customer.name,
        phone_number: paymentData.customer.phone
      },
      customizations: {
        title: "Go7 Order Payment",
        description: `Payment for order ${paymentData.reference}`,
        logo: window.location.origin + "/go7-logo.png"
      },
      redirect_url: paymentData.callbackUrl
    };

    // For server implementation, you would need to:
    // 1. Have a backend endpoint that initializes the payment
    // 2. Return a payment link or auth data to the client

    // This is a client-side initialization for Flutterwave
    return {
      success: true,
      data: flutterwaveConfig,
      useInlineScript: true // Indicates client should use Flutterwave inline script
    };
  } catch (error) {
    console.error('Flutterwave payment initialization error:', error);
    return {
      success: false,
      error: error.message || 'An error occurred while initializing payment'
    };
  }
};

/**
 * Verifies a Flutterwave payment
 * 
 * @param {string} transactionId - Transaction ID returned by Flutterwave
 * @returns {Promise<Object>} - The payment verification response
 */
export const verifyFlutterwavePayment = async (transactionId) => {
  try {
    // This would typically be a server-side operation for security
    // For demo purposes, we're showing how it would be structured

    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_TEST_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.status === 'success') {
      throw new Error(data.message || 'Failed to verify Flutterwave payment');
    }

    return {
      success: true,
      data: data.data,
      isSuccessful: data.data.status === 'successful'
    };
  } catch (error) {
    console.error('Flutterwave payment verification error:', error);
    return {
      success: false,
      error: error.message || 'An error occurred while verifying payment'
    };
  }
};

/**
 * Update payment status in the database
 * @param {Object} params - Payment callback parameters
 * @param {string} params.reference - Payment reference
 * @param {string} params.status - Payment status
 * @param {string} params.orderId - Order ID
 * @returns {Object} Result of the update operation
 */
export const updatePaymentStatus = async (params) => {
  try {
    const { reference, status, orderId } = params;
    
    if (!orderId) {
      return { success: false, message: 'Order ID is required' };
    }
    
    // Get the order from Firestore
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      return { success: false, message: 'Order not found' };
    }
    
    const order = orderDoc.data();
    
    // For demo purposes, we'll accept any status as successful
    // In production, you should verify payment with the gateway
    if (status && (status.toLowerCase() === 'successful' || status.toLowerCase() === 'success')) {
      // Update order payment status
      await updateDoc(orderRef, {
        'payment.status': 'paid',
        'payment.reference': reference,
        'payment.verifiedAt': new Date()
      });
      
      return { success: true, message: 'Payment status updated successfully' };
    }
    
    // If status is not successful
    return { 
      success: false, 
      message: 'Payment verification failed'
    };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, message: 'Error updating payment status', error };
  }
};

/**
 * Generate a unique payment reference
 * @returns {string} Unique payment reference
 */
export const generatePaymentReference = () => {
  return `GO7-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
};
