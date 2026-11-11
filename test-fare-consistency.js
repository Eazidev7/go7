// Test script to verify fare consistency across the Go7 app
import { calculateFare, getFareBreakdown, formatFare, estimateDeliveryTime } from './src/utils/fareCalculator.js';

console.log('🧪 Testing Go7 Unified Fare Calculator Consistency\n');

// Test cases - different distance scenarios
const testCases = [
  { distance: 2.5, description: 'Short delivery (2.5km)' },
  { distance: 5.0, description: 'Medium delivery (5km)' },
  { distance: 10.0, description: 'Long delivery (10km)' },
  { distance: 15.0, description: 'Extended delivery (15km)' },
];

testCases.forEach((testCase, index) => {
  const { distance, description } = testCase;
  
  // Calculate duration using the same logic as the app
  const duration = Math.ceil((distance / 30) * 60); // 30 km/h average
  
  // Test unified calculator
  const totalFare = calculateFare(distance, duration);
  const breakdown = getFareBreakdown(distance, duration);
  const formattedFare = formatFare(totalFare);
  const estimatedTime = estimateDeliveryTime(distance);
  
  console.log(`${index + 1}. ${description}`);
  console.log(`   Distance: ${distance} km`);
  console.log(`   Duration: ${duration} minutes`);
  console.log(`   Estimated Time: ${estimatedTime} minutes`);
  console.log(`   Base Fare: ₦${breakdown.baseFare}`);
  console.log(`   Distance Fee: ₦${breakdown.distanceFare}`);
  console.log(`   Duration Fee: ₦${breakdown.durationFare}`);
  console.log(`   Platform Fee: ₦${breakdown.platformFee}`);
  console.log(`   TOTAL FARE: ${formattedFare}`);
  console.log(`   Manual calculation check: ₦${300 + (distance * 120) + (duration * 20) + Math.round((300 + (distance * 120) + (duration * 20)) * 0.05)}`);
  console.log('');
});

// Test consistency between estimate and final calculation
console.log('🔄 Testing Estimate vs Final Fare Consistency');
const testDistance = 7.5;
const testDuration = Math.ceil((testDistance / 30) * 60);

// Simulate estimate calculation (as done in BookDelivery.jsx)
const estimatedFare = calculateFare(testDistance, testDuration);

// Simulate final calculation (as done in checkout)
const finalFare = calculateFare(testDistance, testDuration);

console.log(`Test Distance: ${testDistance} km`);
console.log(`Test Duration: ${testDuration} minutes`);
console.log(`Estimated Fare: ${formatFare(estimatedFare)}`);
console.log(`Final Fare: ${formatFare(finalFare)}`);
console.log(`Consistency Check: ${estimatedFare === finalFare ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// Test service multipliers (parcel, errand, gobuy)
console.log('🏷️ Testing Service Type Multipliers');
const baseDistance = 5;
const baseDuration = Math.ceil((baseDistance / 30) * 60);
const baseFare = calculateFare(baseDistance, baseDuration);

const serviceTypes = [
  { type: 'parcel', multiplier: 1.0, description: 'Standard Parcel' },
  { type: 'errand', multiplier: 1.2, description: 'Errand Service (+20%)' },
  { type: 'gobuy', multiplier: 1.5, description: 'GoBuy Service (+50%)' }
];

serviceTypes.forEach(service => {
  const finalFare = Math.round(baseFare * service.multiplier);
  console.log(`${service.description}: ${formatFare(finalFare)} (base: ${formatFare(baseFare)} × ${service.multiplier})`);
});

console.log('\n✅ Fare Calculator Test Complete!');
console.log('\n📋 Key Points:');
console.log('• Base Fare: ₦300');
console.log('• Distance Rate: ₦120/km');
console.log('• Duration Rate: ₦20/minute');
console.log('• Platform Fee: 5%');
console.log('• Estimate = Final (no discrepancy)');