/**
 * 🎯 Go7 Shared Fare Calculator (Frontend ESM Version)
 * Unified fare calculation utility for all Go7 services.
 *
 * This module is a thin wrapper around the centralized, admin-driven fare
 * calculator (pricingSettings/current) so every screen shows the SAME price.
 */

import { calculateGo7DeliveryFare, getActivePricingSettings } from './pricingSettings';

// Legacy constants kept for backward-compatible imports (no longer used for math)
export const BASE_FARE = 1000;
export const PRICE_PER_KM = 150;
export const PRICE_PER_MIN = 20;
export const PLATFORM_FEE = 0.05;
export const SURGE_MULTIPLIER = 1.0;

/**
 * Calculate fare for Go7 deliveries/rides
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} durationMin - Duration in minutes
 * @param {Object} options - Optional parameters
 * @param {number} options.surge - Surge multiplier (default: 1.0)
 * @param {number} options.discount - Discount amount in ₦ (default: 0)
 * @returns {number} Final fare amount in ₦
 */
export function calculateFare(distanceKm, durationMin, { surge = SURGE_MULTIPLIER, discount = 0 } = {}) {
  if (distanceKm == null) {
    console.warn('calculateFare: Missing distance, returning base fare');
    return getActivePricingSettings().minimumDeliveryFee;
  }

  const settings = getActivePricingSettings();
  const result = calculateGo7DeliveryFare(settings, {
    distanceKm,
    durationMin,
    waitingMinutes: 0,
    packageMultiplier: 1,
  });

  let total = result.total;
  if (surge && surge !== 1) total = Math.round(total * surge);
  total = Math.max(total - Math.round(discount), 0);

  return total;
}

/**
 * Get fare breakdown for display purposes
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} durationMin - Duration in minutes
 * @param {Object} options - Optional parameters
 * @returns {Object} Detailed fare breakdown
 */
export function getFareBreakdown(distanceKm, durationMin, options = {}) {
  const { surge = SURGE_MULTIPLIER, discount = 0 } = options;
  const settings = getActivePricingSettings();

  if (distanceKm == null) {
    return {
      baseFare: settings.minimumDeliveryFee,
      distanceCost: 0,
      timeCost: 0,
      rideCost: settings.minimumDeliveryFee,
      surgeFee: 0,
      platformFee: 0,
      subtotal: settings.minimumDeliveryFee,
      discount: 0,
      total: settings.minimumDeliveryFee,
    };
  }

  const result = calculateGo7DeliveryFare(settings, {
    distanceKm,
    durationMin,
    waitingMinutes: 0,
    packageMultiplier: 1,
  });

  const subtotal = result.total;
  const surgeFee = surge && surge !== 1 ? Math.round(subtotal * (surge - 1)) : 0;
  const discountAmount = Math.round(discount);
  const total = Math.max(subtotal + surgeFee - discountAmount, 0);

  return {
    baseFare: result.baseFee,
    distanceFare: result.distanceCharge,
    durationFare: result.timeFee,
    rideCost: result.subtotal,
    surgeFee,
    platformFee: 0,
    subtotal: subtotal + surgeFee,
    discount: discountAmount,
    total,
  };
}

/**
 * Format fare amount with currency symbol
 * @param {number} amount - Amount in ₦
 * @returns {string} Formatted amount
 */
export function formatFare(amount) {
  return `₦${amount?.toLocaleString?.() || '0'}`;
}

/**
 * Calculate estimated delivery time based on distance
 * @param {number} distanceKm - Distance in kilometers
 * @returns {number} Estimated time in minutes
 */
export function estimateDeliveryTime(distanceKm) {
  const averageSpeed = 30; // km/h
  const prepTime = 5; // minutes
  const travelTime = (Number(distanceKm) / averageSpeed) * 60;
  return Math.round(travelTime + prepTime);
}

// Export constants for external use
export const FARE_CONSTANTS = {
  BASE_FARE,
  PRICE_PER_KM,
  PRICE_PER_MIN,
  PLATFORM_FEE,
  SURGE_MULTIPLIER,
};
