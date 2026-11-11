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

// Simple pricing calculator for BookDeliveryNew.jsx
export const calculatePrice = ({ pickupArea, dropoffArea, packageSize = 'small', priority = 'standard' }) => {
  let total = 700; // Base fare ₦700
  
  // Add distance charge (simplified - ₦120 per different area)
  if (pickupArea && dropoffArea && pickupArea !== dropoffArea) {
    total += 120;
  }
  
  // Package size surcharge
  const sizeCharges = {
    small: 0,
    medium: 50,
    large: 100,
    xlarge: 200
  };
  total += sizeCharges[packageSize] || 0;
  
  // Priority surcharge
  const priorityCharges = {
    standard: 0,
    express: 200,
    urgent: 500
  };
  total += priorityCharges[priority] || 0;
  
  // Minimum order ₦1000
  return Math.max(total, 1000);
};

// Format price for display
export const formatPrice = (price) => {
  return `₦${price.toLocaleString()}`;
};

// Legacy function for backward compatibility
export const calcPrice = ({ km, size, priority }) => {
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

export const formatNaira = (amount) => {
  return `₦${amount.toLocaleString('en-NG')}`;
};

export const getPackageSizeLabel = (size) => {
  const labels = {
    small: 'Small (≤5kg)',
    medium: 'Medium (5-15kg)',
    large: 'Large (15-30kg)'
  };
  return labels[size] || size;
};

export const getPriorityLabel = (priority) => {
  const labels = {
    standard: 'Standard (2-3h)',
    express: 'Express (1-2h)',
    immediate: 'Immediate (<60m)'
  };
  return labels[priority] || priority;
};

// Package size options for forms
export const getPackageSizeOptions = () => [
  { value: 'small', label: 'Small (≤5kg)', price: 0 },
  { value: 'medium', label: 'Medium (5-15kg)', price: 50 },
  { value: 'large', label: 'Large (15-30kg)', price: 100 },
  { value: 'xlarge', label: 'Extra Large (30kg+)', price: 200 }
];

// Delivery speed options for forms
export const getDeliverySpeedOptions = () => [
  { value: 'standard', label: 'Standard (2-3h)', price: 0 },
  { value: 'express', label: 'Express (1-2h)', price: 200 },
  { value: 'urgent', label: 'Immediate (<60m)', price: 500 }
];

// Fare breakdown for detailed pricing
export const getFareBreakdown = ({ km, size, priority }) => {
  const result = calcPrice({ km, size, priority });
  return {
    distance: result.distanceKm,
    baseRate: basePerKm[size],
    priorityMultiplier: priorityMultipliers[priority],
    subtotal: result.subtotal,
    vat: result.vat,
    total: result.total,
    breakdown: {
      base: `${result.distanceKm}km × ₦${basePerKm[size]} × ${priorityMultipliers[priority]}`,
      minimum: `Minimum: ₦${minimumFares[size]}`,
      vat: `VAT (7.5%): ₦${result.vat}`,
      total: `Total: ₦${result.total}`
    }
  };
};
