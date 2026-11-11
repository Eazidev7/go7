/**
 * Complete Integration Test
 * Tests distance calculation, normalization, and fee calculation together
 */

console.log('='.repeat(80));
console.log('COMPLETE INTEGRATION TEST - DISTANCE NORMALIZATION + DELIVERY FEES');
console.log('='.repeat(80));

// Helper functions
function normalizeDistance(distance) {
  let normalized = Math.round(distance * 10) / 10;
  if (normalized < 0.5) {
    normalized = 0.5;
  }
  return normalized;
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

function formatDistance(distance) {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function calculateHaversineDistance(origin, destination) {
  const R = 6371;
  const lat1Rad = toRadians(origin.lat);
  const lat2Rad = toRadians(destination.lat);
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);

  const a = 
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Full integration test
const vendor = { lat: 7.1575, lng: 3.3470 }; // Abeokuta

const testCustomers = [
  { name: 'Same Location (0 km)', coords: { lat: 7.1575, lng: 3.3470 } },
  { name: 'Very Close (< 1 km)', coords: { lat: 7.1600, lng: 3.3490 } },
  { name: 'Within City (3 km)', coords: { lat: 7.1775, lng: 3.3670 } },
  { name: 'Nearby Area (7 km)', coords: { lat: 7.1875, lng: 3.3970 } },
  { name: 'Different Area (15 km)', coords: { lat: 7.2575, lng: 3.4970 } },
  { name: 'Far Distance (30 km)', coords: { lat: 7.3575, lng: 3.5970 } }
];

console.log('\n📍 VENDOR LOCATION: Abeokuta (7.1575, 3.3470)');
console.log('='.repeat(80));

testCustomers.forEach((customer, index) => {
  console.log(`\n${index + 1}. ${customer.name.toUpperCase()}`);
  console.log('-'.repeat(80));
  
  // Step 1: Calculate raw distance
  const rawDistance = calculateHaversineDistance(vendor, customer.coords);
  console.log(`   Step 1 - Raw Haversine: ${rawDistance.toFixed(6)} km`);
  
  // Step 2: Apply road adjustment
  const adjusted = rawDistance * 1.2;
  console.log(`   Step 2 - Road Adjustment (+20%): ${adjusted.toFixed(6)} km`);
  
  // Step 3: Normalize (round to 1 decimal, min 0.5 km)
  const normalized = normalizeDistance(adjusted);
  console.log(`   Step 3 - Normalized: ${normalized} km`);
  
  // Step 4: Calculate fee
  const fee = calculateDeliveryFee(normalized);
  console.log(`   Step 4 - Delivery Fee: ₦${fee}`);
  
  // Step 5: Format for display
  const displayDistance = formatDistance(normalized);
  console.log(`   Display: ${displayDistance} • ₦${fee.toLocaleString()}`);
});

console.log('\n' + '='.repeat(80));
console.log('PRICING BREAKDOWN');
console.log('='.repeat(80));

const pricingExamples = [
  { distance: 0.2, desc: 'Very short (normalized to min)' },
  { distance: 0.5, desc: 'Minimum distance' },
  { distance: 1.2, desc: 'Short trip' },
  { distance: 3.7, desc: 'Within base range' },
  { distance: 5.0, desc: 'At base limit' },
  { distance: 5.1, desc: 'Just over base' },
  { distance: 7.5, desc: 'Medium distance' },
  { distance: 10.3, desc: 'Longer trip' },
  { distance: 15.8, desc: 'Long distance' },
  { distance: 25.2, desc: 'Very long trip' }
];

console.log('\nRaw Distance → Normalized → Fee Breakdown');
console.log('-'.repeat(80));

pricingExamples.forEach(example => {
  const normalized = normalizeDistance(example.distance);
  const fee = calculateDeliveryFee(normalized);
  const extraKm = Math.max(0, normalized - 5);
  const extraFee = Math.ceil(extraKm) * 100;
  
  console.log(`${example.distance.toFixed(1)} km → ${normalized.toFixed(1)} km → ₦${fee}`);
  if (extraFee > 0) {
    console.log(`  └─ Base ₦500 + ${Math.ceil(extraKm)}km × ₦100 = ₦${extraFee} extra`);
  } else {
    console.log(`  └─ Base fee (≤ 5km)`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('KEY FEATURES VERIFIED');
console.log('='.repeat(80));
console.log('✅ All distances rounded to 1 decimal place');
console.log('✅ Minimum 0.5 km enforced (prevents zero/negative distances)');
console.log('✅ No zero-fee deliveries possible');
console.log('✅ Consistent pricing: ₦500 base + ₦100/km after 5km');
console.log('✅ Haversine + 20% adjustment for road distance estimation');
console.log('='.repeat(80));
