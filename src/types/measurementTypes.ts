// Local Market Measurement System Types
// Supports different measurement units for market products and addons

export type UnitType = 'tuber' | 'pack' | 'spoon' | 'piece' | 'kg' | 'custom';

export interface MeasurementVariant {
  id: string;
  label: string; // e.g., "Small tuber", "500g pack"
  price: number;
  imageUrl?: string;
  description?: string;
}

export interface MeasurementUnit {
  unitType: UnitType;
  unitLabel: string; // e.g., "Per Tuber", "Per Spoon", "Per Pack"
  variants?: MeasurementVariant[]; // Optional variants for different sizes/types
  pieceCountPerUnit?: number; // For bulk items (e.g., 3 tubers per unit)
  maxQty?: number; // Maximum quantity allowed (e.g., maxSpoons: 10)
  minQty?: number; // Minimum quantity (default: 1)
  qtyStep?: number; // Step increment (default: 1 for integers, 0.1 for kg)
  customLabel?: string; // For unitType: 'custom'
}

// Utility function to compute line price based on measurement units
export interface LineItem {
  basePrice: number;
  unitType: UnitType;
  qty: number;
  selectedVariant?: MeasurementVariant;
  unitData?: MeasurementUnit;
}

export function computeLinePrice(item: LineItem): number {
  const variantPrice = item.selectedVariant ? item.selectedVariant.price : 0;
  const base = item.basePrice || 0;
  const pricePerUnit = variantPrice || base;
  
  // Handle different unit types
  switch (item.unitType) {
    case 'spoon':
    case 'tuber':
    case 'piece':
    case 'pack':
      // Integer-based quantities
      return pricePerUnit * Math.floor(item.qty || 1);
    
    case 'kg':
      // Decimal quantities (rounded to 1 decimal place)
      return pricePerUnit * Math.round((item.qty || 1) * 10) / 10;
    
    case 'custom':
    default:
      return pricePerUnit * (item.qty || 1);
  }
}

// Helper functions for UI components
export function getUnitStepSize(unitType: UnitType): number {
  switch (unitType) {
    case 'kg':
      return 0.1;
    case 'spoon':
    case 'tuber':
    case 'piece':
    case 'pack':
    case 'custom':
    default:
      return 1;
  }
}

export function getMaxQuantity(unitType: UnitType, unitData?: MeasurementUnit): number {
  if (unitData?.maxQty) return unitData.maxQty;
  
  switch (unitType) {
    case 'spoon':
      return 10; // Default max spoons
    case 'kg':
      return 5; // Default max kg
    case 'tuber':
    case 'piece':
      return 20; // Default max pieces
    case 'pack':
      return 10; // Default max packs
    case 'custom':
    default:
      return 50; // General default
  }
}

export function getUnitDisplayLabel(unitType: UnitType, unitLabel?: string, customLabel?: string): string {
  if (unitType === 'custom' && customLabel) {
    return customLabel;
  }
  
  if (unitLabel) {
    return unitLabel;
  }
  
  // Default labels
  switch (unitType) {
    case 'tuber':
      return 'Per Tuber';
    case 'pack':
      return 'Per Pack';
    case 'spoon':
      return 'Per Spoon';
    case 'piece':
      return 'Per Piece';
    case 'kg':
      return 'Per Kg';
    case 'custom':
      return 'Per Unit';
    default:
      return 'Per Item';
  }
}