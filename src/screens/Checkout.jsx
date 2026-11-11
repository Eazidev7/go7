/**
 * 🛒 Go7 Checkout - Final Order Processing
 * Handles order finalization before payment processing
 */

import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Finalize order with calculated fare and route data before payment
 * @param {string} orderId - The order ID
 * @param {number} liveFare - Final calculated fare
 * @param {number} distanceKm - Total distance in kilometers
 * @param {number} durationMin - Total duration in minutes
 * @param {Object} additionalData - Additional order data
 * @returns {Promise<boolean>} Success status
 */
export async function finalizeOrder(orderId, liveFare, distanceKm, durationMin, additionalData = {}) {
  console.log('🛒 Finalizing order:', {
    orderId,
    liveFare,
    distanceKm,
    durationMin,
    additionalData
  });

  try {
    // Save final fare and route analytics BEFORE processing payment
    await updateDoc(doc(db, "orders", orderId), {
      // Core fare data
      finalFare: liveFare,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      durationMin: parseFloat(durationMin.toFixed(1)),
      
      // Order status
      status: "confirmed",
      confirmedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      
      // Payment readiness
      readyForPayment: true,
      paymentAmount: liveFare,
      
      // Route analytics
      routeAnalytics: {
        totalDistance: distanceKm,
        totalDuration: durationMin,
        averageSpeed: distanceKm / (durationMin / 60), // km/h
        finalizedAt: serverTimestamp()
      },
      
      // Additional data from caller
      ...additionalData
    });

    console.log('✅ Order finalized successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to finalize order:', error);
    
    // Log error to alerts collection for monitoring
    try {
      await addDoc(collection(db, "alerts"), {
        type: "order_finalization_error",
        orderId,
        error: error.message,
        timestamp: serverTimestamp(),
        severity: "high"
      });
    } catch (logError) {
      console.error('Failed to log finalization error:', logError);
    }
    
    throw error;
  }
}

/**
 * Prepare order data for payment processing
 * @param {Object} orderData - Complete order information
 * @returns {Object} Payment-ready order data
 */
export function preparePaymentData(orderData) {
  const {
    finalFare,
    distanceKm,
    durationMin,
    pickupLocation,
    deliveryLocation,
    customerInfo,
    orderItems = [],
    promoCode = null,
    paymentMethod = 'wallet'
  } = orderData;

  return {
    // Payment essentials
    amount: finalFare,
    currency: 'NGN',
    paymentMethod,
    
    // Order reference
    reference: `GO7-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
    
    // Order details
    orderSummary: {
      items: orderItems,
      subtotal: finalFare,
      deliveryFee: 0, // Already included in finalFare
      total: finalFare,
      distance: `${distanceKm.toFixed(1)} km`,
      duration: `${durationMin.toFixed(0)} min`
    },
    
    // Location data
    pickup: pickupLocation,
    delivery: deliveryLocation,
    
    // Customer info
    customer: customerInfo,
    
    // Promo/discount
    promoCode,
    
    // Metadata for tracking
    metadata: {
      source: 'go7-web-app',
      platform: 'web',
      distanceKm,
      durationMin,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Validate order data before finalization
 * @param {Object} orderData - Order data to validate
 * @returns {Object} Validation result
 */
export function validateOrderData(orderData) {
  const errors = [];
  const warnings = [];

  // Required fields validation
  if (!orderData.finalFare || orderData.finalFare <= 0) {
    errors.push('Final fare is required and must be greater than 0');
  }

  if (!orderData.distanceKm || orderData.distanceKm <= 0) {
    errors.push('Distance is required and must be greater than 0');
  }

  if (!orderData.durationMin || orderData.durationMin <= 0) {
    errors.push('Duration is required and must be greater than 0');
  }

  if (!orderData.pickupLocation) {
    errors.push('Pickup location is required');
  }

  if (!orderData.deliveryLocation) {
    errors.push('Delivery location is required');
  }

  // Business logic validations
  if (orderData.distanceKm > 100) {
    warnings.push('Distance exceeds 100km - please verify');
  }

  if (orderData.durationMin > 300) { // 5 hours
    warnings.push('Duration exceeds 5 hours - please verify');
  }

  if (orderData.finalFare > 50000) { // ₦50,000
    warnings.push('Fare exceeds ₦50,000 - please verify');
  }

  const averageSpeed = orderData.distanceKm / (orderData.durationMin / 60);
  if (averageSpeed > 80) { // km/h
    warnings.push('Average speed seems too high - please verify route');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

/**
 * Create order confirmation summary
 * @param {Object} orderData - Finalized order data
 * @returns {Object} Confirmation summary
 */
export function createOrderSummary(orderData) {
  return {
    orderId: orderData.orderId,
    status: 'confirmed',
    fare: orderData.finalFare,
    route: {
      distance: `${orderData.distanceKm.toFixed(1)} km`,
      duration: `${orderData.durationMin.toFixed(0)} minutes`,
      pickup: orderData.pickupLocation?.address || 'Pickup location',
      delivery: orderData.deliveryLocation?.address || 'Delivery location'
    },
    estimatedArrival: new Date(Date.now() + orderData.durationMin * 60 * 1000).toLocaleTimeString(),
    confirmationTime: new Date().toLocaleString(),
    paymentStatus: 'pending'
  };
}