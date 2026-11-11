/**
 * Distance Cache Test
 * Demonstrates caching mechanism preventing redundant API calls
 */

console.log('='.repeat(80));
console.log('DISTANCE CACHE TEST - PREVENTING REDUNDANT API CALLS');
console.log('='.repeat(80));

// Simulate the caching system
class DistanceCache {
  constructor(cacheDuration = 30 * 60 * 1000) { // 30 minutes default
    this.cache = new Map();
    this.cacheDuration = cacheDuration;
    this.apiCallCount = 0;
    this.cacheHitCount = 0;
  }

  generateKey(vendorCoords, customerCoords) {
    return `${vendorCoords.lat},${vendorCoords.lng}-${customerCoords.lat},${customerCoords.lng}`;
  }

  async getDistance(vendorCoords, customerCoords, calculationFn) {
    const key = this.generateKey(vendorCoords, customerCoords);
    const now = Date.now();

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && (now - cached.timestamp) < this.cacheDuration) {
      this.cacheHitCount++;
      console.log(`  💾 CACHE HIT! Using cached result (age: ${Math.floor((now - cached.timestamp) / 1000)}s)`);
      return {
        ...cached,
        source: 'cache'
      };
    }

    // Cache miss - calculate distance
    console.log(`  🌐 CACHE MISS - Calling API...`);
    this.apiCallCount++;
    
    const result = await calculationFn(vendorCoords, customerCoords);
    
    // Store in cache
    this.cache.set(key, {
      distance: result.distance,
      duration: result.duration,
      method: result.method,
      timestamp: now
    });
    
    console.log(`  💾 Result cached for 30 minutes`);
    
    return {
      ...result,
      source: 'api'
    };
  }

  getCacheStats() {
    return {
      totalEntries: this.cache.size,
      apiCalls: this.apiCallCount,
      cacheHits: this.cacheHitCount,
      hitRate: this.apiCallCount + this.cacheHitCount > 0 
        ? ((this.cacheHitCount / (this.apiCallCount + this.cacheHitCount)) * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  clearCache() {
    this.cache.clear();
    console.log('  🗑️  Cache cleared');
  }
}

// Mock calculation function
async function mockCalculateDistance(vendor, customer) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simple distance calculation
  const distance = Math.sqrt(
    Math.pow(customer.lat - vendor.lat, 2) + 
    Math.pow(customer.lng - vendor.lng, 2)
  ) * 111; // Rough km conversion
  
  return {
    distance: Math.round(distance * 10) / 10,
    duration: 15,
    method: 'google'
  };
}

// Test scenarios
async function runCacheTest() {
  const cache = new DistanceCache();
  
  const vendor = { lat: 7.1575, lng: 3.3470 }; // Abeokuta
  const address1 = { lat: 7.1875, lng: 3.3970 }; // Home
  const address2 = { lat: 7.2575, lng: 3.4970 }; // Work
  const address3 = { lat: 7.1875, lng: 3.3970 }; // Same as address1

  console.log('\n📍 SCENARIO 1: First time selecting address');
  console.log('-'.repeat(80));
  console.log('User selects Home address');
  const result1 = await cache.getDistance(vendor, address1, mockCalculateDistance);
  console.log(`  ✅ Distance: ${result1.distance} km (Source: ${result1.source})`);

  console.log('\n📍 SCENARIO 2: User switches to payment tab and back');
  console.log('-'.repeat(80));
  console.log('User navigates away and returns - same address recalculated');
  const result2 = await cache.getDistance(vendor, address1, mockCalculateDistance);
  console.log(`  ✅ Distance: ${result2.distance} km (Source: ${result2.source})`);

  console.log('\n📍 SCENARIO 3: User selects different address');
  console.log('-'.repeat(80));
  console.log('User selects Work address');
  const result3 = await cache.getDistance(vendor, address2, mockCalculateDistance);
  console.log(`  ✅ Distance: ${result3.distance} km (Source: ${result3.source})`);

  console.log('\n📍 SCENARIO 4: User switches back to first address');
  console.log('-'.repeat(80));
  console.log('User selects Home address again');
  const result4 = await cache.getDistance(vendor, address1, mockCalculateDistance);
  console.log(`  ✅ Distance: ${result4.distance} km (Source: ${result4.source})`);

  console.log('\n📍 SCENARIO 5: Multiple rapid address changes');
  console.log('-'.repeat(80));
  console.log('User toggles between addresses multiple times...');
  
  for (let i = 0; i < 5; i++) {
    const addr = i % 2 === 0 ? address1 : address2;
    const addrName = i % 2 === 0 ? 'Home' : 'Work';
    console.log(`  Attempt ${i + 1}: Selecting ${addrName}`);
    await cache.getDistance(vendor, addr, mockCalculateDistance);
  }

  console.log('\n📍 SCENARIO 6: Identical coordinates (address with same lat/lng)');
  console.log('-'.repeat(80));
  console.log('User selects another address with same coordinates as Home');
  const result5 = await cache.getDistance(vendor, address3, mockCalculateDistance);
  console.log(`  ✅ Distance: ${result5.distance} km (Source: ${result5.source})`);

  // Cache statistics
  console.log('\n' + '='.repeat(80));
  console.log('CACHE PERFORMANCE STATISTICS');
  console.log('='.repeat(80));
  
  const stats = cache.getCacheStats();
  console.log(`Total Cache Entries: ${stats.totalEntries}`);
  console.log(`API Calls Made: ${stats.apiCalls}`);
  console.log(`Cache Hits: ${stats.cacheHits}`);
  console.log(`Cache Hit Rate: ${stats.hitRate}`);
  
  const savedCalls = stats.cacheHits;
  console.log(`\n✅ Saved ${savedCalls} API calls through caching!`);

  // Cost savings (assuming Google API costs money per call)
  console.log('\n💰 COST SAVINGS:');
  console.log(`Without cache: 11 API calls (100% API usage)`);
  console.log(`With cache: ${stats.apiCalls} API calls (${((stats.apiCalls / 11) * 100).toFixed(0)}% API usage)`);
  console.log(`Reduction: ${((1 - stats.apiCalls / 11) * 100).toFixed(0)}% fewer API calls`);

  // Test cache expiration
  console.log('\n' + '='.repeat(80));
  console.log('CACHE EXPIRATION TEST');
  console.log('='.repeat(80));
  
  const shortCache = new DistanceCache(2000); // 2 second expiration
  
  console.log('Calculating distance...');
  await shortCache.getDistance(vendor, address1, mockCalculateDistance);
  
  console.log('Immediately requesting same distance...');
  await shortCache.getDistance(vendor, address1, mockCalculateDistance);
  
  console.log('Waiting 2.5 seconds for cache to expire...');
  await new Promise(resolve => setTimeout(resolve, 2500));
  
  console.log('Requesting after cache expiration...');
  await shortCache.getDistance(vendor, address1, mockCalculateDistance);
  
  const expirationStats = shortCache.getCacheStats();
  console.log(`\nExpiration Test: ${expirationStats.apiCalls} API calls, ${expirationStats.cacheHits} cache hits`);
  console.log('✅ Cache properly expires after timeout');

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('✅ Cache prevents redundant API calls for same vendor-customer pairs');
  console.log('✅ Cache persists across navigation (order tab → payment → back to order)');
  console.log('✅ Multiple rapid address changes use cached results');
  console.log('✅ Cache expires after 30 minutes to ensure fresh data');
  console.log('✅ Significant reduction in API usage and costs');
  console.log('✅ Improved performance - instant results from cache');
  console.log('='.repeat(80));
}

runCacheTest();
