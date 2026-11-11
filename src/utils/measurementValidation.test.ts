/**
 * Test suite for measurement validation utilities
 */

import {
  validateQuantity,
  formatQuantity,
  getMeasurementInputProps,
  getMeasurementExamples,
  parseQuantity,
  calculateTotalPrice,
  validateProductQuantity,
  MEASUREMENT_TYPES,
  type MeasurementType
} from './measurementValidation';

describe('Measurement Validation', () => {
  describe('validateQuantity', () => {
    describe('unit measurement', () => {
      it('should accept valid integer quantities', () => {
        expect(validateQuantity('unit', 1)).toBe(true);
        expect(validateQuantity('unit', 5)).toBe(true);
        expect(validateQuantity('unit', 100)).toBe(true);
      });
      
      it('should reject decimal quantities', () => {
        expect(validateQuantity('unit', 1.5)).toBe(false);
        expect(validateQuantity('unit', 2.3)).toBe(false);
      });
      
      it('should reject zero and negative quantities', () => {
        expect(validateQuantity('unit', 0)).toBe(false);
        expect(validateQuantity('unit', -1)).toBe(false);
      });
      
      it('should reject invalid numbers', () => {
        expect(validateQuantity('unit', NaN)).toBe(false);
        expect(validateQuantity('unit', Infinity)).toBe(false);
      });
    });
    
    describe('portion measurement', () => {
      it('should accept valid integer quantities', () => {
        expect(validateQuantity('portion', 1)).toBe(true);
        expect(validateQuantity('portion', 3)).toBe(true);
      });
      
      it('should reject decimal quantities', () => {
        expect(validateQuantity('portion', 1.5)).toBe(false);
      });
    });
    
    describe('bundle measurement', () => {
      it('should accept valid integer quantities', () => {
        expect(validateQuantity('bundle', 1)).toBe(true);
        expect(validateQuantity('bundle', 10)).toBe(true);
      });
      
      it('should reject decimal quantities', () => {
        expect(validateQuantity('bundle', 2.5)).toBe(false);
      });
    });
    
    describe('weight measurement', () => {
      it('should accept valid decimal quantities', () => {
        expect(validateQuantity('weight', 0.5)).toBe(true);
        expect(validateQuantity('weight', 1.0)).toBe(true);
        expect(validateQuantity('weight', 2.5)).toBe(true);
      });
      
      it('should accept integer quantities', () => {
        expect(validateQuantity('weight', 1)).toBe(true);
        expect(validateQuantity('weight', 5)).toBe(true);
      });
      
      it('should reject zero and negative quantities', () => {
        expect(validateQuantity('weight', 0)).toBe(false);
        expect(validateQuantity('weight', -0.5)).toBe(false);
      });
    });
  });
  
  describe('formatQuantity', () => {
    it('should format unit quantities correctly', () => {
      expect(formatQuantity(1, 'unit')).toBe('1 item');
      expect(formatQuantity(2, 'unit')).toBe('2 items');
      expect(formatQuantity(5, 'unit', 'bottle')).toBe('5 bottles');
    });
    
    it('should format portion quantities correctly', () => {
      expect(formatQuantity(1, 'portion')).toBe('1 item');
      expect(formatQuantity(2, 'portion', 'plate')).toBe('2 plates');
    });
    
    it('should format bundle quantities correctly', () => {
      expect(formatQuantity(1, 'bundle', 'tuber')).toBe('1 tuber');
      expect(formatQuantity(3, 'bundle', 'tuber')).toBe('3 tubers');
    });
    
    it('should format weight quantities correctly', () => {
      expect(formatQuantity(1.5, 'weight', 'derica')).toBe('1.5 dericas');
      expect(formatQuantity(2.0, 'weight', 'kg')).toBe('2 kgs');
      expect(formatQuantity(0.5, 'weight', 'bag')).toBe('0.5 bags');
    });
    
    it('should handle singular vs plural correctly', () => {
      expect(formatQuantity(1, 'bundle', 'tuber')).toBe('1 tuber');
      expect(formatQuantity(2, 'bundle', 'tuber')).toBe('2 tubers');
      expect(formatQuantity(1, 'weight', 'dericas')).toBe('1 dericas'); // Already plural
    });
  });
  
  describe('getMeasurementInputProps', () => {
    it('should return correct props for integer types', () => {
      const props = getMeasurementInputProps('unit');
      expect(props.type).toBe('number');
      expect(props.min).toBe(1);
      expect(props.step).toBe(1);
    });
    
    it('should return correct props for weight type', () => {
      const props = getMeasurementInputProps('weight');
      expect(props.type).toBe('number');
      expect(props.min).toBe(0.1);
      expect(props.step).toBe(0.1);
    });
  });
  
  describe('parseQuantity', () => {
    it('should parse valid quantity strings', () => {
      expect(parseQuantity('2', 'unit')).toBe(2);
      expect(parseQuantity('1.5', 'weight')).toBe(1.5);
      expect(parseQuantity('3 items', 'unit')).toBe(3);
    });
    
    it('should return null for invalid quantities', () => {
      expect(parseQuantity('1.5', 'unit')).toBe(null); // Decimal not allowed for unit
      expect(parseQuantity('', 'unit')).toBe(null);
      expect(parseQuantity('abc', 'unit')).toBe(null);
      expect(parseQuantity('0', 'unit')).toBe(null);
    });
  });
  
  describe('calculateTotalPrice', () => {
    it('should calculate total price correctly', () => {
      expect(calculateTotalPrice(1000, 2, 'unit')).toBe(2000);
      expect(calculateTotalPrice(1500, 1.5, 'weight')).toBe(2250);
    });
    
    it('should return null for invalid inputs', () => {
      expect(calculateTotalPrice(1000, 1.5, 'unit')).toBe(null); // Decimal not allowed
      expect(calculateTotalPrice(-100, 1, 'unit')).toBe(null); // Negative price
      expect(calculateTotalPrice(1000, 0, 'unit')).toBe(null); // Zero quantity
    });
  });
  
  describe('validateProductQuantity', () => {
    it('should validate complete product quantity configuration', () => {
      const result = validateProductQuantity('unit', 2, 1, 10);
      expect(result.isValid).toBe(true);
    });
    
    it('should catch minimum quantity violations', () => {
      const result = validateProductQuantity('unit', 1, 2, 10);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Minimum quantity');
    });
    
    it('should catch maximum quantity violations', () => {
      const result = validateProductQuantity('unit', 15, 1, 10);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Maximum quantity');
    });
    
    it('should catch invalid measurement type quantities', () => {
      const result = validateProductQuantity('unit', 1.5);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('whole numbers');
    });
  });
  
  describe('MEASUREMENT_TYPES configuration', () => {
    it('should have all required measurement types', () => {
      const types: MeasurementType[] = ['unit', 'portion', 'bundle', 'weight'];
      types.forEach(type => {
        expect(MEASUREMENT_TYPES[type]).toBeDefined();
        expect(MEASUREMENT_TYPES[type].type).toBe(type);
        expect(MEASUREMENT_TYPES[type].label).toBeTruthy();
        expect(MEASUREMENT_TYPES[type].description).toBeTruthy();
        expect(MEASUREMENT_TYPES[type].examples).toBeInstanceOf(Array);
      });
    });
    
    it('should have correct input types', () => {
      expect(MEASUREMENT_TYPES.unit.inputType).toBe('integer');
      expect(MEASUREMENT_TYPES.portion.inputType).toBe('integer');
      expect(MEASUREMENT_TYPES.bundle.inputType).toBe('integer');
      expect(MEASUREMENT_TYPES.weight.inputType).toBe('decimal');
    });
  });
});
