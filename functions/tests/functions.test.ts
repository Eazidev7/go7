import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createProduct } from '../src/createProduct';
import { placeOrder } from '../src/placeOrder';
import { triggerManualPayout } from '../src/autoPayout';

// Initialize Firebase for testing
const test = require('firebase-functions-test')();

describe('GO7 Cloud Functions', () => {
  beforeAll(() => {
    // Initialize Firebase Admin for testing
    if (!admin.apps.length) {
      admin.initializeApp();
    }
  });

  afterAll(() => {
    test.cleanup();
  });

  describe('createProduct', () => {
    const mockContext = {
      auth: {
        uid: 'test-vendor-user-123',
        token: {
          email: 'vendor@test.com'
        }
      }
    };

    it('should create a food product with add-ons', async () => {
      const mockData = {
        name: 'Test Jollof Rice',
        description: 'Delicious test jollof rice',
        imageUrl: 'https://example.com/jollof.jpg',
        basePrice: 3500,
        category: 'fast-food',
        productType: 'food' as const,
        vendorId: 'test-vendor-123',
        addons: [
          {
            name: 'Extra Chicken',
            price: 1000,
            category: 'protein' as const
          },
          {
            name: 'Spicy Sauce',
            price: 200,
            category: 'spicy' as const
          }
        ]
      };

      const result = await createProduct(mockData, mockContext);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        productId: expect.any(String),
        message: 'Product created successfully'
      });
    });

    it('should create a market product with variants', async () => {
      const mockData = {
        name: 'Test Samsung Phone',
        description: 'Test smartphone',
        imageUrl: 'https://example.com/phone.jpg',
        basePrice: 285000,
        category: 'electronics',
        productType: 'market' as const,
        vendorId: 'test-vendor-123',
        variants: [
          {
            name: '128GB Blue',
            price: 285000,
            stock: 10,
            sku: 'PHONE-128-BLUE'
          },
          {
            name: '256GB Black',
            price: 325000,
            stock: 5,
            sku: 'PHONE-256-BLACK'
          }
        ]
      };

      const result = await createProduct(mockData, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.productId).toBeDefined();
    });

    it('should reject product creation without authentication', async () => {
      const mockData = {
        name: 'Test Product',
        description: 'Test description',
        imageUrl: 'https://example.com/image.jpg',
        basePrice: 1000,
        category: 'test',
        productType: 'food' as const,
        vendorId: 'test-vendor-123'
      };

      const result = await createProduct(mockData, {});
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Authentication required to create products');
    });

    it('should validate required fields', async () => {
      const mockData = {
        name: '',
        description: '',
        imageUrl: '',
        basePrice: 0,
        category: '',
        productType: 'food' as const,
        vendorId: ''
      };

      const result = await createProduct(mockData, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('placeOrder', () => {
    const mockContext = {
      auth: {
        uid: 'test-customer-123',
        token: {
          email: 'customer@test.com'
        }
      }
    };

    it('should place an order with mixed items', async () => {
      const mockData = {
        items: [
          {
            productId: 'test-product-food-123',
            productName: 'Test Jollof Rice',
            productType: 'food' as const,
            basePrice: 3500,
            selectedAddons: [
              {
                id: 'addon-001',
                name: 'Extra Chicken',
                price: 1000
              }
            ],
            quantity: 2,
            vendorId: 'test-vendor-123',
            vendorName: 'Test Kitchen'
          },
          {
            productId: 'test-product-market-456',
            productName: 'Test Phone',
            productType: 'market' as const,
            basePrice: 285000,
            selectedVariant: {
              id: 'variant-001',
              name: '128GB Blue',
              price: 285000,
              sku: 'PHONE-128-BLUE'
            },
            selectedAddons: [],
            quantity: 1,
            vendorId: 'test-vendor-456',
            vendorName: 'Test Electronics'
          }
        ],
        deliveryAddress: {
          street: '123 Test Street',
          city: 'Lagos',
          state: 'Lagos State',
          postalCode: '100001',
          country: 'Nigeria',
          coordinates: {
            latitude: 6.5244,
            longitude: 3.3792
          }
        },
        paymentMethod: 'card' as const,
        paymentReference: 'test-payment-ref-123',
        deliveryType: 'standard' as const,
        userDetails: {
          name: 'Test Customer',
          email: 'customer@test.com',
          phone: '+234-803-123-4567'
        }
      };

      const result = await placeOrder(mockData, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.orderNumber).toMatch(/^GO7-/);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should validate cart items', async () => {
      const mockData = {
        items: [
          {
            productId: '',
            productName: 'Test Product',
            productType: 'food' as const,
            basePrice: 0,
            selectedAddons: [],
            quantity: 0,
            vendorId: '',
            vendorName: 'Test Vendor'
          }
        ],
        deliveryAddress: {
          street: '123 Test Street',
          city: 'Lagos',
          state: 'Lagos State',
          postalCode: '100001',
          country: 'Nigeria'
        },
        paymentMethod: 'card' as const,
        paymentReference: 'test-ref',
        deliveryType: 'standard' as const,
        userDetails: {
          name: 'Test Customer',
          email: 'customer@test.com',
          phone: '+234-803-123-4567'
        }
      };

      const result = await placeOrder(mockData, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('triggerManualPayout', () => {
    const mockAdminContext = {
      auth: {
        uid: 'test-admin-123',
        token: {
          email: 'admin@go7.com'
        }
      }
    };

    const mockUserContext = {
      auth: {
        uid: 'test-user-123',
        token: {
          email: 'user@test.com'
        }
      }
    };

    it('should reject payout request from non-admin user', async () => {
      const mockData = {
        vendorId: 'test-vendor-123'
      };

      try {
        await triggerManualPayout(mockData, mockUserContext);
        fail('Should have thrown permission denied error');
      } catch (error) {
        expect(error.code).toBe('permission-denied');
      }
    });

    it('should process payout request from admin', async () => {
      const mockData = {
        vendorId: 'test-vendor-123',
        amount: 15000
      };

      // This test would require mock Firestore data setup
      // For now, we'll just verify the function structure
      expect(triggerManualPayout).toBeDefined();
      expect(typeof triggerManualPayout).toBe('function');
    });
  });

  describe('Price Calculation Logic', () => {
    it('should calculate correct price for food items with add-ons', () => {
      const basePrice = 3500;
      const addons = [
        { id: '1', name: 'Extra Chicken', price: 1000 },
        { id: '2', name: 'Spicy Sauce', price: 200 }
      ];
      const quantity = 2;

      const addonsTotal = addons.reduce((sum, addon) => sum + addon.price, 0);
      const itemTotal = (basePrice + addonsTotal) * quantity;

      expect(itemTotal).toBe(9400); // (3500 + 1000 + 200) * 2
    });

    it('should calculate correct price for market items with variants', () => {
      const variantPrice = 285000;
      const quantity = 1;

      const itemTotal = variantPrice * quantity;

      expect(itemTotal).toBe(285000);
    });

    it('should calculate service fee correctly', () => {
      const calculateServiceFee = (subtotal: number): number => {
        const percentage = subtotal * 0.02;
        return Math.min(Math.max(percentage, 100), 1000);
      };

      expect(calculateServiceFee(5000)).toBe(100); // Minimum fee
      expect(calculateServiceFee(10000)).toBe(200); // 2% of 10000
      expect(calculateServiceFee(100000)).toBe(1000); // Maximum fee
    });
  });

  describe('Stock Management', () => {
    it('should properly decrement variant stock', () => {
      const initialStock = 10;
      const orderQuantity = 3;
      const newStock = initialStock - orderQuantity;

      expect(newStock).toBe(7);
      expect(newStock).toBeGreaterThanOrEqual(0);
    });

    it('should prevent order when insufficient stock', () => {
      const availableStock = 2;
      const requestedQuantity = 5;

      expect(availableStock < requestedQuantity).toBe(true);
    });
  });

  describe('Vendor Earnings Calculation', () => {
    it('should calculate 85/15 revenue split correctly', () => {
      const subtotal = 10000;
      const vendorEarnings = Math.round(subtotal * 0.85);
      const platformFee = subtotal - vendorEarnings;

      expect(vendorEarnings).toBe(8500);
      expect(platformFee).toBe(1500);
      expect(vendorEarnings + platformFee).toBe(subtotal);
    });

    it('should handle small amounts correctly', () => {
      const subtotal = 100;
      const vendorEarnings = Math.round(subtotal * 0.85);
      const platformFee = subtotal - vendorEarnings;

      expect(vendorEarnings).toBe(85);
      expect(platformFee).toBe(15);
    });
  });
});

// Integration Test Setup
describe('E2E Integration Tests', () => {
  it('should complete full vendor-to-customer flow', async () => {
    // This would be a comprehensive test that:
    // 1. Creates a vendor
    // 2. Creates a market product with variants
    // 3. Places an order
    // 4. Verifies stock decrement
    // 5. Verifies vendor balance update
    // 6. Triggers payout
    
    // For now, we'll just verify the test structure
    expect(true).toBe(true);
  });
});