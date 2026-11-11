/**
 * Go7 Centralized Fare Calculation System
 * ========================================
 * Single source of truth for all pricing logic
 * Uses integer math (kobo) to avoid floating point errors
 */

// Base pricing constants (Naira)
const BASE_FARE_NAIRA = 500;      // ₦500 base fare
const RATE_PER_KM_NAIRA = 200;    // ₦200 per kilometer
const MIN_FARE_NAIRA = 800;       // ₦800 minimum charge
const MAX_FARE_NAIRA = 10000;     // ₦10,000 maximum cap
const SERVICE_FEE_PERCENT = 5;    // 5% service fee
const TAX_PERCENT = 7.5;          // 7.5% VAT

/**
 * Convert Naira to Kobo (1 Naira = 100 Kobo)
 * @param {number} naira - Amount in Naira
 * @returns {number} Amount in Kobo (integer)
 */
export const toKobo = (naira) => Math.round(naira * 100);

/**
 * Convert Kobo to Naira
 * @param {number} kobo - Amount in Kobo
 * @returns {number} Amount in Naira
 */
export const fromKobo = (kobo) => kobo / 100;

/**
 * Calculate fare breakdown from distance in meters
 * @param {number} distanceMeters - Distance from API (Google Distance Matrix, etc.) in meters
 * @returns {object} Fare breakdown with all amounts in Kobo (integers)
 * 
 * @example
 * const result = calculateFareFromMeters(5000); // 5km
 * console.log(result.distanceKm); // 5
 * console.log(fromKobo(result.breakdown.totalKobo)); // ₦1437.50
 */
export function calculateFareFromMeters(distanceMeters) {
  // Convert meters to kilometers precisely
  const distanceKm = (distanceMeters || 0) / 1000;

  // Calculate components in Kobo (integers) to avoid float errors
  const baseKobo = toKobo(BASE_FARE_NAIRA);
  const distanceFareNaira = RATE_PER_KM_NAIRA * distanceKm;
  const distanceFareKobo = Math.round(distanceFareNaira * 100);

  // Calculate subtotal
  let subtotalKobo = baseKobo + distanceFareKobo;

  // Apply minimum and maximum fare caps
  const minKobo = toKobo(MIN_FARE_NAIRA);
  const maxKobo = toKobo(MAX_FARE_NAIRA);
  
  if (subtotalKobo < minKobo) subtotalKobo = minKobo;
  if (subtotalKobo > maxKobo) subtotalKobo = maxKobo;

  // Calculate service fee and tax based on subtotal
  const serviceFeeKobo = Math.round((subtotalKobo * SERVICE_FEE_PERCENT) / 100);
  const taxKobo = Math.round((subtotalKobo * TAX_PERCENT) / 100);

  // Calculate final total
  const totalKobo = subtotalKobo + serviceFeeKobo + taxKobo;

  return {
    distanceKm: Number(distanceKm.toFixed(3)),
    breakdown: {
      baseKobo,
      distanceFareKobo,
      subtotalKobo,
      serviceFeeKobo,
      taxKobo,
      totalKobo,
    },
  };
}

/**
 * Format Kobo amount to Naira currency string
 * @param {number} kobo - Amount in Kobo
 * @returns {string} Formatted currency (e.g., "₦1,437.50")
 */
export function formatCurrency(kobo) {
  const naira = fromKobo(kobo);
  return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get pricing constants for display
 * @returns {object} Pricing configuration
 */
export function getPricingConfig() {
  return {
    baseFare: BASE_FARE_NAIRA,
    ratePerKm: RATE_PER_KM_NAIRA,
    minFare: MIN_FARE_NAIRA,
    maxFare: MAX_FARE_NAIRA,
    serviceFeePercent: SERVICE_FEE_PERCENT,
    taxPercent: TAX_PERCENT,
  };
}

/**
 * Validate fare amount
 * @param {number} totalKobo - Total amount in Kobo
 * @returns {object} Validation result
 */
export function validateFare(totalKobo) {
  const minKobo = toKobo(MIN_FARE_NAIRA);
  const maxKobo = toKobo(MAX_FARE_NAIRA);

  if (totalKobo < minKobo) {
    return {
      valid: false,
      error: `Minimum fare is ${formatCurrency(minKobo)}`,
    };
  }

  if (totalKobo > maxKobo) {
    return {
      valid: false,
      error: `Maximum fare is ${formatCurrency(maxKobo)}`,
    };
  }

  return { valid: true };
}
