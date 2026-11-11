// Test alternative routing services that might work
async function testAlternativeRoutingServices() {
  console.log('🔍 Testing Alternative Routing Services');
  console.log('======================================\n');
  
  // Test coordinates for Abeokuta
  const start = { lat: 7.1475, lon: 3.3619 };
  const end = { lat: 7.1530, lon: 3.3700 };
  
  const routingServices = [
    {
      name: 'OpenRouteService (Free Tier)',
      url: `https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf6248dcabbc94b4a94dc68b70e5ad1e04e0a8&start=${start.lon},${start.lat}&end=${end.lon},${end.lat}`,
      type: 'ors'
    },
    {
      name: 'OSRM Public Instance',
      url: `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`,
      type: 'osrm'
    },
    {
      name: 'GraphHopper (Free Tier)',
      url: `https://graphhopper.com/api/1/route?point=${start.lat},${start.lon}&point=${end.lat},${end.lon}&vehicle=car&key=your-api-key-here`,
      type: 'graphhopper'
    }
  ];
  
  let workingService = null;
  
  for (const service of routingServices) {
    console.log(`🔍 Testing ${service.name}:`);
    console.log(`📡 URL: ${service.url.substring(0, 80)}...`);
    
    try {
      const response = await fetch(service.url);
      
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS! Service is available');
        
        let distance = null;
        let duration = null;
        let geometry = null;
        
        // Parse different response formats
        if (service.type === 'osrm' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          distance = route.distance; // meters
          duration = route.duration; // seconds
          geometry = route.geometry;
          
          console.log(`📏 Distance: ${distance}m (${(distance/1000).toFixed(3)}km)`);
          console.log(`⏱️  Duration: ${duration}s (${(duration/60).toFixed(1)}min)`);
          console.log(`🗺️  Geometry: ${geometry?.type} with ${geometry?.coordinates?.length || 0} points`);
          
        } else if (service.type === 'ors' && data.features && data.features.length > 0) {
          const route = data.features[0];
          distance = route.properties.segments[0].distance; // meters
          duration = route.properties.segments[0].duration; // seconds
          geometry = route.geometry;
          
          console.log(`📏 Distance: ${distance}m (${(distance/1000).toFixed(3)}km)`);
          console.log(`⏱️  Duration: ${duration}s (${(duration/60).toFixed(1)}min)`);
          console.log(`🗺️  Geometry: ${geometry?.type} with ${geometry?.coordinates?.length || 0} points`);
        }
        
        // Calculate Go7 pricing if we have distance
        if (distance) {
          const distanceKm = distance / 1000;
          const baseFee = 700;
          const distanceFee = Math.ceil(distanceKm) * 100;
          const totalPrice = baseFee + distanceFee;
          
          console.log(`\n💰 Go7 Pricing:`);
          console.log(`   Distance: ${distanceKm.toFixed(3)}km (rounded: ${Math.ceil(distanceKm)}km)`);
          console.log(`   Base fee: ₦${baseFee}`);
          console.log(`   Distance fee: ₦${distanceFee}`);
          console.log(`   Total: ₦${totalPrice}`);
          
          workingService = {
            ...service,
            distance: distanceKm,
            duration: duration,
            pricing: totalPrice
          };
          
          console.log(`\n🎯 ${service.name} is WORKING and can be used for Go7!`);
          break; // Found a working service
        }
        
      } else {
        const errorText = await response.text();
        console.log(`❌ Failed: ${response.status}`);
        if (errorText) console.log(`Error: ${errorText.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`);
    }
    
    console.log('-'.repeat(50));
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 ALTERNATIVE ROUTING SUMMARY:');
  console.log('===============================');
  
  if (workingService) {
    console.log(`✅ WORKING SERVICE: ${workingService.name}`);
    console.log(`📏 Test distance: ${workingService.distance.toFixed(3)}km`);
    console.log(`💰 Test pricing: ₦${workingService.pricing}`);
    console.log('\n🚀 RECOMMENDATION: Integrate this service into Go7!');
    
    return workingService;
  } else {
    console.log('❌ NO WORKING SERVICES FOUND');
    console.log('💡 All external routing services are currently unavailable');
    console.log('🛡️ Continue using enhanced distance calculation as primary method');
    
    return null;
  }
}

// Test the alternative services
testAlternativeRoutingServices()
  .then(result => {
    if (result) {
      console.log('\n📝 INTEGRATION STEPS:');
      console.log('====================');
      console.log('1. Update calculateDrivingDistance function in BookDelivery.jsx');
      console.log(`2. Use ${result.name} as primary routing service`);
      console.log('3. Keep enhanced calculation as fallback');
      console.log('4. Test thoroughly with real Abeokuta addresses');
    } else {
      console.log('\n✅ CURRENT SYSTEM IS OPTIMAL:');
      console.log('=============================');
      console.log('Enhanced distance calculation is the most reliable option');
      console.log('No external dependencies = better performance and reliability');
    }
  })
  .catch(error => console.error('🚨 Test error:', error));