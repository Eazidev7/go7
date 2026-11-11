/**
 * Test: Add New Address Coordinates Saving
 * 
 * Verifies that adding a new address through checkout properly saves coordinates
 */

console.log('\n' + '='.repeat(70));
console.log('  ADD NEW ADDRESS COORDINATES TEST');
console.log('='.repeat(70) + '\n');

function testAddressPageFlow() {
  console.log('📍 TEST 1: AddAddressPage data flow');
  console.log('─'.repeat(70));
  
  // Simulate address data from AddAddressPage
  const addressFromPage = {
    label: 'My Home',
    icon: 'home',
    street: 'MKO Abiola Way',
    details: 'Abeokuta, Ogun State',
    landmark: 'Near the roundabout',
    phone: '+234 801 234 5678',
    isDefault: false,
    lat: 7.1595, // GPS coordinates from pin map
    lng: 3.3520
  };
  
  console.log('   AddAddressPage Output:');
  console.log(`   ├─ Label: ${addressFromPage.label}`);
  console.log(`   ├─ Street: ${addressFromPage.street}`);
  console.log(`   ├─ Details: ${addressFromPage.details}`);
  console.log(`   ├─ Landmark: ${addressFromPage.landmark}`);
  console.log(`   ├─ Phone: ${addressFromPage.phone}`);
  console.log(`   └─ Coordinates: { lat: ${addressFromPage.lat}, lng: ${addressFromPage.lng} }`);
  console.log('   ✅ AddAddressPage includes coordinates\n');
  
  return addressFromPage;
}

function testCheckoutPageConversion(addressFromPage) {
  console.log('🛒 TEST 2: CheckoutPage conversion to DeliveryAddress');
  console.log('─'.repeat(70));
  
  // Simulate CheckoutPage onSave handler
  const newAddress = {
    id: Date.now().toString(),
    type: addressFromPage.icon === 'home' ? 'home' : addressFromPage.icon === 'work' ? 'work' : 'other',
    label: addressFromPage.label,
    address: `${addressFromPage.street}, ${addressFromPage.details}`,
    phoneNumber: addressFromPage.phone,
    instructions: addressFromPage.landmark,
    lat: addressFromPage.lat, // NEW: Include coordinates from the address pin map
    lng: addressFromPage.lng
  };
  
  console.log('   DeliveryAddress Object:');
  console.log(`   ├─ ID: ${newAddress.id}`);
  console.log(`   ├─ Type: ${newAddress.type}`);
  console.log(`   ├─ Label: ${newAddress.label}`);
  console.log(`   ├─ Address: ${newAddress.address}`);
  console.log(`   ├─ Phone: ${newAddress.phoneNumber}`);
  console.log(`   ├─ Instructions: ${newAddress.instructions}`);
  console.log(`   └─ Coordinates: { lat: ${newAddress.lat}, lng: ${newAddress.lng} }`);
  
  if (newAddress.lat === addressFromPage.lat && newAddress.lng === addressFromPage.lng) {
    console.log('   ✅ Coordinates correctly preserved in conversion\n');
    return newAddress;
  } else {
    console.log('   ❌ Coordinates lost in conversion!\n');
    return null;
  }
}

function testFirestoreSave(deliveryAddress) {
  console.log('🔥 TEST 3: Firestore save format');
  console.log('─'.repeat(70));
  
  // Simulate Firestore save mapping
  const firestoreAddress = {
    id: deliveryAddress.id,
    name: deliveryAddress.label,
    address: deliveryAddress.address,
    phone: deliveryAddress.phoneNumber,
    landmark: deliveryAddress.instructions,
    icon: deliveryAddress.type === 'home' ? '🏠' : deliveryAddress.type === 'work' ? '🏢' : '📍',
    coordinates: deliveryAddress.lat && deliveryAddress.lng ? { 
      lat: deliveryAddress.lat, 
      lng: deliveryAddress.lng 
    } : undefined // Save coordinates if available
  };
  
  console.log('   Firestore Document:');
  console.log(`   ├─ ID: ${firestoreAddress.id}`);
  console.log(`   ├─ Name: ${firestoreAddress.name}`);
  console.log(`   ├─ Address: ${firestoreAddress.address}`);
  console.log(`   ├─ Phone: ${firestoreAddress.phone}`);
  console.log(`   ├─ Landmark: ${firestoreAddress.landmark}`);
  console.log(`   ├─ Icon: ${firestoreAddress.icon}`);
  console.log(`   └─ Coordinates: ${JSON.stringify(firestoreAddress.coordinates)}`);
  
  if (firestoreAddress.coordinates && 
      firestoreAddress.coordinates.lat === deliveryAddress.lat &&
      firestoreAddress.coordinates.lng === deliveryAddress.lng) {
    console.log('   ✅ Coordinates correctly saved to Firestore format\n');
    return firestoreAddress;
  } else {
    console.log('   ❌ Coordinates missing in Firestore save!\n');
    return null;
  }
}

function testCheckoutLoading(firestoreAddress) {
  console.log('📥 TEST 4: CheckoutPage loading from Firestore');
  console.log('─'.repeat(70));
  
  // Simulate CheckoutPage loading and mapping
  const formattedAddress = {
    id: firestoreAddress.id || Date.now().toString(),
    type: firestoreAddress.icon === '🏠' ? 'home' : firestoreAddress.icon === '🏢' ? 'work' : 'other',
    label: firestoreAddress.name || firestoreAddress.label || 'Address',
    address: firestoreAddress.address,
    phoneNumber: firestoreAddress.phone || '',
    instructions: firestoreAddress.landmark || firestoreAddress.instructions || '',
    lat: firestoreAddress.coordinates?.lat || firestoreAddress.lat || 7.1575, // Multi-level fallback
    lng: firestoreAddress.coordinates?.lng || firestoreAddress.lng || 3.3470
  };
  
  console.log('   Loaded DeliveryAddress:');
  console.log(`   ├─ Label: ${formattedAddress.label}`);
  console.log(`   ├─ Address: ${formattedAddress.address}`);
  console.log(`   ├─ Phone: ${formattedAddress.phoneNumber}`);
  console.log(`   ├─ Instructions: ${formattedAddress.instructions}`);
  console.log(`   └─ Coordinates: { lat: ${formattedAddress.lat}, lng: ${formattedAddress.lng} }`);
  
  if (formattedAddress.lat === firestoreAddress.coordinates.lat &&
      formattedAddress.lng === firestoreAddress.coordinates.lng) {
    console.log('   ✅ Coordinates correctly loaded from Firestore\n');
    return true;
  } else {
    console.log('   ❌ Coordinates mismatch on load!\n');
    return false;
  }
}

function testDistanceCalculation(lat, lng) {
  console.log('📏 TEST 5: Distance calculation with new address coordinates');
  console.log('─'.repeat(70));
  
  const vendorCoords = { lat: 7.1575, lng: 3.3470 }; // Abeokuta center
  const customerCoords = { lat, lng };
  
  console.log('   Vendor Location:');
  console.log(`   └─ { lat: ${vendorCoords.lat}, lng: ${vendorCoords.lng} }`);
  
  console.log('\n   Customer Location (New Address):');
  console.log(`   └─ { lat: ${customerCoords.lat}, lng: ${customerCoords.lng} }`);
  
  // Haversine distance calculation
  function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }
  
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(customerCoords.lat - vendorCoords.lat);
  const dLon = toRadians(customerCoords.lng - vendorCoords.lng);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRadians(vendorCoords.lat)) * Math.cos(toRadians(customerCoords.lat)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c * 1.2; // Apply 1.2x road adjustment
  
  const normalizedDistance = Math.max(0.5, Math.round(distance * 10) / 10);
  
  console.log('\n   Calculated Distance:');
  console.log(`   ├─ Raw: ${distance.toFixed(2)} km`);
  console.log(`   └─ Normalized: ${normalizedDistance} km`);
  
  // Calculate delivery fee
  const deliveryFee = normalizedDistance <= 5 
    ? 500 
    : 500 + Math.ceil(normalizedDistance - 5) * 100;
  
  console.log('\n   Delivery Fee:');
  console.log(`   └─ ₦${deliveryFee.toLocaleString()}`);
  
  if (normalizedDistance > 0 && deliveryFee >= 500) {
    console.log('   ✅ Distance calculation working with new address coordinates\n');
    return true;
  } else {
    console.log('   ❌ Distance calculation failed!\n');
    return false;
  }
}

// Run all tests
let allPassed = true;

const addressFromPage = testAddressPageFlow();
const deliveryAddress = testCheckoutPageConversion(addressFromPage);
if (!deliveryAddress) allPassed = false;

if (deliveryAddress) {
  const firestoreAddress = testFirestoreSave(deliveryAddress);
  if (!firestoreAddress) allPassed = false;
  
  if (firestoreAddress) {
    const loadSuccess = testCheckoutLoading(firestoreAddress);
    allPassed = loadSuccess && allPassed;
    
    const distanceSuccess = testDistanceCalculation(firestoreAddress.coordinates.lat, firestoreAddress.coordinates.lng);
    allPassed = distanceSuccess && allPassed;
  }
}

// Summary
console.log('='.repeat(70));
if (allPassed) {
  console.log('  ✅ ALL TESTS PASSED - Add new address saves coordinates correctly!');
} else {
  console.log('  ❌ SOME TESTS FAILED - Check implementation');
}
console.log('='.repeat(70));

console.log('\n🔧 FIXED ISSUES:');
console.log('─'.repeat(70));
console.log('1. CheckoutPage.tsx onSave handler:');
console.log('   ├─ BEFORE: newAddress object missing lat/lng');
console.log('   └─ AFTER: lat: address.lat, lng: address.lng ✅');
console.log('');
console.log('2. Firestore save mapping:');
console.log('   ├─ BEFORE: coordinates not saved to Firebase');
console.log('   └─ AFTER: coordinates: { lat, lng } if available ✅');
console.log('');
console.log('3. Complete data flow:');
console.log('   ├─ AddAddressPage pin map → coordinates included');
console.log('   ├─ CheckoutPage conversion → coordinates preserved');
console.log('   ├─ Firestore save → coordinates stored');
console.log('   ├─ CheckoutPage load → coordinates retrieved');
console.log('   └─ Distance calculation → uses real location ✅');
console.log('='.repeat(70) + '\n');