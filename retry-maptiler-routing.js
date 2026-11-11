// Retry MapTiler routing APIs - comprehensive test
async function retryMapTilerRoutingAPIs() {
  const apiKey = 'qRlb1fwa9OgPpla4WO3q';
  const start = '3.3619,7.1475'; // Abeokuta coordinates
  const end = '3.3700,7.1530';
  
  console.log('🔄 RETRYING MapTiler Routing APIs');
  console.log('=================================');
  console.log(`📍 Route: ${start} → ${end} (Abeokuta area)`);
  console.log(`🔑 API Key: ${apiKey}\n`);
  
  // Test different routing API endpoints
  const routingEndpoints = [
    {
      name: 'Directions API v1',
      url: `https://api.maptiler.com/directions/driving/${start};${end}?key=${apiKey}&geometries=geojson&overview=full`
    },
    {
      name: 'Routes API v2',
      url: `https://api.maptiler.com/routes/v2/driving/${start};${end}?key=${apiKey}&geometries=geojson`
    },
    {
      name: 'Navigation API',
      url: `https://api.maptiler.com/navigation/driving/${start};${end}?key=${apiKey}&geometries=geojson`
    },
    {
      name: 'Routing API',
      url: `https://api.maptiler.com/routing/driving/${start};${end}?key=${apiKey}&geometries=geojson`
    },
    {
      name: 'Matrix API',
      url: `https://api.maptiler.com/matrix/driving?key=${apiKey}&sources=0&destinations=1&coordinates=${start};${end}`
    }
  ];
  
  let workingEndpoint = null;
  
  for (let i = 0; i < routingEndpoints.length; i++) {
    const endpoint = routingEndpoints[i];
    
    console.log(`🔍 Testing ${endpoint.name} (${i + 1}/${routingEndpoints.length}):`);
    console.log(`📡 URL: ${endpoint.url}`);
    
    try {
      const response = await fetch(endpoint.url);
      
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      console.log(`🌐 Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS! API is working!');
        
        // Log the full response
        console.log('\n📄 FULL JSON RESPONSE:');
        console.log('=' .repeat(60));
        console.log(JSON.stringify(data, null, 2));
        
        // Extract routing information
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          
          console.log('\n🎯 EXTRACTED ROUTING DATA:');
          console.log('=' .repeat(40));
          
          if (route.distance !== undefined) {
            const distanceKm = (route.distance / 1000).toFixed(3);
            console.log(`📏 Distance: ${route.distance} meters (${distanceKm} km)`);
          }
          
          if (route.duration !== undefined) {
            const durationMin = (route.duration / 60).toFixed(1);
            console.log(`⏱️  Duration: ${route.duration} seconds (${durationMin} minutes)`);
          }
          
          if (route.geometry && route.geometry.coordinates) {
            console.log(`🗺️  Geometry: ${route.geometry.type} with ${route.geometry.coordinates.length} coordinate points`);
            console.log(`🎯 Start: [${route.geometry.coordinates[0]}]`);
            console.log(`🏁 End: [${route.geometry.coordinates[route.geometry.coordinates.length - 1]}]`);
          }
          
          // Calculate Go7 pricing
          if (route.distance) {
            const distanceKm = route.distance / 1000;
            const baseFee = 700;
            const distanceFee = Math.ceil(distanceKm) * 100;
            const totalPrice = baseFee + distanceFee;
            
            console.log('\n💰 GO7 PRICING CALCULATION:');
            console.log(`📏 Distance: ${distanceKm.toFixed(3)}km (rounded up: ${Math.ceil(distanceKm)}km)`);
            console.log(`💵 Base Fee: ₦${baseFee}`);
            console.log(`💵 Distance Fee: ₦${distanceFee}`);
            console.log(`💰 Total Price: ₦${totalPrice}`);
          }
        }
        
        // Matrix API response structure
        if (data.distances && data.durations) {
          console.log('\n🎯 MATRIX API DATA:');
          console.log(`📏 Distance: ${data.distances[0][0]} meters`);
          console.log(`⏱️  Duration: ${data.durations[0][0]} seconds`);
        }
        
        workingEndpoint = endpoint;
        break; // Stop testing once we find a working endpoint
        
      } else {
        const errorText = await response.text();
        console.log(`❌ Failed: ${response.status} ${response.statusText}`);
        console.log(`📄 Error response: ${errorText}`);
        
        if (response.status === 401) {
          console.log('💡 Authentication issue - check API key');
        } else if (response.status === 403) {
          console.log('💡 Forbidden - API might not be available in your plan');
        } else if (response.status === 404) {
          console.log('💡 Endpoint not found - API might not exist');
        } else if (response.status === 429) {
          console.log('💡 Rate limited - too many requests');
        }
      }
      
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.log('💡 Network connectivity issue or CORS policy');
      }
    }
    
    console.log('-'.repeat(50));
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 ROUTING API TEST SUMMARY:');
  console.log('============================');
  
  if (workingEndpoint) {
    console.log(`✅ WORKING ENDPOINT FOUND: ${workingEndpoint.name}`);
    console.log(`📡 URL Pattern: ${workingEndpoint.url.split('?')[0]}?key=YOUR_KEY&...`);
    console.log('🎉 MapTiler routing is now available for Go7!');
    
    return {
      success: true,
      endpoint: workingEndpoint,
      apiWorking: true
    };
  } else {
    console.log('❌ NO WORKING ENDPOINTS FOUND');
    console.log('💡 Recommendations:');
    console.log('   1. Check if routing is included in your MapTiler plan');
    console.log('   2. Verify API key has routing permissions');
    console.log('   3. Continue using enhanced distance calculation as fallback');
    
    return {
      success: false,
      endpoint: null,
      apiWorking: false
    };
  }
}

// Run the comprehensive retry test
console.log('🧪 MapTiler Routing API Retry Test');
console.log('==================================\n');

retryMapTilerRoutingAPIs()
  .then(result => {
    if (result.success) {
      console.log('\n🚀 NEXT STEPS:');
      console.log('==============');
      console.log('1. Update Go7 BookDelivery.jsx to use the working endpoint');
      console.log('2. Implement the working routing API for accurate distances');
      console.log('3. Keep enhanced calculation as fallback');
    } else {
      console.log('\n🛡️ FALLBACK STRATEGY:');
      console.log('=====================');
      console.log('Continue using the optimized enhanced distance calculation');
      console.log('It provides accurate results without external API dependencies');
    }
  })
  .catch(error => console.error('🚨 Test failed:', error));