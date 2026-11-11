// Debounced geocoder using Nominatim
const CACHE_KEY = 'geocode-v1';
const DEBOUNCE_MS = 500;
const TIMEOUT_MS = 5000;

// Get cached results
const getFromCache = (query) => {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    return cache[query] || null;
  } catch {
    return null;
  }
};

// Store in cache
const setInCache = (query, results) => {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[query] = results;
    // Keep only last 100 entries
    const entries = Object.entries(cache);
    if (entries.length > 100) {
      const recent = entries.slice(-100);
      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(recent)));
    } else {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  } catch (error) {
    console.warn('Failed to cache geocode results:', error);
  }
};

// Debounced function factory
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await func(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
};

// Raw geocode function
const geocodeRaw = async (query) => {
  if (!query || query.trim().length < 3) {
    return [];
  }

  const trimmedQuery = query.trim();
  
  // Check cache first
  const cached = getFromCache(trimmedQuery);
  if (cached) {
    return cached;
  }

  // Build strict query to keep results local to Abeokuta
  const strictQuery = `${trimmedQuery}, Abeokuta, Ogun State, Nigeria`;
  const encodedQuery = encodeURIComponent(strictQuery);
  
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ng&addressdetails=1&q=${encodedQuery}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Go7DeliveryApp/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    
    const results = data.map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      address: {
        road: item.address?.road || '',
        suburb: item.address?.suburb || '',
        city: item.address?.city || item.address?.town || 'Abeokuta',
        state: item.address?.state || 'Ogun State'
      }
    }));

    // Cache the results
    setInCache(trimmedQuery, results);
    
    return results;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Geocoding request timed out');
    }
    console.error('Geocoding error:', error);
    throw new Error('Failed to search addresses');
  }
};

// Debounced geocode function
export const geocode = debounce(geocodeRaw, DEBOUNCE_MS);

// Get a formatted address string
export const formatAddress = (result) => {
  const { address } = result;
  const parts = [address.road, address.suburb, address.city].filter(Boolean);
  return parts.join(', ') || result.display_name;
};

// Validate coordinates are within reasonable bounds for Abeokuta area
export const validateCoordinates = (lat, lng) => {
  const ABEOKUTA_BOUNDS = {
    north: 7.3,
    south: 6.9,
    east: 3.6,
    west: 3.1
  };
  
  return lat >= ABEOKUTA_BOUNDS.south && 
         lat <= ABEOKUTA_BOUNDS.north && 
         lng >= ABEOKUTA_BOUNDS.west && 
         lng <= ABEOKUTA_BOUNDS.east;
};
