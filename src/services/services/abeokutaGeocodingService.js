// src/services/abeokutaGeocodingService.js
/**
 * Geocoding service for Abeokuta addresses
 * Integrates with Nominatim API and restricts results to Abeokuta
 */

import { areas } from '../data/areas';

// Cache for geocoding results to avoid repeated API calls
const geocodeCache = new Map();

// Constants for Abeokuta area
const ABEOKUTA_BOUNDS = {
  north: 7.28, // Northern bound
  south: 7.05, // Southern bound
  east: 3.55,  // Eastern bound
  west: 3.25   // Western bound
};

// Helper to check if coordinates are within Abeokuta bounds
function isWithinAbeokuta(lat, lng) {
  return (
    lat >= ABEOKUTA_BOUNDS.south &&
    lat <= ABEOKUTA_BOUNDS.north &&
    lng >= ABEOKUTA_BOUNDS.west &&
    lng <= ABEOKUTA_BOUNDS.east
  );
}

/**
 * Converts any address to include Abeokuta if not already mentioned
 * @param {string} query - The search query
 * @returns {string} - Modified query with Abeokuta reference
 */
function formatAbeokutaQuery(query) {
  const normalizedQuery = query.toLowerCase();
  if (
    !normalizedQuery.includes('abeokuta') &&
    !normalizedQuery.includes('ogun')
  ) {
    return `${query}, Abeokuta, Ogun State`;
  }
  return query;
}

/**
 * Search for places in Abeokuta using Nominatim API
 * @param {string} query - Search query (address or landmark)
 * @returns {Promise<Array>} Array of place results
 */
export async function searchAbeokutaPlaces(query) {
  if (!query || query.length < 2) {
    return [];
  }
  
  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }
  
  // First, check if the query matches any known areas from our areas.js data
  const areaMatches = areas.filter(area => 
    area.name.toLowerCase().includes(query.toLowerCase())
  );
  
  // If we have area matches from our predefined list, return those first
  if (areaMatches.length > 0) {
    const areaResults = areaMatches.map(area => ({
      id: area.id,
      display_name: `${area.name}, Abeokuta, Ogun State`,
      lat: area.lat,
      lng: area.lng,
      address: {
        area: area.name,
        city: 'Abeokuta',
        state: 'Ogun State',
        country: 'Nigeria'
      },
      source: 'local',
      importance: 1,
      type: 'area'
    }));
    
    // Cache the results
    geocodeCache.set(cacheKey, areaResults);
    
    return areaResults;
  }
  
  try {
    // Format query to restrict to Abeokuta
    const abeokutaQuery = formatAbeokutaQuery(query);
    
    // Restrict search to Abeokuta area using viewbox
    const viewbox = `${ABEOKUTA_BOUNDS.west},${ABEOKUTA_BOUNDS.north},${ABEOKUTA_BOUNDS.east},${ABEOKUTA_BOUNDS.south}`;
    
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(abeokutaQuery)}&limit=5&countrycodes=ng&viewbox=${viewbox}&bounded=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GO7-Delivery-App/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter results to only include places within Abeokuta bounds
    const results = data
      .filter(item => isWithinAbeokuta(parseFloat(item.lat), parseFloat(item.lon)))
      .map(item => {
        // Extract the area from the address if available
        let areaName = item.address?.suburb || 
                      item.address?.neighbourhood || 
                      item.address?.residential || 
                      'Abeokuta';
        
        // Try to match with our known areas for better accuracy
        const knownArea = areas.find(area => 
          areaName.toLowerCase().includes(area.name.toLowerCase())
        );
        
        if (knownArea) {
          areaName = knownArea.name;
        }
        
        return {
          id: item.place_id,
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          address: {
            road: item.address?.road,
            area: areaName,
            city: 'Abeokuta',
            state: 'Ogun State',
            country: 'Nigeria'
          },
          source: 'nominatim',
          importance: item.importance,
          type: item.type
        };
      });
    
    // Cache the results
    geocodeCache.set(cacheKey, results);
    
    return results;
  } catch (error) {
    console.error('Abeokuta geocoding error:', error);
    
    // On API failure, fallback to our local data if there are any partial matches
    const fallbackMatches = areas.filter(area => 
      area.name.toLowerCase().includes(query.toLowerCase().substring(0, 3))
    );
    
    if (fallbackMatches.length > 0) {
      return fallbackMatches.map(area => ({
        id: area.id,
        display_name: `${area.name}, Abeokuta, Ogun State`,
        lat: area.lat,
        lng: area.lng,
        address: {
          area: area.name,
          city: 'Abeokuta',
          state: 'Ogun State',
          country: 'Nigeria'
        },
        source: 'local',
        importance: 0.5,
        type: 'area'
      }));
    }
    
    return [];
  }
}

/**
 * Debounce function to limit API calls while typing
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Debounced version of searchAbeokutaPlaces for use in input fields
 */
export const debouncedSearchAbeokutaPlaces = debounce((query, callback) => {
  searchAbeokutaPlaces(query).then(callback);
}, 300);

/**
 * Reverse geocoding - get address from coordinates within Abeokuta
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object|null>} Address object or null if outside Abeokuta
 */
export async function reverseGeocodeAbeokuta(lat, lng) {
  // Check if coordinates are within Abeokuta bounds
  if (!isWithinAbeokuta(lat, lng)) {
    return null;
  }
  
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GO7-Delivery-App/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the area from the address if available
    let areaName = data.address?.suburb || 
                  data.address?.neighbourhood || 
                  data.address?.residential || 
                  'Abeokuta';
    
    // Try to match with our known areas for better accuracy
    const knownArea = areas.find(area => 
      areaName.toLowerCase().includes(area.name.toLowerCase())
    );
    
    if (knownArea) {
      areaName = knownArea.name;
    }
    
    return {
      display_name: data.display_name,
      address: {
        ...data.address,
        area: areaName,
        city: 'Abeokuta',
        state: 'Ogun State',
      },
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon)
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    
    // On API failure, use the nearest known area as fallback
    let closestArea = null;
    let minDistance = Infinity;
    
    for (const area of areas) {
      const distance = Math.sqrt(
        Math.pow(area.lat - lat, 2) + Math.pow(area.lng - lng, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestArea = area;
      }
    }
    
    if (closestArea) {
      return {
        display_name: `${closestArea.name}, Abeokuta, Ogun State`,
        address: {
          area: closestArea.name,
          city: 'Abeokuta',
          state: 'Ogun State',
          country: 'Nigeria'
        },
        lat: closestArea.lat,
        lng: closestArea.lng
      };
    }
    
    return null;
  }
}