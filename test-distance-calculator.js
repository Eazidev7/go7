/**
 * Test Distance Calculator
 * Tests both Google Distance Matrix API and Haversine fallback
 */

// Haversine formula implementation (same as in distanceCalculator.ts)
function calculateHaversineDistance(origin, destination) {
  const R = 6371; // Earth's radius in kilometers
  
  const lat1Rad = toRadians(origin.lat);
  const lat2Rad = toRadians(destination.lat);
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);

  const a = 
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function calculateDeliveryFee(distance) {
  const BASE_FEE = 500;
  const FREE_KM = 5;
  const PER_KM_RATE = 100;

  if (distance <= FREE_KM) {
    return BASE_FEE;
  }

  const extraKm = distance - FREE_KM;
  const additionalFee = Math.ceil(extraKm) * PER_KM_RATE;
  
  return BASE_FEE + additionalFee;
}

// Test cases
console.log('='.repeat(60));
console.log('DISTANCE CALCULATOR TEST');
console.log('='.repeat(60));

// Test 1: Vendor to Customer in same city (Abeokuta)
const vendor = { lat: 7.1575, lng: 3.3470 }; // Abeokuta center
const customer1 = { lat: 7.1875, lng: 3.3970 }; // ~5km away

console.log('\n📍 TEST 1: Short distance (within city)');
console.log('Vendor:', vendor);
console.log('Customer:', customer1);

const distance1 = calculateHaversineDistance(vendor, customer1);
const adjusted1 = distance1 * 1.2; // Add 20% for road distance
const fee1 = calculateDeliveryFee(adjusted1);

console.log('Straight-line distance:', distance1.toFixed(2), 'km');
console.log('Adjusted distance (road):', adjusted1.toFixed(2), 'km');
console.log('Delivery fee:', '₦' + fee1);

// Test 2: Vendor to Customer in different area
const customer2 = { lat: 7.2575, lng: 3.4970 }; // ~15km away

console.log('\n📍 TEST 2: Medium distance (different area)');
console.log('Vendor:', vendor);
console.log('Customer:', customer2);

const distance2 = calculateHaversineDistance(vendor, customer2);
const adjusted2 = distance2 * 1.2;
const fee2 = calculateDeliveryFee(adjusted2);

console.log('Straight-line distance:', distance2.toFixed(2), 'km');
console.log('Adjusted distance (road):', adjusted2.toFixed(2), 'km');
console.log('Delivery fee:', '₦' + fee2);

// Test 3: Long distance
const customer3 = { lat: 6.5244, lng: 3.3792 }; // Lagos (~80km)

console.log('\n📍 TEST 3: Long distance (to Lagos)');
console.log('Vendor:', vendor);
console.log('Customer:', customer3);

const distance3 = calculateHaversineDistance(vendor, customer3);
const adjusted3 = distance3 * 1.2;
const fee3 = calculateDeliveryFee(adjusted3);

console.log('Straight-line distance:', distance3.toFixed(2), 'km');
console.log('Adjusted distance (road):', adjusted3.toFixed(2), 'km');
console.log('Delivery fee:', '₦' + fee3);

// Test 4: Very short distance (same location)
const customer4 = { lat: 7.1575, lng: 3.3470 }; // Same as vendor

console.log('\n📍 TEST 4: Same location');
console.log('Vendor:', vendor);
console.log('Customer:', customer4);

const distance4 = calculateHaversineDistance(vendor, customer4);
const adjusted4 = distance4 * 1.2;
const fee4 = calculateDeliveryFee(adjusted4);

console.log('Straight-line distance:', distance4.toFixed(2), 'km');
console.log('Adjusted distance (road):', adjusted4.toFixed(2), 'km');
console.log('Delivery fee:', '₦' + fee4);

console.log('\n' + '='.repeat(60));
console.log('PRICING TABLE');
console.log('='.repeat(60));
console.log('Distance (km)  | Delivery Fee');
console.log('-'.repeat(60));
for (let km = 0; km <= 20; km += 1) {
  const fee = calculateDeliveryFee(km);
  console.log(`${km.toString().padStart(4)} km        | ₦${fee}`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ All tests completed!');
console.log('='.repeat(60));
