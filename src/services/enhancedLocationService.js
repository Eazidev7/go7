// Enhanced Location Service for GO7 Live Tracking
// Provides reverse geocoding and real-time address resolution

class LocationService {
  constructor() {
    this.cache = new Map();
    this.debounceTimeout = null;
  }

  // Get street address from coordinates using Nominatim (free OpenStreetMap service)
  async reverseGeocode(lat, lng) {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'GO7-DeliveryApp/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      const addressInfo = {
        street: this.formatStreetName(data),
        neighborhood: data.address?.neighbourhood || data.address?.suburb || '',
        city: data.address?.city || data.address?.town || 'Lagos',
        state: data.address?.state || 'Lagos State',
        formattedAddress: data.display_name || 'Location updating...',
        coordinates: { lat, lng }
      };

      // Cache the result
      this.cache.set(cacheKey, addressInfo);
      
      // Clear old cache entries (keep only last 50)
      if (this.cache.size > 50) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      return addressInfo;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      
      // Return fallback location info
      return {
        street: 'Updating location...',
        neighborhood: '',
        city: 'Lagos',
        state: 'Lagos State',
        formattedAddress: 'Getting current location...',
        coordinates: { lat, lng }
      };
    }
  }

  // Format street name for better display
  formatStreetName(geocodeData) {
    const address = geocodeData.address || {};
    
    // Priority order for street identification
    const streetCandidates = [
      address.road,
      address.pedestrian,
      address.footway,
      address.path,
      address.residential,
      address.commercial
    ];

    const street = streetCandidates.find(candidate => candidate && candidate.trim());
    
    if (!street) {
      // Fallback to area names
      return address.neighbourhood || 
             address.suburb || 
             address.industrial || 
             address.commercial || 
             'Current Location';
    }

    // Clean up street name
    return street
      .replace(/\b(street|str|road|rd|avenue|ave|lane|ln|drive|dr)\b/gi, (match) => {
        const abbrev = {
          'street': 'St', 'str': 'St',
          'road': 'Rd', 'rd': 'Rd', 
          'avenue': 'Ave', 'ave': 'Ave',
          'lane': 'Ln', 'ln': 'Ln',
          'drive': 'Dr', 'dr': 'Dr'
        };
        return abbrev[match.toLowerCase()] || match;
      })
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Debounced geocoding to avoid too many API calls
  debouncedGeocode(lat, lng, callback, delay = 2000) {
    clearTimeout(this.debounceTimeout);
    
    this.debounceTimeout = setTimeout(async () => {
      const locationInfo = await this.reverseGeocode(lat, lng);
      callback(locationInfo);
    }, delay);
  }

  // Calculate distance between two points
  calculateDistance(pos1, pos2) {
    const R = 6371; // Earth's radius in km
    const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Return distance in meters
  }

  // Get movement status based on speed/distance
  getMovementStatus(currentPos, previousPos, timeElapsed) {
    if (!previousPos) return 'stationary';
    
    const distance = this.calculateDistance(currentPos, previousPos);
    const speed = (distance / timeElapsed) * 3.6; // km/h
    
    if (speed < 0.5) return 'stationary';
    if (speed < 5) return 'walking';
    if (speed < 15) return 'cycling';
    if (speed < 50) return 'driving';
    return 'fast_driving';
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

export const locationService = new LocationService();
export default LocationService;