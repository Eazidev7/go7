import { RIDER_PAY_RATES } from '../config/riderRates.js';

// Compute rider pay based on delivery parameters
export const computeRiderPay = ({ mode = 'standard', km = 0, isPoD = false, isSurge = false }) => {
  // Get the rate structure for the delivery mode
  const rates = RIDER_PAY_RATES[mode] || RIDER_PAY_RATES.standard;
  
  let total = 0;
  
  // Add base fee
  total += rates.base;
  
  // Add distance-based fee
  total += km * rates.perKm;
  
  // Add Pay on Delivery fee if applicable
  if (isPoD) {
    total += rates.pod;
  }
  
  // Add surge pricing if applicable
  if (isSurge) {
    total += rates.surge;
  }
  
  return Math.round(total);
};

// Format currency in Nigerian Naira
export const formatNaira = (amount) => {
  return `₦${amount.toLocaleString('en-NG')}`;
};

// Calculate breakdown of rider earnings
export const getRiderPayBreakdown = ({ mode = 'standard', km = 0, isPoD = false, isSurge = false }) => {
  const rates = RIDER_PAY_RATES[mode] || RIDER_PAY_RATES.standard;
  
  const breakdown = {
    base: rates.base,
    distance: km * rates.perKm,
    pod: isPoD ? rates.pod : 0,
    surge: isSurge ? rates.surge : 0
  };
  
  breakdown.total = breakdown.base + breakdown.distance + breakdown.pod + breakdown.surge;
  
  return breakdown;
};
