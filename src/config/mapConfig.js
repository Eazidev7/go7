/**
 * 🗺️ GO7 MAP CONFIGURATION SYSTEM
 * Unified configuration for all tracking map types
 */

export const MAP_TYPES = {
  MOBILE_USER: 'mobile_user',      // Customer tracking on mobile
  DESKTOP_ADMIN: 'desktop_admin',  // Admin/vendor dashboard
  RIDER_NAV: 'rider_nav'           // Rider navigation
};

export const MAP_ENGINES = {
  GOOGLE: 'google',        // Google Maps JS API
  LEAFLET: 'leaflet',      // Leaflet + OpenStreetMap
  MAPBOX: 'mapbox'         // Mapbox GL (future)
};

/**
 * Firestore real-time sync configuration
 */
export const FIRESTORE_PATHS = {
  ORDER: (orderId) => `orders/${orderId}`,
  RIDER_LOCATION: (orderId) => `orders/${orderId}/riderLocation`,
  ORDER_STATUS: (orderId) => `orders/${orderId}/orderStatus`,
};

/**
 * Map configuration based on use case
 */
export const MAP_CONFIGS = {
  [MAP_TYPES.MOBILE_USER]: {
    engine: MAP_ENGINES.GOOGLE,
    component: 'MobileLiveTracking',
    path: '/mobile-tracking/:orderId',
    features: {
      riderTracking: true,
      routeDisplay: true,
      etaCalculation: true,
      streetNames: true,
      deliverySheet: true,
      multipleOrders: false,
      navigationMode: false,
      liveLocationUpload: false
    },
    mapOptions: {
      disableDefaultUI: true,
      zoomControl: false,
      gestureHandling: 'greedy',
      clickableIcons: false
    },
    updateInterval: 5000, // 5 seconds
    firebaseSync: true
  },

  [MAP_TYPES.DESKTOP_ADMIN]: {
    engine: MAP_ENGINES.GOOGLE,
    component: 'AdminDashboardMap',
    path: '/admin/orders',
    features: {
      riderTracking: true,
      routeDisplay: true,
      etaCalculation: true,
      streetNames: false,
      deliverySheet: false,
      multipleOrders: true,      // ← KEY: Multiple markers
      navigationMode: false,
      liveLocationUpload: false,
      orderTooltips: true,        // Hover to see order details
      filterByStatus: true
    },
    mapOptions: {
      disableDefaultUI: false,
      zoomControl: true,
      gestureHandling: 'cooperative',
      fullscreenControl: true
    },
    updateInterval: 3000, // 3 seconds (faster for admin)
    firebaseSync: true
  },

  [MAP_TYPES.RIDER_NAV]: {
    engine: MAP_ENGINES.GOOGLE,
    component: 'RiderNavigationMap',
    path: '/rider/trip/:orderId',
    features: {
      riderTracking: false,       // Rider is the user
      routeDisplay: true,
      etaCalculation: true,
      streetNames: true,
      deliverySheet: false,
      multipleOrders: false,
      navigationMode: true,       // ← KEY: Turn-by-turn
      liveLocationUpload: true,   // ← KEY: Upload to Firestore
      pickupDropoffMarkers: true
    },
    mapOptions: {
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      mapTypeControl: false,
      trafficLayer: true          // Show live traffic
    },
    updateInterval: 5000, // Upload location every 5s
    geolocationOptions: {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    },
    firebaseSync: true,
    uploadPath: FIRESTORE_PATHS.RIDER_LOCATION
  }
};

/**
 * Determine which map config to use based on route/device
 */
export function getMapConfig(pathname, userRole) {
  // Admin/vendor dashboard
  if (pathname.includes('/admin/orders') || pathname.includes('/vendor/dashboard')) {
    return MAP_CONFIGS[MAP_TYPES.DESKTOP_ADMIN];
  }
  
  // Rider navigation
  if (pathname.includes('/rider/trip')) {
    return MAP_CONFIGS[MAP_TYPES.RIDER_NAV];
  }
  
  // Default: Mobile user tracking
  return MAP_CONFIGS[MAP_TYPES.MOBILE_USER];
}

/**
 * Firebase location upload helper for riders
 */
export async function uploadRiderLocation(orderId, location, firestore) {
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    const orderRef = doc(firestore, 'orders', orderId);
    
    await updateDoc(orderRef, {
      riderLocation: {
        lat: location.lat,
        lng: location.lng,
        timestamp: new Date().toISOString(),
        accuracy: location.accuracy || null
      },
      lastLocationUpdate: new Date().toISOString()
    });
    
    console.log('📍 Rider location uploaded:', location);
    return true;
  } catch (error) {
    console.error('❌ Failed to upload rider location:', error);
    return false;
  }
}

/**
 * Start continuous location tracking for riders
 */
export function startRiderLocationTracking(orderId, firestore, onError) {
  if (!navigator.geolocation) {
    onError?.('Geolocation not supported');
    return null;
  }

  const config = MAP_CONFIGS[MAP_TYPES.RIDER_NAV];
  
  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      
      await uploadRiderLocation(orderId, location, firestore);
    },
    (error) => {
      console.error('❌ Geolocation error:', error);
      onError?.(error.message);
    },
    config.geolocationOptions
  );
  
  console.log('🚴 Started rider location tracking:', watchId);
  return watchId;
}

/**
 * Stop rider location tracking
 */
export function stopRiderLocationTracking(watchId) {
  if (watchId && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    console.log('🛑 Stopped rider location tracking');
  }
}

export default {
  MAP_TYPES,
  MAP_ENGINES,
  MAP_CONFIGS,
  FIRESTORE_PATHS,
  getMapConfig,
  uploadRiderLocation,
  startRiderLocationTracking,
  stopRiderLocationTracking
};
