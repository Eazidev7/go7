import { computeLinePrice, LineItem, UnitType, MeasurementVariant } from '../types/measurementTypes';

describe('computeLinePrice', () => {
  test('should calculate price for tuber with variants', () => {
    const smallVariant: MeasurementVariant = { id: 'v1', label: 'Small tuber', price: 800 };
    const largeVariant: MeasurementVariant = { id: 'v2', label: 'Large tuber', price: 1200 };

    const smallTuberItem: LineItem = {
      basePrice: 1000,
      unitType: 'tuber',
      qty: 3,
      selectedVariant: smallVariant
    };

    const largeTuberItem: LineItem = {
      basePrice: 1000,
      unitType: 'tuber',
      qty: 2,
      selectedVariant: largeVariant
    };

    expect(computeLinePrice(smallTuberItem)).toBe(2400); // 800 * 3
    expect(computeLinePrice(largeTuberItem)).toBe(2400); // 1200 * 2
  });

  test('should calculate price for spoons (integer quantity)', () => {
    const spoonItem: LineItem = {
      basePrice: 200,
      unitType: 'spoon',
      qty: 5
    };

    expect(computeLinePrice(spoonItem)).toBe(1000); // 200 * 5
  });

  test('should handle decimal quantities for spoons as integers', () => {
    const spoonItem: LineItem = {
      basePrice: 200,
      unitType: 'spoon',
      qty: 5.7 // Should be floored to 5
    };

    expect(computeLinePrice(spoonItem)).toBe(1000); // 200 * 5 (floored)
  });

  test('should calculate price for pack sizes', () => {
    const pack500g: MeasurementVariant = { id: 'p1', label: '500g pack', price: 1500 };
    const pack1kg: MeasurementVariant = { id: 'p2', label: '1kg pack', price: 2800 };

    const packItem: LineItem = {
      basePrice: 2000,
      unitType: 'pack',
      qty: 2,
      selectedVariant: pack1kg
    };

    expect(computeLinePrice(packItem)).toBe(5600); // 2800 * 2
  });

  test('should calculate price for kg with decimal quantities', () => {
    const kgItem: LineItem = {
      basePrice: 3000,
      unitType: 'kg',
      qty: 1.5
    };

    expect(computeLinePrice(kgItem)).toBe(4500); // 3000 * 1.5
  });

  test('should round kg quantities to 1 decimal place', () => {
    const kgItem: LineItem = {
      basePrice: 1000,
      unitType: 'kg',
      qty: 1.23456 // Should be rounded to 1.2
    };

    expect(computeLinePrice(kgItem)).toBe(1200); // 1000 * 1.2
  });

  test('should calculate price for pieces', () => {
    const pieceItem: LineItem = {
      basePrice: 150,
      unitType: 'piece',
      qty: 8
    };

    expect(computeLinePrice(pieceItem)).toBe(1200); // 150 * 8
  });

  test('should handle custom unit type', () => {
    const bundleVariant: MeasurementVariant = { id: 'b1', label: 'Small bundle', price: 500 };
    
    const customItem: LineItem = {
      basePrice: 800,
      unitType: 'custom',
      qty: 3,
      selectedVariant: bundleVariant
    };

    expect(computeLinePrice(customItem)).toBe(1500); // 500 * 3
  });

  test('should fallback to basePrice when no variant selected', () => {
    const noVariantItem: LineItem = {
      basePrice: 1000,
      unitType: 'tuber',
      qty: 2
      // No selectedVariant
    };

    expect(computeLinePrice(noVariantItem)).toBe(2000); // 1000 * 2
  });

  test('should handle zero or missing quantities', () => {
    const zeroQtyItem: LineItem = {
      basePrice: 500,
      unitType: 'piece',
      qty: 0
    };

    const missingQtyItem: LineItem = {
      basePrice: 500,
      unitType: 'piece'
      // No qty provided
    };

    expect(computeLinePrice(zeroQtyItem)).toBe(0); // 500 * 0
    expect(computeLinePrice(missingQtyItem)).toBe(500); // 500 * 1 (default)
  });

  test('should handle missing basePrice', () => {
    const variant: MeasurementVariant = { id: 'v1', label: 'Test variant', price: 300 };
    
    const noPriceItem: LineItem = {
      basePrice: 0,
      unitType: 'piece',
      qty: 3,
      selectedVariant: variant
    };

    expect(computeLinePrice(noPriceItem)).toBe(900); // 300 * 3 (variant price used)
  });
});