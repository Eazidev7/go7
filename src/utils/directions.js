/**
 * Directions utility for retrieving route metrics using Mapbox Directions API
 */

// Type definitions for JSDoc comments
/**
 * @typedef {Object} RouteMetrics
 * @property {number} distanceKm
 * @property {number} durationMin
 * @property {Array<[number, number]>} [points]
 */

/**
 * @typedef {Object} LatLng
 * @property {number} lat
 * @property {number} lng
 */

/**
 * @typedef {Object} RouteParams
 * @property {LatLng} pickupLngLat
 * @property {LatLng} dropLngLat
 */

/**
 * Calculate the distance between two points using the Haversine formula
 * @param {number} lat1 Latitude of point 1
 * @param {number} lng1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lng2 Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  // Earth's radius in kilometers
  const R = 6371;
  
  // Convert latitude and longitude from degrees to radians
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  
  // Haversine formula
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  // Round to 1 decimal place
  return Math.round(distance * 10) / 10;
}

/**
 * Gets route metrics (distance and duration) between two points using Mapbox Directions API
 * with fallback to Haversine formula if the API call fails
 * @param {RouteParams} params Object containing pickup and dropoff coordinates
 * @returns {Promise<RouteMetrics>} Promise resolving to distance in km and duration in minutes
 */
export const getRouteMetrics = async (params) => {
  const { pickupLngLat, dropLngLat } = params;
  
  // Get Mapbox token from environment variables
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  
  // If no token is available, use Haversine fallback
  if (!mapboxToken) {
    console.warn('Mapbox token not found, using Haversine distance calculation');
    return getHaversineMetrics(pickupLngLat, dropLngLat);
  }
  
  try {
    // Format coordinates for Mapbox API (longitude,latitude format)
    const origin = `${pickupLngLat.lng},${pickupLngLat.lat}`;
    const destination = `${dropLngLat.lng},${dropLngLat.lat}`;
    
    // Construct API URL
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin};${destination}?access_token=${mapboxToken}&geometries=geojson&overview=full`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Directions API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check if we have routes
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes found between the specified locations');
    }
    
    // Get the first (recommended) route
    const route = data.routes[0];
    
    // Convert distance from meters to kilometers
    const distanceKm = parseFloat((route.distance / 1000).toFixed(2));
    
    // Convert duration from seconds to minutes
    const durationMin = Math.ceil(route.duration / 60);
    
    // Extract route geometry if available
    const points = route.geometry?.coordinates?.map(
      (coord) => [coord[1], coord[0]]
    );
    
    return { distanceKm, durationMin, points };
  } catch (error) {
    console.warn('Error fetching route metrics, falling back to Haversine:', error);
    return getHaversineMetrics(pickupLngLat, dropLngLat);
  }
};

/**
 * Calculate route metrics using Haversine formula (straight-line distance)
 * This is used as a fallback when Mapbox API is unavailable
 * @param {LatLng} pickup Pickup coordinates
 * @param {LatLng} dropoff Dropoff coordinates
 * @returns {RouteMetrics} Route metrics with distance and estimated duration
 */
function getHaversineMetrics(pickup, dropoff) {
  // Calculate straight-line distance
  const distanceKm = haversineDistance(
    pickup.lat,
    pickup.lng,
    dropoff.lat,
    dropoff.lng
  );
  
  // Estimate duration based on average speed of 20 km/h
  const durationMin = Math.ceil(distanceKm / 20 * 60);
  
  return {
    distanceKm,
    durationMin
  };
}

/**
 * Returns an estimated time of arrival based on duration in minutes
 * @param {number} durationMin Duration in minutes
 * @returns {string} String representation of ETA
 */
export const getEstimatedArrival = (durationMin) => {
  const now = new Date();
  const arrivalTime = new Date(now.getTime() + durationMin * 60 * 1000);
  
  // Format time as HH:MM AM/PM
  return arrivalTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Returns a formatted duration string
 * @param {number} durationMin Duration in minutes
 * @returns {string} Formatted duration string (e.g., "25 mins")
 */
export const formatDuration = (durationMin) => {
  if (durationMin < 60) {
    return `${durationMin} min${durationMin !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  
  if (mins === 0) {
    return `${hours} hr${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
};
