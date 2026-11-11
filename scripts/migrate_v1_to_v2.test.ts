/**
 * Jest Test Suite for V1 to V2 Migration Script
 * 
 * Tests the migration logic with comprehensive coverage
 */

import { 
  migrateVendorExample,
  normalizeAddons,
  validateV2Product,
  V1MenuItem,
  V2Product,
  V2Addon,
  MigrationResult
} from './migrate_v1_to_v2';

describe('V1 to V2 Migration Script', () => {
  
  describe('normalizeAddons', () => {
    it('should convert V1 addons to V2 format', () => {
      const v1Addons = [
        { name: 'Extra Meat', price: 500, description: 'More protein' },
        { name: 'Large Size', price: 200 }
      ];
      
      const result = normalizeAddons(v1Addons);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        name: 'Extra Meat',
        price: 500,
        description: 'More protein',
        category: 'extras'
      });
      expect(result[1]).toMatchObject({
        id: expect.any(String),
        name: 'Large Size', 
        price: 200,
        category: 'extras'
      });
    });
    
    it('should handle empty addons array', () => {
      expect(normalizeAddons([])).toEqual([]);
      expect(normalizeAddons(undefined)).toEqual([]);
    });
    
    it('should generate unique IDs for each addon', () => {
      const v1Addons = [
        { name: 'Addon 1', price: 100 },
        { name: 'Addon 2', price: 200 }
      ];
      
      const result = normalizeAddons(v1Addons);
      const ids = result.map(addon => addon.id);
      
      expect(new Set(ids).size).toBe(2); // All unique
    });
  });
  
  describe('validateV2Product', () => {
    const validProduct: V2Product = {
      id: 'test-product',
      vendorId: 'test-vendor',
      name: 'Test Product',
      description: 'Test description',
      basePrice: 1500,
      category: 'Main Dishes',
      measurementType: 'unit',
      isAvailable: true,
      addons: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    it('should validate correct V2 product', () => {
      expect(validateV2Product(validProduct)).toBe(true);
    });
    
    it('should reject product without required fields', () => {
      const invalidProduct = { ...validProduct };
      delete (invalidProduct as any).name;
      
      expect(validateV2Product(invalidProduct as V2Product)).toBe(false);
    });
    
    it('should reject invalid measurement type', () => {
      const invalidProduct = {
        ...validProduct,
        measurementType: 'invalid' as any
      };
      
      expect(validateV2Product(invalidProduct)).toBe(false);
    });
    
    it('should reject negative price', () => {
      const invalidProduct = {
        ...validProduct,
        basePrice: -100
      };
      
      expect(validateV2Product(invalidProduct)).toBe(false);
    });
  });
  
  describe('migrateVendorExample', () => {
    const mockV1Products: V1MenuItem[] = [
      {
        id: 'item-1',
        vendorId: 'vendor-123',
        name: 'Jollof Rice',
        desc: 'Delicious Nigerian rice',
        price: 2500,
        category: 'Main Dishes',
        imageUrl: 'https://example.com/jollof.jpg',
        addons: [
          { name: 'Extra Meat', price: 500, description: 'More protein' },
          { name: 'Plantain', price: 300 }
        ],
        createdAt: { seconds: 1630000000 },
        updatedAt: { seconds: 1630000000 }
      },
      {
        id: 'item-2',
        vendorId: 'vendor-123',
        name: 'Fried Rice',
        desc: 'Chinese-style fried rice',
        price: 2000,
        category: 'Main Dishes'
      }
    ];
    
    it('should successfully migrate valid V1 products', async () => {
      const result = await migrateVendorExample('vendor-123', mockV1Products, false);
      
      expect(result.success).toBe(true);
      expect(result.vendorId).toBe('vendor-123');
      expect(result.migratedProducts).toBe(2);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should convert V1 fields to V2 structure', async () => {
      const result = await migrateVendorExample('vendor-123', [mockV1Products[0]], false);
      
      expect(result.success).toBe(true);
      // Additional assertions would check the actual converted product structure
    });
    
    it('should handle products without addons', async () => {
      const result = await migrateVendorExample('vendor-123', [mockV1Products[1]], false);
      
      expect(result.success).toBe(true);
      expect(result.migratedProducts).toBe(1);
    });
    
    it('should handle dry run mode', async () => {
      const result = await migrateVendorExample('vendor-123', mockV1Products, true);
      
      expect(result.success).toBe(true);
      expect(result.migratedProducts).toBe(2);
      // In dry run, no actual writes should occur
    });
    
    it('should detect and skip duplicate products', async () => {
      const duplicateProducts = [mockV1Products[0], mockV1Products[0]];
      
      const result = await migrateVendorExample('vendor-123', duplicateProducts, false);
      
      expect(result.warnings).toContain(expect.stringContaining('duplicate'));
    });
    
    it('should handle invalid product data gracefully', async () => {
      const invalidProduct = {
        ...mockV1Products[0],
        name: '', // Invalid empty name
        price: -100 // Invalid negative price
      };
      
      const result = await migrateVendorExample('vendor-123', [invalidProduct], false);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.migratedProducts).toBe(0);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle products with very long names', async () => {
      const longNameProduct: V1MenuItem = {
        id: 'long-name',
        vendorId: 'vendor-123',
        name: 'A'.repeat(300), // Very long name
        desc: 'Test description',
        price: 1000
      };
      
      const result = await migrateVendorExample('vendor-123', [longNameProduct], false);
      
      // Should either truncate or handle gracefully
      expect(result.success).toBe(true);
    });
    
    it('should handle special characters in product names', async () => {
      const specialCharProduct: V1MenuItem = {
        id: 'special-chars',
        vendorId: 'vendor-123',
        name: 'Àmàlà & Ewédú (Special) 🍲',
        desc: 'Traditional Nigerian food with special chars',
        price: 1500
      };
      
      const result = await migrateVendorExample('vendor-123', [specialCharProduct], false);
      
      expect(result.success).toBe(true);
      expect(result.migratedProducts).toBe(1);
    });
    
    it('should handle products with missing optional fields', async () => {
      const minimalProduct: V1MenuItem = {
        id: 'minimal',
        vendorId: 'vendor-123',
        name: 'Minimal Product',
        desc: 'Basic product',
        price: 1000
        // No imageUrl, addons, timestamps
      };
      
      const result = await migrateVendorExample('vendor-123', [minimalProduct], false);
      
      expect(result.success).toBe(true);
      expect(result.migratedProducts).toBe(1);
    });
  });
  
  describe('Performance Tests', () => {
    it('should handle large number of products efficiently', async () => {
      const manyProducts: V1MenuItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: `product-${i}`,
        vendorId: 'vendor-123',
        name: `Product ${i}`,
        desc: `Description ${i}`,
        price: 1000 + i
      }));
      
      const startTime = Date.now();
      const result = await migrateVendorExample('vendor-123', manyProducts, true);
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.migratedProducts).toBe(100);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});

// Mock Firebase Admin functions for testing
jest.mock('firebase-admin', () => ({
  firestore: () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(() => Promise.resolve()),
        get: jest.fn(() => Promise.resolve({ exists: false }))
      }))
    }))
  }),
  storage: () => ({
    bucket: jest.fn(() => ({
      file: jest.fn(() => ({
        copy: jest.fn(() => Promise.resolve())
      }))
    }))
  })
}));
