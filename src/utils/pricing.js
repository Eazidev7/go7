// src/utils/pricing.js
/**
 * Pricing Utilities for Go7
 * 
 * This module handles:
 * - Unified service-based fare calculation (Parcel, Errand, GoBuy, Restaurant, etc.)
 * - Delivery fare calculation based on distance, package size, and service speed
 * - Payment processing fee calculation for different payment methods
 * - Currency and distance formatting utilities
 * 
 * Last updated: October 23, 2025
 */

import { SERVICE_FARES, getFareConfig, getPeakHourStatus } from '../config/fareRates';
import { calculateGo7DeliveryFare, getActivePricingSettings } from './pricingSettings';

// =============================================
// UNIFIED SERVICE PRICING (New Enhanced System)
// =============================================

/**
 * Calculate Haversine distance between two coordinates
 * @param {Object} coord1 - First coordinate {lat, lng}
 * @param {Object} coord2 - Second coordinate {lat, lng}
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(coord1, coord2) {
  if (!coord1 || !coord2 || !coord1.lat || !coord1.lng || !coord2.lat || !coord2.lng) {
    return 0;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLon = toRadians(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(coord1.lat)) *
    Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * UNIFIED FARE CALCULATION - Works for all Go7 services
 * Calculate delivery fare based on service type and distance
 * 
 * @param {string} serviceType - Service type (parcel, errand, gobuy, restaurant, pharmacy, market, vendor)
 * @param {number} distanceKm - Distance in kilometers
 * @param {Object} options - Additional options (packageSize, packageWeight, etc.)
 * @returns {number} Calculated fare in Naira
 */
export function calculateServiceFare(serviceType, distanceKm, options = {}) {
  const settings = getActivePricingSettings();
  const config = getFareConfig(serviceType);

  // Admin-driven centralized delivery fare (pricingSettings/current)
  const result = calculateGo7DeliveryFare(settings, {
    distanceKm,
    durationMin: undefined,
    waitingMinutes: 0,
    packageMultiplier: 1,
  });
  let fare = result.total;

  // Service-specific additions (no admin field exists for these)
  if (serviceType === 'gobuy' && config?.serviceFee) {
    fare += config.serviceFee;
  }

  // Apply peak hour multiplier if enabled
  if (options.applyPeakPricing !== false) {
    const peakStatus = getPeakHourStatus();
    if (peakStatus && peakStatus.isPeak) {
      fare = Math.round(fare * peakStatus.multiplierValue);
    }
  }

  // Validate against admin min/max
  fare = Math.max(settings.minimumDeliveryFee, Math.min(fare, settings.maximumDeliveryFee));

  return fare;
}

/**
 * Calculate detailed fare breakdown for transparency
 * 
 * @param {string} serviceType - Service type
 * @param {number} distanceKm - Distance in kilometers
 * @param {Object} options - Additional options
 * @returns {Object} Detailed breakdown
 */
export function calculateServiceFareBreakdown(serviceType, distanceKm, options = {}) {
  const settings = getActivePricingSettings();
  const config = getFareConfig(serviceType);
  const result = calculateGo7DeliveryFare(settings, {
    distanceKm,
    durationMin: undefined,
    waitingMinutes: 0,
    packageMultiplier: 1,
  });

  const breakdown = {
    serviceType,
    distance: Math.round(distanceKm * 100) / 100,
    baseFee: result.baseFee,
    distanceFee: result.distanceCharge,
    serviceFee: 0,
    peakSurcharge: 0,
    subtotal: result.total,
    total: result.total,
    note: null
  };

  // GoBuy service fee
  if (serviceType === 'gobuy' && config?.serviceFee) {
    breakdown.serviceFee = config.serviceFee;
    breakdown.subtotal += config.serviceFee;
    breakdown.total += config.serviceFee;
  }

  // Apply peak hour multiplier
  if (options.applyPeakPricing !== false) {
    const peakStatus = getPeakHourStatus();
    if (peakStatus && peakStatus.isPeak) {
      const originalSubtotal = breakdown.subtotal;
      breakdown.subtotal = Math.round(breakdown.subtotal * peakStatus.multiplierValue);
      breakdown.peakSurcharge = breakdown.subtotal - originalSubtotal;
      breakdown.peakMultiplier = peakStatus.multiplier;
      breakdown.total = breakdown.subtotal;
    }
  }

  // Validate total against admin min/max
  breakdown.total = Math.max(settings.minimumDeliveryFee, Math.min(breakdown.total, settings.maximumDeliveryFee));

  return breakdown;
}

/**
 * Calculate fare from coordinates (convenience function)
 * 
 * @param {string} serviceType - Service type
 * @param {Object} pickup - Pickup coordinates {lat, lng}
 * @param {Object} dropoff - Dropoff coordinates {lat, lng}
 * @param {Object} options - Additional options
 * @returns {Object} Fare and breakdown
 */
export function calculateServiceFareFromCoordinates(serviceType, pickup, dropoff, options = {}) {
  const distance = calculateDistance(pickup, dropoff);
  const fare = calculateServiceFare(serviceType, distance, options);
  const breakdown = calculateServiceFareBreakdown(serviceType, distance, options);

  return {
    distance,
    fare,
    breakdown,
    formatted: currencyFormatNGN(fare)
  };
}

/**
 * Estimate delivery time based on distance and service type
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} serviceType - Service type
 * @returns {number} Estimated time in minutes
 */
export function estimateDeliveryTime(distanceKm, serviceType = 'parcel') {
  const speeds = {
    parcel: 25,
    errand: 25,
    gobuy: 20,
    restaurant: 30,
    pharmacy: 30,
    market: 20,
    vendor: 25
  };

  const speed = speeds[serviceType] || 25;
  const travelTime = (distanceKm / speed) * 60;
  const preparationTime = serviceType === 'gobuy' ? 20 : 10;
  const totalTime = Math.round(travelTime + preparationTime);

  return Math.round(totalTime * 1.2); // Add 20% buffer
}

// =============================================
// LEGACY CONSTANTS (Maintained for backward compatibility)
// =============================================

// Delivery Pricing Constants
export const BASE_FARE = 800;  // Updated from 700 to 800
export const PER_KM_RATE = 200; // Updated from 100 to 200
export const MIN_FARE = 800;  // Updated minimum fare
export const SERVICE_MULTIPLIERS = {
  standard: 1.0,
  express: 1.5
};
export const SIZE_MULTIPLIERS = {
  small: 1.0,   // No extra charge
  medium: 1.2,  // 20% extra
  large: 1.5    // 50% extra
};
export const PLATFORM_FEE = 100;
export const VAT_RATE = 0.075; // 7.5% VAT

// Payment Processing Constants
export const PAYSTACK_FEES = {
  percentage: 0.015, // 1.5%
  cap: 2000,         // Maximum fee of ₦2,000
  flat: 100          // Flat ₦100 fee
};

// =============================================
// FORMATTING UTILITIES
// =============================================

/**
 * Format a number as Nigerian Naira
 * @param {number} amount - Amount to format
 * @param {boolean} includeSymbol - Whether to include the ₦ symbol
 * @returns {string} Formatted currency string
 */
export const currencyFormatNGN = (amount, includeSymbol = true) => {
  if (typeof amount !== 'number') {
    return includeSymbol ? '₦0' : '0';
  }
  
  const formatted = Math.round(amount).toLocaleString();
  return includeSymbol ? `₦${formatted}` : formatted;
};

/**
 * Format distance in kilometers
 * @param {number} km - Distance in kilometers
 * @param {number} precision - Number of decimal places
 * @returns {string} Formatted distance string
 */
export const formatDistance = (km, precision = 1) => {
  if (typeof km !== 'number') {
    return '0.0 km';
  }
  return `${km.toFixed(precision)} km`;
};

// =============================================
// DELIVERY PRICING FUNCTIONS
// =============================================

/**
 * Compute fare based on distance and priority
 * @param {number|Object} distanceOrParams - Distance in kilometers or params object
 * @param {string} priority - Service priority ('standard' or 'express')
 * @returns {number} Calculated fare (rounded)
 */
export const computeFare = (distanceOrParams, priority = 'standard') => {
  // If params object is passed
  if (typeof distanceOrParams === 'object') {
    const { baseFare = BASE_FARE, perKm = PER_KM_RATE, serviceMultiplier = 1, distanceKm = 0 } = distanceOrParams;
    
    const baseAmount = baseFare;
    const distanceAmount = Math.max(distanceKm, 1) * perKm;
    
    return Math.round((baseAmount + distanceAmount) * serviceMultiplier);
  }
  
  // If distance and priority are passed
  const distanceKm = distanceOrParams;
  const baseAmount = BASE_FARE;
  const distanceAmount = Math.max(distanceKm, 1) * PER_KM_RATE;
  const multiplier = SERVICE_MULTIPLIERS[priority] || SERVICE_MULTIPLIERS.standard;
  
  return Math.round((baseAmount + distanceAmount) * multiplier);
};

/**
 * Generate pricing object with breakdown
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} priority - Service priority ('standard' or 'express')
 * @returns {Object} Detailed pricing breakdown
 */
export const generatePricingObject = (distanceKm, priority = 'standard') => {
  const fare = computeFare(distanceKm, priority);
  return {
    baseFare: BASE_FARE,
    distanceKm,
    distanceCharge: Math.max(distanceKm, 1) * PER_KM_RATE,
    multiplier: SERVICE_MULTIPLIERS[priority] || SERVICE_MULTIPLIERS.standard,
    total: fare
  };
};

/**
 * Calculate comprehensive fare including size and speed factors
 * @param {Object} params - Calculation parameters
 * @param {number} params.km - Distance in kilometers
 * @param {string} params.size - Package size ('small', 'medium', 'large')
 * @param {string} params.speed - Service speed ('standard', 'express')
 * @returns {Object} Detailed fare calculation with breakdown
 */
export function calculateFare({ km, size = 'small', speed = 'standard' }) {
  // Base price per km
  const baseRatePerKm = PER_KM_RATE;
  
  // Calculate base fare
  const baseFare = Math.max(km * baseRatePerKm + BASE_FARE, MIN_FARE);
  
  // Apply multipliers
  const sizeMultiplier = SIZE_MULTIPLIERS[size] || SIZE_MULTIPLIERS.small;
  const speedMultiplier = SERVICE_MULTIPLIERS[speed] || SERVICE_MULTIPLIERS.standard;
  
  const totalFare = baseFare * sizeMultiplier * speedMultiplier;
  
  // Add platform fee
  const platformFee = PLATFORM_FEE;
  
  // Calculate tax (7.5% VAT)
  const subtotal = totalFare + platformFee;
  const tax = subtotal * VAT_RATE;
  
  const total = subtotal + tax;
  
  return {
    baseFare: Math.round(baseFare),
    sizeMultiplier,
    speedMultiplier,
    platformFee,
    tax: Math.round(tax),
    subtotal: Math.round(subtotal),
    total: Math.round(total),
    breakdown: {
      distance: formatDistance(km),
      baseRate: currencyFormatNGN(baseRatePerKm) + '/km',
      packageSize: size,
      serviceSpeed: speed
    }
  };
}

// =============================================
// PAYMENT PROCESSING FUNCTIONS
// =============================================

/**
 * Calculate Paystack processing fee
 * @param {number} amount - Transaction amount (in Naira)
 * @returns {number} Processing fee (rounded)
 */
export const calculatePaystackFee = (amount) => {
  if (!amount || amount <= 0) return 0;
  
  // Calculate percentage fee with cap
  const percentageFee = Math.min(
    amount * PAYSTACK_FEES.percentage, 
    PAYSTACK_FEES.cap
  );
  
  // Add flat fee
  const totalFee = percentageFee + PAYSTACK_FEES.flat;
  
  return Math.round(totalFee);
};

/**
 * Calculate total amount including processing fee
 * @param {number} amount - Original amount
 * @param {string} paymentMethod - Payment method ('card', 'transfer', 'pod')
 * @param {boolean} includeProcessingFee - Whether to add processing fee
 * @returns {Object} Calculated totals with breakdown
 */
export const calculateTotalWithProcessingFee = (amount, paymentMethod = 'card', includeProcessingFee = true) => {
  if (!amount || amount <= 0) {
    return { 
      originalAmount: 0, 
      processingFee: 0, 
      totalAmount: 0 
    };
  }
  
  // Only apply processing fee for card/transfer payments if specified
  const processingFee = (paymentMethod === 'pod' || !includeProcessingFee) 
    ? 0 
    : calculatePaystackFee(amount);
  
  const totalAmount = amount + processingFee;
  
  return {
    originalAmount: amount,
    processingFee,
    totalAmount,
    formattedOriginal: currencyFormatNGN(amount),
    formattedFee: currencyFormatNGN(processingFee),
    formattedTotal: currencyFormatNGN(totalAmount)
  };
};
