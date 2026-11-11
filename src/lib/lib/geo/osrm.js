import { OSRM_ROUTE_BASE } from '../../../config/routing.js';

const OSRM_BASE_URL = OSRM_ROUTE_BASE;
const TIMEOUT_MS = 8000;

export const fetchRoute = async (pickup, dropoff) => {
  if (!pickup || !dropoff || !pickup.lat || !pickup.lng || !dropoff.lat || !dropoff.lng) {
    throw new Error('Invalid coordinates provided');
  }

  const { lat: lat1, lng: lng1 } = pickup;
  const { lat: lat2, lng: lng2 } = dropoff;
  
  // OSRM expects lng,lat format
  const url = `${OSRM_BASE_URL}/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson&steps=false`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found between the locations');
    }

    const route = data.routes[0];
    
    // Extract route information
    const distanceKm = Math.round((route.distance / 1000) * 10) / 10; // Round to 1 decimal
    const durationMinutes = Math.round(route.duration / 60);
    
    // Convert OSRM geometry to Leaflet LatLng format
    const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // lng,lat -> lat,lng

    return {
      distance: distanceKm,
      duration: durationMinutes,
      geometry: coordinates,
      bounds: {
        north: Math.max(lat1, lat2),
        south: Math.min(lat1, lat2),
        east: Math.max(lng1, lng2),
        west: Math.min(lng1, lng2)
      }
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Route request timed out');
    }
    console.error('OSRM routing error:', error);
    throw new Error('Failed to calculate route');
  }
};

// Calculate straight-line distance as fallback
export const calculateStraightLineDistance = (pickup, dropoff) => {
  const R = 6371; // Earth's radius in km
  const dLat = (dropoff.lat - pickup.lat) * Math.PI / 180;
  const dLng = (dropoff.lng - pickup.lng) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pickup.lat * Math.PI / 180) * Math.cos(dropoff.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal
};

// Validate route makes sense (not too long for local delivery)
export const validateRoute = (route) => {
  const MAX_DELIVERY_DISTANCE = 50; // km
  const MIN_DELIVERY_DISTANCE = 0.1; // km
  
  if (route.distance < MIN_DELIVERY_DISTANCE) {
    throw new Error('Pickup and dropoff locations are too close');
  }
  
  if (route.distance > MAX_DELIVERY_DISTANCE) {
    throw new Error('Delivery distance is too far (max 50km)');
  }
  
  return true;
};
