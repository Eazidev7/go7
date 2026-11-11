// Service Worker configuration for map tile caching
// This should be integrated with your existing SW or Workbox setup

const MAP_CACHE_NAME = 'go7-map-tiles-v1';
const MAP_CACHE_SIZE_LIMIT = 200; // Maximum number of tiles to cache

// Map tile URL patterns to cache
const MAP_TILE_PATTERNS = [
  /^https:\/\/.*\.tile\.openstreetmap\.fr\/hot\/.*$/,
  /^https:\/\/.*\.tile\.openstreetmap\.org\/.*$/,
  /^https:\/\/api\.mapbox\.com\/.*$/,
  /^https:\/\/api\.maptiler\.com\/.*$/
];

// Workbox strategy for map tiles
const mapTileCacheStrategy = {
  cacheName: MAP_CACHE_NAME,
  plugins: [
    {
      cacheWillUpdate: async ({ response }) => {
        // Only cache successful responses
        return response.status === 200;
      },
      cacheDidUpdate: async ({ cacheName, request, oldResponse, newResponse }) => {
        // Limit cache size
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        if (keys.length > MAP_CACHE_SIZE_LIMIT) {
          // Remove oldest entries
          const keysToDelete = keys.slice(0, keys.length - MAP_CACHE_SIZE_LIMIT);
          await Promise.all(keysToDelete.map(key => cache.delete(key)));
        }
      }
    }
  ]
};

// Register routes for map tiles (Workbox syntax)
const registerMapTileRoutes = () => {
  if (typeof workbox !== 'undefined') {
    workbox.routing.registerRoute(
      ({ url }) => MAP_TILE_PATTERNS.some(pattern => pattern.test(url.href)),
      new workbox.strategies.StaleWhileRevalidate(mapTileCacheStrategy)
    );
  }
};

// Fallback for manual Service Worker implementation
const handleMapTileRequest = async (event) => {
  const url = event.request.url;
  
  // Check if this is a map tile request
  if (!MAP_TILE_PATTERNS.some(pattern => pattern.test(url))) {
    return;
  }

  event.respondWith(
    caches.open(MAP_CACHE_NAME).then(async (cache) => {
      // Try to get from cache first
      const cachedResponse = await cache.match(event.request);
      
      if (cachedResponse) {
        // Serve from cache and update in background
        fetch(event.request)
          .then(response => {
            if (response.status === 200) {
              cache.put(event.request, response.clone());
              // Cleanup old entries
              limitCacheSize(cache);
            }
          })
          .catch(() => {}); // Ignore network errors
        
        return cachedResponse;
      }

      // Not in cache, fetch from network
      try {
        const response = await fetch(event.request);
        if (response.status === 200) {
          cache.put(event.request, response.clone());
          limitCacheSize(cache);
        }
        return response;
      } catch (error) {
        // Return offline tile or error response
        return new Response('', { status: 404 });
      }
    })
  );
};

// Helper function to limit cache size
const limitCacheSize = async (cache) => {
  const keys = await cache.keys();
  if (keys.length > MAP_CACHE_SIZE_LIMIT) {
    const keysToDelete = keys.slice(0, keys.length - MAP_CACHE_SIZE_LIMIT);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
};

// Preload essential Abeokuta tiles
const preloadAbeokutaTiles = async () => {
  const cache = await caches.open(MAP_CACHE_NAME);
  const abeokutaTiles = [
    // Key tiles for Abeokuta area at zoom levels 12-14
    'https://a.tile.openstreetmap.fr/hot/12/2027/2015.png',
    'https://a.tile.openstreetmap.fr/hot/12/2028/2015.png',
    'https://a.tile.openstreetmap.fr/hot/13/4055/4030.png',
    'https://a.tile.openstreetmap.fr/hot/13/4055/4031.png',
    'https://a.tile.openstreetmap.fr/hot/13/4056/4030.png',
    'https://a.tile.openstreetmap.fr/hot/13/4056/4031.png',
    'https://a.tile.openstreetmap.fr/hot/14/8110/8060.png',
    'https://a.tile.openstreetmap.fr/hot/14/8110/8061.png',
    'https://a.tile.openstreetmap.fr/hot/14/8111/8060.png',
    'https://a.tile.openstreetmap.fr/hot/14/8111/8061.png'
  ];

  const requests = abeokutaTiles.map(url => new Request(url));
  
  try {
    await Promise.allSettled(
      requests.map(async (request) => {
        const response = await fetch(request);
        if (response.status === 200) {
          await cache.put(request, response);
        }
      })
    );
  } catch (error) {
    console.warn('Failed to preload some map tiles:', error);
  }
};

// Export for integration
export {
  registerMapTileRoutes,
  handleMapTileRequest,
  preloadAbeokutaTiles,
  MAP_CACHE_NAME,
  MAP_TILE_PATTERNS
};
