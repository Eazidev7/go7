// ==========================================================
// HYBRID ADDRESS SYSTEM - TEST SCRIPT
// Run this in browser console to verify everything works
// ==========================================================

console.log('🧪 TESTING HYBRID ADDRESS SYSTEM...\n');

// Test 1: Check if hybrid function is imported
console.log('1️⃣ Checking imports...');
try {
    const testModule = typeof fetchAddressSuggestions;
    console.log(`✅ fetchAddressSuggestions: ${testModule !== 'undefined' ? 'Found' : 'Not found'}`);
} catch (e) {
    console.log('❌ Import check failed:', e.message);
}

// Test 2: Verify GPS settings
console.log('\n2️⃣ Testing GPS accuracy settings...');
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            console.log('✅ GPS Working');
            console.log(`📍 Your current location:`, {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy + 'm'
            });
            console.log(`⏰ Timestamp:`, new Date(position.timestamp).toLocaleString());
        },
        (error) => {
            console.log('❌ GPS Error:', error.message);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0 // MUST BE 0 for fresh location!
        }
    );
} else {
    console.log('❌ GPS not supported in this browser');
}

// Test 3: Test Google Places API
console.log('\n3️⃣ Testing Google Places API...');
fetch('https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Ibara&location=7.1475,3.3619&radius=15000&components=country:ng&key=AIzaSyAl_g5kJ7gts6QtRYGArqEpne277dJ0Bq4')
    .then(res => res.json())
    .then(data => {
        if (data.predictions && data.predictions.length > 0) {
            console.log(`✅ Google Places API working - ${data.predictions.length} results for "Ibara"`);
            console.log('Sample:', data.predictions[0].description);
        } else {
            console.log('⚠️ Google Places API returned no results');
            console.log('Response:', data);
        }
    })
    .catch(err => {
        console.log('❌ Google Places API failed:', err.message);
    });

// Test 4: Test OpenStreetMap Nominatim API
console.log('\n4️⃣ Testing OpenStreetMap Nominatim API...');
fetch('https://nominatim.openstreetmap.org/search?q=Ibara,Abeokuta,Ogun State,Nigeria&format=json&addressdetails=1&limit=5&countrycodes=ng', {
    headers: {
        'User-Agent': 'Go7DeliveryApp/1.0'
    }
})
    .then(res => res.json())
    .then(data => {
        if (data && data.length > 0) {
            console.log(`✅ OSM Nominatim API working - ${data.length} results for "Ibara"`);
            console.log('Sample:', data[0].display_name);
        } else {
            console.log('⚠️ OSM Nominatim API returned no results');
        }
    })
    .catch(err => {
        console.log('❌ OSM Nominatim API failed:', err.message);
    });

// Test 5: Check local landmarks
console.log('\n5️⃣ Testing local landmarks search...');
setTimeout(() => {
    try {
        // Assuming searchLandmarks is available globally
        if (typeof searchLandmarks === 'function') {
            const results = searchLandmarks('Ibara');
            console.log(`✅ Landmark search working - ${results.length} results for "Ibara"`);
            if (results.length > 0) {
                console.log('Sample:', results[0].name);
            }
        } else {
            console.log('⚠️ searchLandmarks function not found (may not be exposed globally)');
        }
    } catch (e) {
        console.log('❌ Landmark search error:', e.message);
    }
}, 1000);

// Test 6: Verify Abeokuta bias
console.log('\n6️⃣ Verifying Abeokuta geographic bias...');
const abeokutaCenter = { lat: 7.1475, lng: 3.3619 };
console.log('Expected center:', abeokutaCenter);
console.log('Search radius: 15km (15000m)');

// Test 7: Check CORS for APIs
console.log('\n7️⃣ Testing CORS policies...');
Promise.all([
    fetch('https://maps.googleapis.com/maps/api/js')
        .then(() => console.log('✅ Google Maps: CORS OK'))
        .catch(() => console.log('⚠️ Google Maps: CORS issue (expected, doesn\'t affect API)')),

    fetch('https://nominatim.openstreetmap.org/search?q=test&format=json')
        .then(() => console.log('✅ OSM Nominatim: CORS OK'))
        .catch(() => console.log('❌ OSM Nominatim: CORS blocked'))
]);

// Final summary
setTimeout(() => {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('Check the results above. All should show ✅');
    console.log('\nIf you see ❌ errors:');
    console.log('- Google API: Check API key validity');
    console.log('- OSM API: Check internet connection');
    console.log('- GPS: Grant location permissions');
    console.log('\nNext step: Test in the actual BookDelivery page!');
    console.log('Go to: http://localhost:3000/book-delivery');
    console.log('='.repeat(60));
}, 3000);

// ==========================================================
// MANUAL TESTING CHECKLIST
// ==========================================================
/*

✅ STEP-BY-STEP TEST GUIDE:

1. OPEN BOOKING PAGE
   □ Navigate to: http://localhost:3000/book-delivery
   □ Page loads without errors

2. TEST GPS LOCATION
   □ Click "📍 Use GPS" button
   □ Allow location permission
   □ Address shows Abeokuta (NOT Oshodi!)
   □ Map centers on your actual location
   □ Console shows: "✅ Location detected: [address]"

3. TEST ADDRESS SEARCH (PICKUP)
   □ Type "Ibara" in pickup field
   □ Wait for suggestions to appear
   □ See 3 types of icons:
      - 📍 Landmarks (red background)
      - 🔵 Google Places
      - 🟢 OpenStreetMap
   □ Select any suggestion
   □ Map centers correctly
   □ Marker appears on map

4. TEST ADDRESS SEARCH (DROPOFF)
   □ Type "FUNAAB" in dropoff field
   □ See mixed suggestions (landmarks + Google + OSM)
   □ Select any suggestion
   □ Both markers visible on map
   □ Route calculation starts

5. TEST FALLBACK BEHAVIOR
   □ Open DevTools → Network tab
   □ Block "maps.googleapis.com"
   □ Type address again
   □ Should still see 🟢 OSM suggestions
   □ System works without Google!

6. TEST CACHING
   □ Type "Ibara" → see suggestions
   □ Clear input, type "Ibara" again
   □ Suggestions appear faster (cached)
   □ Console shows: "✅ Using cached suggestions"

7. VERIFY BOOKING
   □ Fill both pickup and dropoff
   □ Check distance calculation
   □ Click "Book Delivery"
   □ Booking ID generated: Go7-XXXXXXX
   □ Success alert appears
   □ No errors in console

8. CHECK CONSOLE LOGS
   Expected logs:
   □ "🔍 Searching for X using HYBRID system..."
   □ "📍 Found N local landmarks"
   □ "🌐 Fetching HYBRID suggestions..."
   □ "✅ HYBRID system returned N suggestions"
   □ "🗺️ Google Places returned: N results"
   □ "🧭 OSM Nominatim returned: N results"

9. VERIFY NO ERRORS
   □ No red errors in console
   □ No CORS errors
   □ No "undefined" errors
   □ No API key warnings

10. TEST EDGE CASES
    □ Type 1 character → no suggestions (minimum 3)
    □ Type gibberish → some suggestions or empty
    □ Select landmark → coordinates correct
    □ Select Google → geocoding works
    □ Select OSM → coordinates correct

PASS CRITERIA:
✅ All 10 steps complete without errors
✅ GPS shows Abeokuta location (not Oshodi)
✅ Address search returns relevant Abeokuta results
✅ Icons show: 📍 🔵 🟢
✅ System works even with Google API disabled
✅ Booking completes successfully

*/
