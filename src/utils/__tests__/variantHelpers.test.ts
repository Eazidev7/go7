import { VariantGenerator } from '../variantHelpers';
import { ProductOption, ProductVariant } from '../../types/models';

describe('VariantGenerator', () => {
  const createMockOption = (
    name: string,
    values: Array<{ value: string; priceModifier?: number }>
  ): ProductOption => ({
    id: `opt-${name.toLowerCase()}`,
    name,
    type: 'single',
    required: false,
    displayOrder: 0,
    values: values.map((val, index) => ({
      id: `val-${index}`,
      value: val.value,
      priceModifier: val.priceModifier || 0,
      available: true,
      displayOrder: index
    }))
  });

  describe('generateOptionCombinations', () => {
    it('should generate all combinations for single option', () => {
      const options = [
        createMockOption('Size', [
          { value: 'Small' },
          { value: 'Medium' },
          { value: 'Large' }
        ])
      ];

      const combinations = VariantGenerator.generateOptionCombinations(options);

      expect(combinations).toHaveLength(3);
      expect(combinations).toEqual([
        { Size: 'Small' },
        { Size: 'Medium' },
        { Size: 'Large' }
      ]);
    });

    it('should generate all combinations for multiple options', () => {
      const options = [
        createMockOption('Size', [
          { value: 'Small' },
          { value: 'Large' }
        ]),
        createMockOption('Color', [
          { value: 'Red' },
          { value: 'Blue' }
        ])
      ];

      const combinations = VariantGenerator.generateOptionCombinations(options);

      expect(combinations).toHaveLength(4);
      expect(combinations).toEqual([
        { Size: 'Small', Color: 'Red' },
        { Size: 'Small', Color: 'Blue' },
        { Size: 'Large', Color: 'Red' },
        { Size: 'Large', Color: 'Blue' }
      ]);
    });

    it('should generate combinations for three options', () => {
      const options = [
        createMockOption('Size', [
          { value: 'S' },
          { value: 'M' }
        ]),
        createMockOption('Color', [
          { value: 'Red' },
          { value: 'Blue' }
        ]),
        createMockOption('Material', [
          { value: 'Cotton' },
          { value: 'Wool' }
        ])
      ];

      const combinations = VariantGenerator.generateOptionCombinations(options);

      expect(combinations).toHaveLength(8);
      expect(combinations).toContainEqual({ Size: 'S', Color: 'Red', Material: 'Cotton' });
      expect(combinations).toContainEqual({ Size: 'M', Color: 'Blue', Material: 'Wool' });
    });

    it('should return empty array for empty options', () => {
      const combinations = VariantGenerator.generateOptionCombinations([]);
      expect(combinations).toEqual([]);
    });

    it('should filter out empty option names and values', () => {
      const options = [
        createMockOption('', [{ value: 'Small' }]), // Empty name
        createMockOption('Size', [{ value: '' }]), // Empty value
        createMockOption('Color', [{ value: 'Red' }, { value: '' }]) // Mixed values
      ];

      const combinations = VariantGenerator.generateOptionCombinations(options);

      expect(combinations).toEqual([
        { Color: 'Red' }
      ]);
    });

    it('should handle options with whitespace in names and values', () => {
      const options = [
        createMockOption('  Size  ', [
          { value: '  Small  ' },
          { value: '  Large  ' }
        ])
      ];

      const combinations = VariantGenerator.generateOptionCombinations(options);

      expect(combinations).toEqual([
        { Size: 'Small' },
        { Size: 'Large' }
      ]);
    });
  });

  describe('generateVariantsFromOptions', () => {
    it('should generate variants with correct structure', () => {
      const options = [
        createMockOption('Size', [
          { value: 'Small', priceModifier: -500 },
          { value: 'Large', priceModifier: 1000 }
        ])
      ];

      const variants = VariantGenerator.generateVariantsFromOptions(
        options,
        2500, // Base price: ₦25.00
        10,   // Base stock
        'Test Product'
      );

      expect(variants).toHaveLength(2);
      
      expect(variants[0]).toMatchObject({
        name: 'Size: Small',
        price: 2000, // 2500 - 500
        stock: 10,
        available: true,
        optionCombination: { Size: 'Small' }
      });

      expect(variants[1]).toMatchObject({
        name: 'Size: Large',
        price: 3500, // 2500 + 1000
        stock: 10,
        available: true,
        optionCombination: { Size: 'Large' }
      });

      // Check that SKUs are generated
      expect(variants[0].sku).toMatch(/TES-small-1/);
      expect(variants[1].sku).toMatch(/TES-large-2/);
    });

    it('should preserve existing variants when they match combinations', () => {
      const options = [
        createMockOption('Size', [
          { value: 'Small' },
          { value: 'Large' }
        ])
      ];

      const existingVariants: ProductVariant[] = [
        {
          id: 'existing-1',
          name: 'Size: Small',
          sku: 'EXISTING-SMALL',
          price: 1500,
          stock: 5,
          available: false,
          optionCombination: { Size: 'Small' },
          images: ['image1.jpg']
        }
      ];

      const variants = VariantGenerator.generateVariantsFromOptions(
        options,
        2500,
        10,
        'Test Product',
        existingVariants
      );

      expect(variants).toHaveLength(2);
      
      // Existing variant should be preserved
      expect(variants[0]).toEqual(existingVariants[0]);
      
      // New variant should be created for Large
      expect(variants[1]).toMatchObject({
        name: 'Size: Large',
        optionCombination: { Size: 'Large' }
      });
    });

    it('should return empty array when no valid options', () => {
      const options = [
        createMockOption('', [{ value: '' }])
      ];

      const variants = VariantGenerator.generateVariantsFromOptions(options, 2500);
      expect(variants).toEqual([]);
    });
  });

  describe('generateVariantName', () => {
    it('should generate name from single option', () => {
      const combination = { Size: 'Large' };
      const name = VariantGenerator.generateVariantName(combination);
      expect(name).toBe('Size: Large');
    });

    it('should generate name from multiple options', () => {
      const combination = { Size: 'Large', Color: 'Red', Material: 'Cotton' };
      const name = VariantGenerator.generateVariantName(combination);
      expect(name).toBe('Size: Large, Color: Red, Material: Cotton');
    });

    it('should handle empty combination', () => {
      const combination = {};
      const name = VariantGenerator.generateVariantName(combination);
      expect(name).toBe('');
    });
  });

  describe('generateVariantSKU', () => {
    it('should generate SKU from product title and combination', () => {
      const sku = VariantGenerator.generateVariantSKU(
        'Test Product',
        { Size: 'Large', Color: 'Red' },
        0
      );
      expect(sku).toBe('TES-large-red-1');
    });

    it('should handle special characters in title and options', () => {
      const sku = VariantGenerator.generateVariantSKU(
        'T-Shirt & Jeans!',
        { 'Size/Fit': 'X-Large', 'Color (Primary)': 'Blue-Green' },
        5
      );
      expect(sku).toBe('TSH-x-large-blue-green-6');
    });

    it('should use default prefix for empty title', () => {
      const sku = VariantGenerator.generateVariantSKU(
        '',
        { Size: 'Small' },
        0
      );
      expect(sku).toBe('PRD-small-1');
    });

    it('should truncate long combinations', () => {
      const sku = VariantGenerator.generateVariantSKU(
        'Product',
        { 
          Size: 'Extra-Extra-Large',
          Color: 'Deep-Blue-Ocean-Tint',
          Material: 'Organic-Cotton-Blend'
        },
        0
      );
      expect(sku.length).toBeLessThanOrEqual(30); // Reasonable SKU length
      expect(sku).toContain('PRO-');
    });
  });

  describe('calculatePriceModifiers', () => {
    it('should calculate total price modifiers from options', () => {
      const options = [
        createMockOption('Size', [
          { value: 'Small', priceModifier: -500 },
          { value: 'Large', priceModifier: 1000 }
        ]),
        createMockOption('Material', [
          { value: 'Cotton', priceModifier: 0 },
          { value: 'Silk', priceModifier: 2000 }
        ])
      ];

      const combination = { Size: 'Large', Material: 'Silk' };
      const modifier = VariantGenerator.calculatePriceModifiers(combination, options);
      
      expect(modifier).toBe(3000); // 1000 + 2000
    });

    it('should return 0 for combination with no modifiers', () => {
      const options = [
        createMockOption('Size', [
          { value: 'Medium', priceModifier: 0 }
        ])
      ];

      const combination = { Size: 'Medium' };
      const modifier = VariantGenerator.calculatePriceModifiers(combination, options);
      
      expect(modifier).toBe(0);
    });

    it('should handle negative modifiers', () => {
      const options = [
        createMockOption('Size', [
          { value: 'Small', priceModifier: -1000 }
        ]),
        createMockOption('Quality', [
          { value: 'Basic', priceModifier: -500 }
        ])
      ];

      const combination = { Size: 'Small', Quality: 'Basic' };
      const modifier = VariantGenerator.calculatePriceModifiers(combination, options);
      
      expect(modifier).toBe(-1500);
    });

    it('should ignore options not found in combination', () => {
      const options = [
        createMockOption('Size', [
          { value: 'Large', priceModifier: 1000 }
        ])
      ];

      const combination = { Color: 'Red' }; // Option not in options array
      const modifier = VariantGenerator.calculatePriceModifiers(combination, options);
      
      expect(modifier).toBe(0);
    });
  });

  describe('compareCombinations', () => {
    it('should return true for identical combinations', () => {
      const combo1 = { Size: 'Large', Color: 'Red' };
      const combo2 = { Size: 'Large', Color: 'Red' };
      
      expect(VariantGenerator.compareCombinations(combo1, combo2)).toBe(true);
    });

    it('should return true for combinations with different key order', () => {
      const combo1 = { Size: 'Large', Color: 'Red' };
      const combo2 = { Color: 'Red', Size: 'Large' };
      
      expect(VariantGenerator.compareCombinations(combo1, combo2)).toBe(true);
    });

    it('should return false for different values', () => {
      const combo1 = { Size: 'Large', Color: 'Red' };
      const combo2 = { Size: 'Large', Color: 'Blue' };
      
      expect(VariantGenerator.compareCombinations(combo1, combo2)).toBe(false);
    });

    it('should return false for different number of keys', () => {
      const combo1 = { Size: 'Large' };
      const combo2 = { Size: 'Large', Color: 'Red' };
      
      expect(VariantGenerator.compareCombinations(combo1, combo2)).toBe(false);
    });

    it('should return true for empty combinations', () => {
      const combo1 = {};
      const combo2 = {};
      
      expect(VariantGenerator.compareCombinations(combo1, combo2)).toBe(true);
    });
  });

  describe('validateOptions', () => {
    it('should validate correct options', () => {
      const options = [
        createMockOption('Size', [
          { value: 'Small' },
          { value: 'Large' }
        ]),
        createMockOption('Color', [
          { value: 'Red' },
          { value: 'Blue' }
        ])
      ];

      const result = VariantGenerator.validateOptions(options);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty options array', () => {
      const result = VariantGenerator.validateOptions([]);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one option is required for variant generation');
    });

    it('should reject options with empty names', () => {
      const options = [
        createMockOption('', [{ value: 'Small' }]),
        createMockOption('  ', [{ value: 'Large' }])
      ];

      const result = VariantGenerator.validateOptions(options);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Option 1: Name is required');
      expect(result.errors).toContain('Option 2: Name is required');
    });

    it('should reject options with no values', () => {
      const options = [
        { ...createMockOption('Size', []), values: [] },
        { ...createMockOption('Color', [{ value: '' }]) }
      ];

      const result = VariantGenerator.validateOptions(options);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Option 1: At least one value is required');
      expect(result.errors).toContain('Option 2: At least one non-empty value is required');
    });

    it('should reject duplicate option names', () => {
      const options = [
        createMockOption('Size', [{ value: 'Small' }]),
        createMockOption('SIZE', [{ value: 'Large' }]), // Case insensitive duplicate
        createMockOption('Color', [{ value: 'Red' }])
      ];

      const result = VariantGenerator.validateOptions(options);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate option names found');
    });

    it('should reject duplicate option values', () => {
      const options = [
        createMockOption('Size', [
          { value: 'Small' },
          { value: 'SMALL' }, // Case insensitive duplicate
          { value: 'Large' }
        ])
      ];

      const result = VariantGenerator.validateOptions(options);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Option 1: Duplicate values found');
    });
  });

  describe('getMaxVariantCount', () => {
    it('should calculate correct count for single option', () => {
      const options = [
        createMockOption('Size', [
          { value: 'Small' },
          { value: 'Medium' },
          { value: 'Large' }
        ])
      ];

      const count = VariantGenerator.getMaxVariantCount(options);
      expect(count).toBe(3);
    });

    it('should calculate correct count for multiple options', () => {
      const options = [
        createMockOption('Size', [
          { value: 'Small' },
          { value: 'Large' }
        ]),
        createMockOption('Color', [
          { value: 'Red' },
          { value: 'Blue' },
          { value: 'Green' }
        ])
      ];

      const count = VariantGenerator.getMaxVariantCount(options);
      expect(count).toBe(6); // 2 * 3
    });

    it('should return 0 for empty options', () => {
      const count = VariantGenerator.getMaxVariantCount([]);
      expect(count).toBe(0);
    });

    it('should ignore options with empty values', () => {
      const options = [
        createMockOption('Size', [{ value: 'Small' }]),
        createMockOption('Color', [{ value: '' }]) // Empty value
      ];

      const count = VariantGenerator.getMaxVariantCount(options);
      expect(count).toBe(1); // Only Size option counts
    });
  });

  describe('updateVariantsFromOptions', () => {
    it('should preserve existing variants that still match', () => {
      const options = [
        createMockOption('Size', [
          { value: 'Small' },
          { value: 'Large' }
        ])
      ];

      const existingVariants: ProductVariant[] = [
        {
          id: 'existing-1',
          name: 'Size: Small',
          sku: 'EXISTING-SMALL',
          price: 1500,
          stock: 5,
          available: false,
          optionCombination: { Size: 'Small' },
          images: ['image1.jpg']
        }
      ];

      const updatedVariants = VariantGenerator.updateVariantsFromOptions(
        options,
        existingVariants,
        2500,
        'Test Product'
      );

      expect(updatedVariants).toHaveLength(2);
      
      // Should preserve existing variant
      const preservedVariant = updatedVariants.find(v => v.id === 'existing-1');
      expect(preservedVariant).toEqual(existingVariants[0]);
      
      // Should add new variant for Large
      const newVariant = updatedVariants.find(v => v.optionCombination.Size === 'Large');
      expect(newVariant).toBeDefined();
      expect(newVariant?.name).toBe('Size: Large');
    });

    it('should remove variants that no longer match any combination', () => {
      const options = [
        createMockOption('Size', [
          { value: 'Small' },
          { value: 'Large' }
        ])
      ];

      const existingVariants: ProductVariant[] = [
        {
          id: 'existing-1',
          name: 'Size: Small',
          sku: 'EXISTING-SMALL',
          price: 1500,
          stock: 5,
          available: true,
          optionCombination: { Size: 'Small' },
          images: []
        },
        {
          id: 'existing-2',
          name: 'Size: Medium',
          sku: 'EXISTING-MEDIUM',
          price: 2000,
          stock: 3,
          available: true,
          optionCombination: { Size: 'Medium' }, // No longer exists in options
          images: []
        }
      ];

      const updatedVariants = VariantGenerator.updateVariantsFromOptions(
        options,
        existingVariants,
        2500,
        'Test Product'
      );

      expect(updatedVariants).toHaveLength(2);
      
      // Should preserve Small variant
      expect(updatedVariants.some(v => v.optionCombination.Size === 'Small')).toBe(true);
      
      // Should remove Medium variant
      expect(updatedVariants.some(v => v.optionCombination.Size === 'Medium')).toBe(false);
      
      // Should add Large variant
      expect(updatedVariants.some(v => v.optionCombination.Size === 'Large')).toBe(true);
    });

    it('should handle complex option changes', () => {
      const oldOptions = [
        createMockOption('Size', [
          { value: 'Small' },
          { value: 'Medium' }
        ]),
        createMockOption('Color', [
          { value: 'Red' },
          { value: 'Blue' }
        ])
      ];

      const newOptions = [
        createMockOption('Size', [
          { value: 'Small' },
          { value: 'Large' } // Medium removed, Large added
        ]),
        createMockOption('Color', [
          { value: 'Red' },
          { value: 'Green' } // Blue removed, Green added
        ])
      ];

      const existingVariants: ProductVariant[] = [
        {
          id: 'v1',
          name: 'Size: Small, Color: Red',
          sku: 'V1',
          price: 2000,
          stock: 5,
          available: true,
          optionCombination: { Size: 'Small', Color: 'Red' }, // Should be preserved
          images: []
        },
        {
          id: 'v2',
          name: 'Size: Medium, Color: Blue',
          sku: 'V2',
          price: 2500,
          stock: 3,
          available: true,
          optionCombination: { Size: 'Medium', Color: 'Blue' }, // Should be removed
          images: []
        }
      ];

      const updatedVariants = VariantGenerator.updateVariantsFromOptions(
        newOptions,
        existingVariants,
        2500,
        'Test Product'
      );

      expect(updatedVariants).toHaveLength(4);
      
      // Should preserve Small + Red
      expect(updatedVariants.some(v => 
        v.optionCombination.Size === 'Small' && v.optionCombination.Color === 'Red'
      )).toBe(true);
      
      // Should remove Medium + Blue
      expect(updatedVariants.some(v => 
        v.optionCombination.Size === 'Medium' && v.optionCombination.Color === 'Blue'
      )).toBe(false);
      
      // Should add new combinations
      expect(updatedVariants.some(v => 
        v.optionCombination.Size === 'Small' && v.optionCombination.Color === 'Green'
      )).toBe(true);
      expect(updatedVariants.some(v => 
        v.optionCombination.Size === 'Large' && v.optionCombination.Color === 'Red'
      )).toBe(true);
      expect(updatedVariants.some(v => 
        v.optionCombination.Size === 'Large' && v.optionCombination.Color === 'Green'
      )).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle options with very large number of combinations', () => {
      // Create options that would generate 2^10 = 1024 combinations
      const options = Array.from({ length: 10 }, (_, i) =>
        createMockOption(`Option${i}`, [
          { value: 'A' },
          { value: 'B' }
        ])
      );

      const count = VariantGenerator.getMaxVariantCount(options);
      expect(count).toBe(1024);

      // Should still be able to generate combinations (though it might be slow)
      const combinations = VariantGenerator.generateOptionCombinations(options);
      expect(combinations).toHaveLength(1024);
    });

    it('should handle unicode characters in option names and values', () => {
      const options = [
        createMockOption('サイズ', [
          { value: 'Sサイズ' },
          { value: 'Mサイズ' }
        ]),
        createMockOption('色', [
          { value: '赤' },
          { value: '青' }
        ])
      ];

      const combinations = VariantGenerator.generateOptionCombinations(options);
      expect(combinations).toHaveLength(4);
      expect(combinations[0]).toEqual({ 'サイズ': 'Sサイズ', '色': '赤' });
    });

    it('should handle extremely long option names and values', () => {
      const longName = 'A'.repeat(1000);
      const longValue = 'B'.repeat(1000);

      const options = [
        createMockOption(longName, [
          { value: longValue }
        ])
      ];

      const variants = VariantGenerator.generateVariantsFromOptions(
        options,
        2500,
        10,
        'Test Product'
      );

      expect(variants).toHaveLength(1);
      expect(variants[0].optionCombination[longName]).toBe(longValue);
    });
  });
});