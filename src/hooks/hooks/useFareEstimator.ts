import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAreaCoordinates } from '../utils/areaCoords';
import { getDistanceKm } from '../utils/distance';
import { 
  computeFare, 
  BASE_FARE, 
  PER_KM_RATE, 
  SERVICE_MULTIPLIERS
} from '../utils/pricing';

/**
 * Custom hook for the fare estimator that calculates both standard and express fares
 */
export const useFareEstimator = (
  pickupArea: string | null, 
  dropoffArea: string | null
) => {
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate both standard and express fares
  const fares = useMemo(() => {
    if (!distanceKm) return { standard: null, express: null };
    
    const standardFare = computeFare({
      baseFare: BASE_FARE,
      perKm: PER_KM_RATE,
      serviceMultiplier: SERVICE_MULTIPLIERS.standard,
      distanceKm
    });
    
    const expressFare = computeFare({
      baseFare: BASE_FARE,
      perKm: PER_KM_RATE,
      serviceMultiplier: SERVICE_MULTIPLIERS.express,
      distanceKm
    });
    
    return { standard: standardFare, express: expressFare };
  }, [distanceKm]);
  
  // Debounced calculation function
  const calculateDistance = useCallback(async () => {
    setError(null);
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
        console.debug('Estimator calculating distance between:', {
          pickup: { area: pickupArea, coords: pickupCoords },
          dropoff: { area: dropoffArea, coords: dropoffCoords }
        });
      }
      
      // Calculate distance
      const distance = await getDistanceKm(pickupCoords, dropoffCoords);
      setDistanceKm(distance);
      
      // Log result in dev mode
      if (import.meta.env.DEV) {
        console.debug('Estimator distance calculation result:', {
          distance,
          fares: {
            standard: computeFare({
              baseFare: BASE_FARE,
              perKm: PER_KM_RATE,
              serviceMultiplier: SERVICE_MULTIPLIERS.standard,
              distanceKm: distance
            }),
            express: computeFare({
              baseFare: BASE_FARE,
              perKm: PER_KM_RATE,
              serviceMultiplier: SERVICE_MULTIPLIERS.express,
              distanceKm: distance
            })
          }
        });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Estimator error calculating distance:', error);
      }
      setError((error as Error).message);
    } finally {
      setIsCalculating(false);
    }
  }, [pickupArea, dropoffArea]);
  
  // Effect to trigger calculation when areas change
  useEffect(() => {
    // Skip calculation if either area is missing
    if (!pickupArea || !dropoffArea) {
      setDistanceKm(null);
      return;
    }
    
    // Create a debounce timer
    const timerId = setTimeout(() => {
      calculateDistance();
    }, 300); // 300ms debounce
    
    // Cleanup function
    return () => clearTimeout(timerId);
  }, [pickupArea, dropoffArea, calculateDistance]);
  
  return {
    distanceKm,
    standardFare: fares.standard,
    expressFare: fares.express,
    isCalculating,
    error,
    hasRequiredFields: !!pickupArea && !!dropoffArea
  };
};

export default useFareEstimator;
