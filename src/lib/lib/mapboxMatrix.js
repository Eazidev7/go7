/**
 * Mapbox Matrix API Frontend Helper
 * 
 * This module provides utilities for calculating driving distances/durations
 * between a pickup location and multiple rider positions using Mapbox Matrix API.
 * 
 * For production use, this logic should be moved to the server-side
 * Cloud Functions to secure the API token.
 */

// Haversine formula for calculating distance between two points on Earth
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Zone centroids for Abeokuta zones (fallback when rider coords not available)
export const ZONE_CENTROIDS = {
  "Kuto": { lng: 3.3517, lat: 7.1475 },
  "Panseke": { lng: 3.3644, lat: 7.1536 },
  "Ibara": { lng: 3.3456, lat: 7.1567 },
  "Adatan": { lng: 3.3378, lat: 7.1423 },
  "Obantoko": { lng: 3.3289, lat: 7.1312 },
  "Camp": { lng: 3.3201, lat: 7.1201 },
  "Oke-Ilewo": { lng: 3.3567, lat: 7.1612 }
};

/**
 * Call Mapbox Matrix API to get driving durations
 * @param {Array} coords - Array of {lng, lat} objects. Index 0 = pickup, others = rider positions
 * @param {string} token - Mapbox access token
 * @returns {Promise<Array>} Array of durations in seconds from pickup to each rider
 */
export async function matrixDurations(coords, token) {
  if (!coords || coords.length < 2) {
    throw new Error("Need at least pickup location and one rider position");
  }

  if (!token) {
    throw new Error("Mapbox token is required");
  }

  // Format coordinates for Mapbox API: "lng,lat;lng,lat;..."
  const coordString = coords.map(coord => `${coord.lng},${coord.lat}`).join(';');
  
  // Mapbox Matrix API URL
  const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordString}?annotations=duration&access_token=${token}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("RATE_LIMITED");
      }
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.durations || !data.durations[0]) {
      throw new Error("Invalid response from Mapbox API");
    }

    // Return durations from pickup (index 0) to all riders (index 1+)
    // Skip the first element which is pickup to pickup (0 seconds)
    return data.durations[0].slice(1);
    
  } catch (error) {
    console.error("Mapbox Matrix API error:", error);
    throw error;
  }
}

/**
 * Fallback distance calculation using haversine formula
 * @param {Array} coords - Array of {lng, lat} objects. Index 0 = pickup, others = rider positions
 * @returns {Array} Array of estimated durations in seconds (distance * 60 for rough time estimate)
 */
export function haversineFallback(coords) {
  if (!coords || coords.length < 2) {
    return [];
  }

  const pickup = coords[0];
  const durations = [];

  for (let i = 1; i < coords.length; i++) {
    const rider = coords[i];
    const distanceKm = haversineDistance(pickup.lat, pickup.lng, rider.lat, rider.lng);
    
    // Rough estimate: assume 30 km/h average speed in city traffic
    // Duration in seconds = (distance in km / 30 km/h) * 3600 seconds/hour
    const estimatedDuration = (distanceKm / 30) * 3600;
    durations.push(Math.round(estimatedDuration));
  }

  return durations;
}

/**
 * Select best rider based on duration and tie-breaking rules
 * @param {Array} riders - Array of rider objects with duration and lastPingAt
 * @param {Array} durations - Array of durations in seconds matching rider order
 * @returns {Object} Best rider object with added duration property
 */
export function selectBestRider(riders, durations) {
  if (!riders || !durations || riders.length !== durations.length) {
    throw new Error("Riders and durations arrays must have same length");
  }

  if (riders.length === 0) {
    return null;
  }

  // Add durations to riders
  const ridersWithDuration = riders.map((rider, index) => ({
    ...rider,
    duration: durations[index]
  }));

  // Sort by duration (ascending), then by lastPingAt (descending for most recent)
  ridersWithDuration.sort((a, b) => {
    if (a.duration !== b.duration) {
      return a.duration - b.duration; // Shorter duration wins
    }
    // Tie-breaker: most recent lastPingAt wins
    return new Date(b.lastPingAt) - new Date(a.lastPingAt);
  });

  return ridersWithDuration[0];
}

/**
 * Get rider position - prefer live coords, fallback to zone centroid
 * @param {Object} rider - Rider object with optional coords and zone
 * @returns {Object} {lng, lat} coordinates
 */
export function getRiderPosition(rider) {
  if (rider.coords && rider.coords.lng && rider.coords.lat) {
    return { lng: rider.coords.lng, lat: rider.coords.lat };
  }
  
  if (rider.zone && ZONE_CENTROIDS[rider.zone]) {
    return ZONE_CENTROIDS[rider.zone];
  }
  
  throw new Error(`Cannot determine position for rider ${rider.id}: no coords or valid zone`);
}

/**
 * Main function to find nearest rider using Mapbox with haversine fallback
 * @param {Object} pickupCoords - {lng, lat} pickup location
 * @param {Array} riders - Array of available riders
 * @param {string} mapboxToken - Mapbox access token
 * @returns {Promise<Object>} Result with {rider, duration, source: "matrix"|"fallback"}
 */
export async function findNearestRider(pickupCoords, riders, mapboxToken) {
  if (!riders || riders.length === 0) {
    return { rider: null, duration: null, source: "no_riders" };
  }

  try {
    // Build coordinates array: pickup first, then all rider positions
    const coords = [pickupCoords];
    const validRiders = [];

    for (const rider of riders) {
      try {
        const riderPos = getRiderPosition(rider);
        coords.push(riderPos);
        validRiders.push(rider);
      } catch (error) {
        console.warn(`Skipping rider ${rider.id}: ${error.message}`);
      }
    }

    if (validRiders.length === 0) {
      return { rider: null, duration: null, source: "no_valid_positions" };
    }

    // Try Mapbox Matrix API first
    try {
      const durations = await matrixDurations(coords, mapboxToken);
      const bestRider = selectBestRider(validRiders, durations);
      
      return {
        rider: bestRider,
        duration: bestRider.duration,
        source: "matrix"
      };
    } catch (error) {
      console.warn("Mapbox Matrix API failed, falling back to haversine:", error.message);
      
      // Fallback to haversine calculation
      const durations = haversineFallback(coords);
      const bestRider = selectBestRider(validRiders, durations);
      
      return {
        rider: bestRider,
        duration: bestRider.duration,
        source: "fallback"
      };
    }
  } catch (error) {
    console.error("Error in findNearestRider:", error);
    throw error;
  }
}
