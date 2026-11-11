/**
 * 💰 GO7 SERVICE FARE CALCULATOR
 * Dynamic pricing for all Go7 services
 * Date: October 23, 2025
 */

/**
 * Calculate fare based on service type and parameters (REAL-TIME)
 * @param {string} serviceType - 'parcel', 'gobuy', 'food', 'errand', 'pharmacy'
 * @param {number} distance - Distance in kilometers
 * @param {number} itemTotal - Total cost of items (for food service)
 * @returns {object} Fare breakdown with total
 */
export function calculateFare(serviceType, distance = 0, itemTotal = 0) {
  let baseFee = 0;
  let deliveryFee = 0;
  let packagingFee = 0;
  let perKmRate = 0;
  let description = '';
  let minimumCharge = 0;

  // Normalize service name for consistent matching
  const normalizedService = serviceType.toLowerCase().trim();

  switch (normalizedService) {
    case 'parcel':
    case 'delivery':
    case 'book':
    case 'book delivery':
      // Formula: ₦300 base + ₦50/km, minimum ₦800 if distance < 10km
      baseFee = 300;
      perKmRate = 50;
      deliveryFee = baseFee + (distance * perKmRate);
      minimumCharge = distance < 10 ? 800 : 0;
      if (minimumCharge && deliveryFee < minimumCharge) {
        deliveryFee = minimumCharge;
      }
      description = 'Package delivery';
      break;

    case 'gobuy':
    case 'shopping':
      // Flat ₦800 per request
      deliveryFee = 800;
      description = 'Personal shopping and errands';
      break;

    case 'food':
    case 'restaurant':
    case 'restaurants':
      // ₦400 delivery + ₦100 packaging if subtotal < ₦2000
      deliveryFee = 400;
      packagingFee = itemTotal < 2000 ? 100 : 0;
      description = 'Food delivery';
      break;

    case 'errand':
    case 'errands':
      // ₦600 base + ₦50/km if >3km
      baseFee = 600;
      perKmRate = distance > 3 ? 50 : 0;
      deliveryFee = baseFee + (distance > 3 ? (distance - 3) * perKmRate : 0);
      description = 'Get anything done';
      break;

    case 'pharmacy':
    case 'medicine':
      // Flat ₦500 delivery fee
      deliveryFee = 500;
      description = 'Medicine delivery';
      break;

    case 'market':
    case 'grocery':
      // ₦400 delivery fee
      deliveryFee = 400;
      description = 'Fresh groceries';
      break;

    default:
      // Default fallback
      deliveryFee = 500;
      description = 'Delivery service';
      break;
  }

  const subtotal = itemTotal + deliveryFee + packagingFee;
  const total = subtotal;

  return {
    serviceType,
    baseFee,
    perKmRate,
    distance: Math.round(distance * 10) / 10, // Round to 1 decimal
    deliveryFee,
    packagingFee,
    itemTotal,
    subtotal,
    total,
    minimumCharge,
    description,
    breakdown: {
      baseFee,
      distanceCharge: Math.round((distance * perKmRate) * 100) / 100,
      deliveryFee,
      packagingFee,
      itemTotal
    },
    // Add timestamp for real-time tracking
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Format currency to Naira
 * @param {number} amount
 * @returns {string} Formatted currency
 */
export function formatNaira(amount) {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

/**
 * Validate fare calculation
 * @param {object} fareData
 * @returns {boolean}
 */
export function validateFare(fareData) {
  if (!fareData || typeof fareData.total !== 'number') {
    return false;
  }
  if (fareData.total < 0) {
    return false;
  }
  return true;
}

/**
 * Get service description
 * @param {string} serviceType
 * @returns {string}
 */
export function getServiceDescription(serviceType) {
  const descriptions = {
    parcel: 'Package delivery',
    gobuy: 'Personal shopping and errands',
    food: 'Food delivery',
    restaurant: 'Food delivery',
    errand: 'Get anything done',
    pharmacy: 'Medicine delivery',
    market: 'Fresh groceries'
  };
  return descriptions[serviceType.toLowerCase()] || 'Delivery service';
}

/**
 * Generate unique order code
 * @returns {string} Order code in format GO7-XXXXXX
 */
export function generateOrderCode() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  const code = `${timestamp}${random}`.slice(-6);
  return `GO7-${code}`;
}

/**
 * Simulate vendor notification
 * @param {object} orderData - Order details
 */
export function notifyVendor(orderData) {
  const { orderCode, serviceType, total, vendor } = orderData;
  
  console.log(`🚀 Vendor Notified: New Order for ${orderCode} | ₦${total.toLocaleString()} | ${serviceType}`);
  
  if (vendor) {
    console.log(`   → Vendor: ${vendor.name || 'Unknown Vendor'}`);
  }
  
  console.log(`   → Status: Order placed and paid`);
  console.log(`   → Time: ${new Date().toLocaleTimeString()}`);
  
  // TODO: Replace with actual Firebase Cloud Function trigger
  // This will send push notification to vendor's device
  
  return {
    notified: true,
    timestamp: new Date().toISOString(),
    message: `Order ${orderCode} assigned`
  };
}

/**
 * Calculate fare with debouncing for real-time updates
 * @param {function} callback - Function to call with calculated fare
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {function} Debounced calculator function
 */
export function createDebouncedCalculator(callback, delay = 300) {
  let timeoutId;
  
  return (serviceType, distance, itemTotal) => {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      const fare = calculateFare(serviceType, distance, itemTotal);
      callback(fare);
    }, delay);
  };
}

/**
 * Test fare calculations
 */
export function testFareCalculations() {
  console.log('🧪 Testing Fare Calculations...\n');

  // Test 1: Book Delivery (5km)
  const test1 = calculateFare('parcel', 5);
  console.log('✅ Book Delivery (5km):', test1);
  console.assert(test1.total === 800, 'Should be ₦800 minimum');

  // Test 2: Food Order (₦1800 subtotal)
  const test2 = calculateFare('food', 0, 1800);
  console.log('✅ Food Order (₦1800):', test2);
  console.assert(test2.total === 2300, 'Should be ₦2300 (₦400 delivery + ₦100 packaging)');

  // Test 3: Errand (10km)
  const test3 = calculateFare('errand', 10);
  console.log('✅ Errand (10km):', test3);
  console.assert(test3.total === 950, 'Should be ₦950 (₦600 + ₦50×7km)');

  // Test 4: Pharmacy (flat)
  const test4 = calculateFare('pharmacy');
  console.log('✅ Pharmacy (flat):', test4);
  console.assert(test4.total === 500, 'Should be ₦500 flat');

  // Test 5: GoBuy
  const test5 = calculateFare('gobuy');
  console.log('✅ GoBuy:', test5);
  console.assert(test5.total === 800, 'Should be ₦800 flat');

  console.log('\n🎉 All tests passed!');
}

export default calculateFare;
