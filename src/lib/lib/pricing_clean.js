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
