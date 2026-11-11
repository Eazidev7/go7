// GO7 UNIFIED FARE CONFIGURATION
// ================================
// Centralized pricing rates for all Go7 services
// Easy to update and maintain in one location

/**
 * SERVICE_FARES - Base rates and per-kilometer pricing
 * 
 * Structure:
 * - base: Fixed starting fee for the service (₦)
 * - perKm: Additional charge per kilometer (₦)
 * 
 * Last Updated: October 23, 2025
 */
export const SERVICE_FARES = {
  // Parcel Delivery - Standard package delivery
  // ⚠️ Rates must match pricingSettings/current (launch defaults)
  parcel: {
    base: 1000,
    perKm: 150,
    description: "Standard parcel delivery across Abeokuta",
    minFare: 1000,
    maxFare: 6000
  },

  // Quick Errand - Personal errands and tasks
  errand: {
    base: 1000,
    perKm: 200,
    description: "Quick personal errands handled with care",
    minFare: 1000,
    maxFare: 15000
  },

  // GoBuy - Personal shopping service
  gobuy: {
    base: 1000,
    perKm: 120,
    description: "Personal shopping and delivery service",
    minFare: 1000,
    maxFare: 8000,
    serviceFee: 500 // Additional fee for shopping service
  },

  // Restaurant - Food delivery
  restaurant: {
    base: 300,
    perKm: 100,
    description: "Hot meals delivered fresh",
    minFare: 300,
    maxFare: 5000,
    flatRateDistance: 3, // Use flat rate for distances ≤ 3km
    flatRate: 700 // Flat fee for short distances
  },

  // Pharmacy - Medication delivery
  pharmacy: {
    base: 350,
    perKm: 90,
    description: "Fast & confidential medication delivery",
    minFare: 350,
    maxFare: 4000
  },

  // Market - Groceries and market items
  market: {
    base: 400,
    perKm: 120,
    description: "Fresh groceries and market items",
    minFare: 400,
    maxFare: 6000
  },

  // Vendor - General vendor pickup
  vendor: {
    base: 600,
    perKm: 150,
    description: "Quick pickup from local vendors",
    minFare: 600,
    maxFare: 8000
  }
};

/**
 * PACKAGE SIZE MULTIPLIERS
 * Additional charges based on package size (for parcel service)
 */
export const PACKAGE_SIZE_RATES = {
  small: 0,           // No additional charge
  medium: 200,        // +₦200
  large: 400,         // +₦400
  extra_large: 600    // +₦600
};

/**
 * PACKAGE WEIGHT SURCHARGES
 * Additional charges based on package weight (for parcel service)
 */
export const PACKAGE_WEIGHT_RATES = {
  under_5kg: 0,       // No surcharge
  '5_10kg': 300,      // +₦300
  '10_20kg': 600,     // +₦600
  over_20kg: 1000     // +₦1000
};

/**
 * PEAK HOUR MULTIPLIERS
 * Surge pricing during high-demand periods
 */
export const PEAK_MULTIPLIERS = {
  normal: 1.0,        // No surge
  moderate: 1.2,      // +20%
  high: 1.5,          // +50%
  peak: 2.0           // +100%
};

/**
 * TIME-BASED PRICING
 * Define peak hours for surge pricing
 */
export const PEAK_HOURS = [
  { start: 7, end: 9, multiplier: 'moderate' },   // Morning rush
  { start: 12, end: 14, multiplier: 'moderate' }, // Lunch time
  { start: 17, end: 20, multiplier: 'high' }      // Evening rush
];

/**
 * SPECIAL SERVICE FEES
 * Additional fees for special services
 */
export const SPECIAL_FEES = {
  expressDelivery: 500,      // Rush/express delivery
  scheduledDelivery: 0,      // No extra charge for scheduled
  waitTime: 100,             // Per 10 minutes wait time
  returnTrip: 0.5,           // 50% of original fare
  insurance: 200             // Package insurance fee
};

/**
 * MINIMUM ORDER VALUES
 * Minimum order requirements for certain services
 */
export const MIN_ORDER_VALUES = {
  gobuy: 1000,      // Minimum ₦1000 for GoBuy
  restaurant: 500,  // Minimum ₦500 for restaurant
  market: 800       // Minimum ₦800 for market
};

/**
 * Get fare configuration for a service type
 * @param {string} serviceType - Service type key
 * @returns {Object} Fare configuration object
 */
export function getFareConfig(serviceType) {
  const config = SERVICE_FARES[serviceType];
  if (!config) {
    console.warn(`Unknown service type: ${serviceType}, using parcel defaults`);
    return SERVICE_FARES.parcel;
  }
  return config;
}

/**
 * Check if current time is peak hour
 * @returns {Object} { isPeak: boolean, multiplier: string }
 */
export function getPeakHourStatus() {
  const now = new Date();
  const hour = now.getHours();

  for (const peak of PEAK_HOURS) {
    if (hour >= peak.start && hour < peak.end) {
      return {
        isPeak: true,
        multiplier: peak.multiplier,
        multiplierValue: PEAK_MULTIPLIERS[peak.multiplier]
      };
    }
  }

  return {
    isPeak: false,
    multiplier: 'normal',
    multiplierValue: PEAK_MULTIPLIERS.normal
  };
}

/**
 * Validate fare is within acceptable range
 * @param {number} fare - Calculated fare
 * @param {string} serviceType - Service type
 * @returns {number} Validated fare (clamped to min/max)
 */
export function validateFare(fare, serviceType) {
  const config = getFareConfig(serviceType);
  const validated = Math.max(config.minFare, Math.min(fare, config.maxFare));
  
  if (validated !== fare) {
    console.warn(`Fare ${fare} clamped to ${validated} for ${serviceType}`);
  }
  
  return validated;
}

// Export all configurations
export default {
  SERVICE_FARES,
  PACKAGE_SIZE_RATES,
  PACKAGE_WEIGHT_RATES,
  PEAK_MULTIPLIERS,
  PEAK_HOURS,
  SPECIAL_FEES,
  MIN_ORDER_VALUES,
  getFareConfig,
  getPeakHourStatus,
  validateFare
};
