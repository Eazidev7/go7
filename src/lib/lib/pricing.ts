export interface PriceCalculation {
  distanceKm: number;
  subtotal: number;
  vat: number;
  total: number;
}

export interface PriceParams {
  km: number;
  size: 'small' | 'medium' | 'large';
  priority: 'standard' | 'express' | 'immediate';
}

// New interfaces for simplified pricing
export interface FareBreakdown {
  base: number;
  perKm: number;
  km: number;
  multiplier: number;
  total: number;
}

export type DeliverySpeed = 'standard' | 'express';

// Base rates per kilometer (in Naira)
const basePerKm = {
  small: 120,
  medium: 160,
  large: 220
};

// Priority multipliers
const priorityMultipliers = {
  standard: 1,
  express: 1.25,
  immediate: 1.6
};

// Minimum fares by package size (in Naira)
const minimumFares = {
  small: 1200,
  medium: 1600,
  large: 2200
};

export const calcAdvancedPrice = ({ km, size, priority }: PriceParams): PriceCalculation => {
  // Round distance to 1 decimal place
  const distanceKm = Math.round(km * 10) / 10;
  
  // Calculate base cost
  const baseRate = basePerKm[size];
  const priorityMultiplier = priorityMultipliers[priority];
  const minimumFare = minimumFares[size];
  
  // Calculate subtotal
  const baseSubtotal = distanceKm * baseRate * priorityMultiplier;
  
  // Apply minimum fare
  const subtotal = Math.max(baseSubtotal, minimumFare);
  
  // Calculate VAT (7.5%)
  const vat = Math.round(subtotal * 0.075);
  
  // Calculate total
  const total = subtotal + vat;
  
  return {
    distanceKm,
    subtotal: Math.round(subtotal),
    vat,
    total: Math.round(total)
  };
};

export const formatNaira = (amount: number): string => {
  return `₦${amount.toLocaleString('en-NG')}`;
};

export const getPackageSizeLabel = (size: string): string => {
  const labels = {
    small: 'Small (≤5kg)',
    medium: 'Medium (5-15kg)',
    large: 'Large (15-30kg)'
  };
  return labels[size as keyof typeof labels] || size;
};

export const getPriorityLabel = (priority: string): string => {
  const labels = {
    standard: 'Standard (2-3h)',
    express: 'Express (1-2h)',
    immediate: 'Immediate (<60m)'
  };
  return labels[priority as keyof typeof labels] || priority;
};

// New simplified pricing functions as requested
/**
 * Calculate delivery price based on distance and speed (simplified version)
 * @param distanceKm Distance in kilometers
 * @param speed Delivery speed ('standard' or 'express')
 * @returns Calculated price in naira
 */
export function calcPrice(distanceKm: number, speed: DeliverySpeed = 'standard'): number {
  const base = 500;
  const perKm = 120;
  const expressMultiplier = 1.3;

  return Math.round((base + perKm * distanceKm) * (speed === 'express' ? expressMultiplier : 1));
}

/**
 * Get detailed fare breakdown
 * @param distanceKm Distance in kilometers
 * @param speed Delivery speed ('standard' or 'express')
 * @returns Detailed fare breakdown
 */
export function getFareBreakdown(distanceKm: number, speed: DeliverySpeed = 'standard'): FareBreakdown {
  const base = 500;
  const perKm = 120;
  const expressMultiplier = 1.3;
  const multiplier = speed === 'express' ? expressMultiplier : 1;
  
  const subtotal = base + perKm * distanceKm;
  const total = Math.round(subtotal * multiplier);

  return {
    base,
    perKm,
    km: distanceKm,
    multiplier,
    total
  };
}

/**
 * Format price for display
 * @param amount Amount in naira
 * @returns Formatted price string
 */
export function formatPrice(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}
