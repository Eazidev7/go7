import { calculateDistance } from '../utils/distance.js';
import { resolveDistanceKm } from '../lib/distanceResolver.js';
import { computeRiderPay } from '../utils/earnings.js';
import { getSLATargets } from '../utils/sla.js';
import { CUSTOMER_MARKUP, MIN_CUSTOMER_FEE } from '../config/riderRates.js';

export const useFareAndSLA = () => {
  // Synchronous estimate using haversine (legacy)
  const estimate = ({ pickup, dropoff, mode = 'standard', isPoD = false, isSurge = false }) => {
    // Calculate distance using haversine
    const km = calculateDistance(pickup, dropoff);
    
    // Calculate rider pay
    const riderPay = computeRiderPay({ mode, km, isPoD, isSurge });
    
    // Calculate customer fee (25% markup on rider pay, minimum ₦500)
    const customerFee = Math.max(
      Math.round(riderPay * (1 + CUSTOMER_MARKUP)),
      MIN_CUSTOMER_FEE
    );
    
    // Get SLA targets
    const slaTargets = getSLATargets(mode);
    
    return {
      km: Math.round(km * 100) / 100, // Round to 2 decimal places
      riderPay,
      customerFee,
      slaTargets: {
        pickup: slaTargets.pickup,
        delivery: slaTargets.delivery
      }
    };
  };

  // Async estimate using road distance with haversine fallback
  const estimateAsync = async ({ pickup, dropoff, mode = 'standard', isPoD = false, isSurge = false }) => {
    // Calculate distance using road distance with fallback
    const km = await resolveDistanceKm({ pickup, dropoff });
    
    // Calculate rider pay
    const riderPay = computeRiderPay({ mode, km, isPoD, isSurge });
    
    // Calculate customer fee (25% markup on rider pay, minimum ₦500)
    const customerFee = Math.max(
      Math.round(riderPay * (1 + CUSTOMER_MARKUP)),
      MIN_CUSTOMER_FEE
    );
    
    // Get SLA targets
    const slaTargets = getSLATargets(mode);
    
    return {
      km: Math.round(km * 100) / 100, // Round to 2 decimal places
      riderPay,
      customerFee,
      targets: {
        pickup: slaTargets.pickup,
        delivery: slaTargets.delivery
      }
    };
  };
  
  return { estimate, estimateAsync };
};
