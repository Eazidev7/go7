/**
 * 📏 MEASUREMENT UTILITIES
 * 
 * Handles different measurement types for local market products:
 * - unit: Food items (1 plate, 2 bottles)
 * - portion: Food portions (small, medium, large)  
 * - bundle: Local market (per tuber, per bunch)
 * - weight: Weight-based (per kg, per derica)
 */

export const MEASUREMENT_TYPES = {
  UNIT: 'unit',
  PORTION: 'portion', 
  BUNDLE: 'bundle',
  WEIGHT: 'weight'
} as const;

export type MeasurementType = typeof MEASUREMENT_TYPES[keyof typeof MEASUREMENT_TYPES];

export interface MeasurementConfig {
  type: MeasurementType;
  label: string;
  unit: string;
  allowDecimals: boolean;
  minValue: number;
  maxValue: number;
  step: number;
  examples: string[];
  description: string;
}

export const MEASUREMENT_CONFIGS: Record<MeasurementType, MeasurementConfig> = {
  [MEASUREMENT_TYPES.UNIT]: {
    type: 'unit',
    label: 'Unit',
    unit: 'pieces',
    allowDecimals: false,
    minValue: 1,
    maxValue: 100,
    step: 1,
    examples: ['1 plate', '2 bottles', '3 cups'],
    description: 'Individual items counted as whole units'
  },
  
  [MEASUREMENT_TYPES.PORTION]: {
    type: 'portion',
    label: 'Portion',
    unit: 'portions',
    allowDecimals: false,
    minValue: 1,
    maxValue: 20,
    step: 1,
    examples: ['Small portion', 'Medium portion', 'Large portion'],
    description: 'Food portions with different sizes'
  },
  
  [MEASUREMENT_TYPES.BUNDLE]: {
    type: 'bundle',
    label: 'Bundle',
    unit: 'bundles',
    allowDecimals: false,
    minValue: 1,
    maxValue: 50,
    step: 1,
    examples: ['1 tuber', '2 bunches', '5 pieces'],
    description: 'Local market items sold in natural groupings'
  },
  
  [MEASUREMENT_TYPES.WEIGHT]: {
    type: 'weight',
    label: 'Weight',
    unit: 'kg',
    allowDecimals: true,
    minValue: 0.1,
    maxValue: 100,
    step: 0.1,
    examples: ['0.5 kg', '1 derica', '2.5 kg'],
    description: 'Weight-based measurements for bulk items'
  }
};

/**
 * Validate quantity based on measurement type
 */
export const validateQuantity = (
  quantity: number, 
  measurementType: MeasurementType
): { isValid: boolean; error?: string } => {
  const config = MEASUREMENT_CONFIGS[measurementType];
  
  if (!config) {
    return { isValid: false, error: 'Invalid measurement type' };
  }
  
  // Check if decimals are allowed
  if (!config.allowDecimals && quantity % 1 !== 0) {
    return { 
      isValid: false, 
      error: `${config.label} quantities must be whole numbers` 
    };
  }
  
  // Check minimum value
  if (quantity < config.minValue) {
    return { 
      isValid: false, 
      error: `Minimum quantity is ${config.minValue} ${config.unit}` 
    };
  }
  
  // Check maximum value
  if (quantity > config.maxValue) {
    return { 
      isValid: false, 
      error: `Maximum quantity is ${config.maxValue} ${config.unit}` 
    };
  }
  
  return { isValid: true };
};

/**
 * Format quantity for display
 */
export const formatQuantity = (
  quantity: number, 
  measurementType: MeasurementType
): string => {
  const config = MEASUREMENT_CONFIGS[measurementType];
  
  if (!config) {
    return quantity.toString();
  }
  
  const formattedNumber = config.allowDecimals 
    ? quantity.toString() 
    : Math.floor(quantity).toString();
    
  const unit = quantity === 1 ? config.unit.slice(0, -1) : config.unit; // Remove 's' for singular
  
  return `${formattedNumber} ${unit}`;
};

/**
 * Get quantity input props for different measurement types
 */
export const getQuantityInputProps = (measurementType: MeasurementType) => {
  const config = MEASUREMENT_CONFIGS[measurementType];
  
  return {
    type: 'number',
    min: config.minValue,
    max: config.maxValue,
    step: config.step,
    placeholder: config.examples[0]
  };
};

/**
 * Calculate price based on quantity and measurement type
 */
export const calculatePrice = (
  basePrice: number,
  quantity: number,
  measurementType: MeasurementType
): number => {
  // Validate quantity first
  const validation = validateQuantity(quantity, measurementType);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  return basePrice * quantity;
};

/**
 * Get measurement type suggestions based on category
 */
export const getMeasurementSuggestions = (category: string): MeasurementType[] => {
  switch (category.toLowerCase()) {
    case 'food':
      return ['unit', 'portion'];
    case 'local_market':
      return ['bundle', 'weight', 'unit'];
    case 'pharmacy':
      return ['unit'];
    case 'grocery':
      return ['unit', 'weight'];
    default:
      return ['unit'];
  }
};

/**
 * Convert between measurement types (for migration purposes)
 */
export const convertMeasurement = (
  quantity: number,
  fromType: MeasurementType,
  toType: MeasurementType
): number => {
  // This is a simplified conversion - in reality you'd need more complex logic
  const fromConfig = MEASUREMENT_CONFIGS[fromType];
  const toConfig = MEASUREMENT_CONFIGS[toType];
  
  // If converting to a type that doesn't allow decimals, round down
  if (fromConfig.allowDecimals && !toConfig.allowDecimals) {
    return Math.floor(quantity);
  }
  
  return quantity;
};

/**
 * Get localized unit labels
 */
export const getLocalizedUnits = (measurementType: MeasurementType, locale: string = 'en') => {
  // Add localization support for different languages
  const units = {
    en: MEASUREMENT_CONFIGS[measurementType].unit,
    // Add more languages as needed
  };
  
  return units[locale as keyof typeof units] || units.en;
};

/**
 * Measurement type utilities for forms
 */
export const MeasurementUtils = {
  validateQuantity,
  formatQuantity,
  getQuantityInputProps,
  calculatePrice,
  getMeasurementSuggestions,
  convertMeasurement,
  getLocalizedUnits,
  MEASUREMENT_TYPES,
  MEASUREMENT_CONFIGS
};

export default MeasurementUtils;