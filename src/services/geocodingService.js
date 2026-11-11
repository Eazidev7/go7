// Geocoding service to interact with Mapbox API for address suggestions

/**
 * Fetch address suggestions from Mapbox
 * @param {string} query - The search query
 * @param {boolean} limitToAbeokuta - Whether to limit results to Abeokuta area
 * @returns {Promise<Array>} - Array of address suggestions
 */
export async function getAddressSuggestions(query, limitToAbeokuta = true) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token) {
    console.error('Mapbox token not configured');
    return [];
  }

  try {
    // Build the geocoding endpoint URL
    let endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json?access_token=${token}&country=ng&types=address,place,neighborhood,locality,poi&limit=5`;
    
    // Add proximity to Abeokuta to improve local results
    if (limitToAbeokuta) {
      // Abeokuta coordinates (approximate center)
      endpoint += '&proximity=3.3500,7.1600';
      
      // Add bounding box for Abeokuta area to limit results
      // Format: minLng,minLat,maxLng,maxLat
      endpoint += '&bbox=3.05,6.85,3.65,7.45';
    }

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.features.map(feature => ({
      id: feature.id,
      text: feature.text,
      placeName: feature.place_name,
      center: feature.center, // [longitude, latitude]
      type: 'address',
      properties: feature.properties
    }));
  } catch (error) {
    console.error('Error fetching address suggestions:', error);
    return [];
  }
}

/**
 * Get current user location using browser's geolocation API
 * @returns {Promise<{lat: number, lng: number} | null>} - Coordinates or null if unavailable
 */
export function getCurrentLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported by this browser');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.log('Error getting current location:', error.message);
        resolve(null);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

/**
 * Reverse geocode coordinates to get address
 * @param {Object} coords - The coordinates object {lat, lng}
 * @returns {Promise<string>} - Human readable address
 */
export async function reverseGeocode(coords) {
  if (!coords || !coords.lat || !coords.lng) {
    return null;
  }

  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token) {
    console.error('Mapbox token not configured');
    return null;
  }

  try {
    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${token}&limit=1`;

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.features && data.features.length > 0) {
      return data.features[0].place_name;
    }
    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Create a custom marker icon
 * @param {string} type - The type of marker ('pickup' or 'dropoff')
 * @param {boolean} isDraggable - Whether the marker is draggable
 * @returns {Object} - Leaflet icon object
 */
export function createMarkerIcon(type, isDraggable = false) {
  const color = type === 'pickup' ? '#E53935' : '#3949AB';
  const icon = type === 'pickup' ? '📍' : '🎯';
  
  return L.divIcon({
    className: `custom-marker-icon ${type}-marker-icon ${isDraggable ? 'draggable' : ''}`,
    html: `<div style="background-color: ${color}; color: white; width: 30px; height: 30px; 
      display: flex; align-items: center; justify-content: center; border-radius: 50%; 
      border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2); font-size: 18px;">
      ${icon}
    </div>
    ${isDraggable ? '<div class="drag-hint" style="white-space: nowrap; background: rgba(0,0,0,0.6); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-top: 2px; text-align: center;">Drag me</div>' : ''}`,
    iconSize: [30, 42],
    iconAnchor: [15, 42]
  });
}

/**
 * Calculate distance between two points using Mapbox API
 * @param {Array} start - Starting coordinates [lng, lat]
 * @param {Array} end - Ending coordinates [lng, lat]
 * @returns {Promise<{distance: number, duration: number}>} - Distance in km and duration in minutes
 */
export async function calculateRoute(start, end) {
  if (!start || !end) {
    return { distance: 0, duration: 0 };
  }
  
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token) {
    console.error('Mapbox token not configured');
    return { distance: 0, duration: 0 };
  }
  
  try {
    const endpoint = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?access_token=${token}&geometries=geojson&overview=full`;
    
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance: route.distance / 1000, // Convert meters to kilometers
        duration: Math.ceil(route.duration / 60), // Convert seconds to minutes
        geometry: route.geometry // GeoJSON LineString of the route
      };
    }
    
    return { distance: 0, duration: 0 };
  } catch (error) {
    console.error('Error calculating route:', error);
    return { distance: 0, duration: 0 };
  }
}