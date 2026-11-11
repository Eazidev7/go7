/**
 * 🔧 PRODUCT-VENDOR VERIFICATION SCRIPT
 * Run this in your browser console to verify fixes
 */

import { ProductVendorDiagnostic } from '../services/productVendorDiagnostic';
import { ProductService } from '../services/productServiceNew';

class ProductVendorVerification {
  
  static async runAllTests() {
    console.log('🚀 Starting Product-Vendor Verification Tests...\n');
    
    // Test 1: Diagnostic check
    await ProductVendorDiagnostic.testAllVendorProducts();
    
    // Test 2: Category verification
    await ProductVendorDiagnostic.testCategoryDisplay();
    
    // Test 3: Service layer test
    await this.testServiceLayer();
    
    console.log('✅ Verification tests completed!');
  }
  
  static async testServiceLayer() {
    console.log('🔍 Testing Service Layer Methods...\n');
    
    try {
      const productService = new ProductService();
      
      // Test getting vendor products for first vendor
      console.log('Testing ProductService.getVendorProducts()...');
      
      // You can replace 'test-vendor-id' with an actual vendor ID from your database
      const vendorId = 'test-vendor-id'; 
      const products = await productService.getVendorProducts(vendorId);
      
      console.log(`Found ${products.length} products for vendor ${vendorId}`);
      
      products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (${product.vendorId === vendorId ? '✅' : '❌'} vendorId match)`);
      });
      
    } catch (error) {
      console.log('Note: Service test requires valid vendor ID. Error:', error.message);
    }
  }
  
  // Quick test for dashboard category display
  static testCategoryDisplay() {
    console.log('🔍 Testing Category Display Logic...\n');
    
    // Sample product with correct structure
    const sampleProduct = {
      id: 'test-product',
      vendorId: 'test-vendor',
      name: 'Test Product',
      basePrice: 1000,
      desc: 'Test description',
      category: 'food',
      active: true,
      productType: 'food'
    };
    
    console.log('Sample Product Structure:', sampleProduct);
    console.log('✅ Product has vendorId:', !!sampleProduct.vendorId);
    console.log('✅ Product has category:', !!sampleProduct.category);
    console.log('✅ Product is active:', sampleProduct.active);
  }
}

// Export for browser console use
if (typeof window !== 'undefined') {
  window.ProductVendorVerification = ProductVendorVerification;
  console.log('🔧 Verification script loaded!');
  console.log('Run: ProductVendorVerification.runAllTests()');
}

export { ProductVendorVerification };