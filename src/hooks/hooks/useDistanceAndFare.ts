import { useState, useEffect, useCallback } from 'react';
import { getAreaCoordinates } from '../utils/areaCoords';
import { getDistanceKm } from '../utils/distance';
import { 
  computeFare, 
  BASE_FARE, 
  PER_KM_RATE, 
  SERVICE_MULTIPLIERS,
  generatePricingObject
} from '../utils/pricing';

/**
 * Custom hook for calculating distance and fare between pickup and dropoff areas
 */
export const useDistanceAndFare = (
  pickupArea: string | null, 
  dropoffArea: string | null,
  serviceLevel: 'standard' | 'express'
) => {
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [totalFare, setTotalFare] = useState<number | null>(null);
  const [pricingObject, setPricingObject] = useState<any>(null);

  // Debounced calculation function
  const calculateDistance = useCallback(async () => {
    // Reset states
    setCalculationError(null);
    setIsCalculating(true);
    
    try {
      // Get coordinates for both areas
      const pickupCoords = getAreaCoordinates(pickupArea || '');
      const dropoffCoords = getAreaCoordinates(dropoffArea || '');
      
      // Validate coordinates
      if (!pickupCoords || !dropoffCoords) {
        throw new Error('Invalid area coordinates');
      }
      
      // Log coordinates in dev mode
      if (import.meta.env.DEV) {
        console.debug('Calculating distance between:', {
          pickup: { area: pickupArea, coords: pickupCoords },
          dropoff: { area: dropoffArea, coords: dropoffCoords }
        });
      }
      
      // Calculate distance
      const distance = await getDistanceKm(pickupCoords, dropoffCoords);
      setDistanceKm(distance);
      
      // Calculate fare
      const serviceMultiplier = SERVICE_MULTIPLIERS[serviceLevel];
      const fare = computeFare({
        baseFare: BASE_FARE,
        perKm: PER_KM_RATE,
        serviceMultiplier,
        distanceKm: distance
      });
      setTotalFare(fare);
      
      // Generate full pricing object for booking record
      const pricingObj = generatePricingObject(distance, serviceLevel);
      setPricingObject(pricingObj);
      
      // Log result in dev mode
      if (import.meta.env.DEV) {
        console.debug('Distance calculation result:', {
          distance,
          fare,
          pricing: pricingObj
        });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error calculating distance:', error);
      }
      setCalculationError((error as Error).message);
    } finally {
      setIsCalculating(false);
    }
  }, [pickupArea, dropoffArea, serviceLevel]);

  // Effect to trigger calculation when areas change
  useEffect(() => {
    // Skip calculation if either area is missing
    if (!pickupArea || !dropoffArea) {
      setDistanceKm(null);
      setTotalFare(null);
      setPricingObject(null);
      return;
    }
    
    // Create a debounce timer
    const timerId = setTimeout(() => {
      calculateDistance();
    }, 300); // 300ms debounce
    
    // Cleanup function
    return () => clearTimeout(timerId);
  }, [pickupArea, dropoffArea, serviceLevel, calculateDistance]);

  // Return all relevant states
  return {
    distanceKm,
    totalFare,
    isCalculating,
    calculationError,
    pricingObject,
    hasRequiredFields: !!pickupArea && !!dropoffArea
  };
};

export default useDistanceAndFare;
