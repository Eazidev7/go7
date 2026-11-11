import { useState, useEffect, useMemo } from 'react';

// Types
export type ServiceType = 'standard' | 'express';
export type PackageSize = 's' | 'm' | 'l';

export interface FareInputs {
  distanceKm: number;
  service: ServiceType;
  size: PackageSize;
  hourOfDay?: number;
}

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  sizeFare: number;
  surgeFare: number;
  rawTotal: number;
  minFareApplied: boolean;
  finalFare: number;
}

export interface FareResult {
  fare: number;
  fareRounded: number;
  breakdown: FareBreakdown;
  etaLabel: string;
}

// Pricing constants
const PRICING = {
  standard: { base: 600, perKm: 150, minFare: 900 },
  express: { base: 900, perKm: 220, minFare: 1400 }
};

const SIZE_MULTIPLIER = {
  s: 1.0,    // Small (≤2kg)
  m: 1.15,   // Medium (≤5kg)
  l: 1.3     // Large (≤10kg)
};

// Utility functions
const isSurgeHour = (hourOfDay?: number): boolean => {
  if (hourOfDay === undefined) return false;
  return hourOfDay >= 18 && hourOfDay <= 21; // 6-9pm surge
};

const roundUpToNearest50 = (amount: number): number => {
  return Math.ceil(amount / 50) * 50;
};

const clampDistance = (distance: number): number => {
  return Math.max(0.5, Math.min(25, distance));
};

const calculateETA = (service: ServiceType, distanceKm: number): string => {
  if (service === 'standard') {
    const baseMin = distanceKm < 3 ? 20 : 25;
    const baseMax = distanceKm < 3 ? 40 : 45;
    return `~${baseMin}–${baseMax} mins`;
  } else {
    const baseMin = distanceKm > 12 ? 25 : 15;
    const baseMax = distanceKm > 12 ? 40 : 30;
    return `~${baseMin}–${baseMax} mins`;
  }
};

// Main hook
export const useFare = (initialInputs?: Partial<FareInputs>) => {
  const [inputs, setInputs] = useState<FareInputs>({
    distanceKm: 2.5,
    service: 'standard',
    size: 's',
    hourOfDay: new Date().getHours(),
    ...initialInputs
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('go7-fare-calculator');
      if (saved) {
        const parsed = JSON.parse(saved);
        setInputs(prev => ({
          ...prev,
          service: parsed.service || prev.service,
          size: parsed.size || prev.size,
          distanceKm: parsed.distanceKm || prev.distanceKm
        }));
      }
    } catch (error) {
      console.warn('Failed to load fare calculator settings:', error);
    }
  }, []);

  // Save to localStorage when inputs change
  useEffect(() => {
    try {
      localStorage.setItem('go7-fare-calculator', JSON.stringify({
        service: inputs.service,
        size: inputs.size,
        distanceKm: inputs.distanceKm
      }));
    } catch (error) {
      console.warn('Failed to save fare calculator settings:', error);
    }
  }, [inputs.service, inputs.size, inputs.distanceKm]);

  // Calculate fare result
  const result = useMemo((): FareResult => {
    const clampedDistance = clampDistance(inputs.distanceKm);
    const pricing = PRICING[inputs.service];
    const sizeMultiplier = SIZE_MULTIPLIER[inputs.size];
    const isSurge = isSurgeHour(inputs.hourOfDay);

    // Calculate base components
    const baseFare = pricing.base;
    const distanceFare = pricing.perKm * clampedDistance;
    const rawBeforeSize = baseFare + distanceFare;
    const sizeFare = rawBeforeSize * (sizeMultiplier - 1); // Additional cost due to size
    const rawAfterSize = rawBeforeSize * sizeMultiplier;
    
    // Apply surge
    const surgeFare = isSurge ? rawAfterSize * 0.10 : 0;
    const rawTotal = rawAfterSize + surgeFare;
    
    // Apply minimum fare
    const minFareApplied = rawTotal < pricing.minFare;
    const finalFare = Math.max(rawTotal, pricing.minFare);
    const fareRounded = roundUpToNearest50(finalFare);

    const breakdown: FareBreakdown = {
      baseFare,
      distanceFare,
      sizeFare,
      surgeFare,
      rawTotal,
      minFareApplied,
      finalFare
    };

    const etaLabel = calculateETA(inputs.service, clampedDistance);

    return {
      fare: finalFare,
      fareRounded,
      breakdown,
      etaLabel
    };
  }, [inputs]);

  // Update functions
  const updateDistance = (distanceKm: number) => {
    const clamped = clampDistance(distanceKm);
    setInputs(prev => ({ ...prev, distanceKm: clamped }));
    
    // Analytics event
    window.dispatchEvent(new CustomEvent('fareCalc', {
      detail: { action: 'distance_change', distanceKm: clamped }
    }));
  };

  const updateService = (service: ServiceType) => {
    setInputs(prev => ({ ...prev, service }));
    
    // Analytics event
    window.dispatchEvent(new CustomEvent('fareCalc', {
      detail: { action: 'service_toggle', service }
    }));
  };

  const updateSize = (size: PackageSize) => {
    setInputs(prev => ({ ...prev, size }));
    
    // Analytics event
    window.dispatchEvent(new CustomEvent('fareCalc', {
      detail: { action: 'size_change', size }
    }));
  };

  const isValidDistance = (distance: number): boolean => {
    return distance >= 0.5 && distance <= 25;
  };

  const getDistanceHelperText = (distance: number): string | null => {
    if (distance < 0.5) return 'Minimum distance is 0.5 km';
    if (distance > 25) return 'Maximum distance is 25 km';
    return null;
  };

  return {
    inputs,
    result,
    updateDistance,
    updateService,
    updateSize,
    isValidDistance,
    getDistanceHelperText,
    isCalculationValid: isValidDistance(inputs.distanceKm)
  };
};