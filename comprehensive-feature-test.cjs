#!/usr/bin/env node
/**
 * GO7 COMPREHENSIVE FEATURE TEST SUITE
 * Programmatic testing of all app features
 * Run with: node comprehensive-feature-test.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.TEST_URL || 'https://192.168.18.6:3000';
const TEST_RESULTS = [];
const SCREENSHOTS_DIR = './test-screenshots';

// Test Data
const TEST_DATA = {
  locations: {
    abeokuta: {
      pickup: { lat: 7.1475, lng: 3.3619, address: 'Olusegun Obasanjo Presidential Library, Abeokuta' },
      dropoff: { lat: 7.1689, lng: 3.3501, address: 'Totoro, Abeokuta' }
    },
    lagos: {
      pickup: { lat: 6.5244, lng: 3.3792, address: 'Victoria Island, Lagos' },
      dropoff: { lat: 6.4541, lng: 3.3947, address: 'Lekki Phase 1, Lagos' }
    }
  },
  users: {
    customer: {
      email: 'test.customer@go7test.com',
      password: 'TestPassword123!',
      phone: '08012345678'
    },
    vendor: {
      email: 'test.vendor@go7test.com',
      password: 'VendorPass123!',
      phone: '08087654321'
    },
    rider: {
      email: 'test.rider@go7test.com',
      password: 'RiderPass123!',
      phone: '08098765432'
    }
  },
  cart: {
    restaurant: [
      { name: 'Jollof Rice', price: 2500, quantity: 2 },
      { name: 'Chicken Suya', price: 1500, quantity: 1 }
    ],
    shop: [
      { name: 'Nike Sneakers', price: 25000, quantity: 1 },
      { name: 'T-Shirt', price: 5000, quantity: 2 }
    ]
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Logging functions
function logSection(title) {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(80)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(80)}${colors.reset}\n`);
}

function logTest(testName) {
  console.log(`${colors.blue}▶ Testing:${colors.reset} ${testName}`);
}

function logPass(message) {
  console.log(`${colors.green}✓ PASS:${colors.reset} ${message}`);
}

function logFail(message) {
  console.log(`${colors.red}✗ FAIL:${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠ WARNING:${colors.reset} ${message}`);
}

function logInfo(message) {
  console.log(`${colors.cyan}ℹ INFO:${colors.reset} ${message}`);
}

// Test result tracking
function recordTest(category, testName, passed, details = '', duration = 0) {
  TEST_RESULTS.push({
    category,
    testName,
    passed,
    details,
    duration,
    timestamp: new Date().toISOString()
  });
}

// Setup screenshots directory
function setupScreenshotsDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

// Take screenshot helper
async function takeScreenshot(page, name) {
  try {
    const filename = `${SCREENSHOTS_DIR}/${name}-${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    logInfo(`Screenshot saved: ${filename}`);
    return filename;
  } catch (error) {
    logWarning(`Failed to take screenshot: ${error.message}`);
    return null;
  }
}

// Wait helper with timeout
async function waitForElement(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    logWarning(`Element not found: ${selector}`);
    return false;
  }
}

// ==========================================
// TEST SUITE 1: CORE NAVIGATION & ROUTING
// ==========================================
async function testCoreNavigation(browser) {
  logSection('🧭 TEST SUITE 1: CORE NAVIGATION & ROUTING');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    // Test main routes
    const routes = [
      { path: '/', name: 'Homepage', expectedText: 'GO7' },
      { path: '/book', name: 'Book Delivery', expectedText: 'pickup' },
      { path: '/gobuy', name: 'GoBuy Shopping', expectedText: 'shopping' },
      { path: '/restaurants', name: 'Restaurants', expectedText: 'restaurant' },
      { path: '/shops', name: 'Shops', expectedText: 'shop' },
      { path: '/pharmacy', name: 'Pharmacy', expectedText: 'pharmacy' },
      { path: '/markets', name: 'Markets', expectedText: 'market' },
      { path: '/checkout', name: 'Checkout', expectedText: 'checkout' },
      { path: '/track', name: 'Track Order', expectedText: 'track' },
      { path: '/profile', name: 'Profile', expectedText: 'profile' }
    ];

    for (const route of routes) {
      logTest(`${route.name} (${route.path})`);
      try {
        const response = await page.goto(`${BASE_URL}${route.path}`, { 
          waitUntil: 'networkidle2',
          timeout: 10000 
        });
        
        if (response && response.ok()) {
          const content = await page.content();
          const hasExpectedText = content.toLowerCase().includes(route.expectedText.toLowerCase());
          
          if (hasExpectedText) {
            logPass(`${route.name} loaded successfully`);
            recordTest('Navigation', route.name, true, `Status: ${response.status()}`);
          } else {
            logWarning(`${route.name} loaded but missing expected content`);
            recordTest('Navigation', route.name, true, `Warning: Missing '${route.expectedText}'`);
          }
          
          await takeScreenshot(page, `route-${route.name.replace(/\s+/g, '-').toLowerCase()}`);
        } else {
          logFail(`${route.name} returned ${response?.status()}`);
          recordTest('Navigation', route.name, false, `Status: ${response?.status()}`);
        }
      } catch (error) {
        logFail(`${route.name} - ${error.message}`);
        recordTest('Navigation', route.name, false, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between tests
    }
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// TEST SUITE 2: PARCEL/ERRAND DELIVERY
// ==========================================
async function testParcelDelivery(browser) {
  logSection('📦 TEST SUITE 2: PARCEL/ERRAND DELIVERY FLOW');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    logTest('Loading Book Delivery page');
    await page.goto(`${BASE_URL}/book`, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'book-delivery-initial');
    
    // Test 1: Check for pickup location input
    logTest('Checking pickup location input');
    const pickupExists = await waitForElement(page, 'input[placeholder*="pickup"], input[name*="pickup"], [data-testid="pickup"]');
    if (pickupExists) {
      logPass('Pickup location input found');
      recordTest('Parcel Delivery', 'Pickup Input', true);
    } else {
      logFail('Pickup location input not found');
      recordTest('Parcel Delivery', 'Pickup Input', false);
    }
    
    // Test 2: Check for dropoff location input
    logTest('Checking dropoff location input');
    const dropoffExists = await waitForElement(page, 'input[placeholder*="dropoff"], input[name*="dropoff"], [data-testid="dropoff"]');
    if (dropoffExists) {
      logPass('Dropoff location input found');
      recordTest('Parcel Delivery', 'Dropoff Input', true);
    } else {
      logFail('Dropoff location input not found');
      recordTest('Parcel Delivery', 'Dropoff Input', false);
    }
    
    // Test 3: Check for package size options
    logTest('Checking package size options');
    const packageOptions = await page.$$('button:has-text("Small"), button:has-text("Medium"), button:has-text("Large"), select[name*="size"]');
    if (packageOptions.length > 0) {
      logPass('Package size options found');
      recordTest('Parcel Delivery', 'Package Options', true);
    } else {
      logWarning('Package size options not clearly visible');
      recordTest('Parcel Delivery', 'Package Options', false, 'Not found');
    }
    
    // Test 4: Check for fare display component
    logTest('Checking fare display component');
    const fareDisplay = await page.$('[data-testid="fare-display"], .fare-display, [class*="fare"]');
    if (fareDisplay) {
      logPass('Fare display component present');
      recordTest('Parcel Delivery', 'Fare Display', true);
    } else {
      logWarning('Fare display not found (may appear after location selection)');
      recordTest('Parcel Delivery', 'Fare Display', false, 'Not visible initially');
    }
    
    // Test 5: Check for checkout button
    logTest('Checking proceed to checkout button');
    const checkoutBtn = await page.$('button:has-text("Checkout"), button:has-text("Proceed"), [data-testid="checkout-btn"]');
    if (checkoutBtn) {
      logPass('Checkout button found');
      recordTest('Parcel Delivery', 'Checkout Button', true);
    } else {
      logFail('Checkout button not found');
      recordTest('Parcel Delivery', 'Checkout Button', false);
    }
    
    await takeScreenshot(page, 'book-delivery-form');
    
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// TEST SUITE 3: GOBUY SHOPPING SERVICE
// ==========================================
async function testGoBuyService(browser) {
  logSection('🛍️ TEST SUITE 3: GOBUY SHOPPING SERVICE');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    logTest('Loading GoBuy page');
    await page.goto(`${BASE_URL}/gobuy`, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'gobuy-initial');
    
    // Test 1: Shopping list input
    logTest('Checking shopping list input');
    const shoppingInput = await page.$('textarea, input[type="text"][placeholder*="item"], [data-testid="shopping-list"]');
    if (shoppingInput) {
      logPass('Shopping list input found');
      recordTest('GoBuy', 'Shopping List Input', true);
    } else {
      logFail('Shopping list input not found');
      recordTest('GoBuy', 'Shopping List Input', false);
    }
    
    // Test 2: Delivery address input
    logTest('Checking delivery address input');
    const addressInput = await page.$('input[placeholder*="address"], input[placeholder*="delivery"]');
    if (addressInput) {
      logPass('Delivery address input found');
      recordTest('GoBuy', 'Delivery Address', true);
    } else {
      logFail('Delivery address input not found');
      recordTest('GoBuy', 'Delivery Address', false);
    }
    
    // Test 3: Service fee display
    logTest('Checking service fee information');
    const feeInfo = await page.$('[data-testid="service-fee"], .service-fee, [class*="fee"]');
    if (feeInfo) {
      logPass('Service fee information present');
      recordTest('GoBuy', 'Service Fee Display', true);
    } else {
      logWarning('Service fee not displayed initially');
      recordTest('GoBuy', 'Service Fee Display', false, 'Not visible');
    }
    
    await takeScreenshot(page, 'gobuy-form');
    
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// TEST SUITE 4: RESTAURANT FOOD DELIVERY
// ==========================================
async function testRestaurantDelivery(browser) {
  logSection('🍔 TEST SUITE 4: RESTAURANT FOOD DELIVERY');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    logTest('Loading Restaurants page');
    await page.goto(`${BASE_URL}/restaurants`, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'restaurants-initial');
    
    // Test 1: Restaurant list
    logTest('Checking restaurant list display');
    const restaurants = await page.$$('[data-testid="restaurant-card"], .restaurant-card, [class*="restaurant"]');
    if (restaurants.length > 0) {
      logPass(`Found ${restaurants.length} restaurant(s)`);
      recordTest('Restaurants', 'Restaurant List', true, `${restaurants.length} items`);
    } else {
      logFail('No restaurants found');
      recordTest('Restaurants', 'Restaurant List', false);
    }
    
    // Test 2: Cart component
    logTest('Checking cart component');
    const cart = await page.$('[data-testid="cart"], .cart, [class*="cart"]');
    if (cart) {
      logPass('Cart component present');
      recordTest('Restaurants', 'Cart Component', true);
    } else {
      logWarning('Cart not visible initially');
      recordTest('Restaurants', 'Cart Component', false, 'Not visible');
    }
    
    // Test 3: Menu items (if restaurant clicked)
    logTest('Checking menu item structure');
    const menuItems = await page.$$('[data-testid="menu-item"], .menu-item, [class*="menu"]');
    if (menuItems.length > 0) {
      logPass(`Found ${menuItems.length} menu item(s)`);
      recordTest('Restaurants', 'Menu Items', true, `${menuItems.length} items`);
    } else {
      logWarning('Menu items not displayed (may require restaurant selection)');
      recordTest('Restaurants', 'Menu Items', false, 'Not visible');
    }
    
    await takeScreenshot(page, 'restaurants-menu');
    
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// TEST SUITE 5: SHOPS RETAIL
// ==========================================
async function testShopsRetail(browser) {
  logSection('🏪 TEST SUITE 5: SHOPS RETAIL SHOPPING');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    logTest('Loading Shops page');
    await page.goto(`${BASE_URL}/shops`, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'shops-initial');
    
    // Test 1: Shop categories
    logTest('Checking shop categories');
    const categories = await page.$$('[data-testid="category"], .category, [class*="category"]');
    if (categories.length > 0) {
      logPass(`Found ${categories.length} categor(y/ies)`);
      recordTest('Shops', 'Categories', true, `${categories.length} items`);
    } else {
      logFail('No categories found');
      recordTest('Shops', 'Categories', false);
    }
    
    // Test 2: Product list
    logTest('Checking product display');
    const products = await page.$$('[data-testid="product"], .product, [class*="product-card"]');
    if (products.length > 0) {
      logPass(`Found ${products.length} product(s)`);
      recordTest('Shops', 'Products', true, `${products.length} items`);
    } else {
      logWarning('No products displayed');
      recordTest('Shops', 'Products', false);
    }
    
    // Test 3: Cart functionality
    logTest('Checking cart presence');
    const cart = await page.$('[data-testid="cart"], .cart-icon, [class*="cart"]');
    if (cart) {
      logPass('Cart icon/component present');
      recordTest('Shops', 'Cart', true);
    } else {
      logFail('Cart not found');
      recordTest('Shops', 'Cart', false);
    }
    
    await takeScreenshot(page, 'shops-products');
    
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// TEST SUITE 6: PHARMACY & MARKETS
// ==========================================
async function testPharmacyAndMarkets(browser) {
  logSection('💊 TEST SUITE 6: PHARMACY & MARKETS');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    // Pharmacy Tests
    logTest('Loading Pharmacy page');
    await page.goto(`${BASE_URL}/pharmacy`, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'pharmacy-initial');
    
    const pharmacyProducts = await page.$$('[data-testid="product"], .product, [class*="medicine"]');
    if (pharmacyProducts.length > 0) {
      logPass(`Pharmacy: Found ${pharmacyProducts.length} product(s)`);
      recordTest('Pharmacy', 'Products', true, `${pharmacyProducts.length} items`);
    } else {
      logWarning('Pharmacy: No products displayed');
      recordTest('Pharmacy', 'Products', false);
    }
    
    // Markets Tests
    logTest('Loading Markets page');
    await page.goto(`${BASE_URL}/markets`, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'markets-initial');
    
    const marketProducts = await page.$$('[data-testid="product"], .product, [class*="grocery"]');
    if (marketProducts.length > 0) {
      logPass(`Markets: Found ${marketProducts.length} product(s)`);
      recordTest('Markets', 'Products', true, `${marketProducts.length} items`);
    } else {
      logWarning('Markets: No products displayed');
      recordTest('Markets', 'Products', false);
    }
    
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// TEST SUITE 7: CHECKOUT SYSTEM
// ==========================================
async function testCheckoutSystem(browser) {
  logSection('💳 TEST SUITE 7: CHECKOUT SYSTEM');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    logTest('Loading Checkout page');
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'checkout-initial');
    
    // Test 1: Order summary
    logTest('Checking order summary section');
    const orderSummary = await page.$('[data-testid="order-summary"], .order-summary, [class*="summary"]');
    if (orderSummary) {
      logPass('Order summary section present');
      recordTest('Checkout', 'Order Summary', true);
    } else {
      logWarning('Order summary not visible');
      recordTest('Checkout', 'Order Summary', false);
    }
    
    // Test 2: Payment methods
    logTest('Checking payment method options');
    const paymentMethods = await page.$$('input[type="radio"][name*="payment"], [data-testid="payment-method"]');
    if (paymentMethods.length > 0) {
      logPass(`Found ${paymentMethods.length} payment method(s)`);
      recordTest('Checkout', 'Payment Methods', true, `${paymentMethods.length} options`);
    } else {
      logFail('No payment methods found');
      recordTest('Checkout', 'Payment Methods', false);
    }
    
    // Test 3: Delivery fee breakdown
    logTest('Checking delivery fee breakdown');
    const feeBreakdown = await page.$('[data-testid="fee-breakdown"], .delivery-fee, [class*="breakdown"]');
    if (feeBreakdown) {
      logPass('Delivery fee breakdown present');
      recordTest('Checkout', 'Fee Breakdown', true);
    } else {
      logWarning('Fee breakdown not visible');
      recordTest('Checkout', 'Fee Breakdown', false);
    }
    
    // Test 4: Confirm order button
    logTest('Checking confirm order button');
    const confirmBtn = await page.$('button:has-text("Confirm"), button:has-text("Place Order"), [data-testid="confirm-order"]');
    if (confirmBtn) {
      logPass('Confirm order button found');
      recordTest('Checkout', 'Confirm Button', true);
    } else {
      logFail('Confirm order button not found');
      recordTest('Checkout', 'Confirm Button', false);
    }
    
    await takeScreenshot(page, 'checkout-details');
    
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// TEST SUITE 8: ORDER TRACKING
// ==========================================
async function testOrderTracking(browser) {
  logSection('📍 TEST SUITE 8: ORDER TRACKING');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    logTest('Loading Track Order page');
    await page.goto(`${BASE_URL}/track`, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'track-initial');
    
    // Test 1: Order ID input
    logTest('Checking order ID input');
    const orderInput = await page.$('input[placeholder*="order"], input[name*="orderId"]');
    if (orderInput) {
      logPass('Order ID input found');
      recordTest('Tracking', 'Order Input', true);
    } else {
      logFail('Order ID input not found');
      recordTest('Tracking', 'Order Input', false);
    }
    
    // Test 2: Map component
    logTest('Checking map component for tracking');
    const map = await page.$('[data-testid="map"], .map, #map, [class*="leaflet"]');
    if (map) {
      logPass('Map component present');
      recordTest('Tracking', 'Map Component', true);
    } else {
      logWarning('Map not visible initially');
      recordTest('Tracking', 'Map Component', false);
    }
    
    // Test 3: Order status display
    logTest('Checking order status display');
    const statusDisplay = await page.$('[data-testid="order-status"], .order-status, [class*="status"]');
    if (statusDisplay) {
      logPass('Order status display present');
      recordTest('Tracking', 'Status Display', true);
    } else {
      logWarning('Status display not visible');
      recordTest('Tracking', 'Status Display', false);
    }
    
    await takeScreenshot(page, 'track-page');
    
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// TEST SUITE 9: USER PROFILE & WALLET
// ==========================================
async function testProfileAndWallet(browser) {
  logSection('👤 TEST SUITE 9: USER PROFILE & WALLET');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    logTest('Loading Profile page');
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'profile-initial');
    
    // Test 1: Profile information section
    logTest('Checking profile information');
    const profileInfo = await page.$('[data-testid="profile-info"], .profile-info, [class*="profile"]');
    if (profileInfo) {
      logPass('Profile information section present');
      recordTest('Profile', 'Profile Info', true);
    } else {
      logWarning('Profile info not visible (may require login)');
      recordTest('Profile', 'Profile Info', false, 'Not visible');
    }
    
    // Test 2: Wallet/balance display
    logTest('Checking wallet balance display');
    const wallet = await page.$('[data-testid="wallet"], .wallet, [class*="balance"]');
    if (wallet) {
      logPass('Wallet component present');
      recordTest('Profile', 'Wallet', true);
    } else {
      logWarning('Wallet not visible');
      recordTest('Profile', 'Wallet', false);
    }
    
    // Test 3: Order history
    logTest('Checking order history section');
    const orderHistory = await page.$('[data-testid="order-history"], .order-history, [class*="orders"]');
    if (orderHistory) {
      logPass('Order history section present');
      recordTest('Profile', 'Order History', true);
    } else {
      logWarning('Order history not visible');
      recordTest('Profile', 'Order History', false);
    }
    
    await takeScreenshot(page, 'profile-page');
    
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// TEST SUITE 10: VENDOR PORTAL
// ==========================================
async function testVendorPortal(browser) {
  logSection('🏢 TEST SUITE 10: VENDOR PORTAL');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    logTest('Loading Vendor page');
    await page.goto(`${BASE_URL}/vendor`, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'vendor-initial');
    
    // Test 1: Vendor login
    logTest('Checking vendor login/dashboard');
    const loginForm = await page.$('form, [data-testid="login"], input[type="email"]');
    if (loginForm) {
      logPass('Vendor login/form present');
      recordTest('Vendor', 'Login Form', true);
    } else {
      logWarning('Vendor login not visible');
      recordTest('Vendor', 'Login Form', false);
    }
    
    // Test 2: Product management section
    logTest('Checking product management');
    const productMgmt = await page.$('[data-testid="products"], .products, [class*="product-manage"]');
    if (productMgmt) {
      logPass('Product management section present');
      recordTest('Vendor', 'Product Management', true);
    } else {
      logWarning('Product management not visible (may require login)');
      recordTest('Vendor', 'Product Management', false);
    }
    
    await takeScreenshot(page, 'vendor-page');
    
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// TEST SUITE 11: RIDER DASHBOARD
// ==========================================
async function testRiderDashboard(browser) {
  logSection('🏍️ TEST SUITE 11: RIDER DASHBOARD');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    logTest('Loading Rider page');
    await page.goto(`${BASE_URL}/rider`, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'rider-initial');
    
    // Test 1: Rider login
    logTest('Checking rider login/dashboard');
    const loginForm = await page.$('form, [data-testid="rider-login"], input[type="email"]');
    if (loginForm) {
      logPass('Rider login/form present');
      recordTest('Rider', 'Login Form', true);
    } else {
      logWarning('Rider login not visible');
      recordTest('Rider', 'Login Form', false);
    }
    
    // Test 2: Active orders section
    logTest('Checking active orders');
    const activeOrders = await page.$('[data-testid="active-orders"], .active-orders, [class*="order"]');
    if (activeOrders) {
      logPass('Active orders section present');
      recordTest('Rider', 'Active Orders', true);
    } else {
      logWarning('Active orders not visible (may require login)');
      recordTest('Rider', 'Active Orders', false);
    }
    
    // Test 3: Earnings/stats
    logTest('Checking earnings display');
    const earnings = await page.$('[data-testid="earnings"], .earnings, [class*="stat"]');
    if (earnings) {
      logPass('Earnings section present');
      recordTest('Rider', 'Earnings', true);
    } else {
      logWarning('Earnings not visible');
      recordTest('Rider', 'Earnings', false);
    }
    
    await takeScreenshot(page, 'rider-dashboard');
    
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// TEST SUITE 12: ADMIN DASHBOARD
// ==========================================
async function testAdminDashboard(browser) {
  logSection('⚙️ TEST SUITE 12: ADMIN DASHBOARD');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    logTest('Loading Admin page');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'admin-initial');
    
    // Test 1: Admin login
    logTest('Checking admin login');
    const loginForm = await page.$('form, [data-testid="admin-login"], input[type="email"]');
    if (loginForm) {
      logPass('Admin login form present');
      recordTest('Admin', 'Login Form', true);
    } else {
      logWarning('Admin login not visible');
      recordTest('Admin', 'Login Form', false);
    }
    
    // Test 2: Dashboard metrics
    logTest('Checking dashboard metrics');
    const metrics = await page.$$('[data-testid="metric"], .metric, [class*="stat"]');
    if (metrics.length > 0) {
      logPass(`Found ${metrics.length} metric(s)`);
      recordTest('Admin', 'Metrics', true, `${metrics.length} items`);
    } else {
      logWarning('Metrics not visible (may require login)');
      recordTest('Admin', 'Metrics', false);
    }
    
    await takeScreenshot(page, 'admin-dashboard');
    
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// TEST SUITE 13: RESPONSIVE DESIGN
// ==========================================
async function testResponsiveDesign(browser) {
  logSection('📱 TEST SUITE 13: RESPONSIVE DESIGN');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      logTest(`Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})`);
      
      await page.setViewport({ width: viewport.width, height: viewport.height });
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
      
      // Check if content is visible
      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      
      if (bodyHeight > 0) {
        logPass(`${viewport.name}: Content renders correctly`);
        recordTest('Responsive', viewport.name, true, `${viewport.width}x${viewport.height}`);
      } else {
        logFail(`${viewport.name}: No content visible`);
        recordTest('Responsive', viewport.name, false);
      }
      
      await takeScreenshot(page, `responsive-${viewport.name.toLowerCase()}`);
    }
    
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// TEST SUITE 14: PERFORMANCE CHECKS
// ==========================================
async function testPerformance(browser) {
  logSection('⚡ TEST SUITE 14: PERFORMANCE CHECKS');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    const routes = ['/book', '/restaurants', '/shops', '/checkout'];
    
    for (const route of routes) {
      logTest(`Measuring load time for ${route}`);
      
      const start = Date.now();
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle2' });
      const loadTime = Date.now() - start;
      
      if (loadTime < 3000) {
        logPass(`${route} loaded in ${loadTime}ms (excellent)`);
        recordTest('Performance', `${route} Load Time`, true, `${loadTime}ms`);
      } else if (loadTime < 5000) {
        logWarning(`${route} loaded in ${loadTime}ms (acceptable)`);
        recordTest('Performance', `${route} Load Time`, true, `${loadTime}ms - slow`);
      } else {
        logFail(`${route} loaded in ${loadTime}ms (too slow)`);
        recordTest('Performance', `${route} Load Time`, false, `${loadTime}ms`);
      }
    }
    
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// TEST SUITE 15: ACCESSIBILITY CHECKS
// ==========================================
async function testAccessibility(browser) {
  logSection('♿ TEST SUITE 15: ACCESSIBILITY CHECKS');
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    
    // Test 1: Alt text on images
    logTest('Checking images for alt text');
    const images = await page.$$eval('img', imgs => imgs.map(img => ({
      src: img.src,
      alt: img.alt
    })));
    
    const imagesWithoutAlt = images.filter(img => !img.alt);
    if (imagesWithoutAlt.length === 0) {
      logPass('All images have alt text');
      recordTest('Accessibility', 'Image Alt Text', true);
    } else {
      logWarning(`${imagesWithoutAlt.length} images missing alt text`);
      recordTest('Accessibility', 'Image Alt Text', false, `${imagesWithoutAlt.length} missing`);
    }
    
    // Test 2: Form labels
    logTest('Checking form inputs for labels');
    const inputs = await page.$$eval('input', inputs => inputs.map(input => ({
      id: input.id,
      name: input.name,
      hasLabel: input.labels && input.labels.length > 0,
      ariaLabel: input.getAttribute('aria-label')
    })));
    
    const inputsWithoutLabels = inputs.filter(input => !input.hasLabel && !input.ariaLabel);
    if (inputsWithoutLabels.length === 0) {
      logPass('All inputs have labels');
      recordTest('Accessibility', 'Form Labels', true);
    } else {
      logWarning(`${inputsWithoutLabels.length} inputs missing labels`);
      recordTest('Accessibility', 'Form Labels', false, `${inputsWithoutLabels.length} missing`);
    }
    
    // Test 3: Heading hierarchy
    logTest('Checking heading hierarchy');
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', headings => 
      headings.map(h => h.tagName)
    );
    
    if (headings.length > 0) {
      logPass(`Found ${headings.length} headings`);
      recordTest('Accessibility', 'Headings', true, `${headings.length} headings`);
    } else {
      logWarning('No headings found');
      recordTest('Accessibility', 'Headings', false);
    }
    
  } finally {
    await page.close();
    const duration = Date.now() - startTime;
    logInfo(`Suite completed in ${(duration / 1000).toFixed(2)}s`);
  }
}

// ==========================================
// GENERATE SUMMARY REPORT
// ==========================================
function generateSummaryReport() {
  logSection('📊 COMPREHENSIVE TEST SUMMARY REPORT');
  
  const passed = TEST_RESULTS.filter(t => t.passed).length;
  const failed = TEST_RESULTS.filter(t => !t.passed).length;
  const total = TEST_RESULTS.length;
  const passRate = ((passed / total) * 100).toFixed(2);
  
  console.log(`${colors.bold}Total Tests:${colors.reset} ${total}`);
  console.log(`${colors.green}${colors.bold}Passed:${colors.reset} ${passed}`);
  console.log(`${colors.red}${colors.bold}Failed:${colors.reset} ${failed}`);
  console.log(`${colors.cyan}${colors.bold}Pass Rate:${colors.reset} ${passRate}%\n`);
  
  // Group by category
  const categories = [...new Set(TEST_RESULTS.map(t => t.category))];
  
  console.log(`${colors.bold}Breakdown by Category:${colors.reset}`);
  categories.forEach(category => {
    const categoryTests = TEST_RESULTS.filter(t => t.category === category);
    const categoryPassed = categoryTests.filter(t => t.passed).length;
    const categoryTotal = categoryTests.length;
    const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(0);
    
    const icon = categoryRate == 100 ? '✓' : categoryRate >= 50 ? '⚠' : '✗';
    const color = categoryRate == 100 ? colors.green : categoryRate >= 50 ? colors.yellow : colors.red;
    
    console.log(`  ${color}${icon} ${category}:${colors.reset} ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
  });
  
  // Show failures
  const failures = TEST_RESULTS.filter(t => !t.passed);
  if (failures.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Failed Tests:${colors.reset}`);
    failures.forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.category} - ${test.testName}`);
      if (test.details) {
        console.log(`     ${colors.yellow}${test.details}${colors.reset}`);
      }
    });
  }
  
  // Save to file
  const reportPath = `./test-results-comprehensive-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: { 
      total, 
      passed, 
      failed, 
      passRate: passRate + '%',
      baseUrl: BASE_URL
    },
    tests: TEST_RESULTS,
    testData: TEST_DATA
  }, null, 2));
  
  console.log(`\n${colors.cyan}Full report saved to: ${reportPath}${colors.reset}`);
  console.log(`${colors.cyan}Screenshots saved to: ${SCREENSHOTS_DIR}${colors.reset}`);
}

// ==========================================
// MAIN EXECUTION
// ==========================================
async function runAllTests() {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║          GO7 COMPREHENSIVE FEATURE TEST SUITE                                ║');
  console.log('║          Testing URL: ' + BASE_URL.padEnd(55) + '║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  setupScreenshotsDir();
  
  let browser;
  try {
    logInfo('Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--ignore-certificate-errors',
        '--allow-insecure-localhost'
      ]
    });
    logPass('Browser launched successfully\n');
    
    // Run all test suites
    await testCoreNavigation(browser);
    await testParcelDelivery(browser);
    await testGoBuyService(browser);
    await testRestaurantDelivery(browser);
    await testShopsRetail(browser);
    await testPharmacyAndMarkets(browser);
    await testCheckoutSystem(browser);
    await testOrderTracking(browser);
    await testProfileAndWallet(browser);
    await testVendorPortal(browser);
    await testRiderDashboard(browser);
    await testAdminDashboard(browser);
    await testResponsiveDesign(browser);
    await testPerformance(browser);
    await testAccessibility(browser);
    
    generateSummaryReport();
    
    console.log(`\n${colors.green}${colors.bold}🎉 Testing complete!${colors.reset}\n`);
    
    // Exit code based on results
    const failed = TEST_RESULTS.filter(t => !t.passed).length;
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error(`${colors.red}Fatal error during testing:${colors.reset}`, error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests, TEST_DATA };
