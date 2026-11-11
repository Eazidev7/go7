/**
 * Go7 fare calculation — delegates to Firestore-backed launch/standard pricing.
 */
import {
  DEFAULT_PRICING_SETTINGS,
  calculateGo7DeliveryFare,
  getActivePricingSettings,
  setActivePricingSettings,
} from './pricingSettings';

export { getActivePricingSettings, setActivePricingSettings, DEFAULT_PRICING_SETTINGS };

// Legacy constants (launch defaults for modules that still import them)
export const BASE_FARE = DEFAULT_PRICING_SETTINGS.launchBaseFee;
export const PER_KM = DEFAULT_PRICING_SETTINGS.launchPerKmAfterIncluded;
export const PER_MIN = 20;

export function estimateDeliveryTime(distanceKm) {
  const averageSpeed = 30;
  const prepTime = 5;
  const travelTime = (Number(distanceKm) / averageSpeed) * 60;
  return Math.round(travelTime + prepTime);
}

function resolveSettings(opts = {}) {
  return opts.pricingSettings || getActivePricingSettings();
}

/**
 * @param {number} distanceKm
 * @param {number} [durationMin] - only used when enableTimeCharge is true in settings
 * @param {object} [opts]
 */
export function calculateFare(distanceKm, durationMin, opts = {}) {
  const settings = resolveSettings(opts);
  const result = calculateGo7DeliveryFare(settings, {
    distanceKm,
    durationMin,
    waitingMinutes: opts.waitingMinutes ?? 0,
    packageMultiplier: opts.packageMultiplier ?? 1,
  });
  return result.total;
}

export function getFareBreakdown(distanceKm, durationMin, opts = {}) {
  const settings = resolveSettings(opts);
  const result = calculateGo7DeliveryFare(settings, {
    distanceKm,
    durationMin,
    waitingMinutes: opts.waitingMinutes ?? 0,
    packageMultiplier: opts.packageMultiplier ?? 1,
  });
  return {
    baseFare: result.baseFee,
    includedKm: result.includedKm,
    chargeableKm: result.chargeableKm,
    distanceFee: result.distanceCharge,
    timeFee: result.timeFee,
    waitingCharge: result.waitingCharge,
    subtotal: result.subtotal,
    total: result.total,
    distance: result.distance,
    duration: result.duration,
    pricingMode: result.pricingMode,
  };
}

export function computeTripFare(distanceKm, serviceMultiplier = 1, opts = {}) {
  const settings = resolveSettings(opts);
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km <= 0) {
    const minFee = settings.minimumDeliveryFee ?? DEFAULT_PRICING_SETTINGS.minimumDeliveryFee;
    return {
      baseFare: minFee,
      baseFee: minFee,
      distanceFee: 0,
      distanceCharge: 0,
      timeFee: 0,
      waitingCharge: 0,
      includedKm: settings.launchMode ? settings.launchIncludedKm : settings.standardIncludedKm,
      chargeableKm: 0,
      packageSurcharge: 0,
      subtotal: minFee,
      total: minFee,
      distance: 0,
      duration: 0,
      pricingMode: settings.launchMode ? 'launch' : 'standard',
    };
  }

  const duration = opts.durationMin ?? estimateDeliveryTime(km);
  const result = calculateGo7DeliveryFare(settings, {
    distanceKm: km,
    durationMin: duration,
    waitingMinutes: opts.waitingMinutes ?? 0,
    packageMultiplier: serviceMultiplier,
  });

  return {
    ...result,
    packageSurcharge: result.packageSurcharge,
  };
}

export function formatFare(amount) {
  return `₦${amount?.toLocaleString() || '0'}`;
}

export function validateFareConsistency(expectedFare, actualFare, tolerance = 50) {
  return Math.abs(expectedFare - actualFare) <= tolerance;
}

export const FARE_CONSTANTS = {
  BASE_FARE,
  PER_KM,
  PER_MIN,
};
