/**
 * 🧪 QUICK TEST SCRIPT - Vendor Product Service
 * 
 * Run this in browser console to test the vendor product service
 * Make sure you're logged in as a vendor first!
 */

import { VendorProductService } from './services/vendorProductService';

// ====================================================================
// TEST CONFIGURATION
// ====================================================================

const TEST_VENDOR_ID = 'your-vendor-id-here'; // ⚠️ REPLACE WITH YOUR VENDOR ID

// ====================================================================
// TEST 1: Create Product with Numeric Price
// ====================================================================

async function testCreateProduct() {
  console.log('🧪 TEST 1: Creating product with numeric price...');
  
  try {
    const product = await VendorProductService.createProduct(
      TEST_VENDOR_ID,
      {
        name: 'Test Jollof Rice',
        description: 'Delicious test jollof rice for testing',
        price: 1500,  // ✅ Numeric price
        currency: 'NGN',
        measurementType: 'portion',
        minQty: 1,
        maxQty: 50,
        available: true,
        category: 'Food'
      }
    );
    
    console.log('✅ Product created:', product);
    console.log('✅ Price is numeric:', typeof product.price === 'number');
    return product.id;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// ====================================================================
// TEST 2: Price Validation (String to Number)
// ====================================================================

async function testPriceValidation() {
  console.log('\n🧪 TEST 2: Testing price validation...');
  
  try {
    // Test with string price (should convert to number)
    const product = await VendorProductService.createProduct(
      TEST_VENDOR_ID,
      {
        name: 'Test Price Validation Product',
        description: 'Testing price validation',
        price: "2500" as any,  // ⚠️ String price (should convert)
        currency: 'NGN',
        measurementType: 'portion',
        minQty: 1,
        maxQty: 50,
        available: true
      }
    );
    
    console.log('✅ Product created with string price:', product);
    console.log('✅ Price converted to number:', typeof product.price === 'number');
    console.log('✅ Price value:', product.price);
    return product.id;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// ====================================================================
// TEST 3: Get Products and Verify No NaN
// ====================================================================

async function testGetProducts() {
  console.log('\n🧪 TEST 3: Getting products and checking for NaN...');
  
  try {
    const products = await VendorProductService.getVendorProducts(TEST_VENDOR_ID);
    
    console.log(`✅ Retrieved ${products.length} products`);
    
    // Check each product for NaN prices
    const nanPrices = products.filter(p => isNaN(p.price));
    
    if (nanPrices.length > 0) {
      console.error('❌ Found products with NaN prices:', nanPrices);
      return false;
    }
    
    console.log('✅ All prices are valid numbers!');
    
    // Display formatted prices
    products.forEach(p => {
      const formatted = VendorProductService.formatPrice(p.price, p.currency);
      console.log(`  - ${p.name}: ${formatted}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// ====================================================================
// TEST 4: Real-time Listener
// ====================================================================

async function testRealtimeListener() {
  console.log('\n🧪 TEST 4: Testing real-time listener...');
  
  try {
    let updateCount = 0;
    
    const unsubscribe = VendorProductService.subscribeToVendorProducts(
      TEST_VENDOR_ID,
      (products) => {
        updateCount++;
        console.log(`✅ Real-time update #${updateCount}: ${products.length} products`);
        
        // Verify all prices are numeric
        const allNumeric = products.every(p => typeof p.price === 'number' && !isNaN(p.price));
        console.log(`✅ All prices numeric: ${allNumeric}`);
      },
      (error) => {
        console.error('❌ Listener error:', error);
      }
    );
    
    console.log('✅ Listener subscribed. Make changes in Firestore to see real-time updates!');
    console.log('⏰ Will unsubscribe in 30 seconds...');
    
    // Auto-unsubscribe after 30 seconds
    setTimeout(() => {
      unsubscribe();
      console.log('✅ Listener unsubscribed');
    }, 30000);
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// ====================================================================
// TEST 5: Create Addon
// ====================================================================

async function testCreateAddon(productId) {
  console.log('\n🧪 TEST 5: Creating addon...');
  
  if (!productId) {
    console.error('❌ Need productId to create addon');
    return null;
  }
  
  try {
    const addon = await VendorProductService.createAddon(
      TEST_VENDOR_ID,
      productId,
      {
        name: 'Extra Meat',
        price: 500,  // ✅ Numeric price
        available: true,
        qtyLimit: 5
      }
    );
    
    console.log('✅ Addon created:', addon);
    console.log('✅ Addon price is numeric:', typeof addon.price === 'number');
    return addon.id;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// ====================================================================
// TEST 6: Calculate Total Price
// ====================================================================

function testPriceCalculation() {
  console.log('\n🧪 TEST 6: Testing price calculation...');
  
  try {
    const basePrice = 1500;
    const addons = [
      { price: 500, quantity: 2 },  // Extra Meat x2 = 1000
      { price: 300, quantity: 1 }   // Extra Sauce x1 = 300
    ];
    
    const total = VendorProductService.calculateTotalPrice(basePrice, addons);
    
    console.log('✅ Base price:', basePrice);
    console.log('✅ Addons:', addons);
    console.log('✅ Total:', total);
    console.log('✅ Expected: 2800, Got:', total);
    console.log('✅ Test passed:', total === 2800);
    
    return total === 2800;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// ====================================================================
// TEST 7: Trending Products (Global Collection)
// ====================================================================

async function testTrendingProducts() {
  console.log('\n🧪 TEST 7: Getting trending products from global collection...');
  
  try {
    const trending = await VendorProductService.getTrendingProducts(10);
    
    console.log(`✅ Retrieved ${trending.length} trending products`);
    
    trending.forEach(p => {
      console.log(`  - ${p.name} (Vendor: ${p.vendorId}): ${VendorProductService.formatPrice(p.price, p.currency)}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// ====================================================================
// RUN ALL TESTS
// ====================================================================

async function runAllTests() {
  console.log('🚀 Starting Vendor Product Service Tests...\n');
  console.log('⚠️ Make sure to set TEST_VENDOR_ID at the top of this file!\n');
  
  if (TEST_VENDOR_ID === 'your-vendor-id-here') {
    console.error('❌ Please set TEST_VENDOR_ID before running tests!');
    return;
  }
  
  try {
    // Test 1: Create product
    const productId1 = await testCreateProduct();
    
    // Test 2: Price validation
    const productId2 = await testPriceValidation();
    
    // Test 3: Get products
    await testGetProducts();
    
    // Test 4: Real-time listener (runs in background)
    testRealtimeListener();
    
    // Test 5: Create addon (using first product)
    if (productId1) {
      await testCreateAddon(productId1);
    }
    
    // Test 6: Price calculation
    testPriceCalculation();
    
    // Test 7: Trending products
    await testTrendingProducts();
    
    console.log('\n✅ ALL TESTS COMPLETED!\n');
    console.log('📊 Check Firestore Console to verify:');
    console.log('  1. Products in vendors/{vendorId}/products');
    console.log('  2. Products mirrored to /products collection');
    console.log('  3. vendor.totalProducts incremented');
    console.log('  4. All prices are numbers (not strings)');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// ====================================================================
// EXPORT FOR CONSOLE TESTING
// ====================================================================

export {
  testCreateProduct,
  testPriceValidation,
  testGetProducts,
  testRealtimeListener,
  testCreateAddon,
  testPriceCalculation,
  testTrendingProducts,
  runAllTests
};

// Auto-run if in development
if (import.meta.env.DEV) {
  console.log('🧪 Test functions available:');
  console.log('  - runAllTests()');
  console.log('  - testCreateProduct()');
  console.log('  - testPriceValidation()');
  console.log('  - testGetProducts()');
  console.log('  - testRealtimeListener()');
  console.log('  - testCreateAddon(productId)');
  console.log('  - testPriceCalculation()');
  console.log('  - testTrendingProducts()');
  console.log('\n💡 Run runAllTests() to test everything!');
}
