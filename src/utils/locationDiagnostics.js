// ==========================================================
// LOCATION ACCURACY DIAGNOSTICS - Go7 Delivery
// ==========================================================

/**
 * Test your device's GPS accuracy and see where you really are
 */
export async function runLocationDiagnostic() {
    console.log('🔍 Starting Location Diagnostic...\n');

    if (!navigator.geolocation) {
        console.error('❌ Geolocation not supported on this device');
        return;
    }

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords;

                console.log('📍 RAW GPS DATA:');
                console.log(`  Latitude:  ${latitude}`);
                console.log(`  Longitude: ${longitude}`);
                console.log(`  Accuracy:  ${accuracy}m ${accuracy < 20 ? '✅ EXCELLENT' : accuracy < 50 ? '⚠️ GOOD' : accuracy < 100 ? '⚠️ FAIR' : '❌ POOR'}`);
                console.log(`  Altitude:  ${altitude}m`);
                console.log(`  Speed:     ${speed}m/s`);
                console.log(`  Heading:   ${heading}°\n`);

                // Calculate distance from Abeokuta center
                const ABEOKUTA_LAT = 7.1475;
                const ABEOKUTA_LNG = 3.3619;
                const distance = calculateDistance(latitude, longitude, ABEOKUTA_LAT, ABEOKUTA_LNG);

                console.log('📏 LOCATION CHECK:');
                console.log(`  Distance from Abeokuta center: ${distance.toFixed(2)} km`);
                if (distance < 5) {
                    console.log('  ✅ You appear to be IN Abeokuta');
                } else if (distance < 20) {
                    console.log('  ⚠️ You appear to be NEAR Abeokuta');
                } else {
                    console.log('  ❌ You appear to be OUTSIDE Abeokuta');
                    console.log(`  ⚠️ This location shows as ${distance.toFixed(0)}km away!\n`);
                }

                // Test Google Maps Geocoding
                console.log('\n🗺️ TESTING GEOCODING SERVICES:\n');

                const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
                if (googleKey && googleKey !== 'undefined') {
                    try {
                        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&region=ng&key=${googleKey}`;
                        const response = await fetch(googleUrl);
                        const data = await response.json();

                        if (data.status === 'OK' && data.results[0]) {
                            console.log('✅ Google Maps Geocoding:');
                            console.log(`  ${data.results[0].formatted_address}\n`);
                        } else {
                            console.log('❌ Google Maps Geocoding failed:', data.status, '\n');
                        }
                    } catch (error) {
                        console.log('❌ Google Maps error:', error.message, '\n');
                    }
                } else {
                    console.log('⚠️ Google Maps API key not configured\n');
                }

                // Test OpenStreetMap
                try {
                    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
                    const osmResponse = await fetch(osmUrl, {
                        headers: { 'User-Agent': 'Go7DiagnosticTool/1.0' }
                    });
                    const osmData = await osmResponse.json();

                    if (osmData && osmData.display_name) {
                        console.log('✅ OpenStreetMap Geocoding:');
                        console.log(`  ${osmData.display_name}`);
                        console.log(`  City: ${osmData.address?.city || osmData.address?.town || 'Unknown'}\n`);
                    }
                } catch (error) {
                    console.log('❌ OpenStreetMap error:', error.message, '\n');
                }

                // Test MapTiler
                try {
                    const mapTilerUrl = `https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=nRGZ9lGblbV9lFK2KclL&language=en`;
                    const mapTilerResponse = await fetch(mapTilerUrl);
                    const mapTilerData = await mapTilerResponse.json();

                    if (mapTilerData && mapTilerData.features?.[0]) {
                        console.log('✅ MapTiler Geocoding:');
                        console.log(`  ${mapTilerData.features[0].place_name}\n`);
                    }
                } catch (error) {
                    console.log('❌ MapTiler error:', error.message, '\n');
                }

                console.log('\n📋 SUMMARY:');
                console.log('  If all geocoding services show the SAME wrong location,');
                console.log('  then your device GPS is giving wrong coordinates.');
                console.log('  \n  Try these fixes:');
                console.log('  1. Turn OFF WiFi (use mobile data only)');
                console.log('  2. Go outside or near a window');
                console.log('  3. Restart your device GPS');
                console.log('  4. Clear browser cache and location permissions');
                console.log('  5. Wait 30 seconds for GPS to lock on satellites\n');

                resolve({
                    latitude,
                    longitude,
                    accuracy,
                    distanceFromAbeokuta: distance
                });
            },
            (error) => {
                console.error('❌ GPS Error:', error.message);
                console.log('\nError codes:');
                console.log('  1 = Permission denied');
                console.log('  2 = Position unavailable (no GPS signal)');
                console.log('  3 = Timeout (GPS taking too long)\n');
                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0  // Get fresh GPS data
            }
        );
    });
}

// Calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Quick test - just call this from browser console
window.testLocation = runLocationDiagnostic;

export default { runLocationDiagnostic };
