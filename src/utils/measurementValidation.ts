/**
 * Local Market Measurement Rules and Validation
 * 
 * Handles quantity validation and measurement type logic
 * for Nigerian market context
 */

export type MeasurementType = 'unit' | 'portion' | 'bundle' | 'weight';

export interface MeasurementConfig {
  type: MeasurementType;
  label: string;
  description: string;
  inputType: 'integer' | 'decimal';
  step?: number;
  defaultUnit?: string;
  examples: string[];
}

/**
 * Local market measurement type definitions
 */
export const MEASUREMENT_TYPES: Record<MeasurementType, MeasurementConfig> = {
  unit: {
    type: 'unit',
    label: 'Single Item',
    description: 'Individual items sold as single units',
    inputType: 'integer',
    examples: ['1 plate of rice', '2 bottles of water', '3 meat pies']
  },
  
  portion: {
    type: 'portion',
    label: 'Servings',
    description: 'Food served in portions (per spoon, plate, etc.)',
    inputType: 'integer', 
    examples: ['1 spoon of rice', '2 plates of soup', '3 servings']
  },
  
  bundle: {
    type: 'bundle',
    label: 'Group/Bundle',
    description: 'Items sold in groups or bundles',
    inputType: 'integer',
    defaultUnit: 'bundle',
    examples: ['1 tuber of yam', '2 bunches of plantain', '3 pieces of meat']
  },
  
  weight: {
    type: 'weight',
    label: 'Measured Weight',
    description: 'Items sold by weight or volume measurement',
    inputType: 'decimal',
    step: 0.1,
    defaultUnit: 'derica', // Default Nigerian market unit
    examples: ['1.5 derica of rice', '0.5 bag of garri', '2.0 kg of tomatoes']
  }
};

/**
 * Common unit labels for different measurement types
 */
export const UNIT_LABELS: Record<MeasurementType, string[]> = {
  unit: ['piece', 'item', 'bottle', 'can', 'pack'],
  portion: ['plate', 'spoon', 'serving', 'bowl', 'cup'],
  bundle: ['tuber', 'bunch', 'bundle', 'piece', 'stick'],
  weight: ['derica', 'bag', 'kg', 'mudu', 'paint', 'cup']
};

/**
 * Validate quantity based on measurement type
 * 
 * @param measurementType - The measurement type
 * @param quantity - The quantity value to validate
 * @returns true if valid, false otherwise
 */
export function validateQuantity(measurementType: MeasurementType, quantity: number): boolean {
  // Check if quantity is a valid number
  if (isNaN(quantity) || !isFinite(quantity)) {
    return false;
  }
  
  // Must be positive
  if (quantity <= 0) {
    return false;
  }
  
  // Type-specific validation
  switch (measurementType) {
    case 'unit':
    case 'portion':
    case 'bundle':
      // Must be integer and >= 1
      return Number.isInteger(quantity) && quantity >= 1;
      
    case 'weight':
      // Can be decimal, must be > 0
      return quantity > 0;
      
    default:
      return false;
  }
}

/**
 * Get appropriate input step for measurement type
 * 
 * @param measurementType - The measurement type
 * @returns step value for HTML input
 */
export function getInputStep(measurementType: MeasurementType): number {
  return MEASUREMENT_TYPES[measurementType].step || 1;
}

/**
 * Get input type for measurement type
 * 
 * @param measurementType - The measurement type
 * @returns 'number' input type with appropriate constraints
 */
export function getInputType(measurementType: MeasurementType): string {
  return 'number';
}

/**
 * Format quantity display with unit label
 * 
 * @param quantity - The quantity value
 * @param measurementType - The measurement type
 * @param unitLabel - Custom unit label (optional)
 * @returns formatted quantity string
 */
export function formatQuantity(
  quantity: number, 
  measurementType: MeasurementType, 
  unitLabel?: string
): string {
  const config = MEASUREMENT_TYPES[measurementType];
  const unit = unitLabel || config.defaultUnit || 'item';
  
  // Format number based on type
  const formattedQty = config.inputType === 'integer' 
    ? quantity.toString()
    : quantity.toFixed(1).replace(/\.0$/, ''); // Remove .0 for whole numbers
  
  // Pluralize unit if quantity > 1
  const pluralUnit = quantity > 1 && !unit.endsWith('s') ? `${unit}s` : unit;
  
  return `${formattedQty} ${pluralUnit}`;
}

/**
 * Get default unit label for measurement type
 * 
 * @param measurementType - The measurement type
 * @returns default unit label
 */
export function getDefaultUnitLabel(measurementType: MeasurementType): string {
  return MEASUREMENT_TYPES[measurementType].defaultUnit || 'item';
}

/**
 * Validate unit label for measurement type
 * 
 * @param measurementType - The measurement type
 * @param unitLabel - The unit label to validate
 * @returns true if valid unit label
 */
export function validateUnitLabel(measurementType: MeasurementType, unitLabel: string): boolean {
  if (!unitLabel || unitLabel.trim().length === 0) {
    return false;
  }
  
  // Check if it's a common unit for this type
  const commonUnits = UNIT_LABELS[measurementType];
  const normalizedLabel = unitLabel.toLowerCase().trim();
  
  // Allow any reasonable unit label (not just predefined ones)
  return normalizedLabel.length >= 2 && normalizedLabel.length <= 20;
}

/**
 * Get measurement type examples for UI help text
 * 
 * @param measurementType - The measurement type
 * @returns array of example usage strings
 */
export function getMeasurementExamples(measurementType: MeasurementType): string[] {
  return MEASUREMENT_TYPES[measurementType].examples;
}

/**
 * Parse quantity string and extract number
 * 
 * @param quantityStr - String representation of quantity
 * @param measurementType - The measurement type for validation
 * @returns parsed quantity number or null if invalid
 */
export function parseQuantity(quantityStr: string, measurementType: MeasurementType): number | null {
  if (!quantityStr || quantityStr.trim().length === 0) {
    return null;
  }
  
  const cleaned = quantityStr.trim().replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    return null;
  }
  
  return validateQuantity(measurementType, parsed) ? parsed : null;
}

/**
 * Calculate total price including quantity
 * 
 * @param basePrice - Base price per unit
 * @param quantity - Quantity ordered
 * @param measurementType - The measurement type (for validation)
 * @returns total price or null if invalid
 */
export function calculateTotalPrice(
  basePrice: number, 
  quantity: number, 
  measurementType: MeasurementType
): number | null {
  if (!validateQuantity(measurementType, quantity) || basePrice < 0) {
    return null;
  }
  
  return basePrice * quantity;
}

/**
 * Generate measurement input props for React forms
 * 
 * @param measurementType - The measurement type
 * @returns props object for input element
 */
export function getMeasurementInputProps(measurementType: MeasurementType) {
  const config = MEASUREMENT_TYPES[measurementType];
  
  return {
    type: 'number',
    min: config.inputType === 'decimal' ? 0.1 : 1,
    step: config.step || 1,
    placeholder: `Enter ${config.label.toLowerCase()}`,
    'aria-label': `Quantity in ${config.label.toLowerCase()}`
  };
}

/**
 * Validate complete product quantity configuration
 * 
 * @param measurementType - The measurement type
 * @param quantity - The quantity value
 * @param minQty - Minimum allowed quantity (optional)
 * @param maxQty - Maximum allowed quantity (optional)
 * @returns validation result with error message if invalid
 */
export function validateProductQuantity(
  measurementType: MeasurementType,
  quantity: number,
  minQty?: number,
  maxQty?: number
): { isValid: boolean; error?: string } {
  // Basic quantity validation
  if (!validateQuantity(measurementType, quantity)) {
    const config = MEASUREMENT_TYPES[measurementType];
    return {
      isValid: false,
      error: `Invalid quantity. ${config.label} requires ${config.inputType === 'integer' ? 'whole numbers' : 'decimal values'} greater than 0.`
    };
  }
  
  // Minimum quantity check
  if (minQty !== undefined && quantity < minQty) {
    return {
      isValid: false,
      error: `Minimum quantity is ${formatQuantity(minQty, measurementType)}.`
    };
  }
  
  // Maximum quantity check
  if (maxQty !== undefined && quantity > maxQty) {
    return {
      isValid: false,
      error: `Maximum quantity is ${formatQuantity(maxQty, measurementType)}.`
    };
  }
  
  return { isValid: true };
}
