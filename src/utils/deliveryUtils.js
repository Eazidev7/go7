// Utility functions for delivery fee calculation

/**
 * Calculate delivery fee based on distance and priority
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} priority - Priority level ('standard' or 'express')
 * @param {string} packageSize - Size of the package ('small', 'medium', or 'large')
 * @returns {Object} - Fee breakdown
 */
export function calculateDeliveryFee(distanceKm, priority = 'standard', packageSize = 'small') {
  // Base rates
  const BASE_FARE = 150; // Base fare in Naira
  const RATE_PER_KM = 100; // Rate per kilometer in Naira
  
  // Package size multipliers
  const SIZE_MULTIPLIERS = {
    small: 1.0,
    medium: 1.2,
    large: 1.5
  };
  
  // Priority multipliers
  const PRIORITY_MULTIPLIERS = {
    standard: 1.0,
    express: 1.5
  };
  
  // Calculate distance charge
  const distanceCharge = Math.max(0, Math.round(distanceKm * RATE_PER_KM));
  
  // Apply size multiplier
  const sizeMultiplier = SIZE_MULTIPLIERS[packageSize] || SIZE_MULTIPLIERS.small;
  const sizeAdjustedFare = Math.round((BASE_FARE + distanceCharge) * sizeMultiplier);
  
  // Apply priority multiplier
  const priorityMultiplier = PRIORITY_MULTIPLIERS[priority] || PRIORITY_MULTIPLIERS.standard;
  const totalFare = Math.round(sizeAdjustedFare * priorityMultiplier);
  
  return {
    baseFare: BASE_FARE,
    distanceCharge,
    sizeMultiplier,
    priorityMultiplier,
    subtotal: BASE_FARE + distanceCharge,
    sizeAdjustedFare,
    totalFare
  };
}

/**
 * Format currency in Naira
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted amount
 */
export function formatNaira(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format distance in kilometers
 * @param {number} distance - Distance in kilometers
 * @returns {string} - Formatted distance
 */
export function formatDistance(distance) {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
}

/**
 * Format time duration in minutes
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted duration
 */
export function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
}

/**
 * Get estimated arrival time based on duration
 * @param {number} durationMinutes - Duration in minutes
 * @returns {string} - Formatted arrival time
 */
export function getEstimatedArrival(durationMinutes) {
  const now = new Date();
  const arrivalTime = new Date(now.getTime() + durationMinutes * 60000);
  
  return arrivalTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
}