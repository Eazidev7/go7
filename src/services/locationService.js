// GO7 Location & Address Resolution Service
// Converts coordinates to human-readable addresses for live tracking

class LocationService {
  constructor() {
    this.cache = new Map(); // Cache for address lookups
    this.pendingRequests = new Map(); // Prevent duplicate requests
  }

  // Convert coordinates to address using Nominatim (free OpenStreetMap service)
  async getAddressFromCoords(lat, lng) {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Make new request
    const requestPromise = this.fetchAddress(lat, lng, key);
    this.pendingRequests.set(key, requestPromise);
    
    return requestPromise;
  }

  async fetchAddress(lat, lng, key) {
    try {
      // Using Nominatim (free OpenStreetMap geocoding service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`,
        {
          headers: {
            'User-Agent': 'GO7-Delivery-App/1.0'
          }
        }
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();
      
      const address = this.formatNigerianAddress(data);
      
      // Cache the result
      this.cache.set(key, address);
      this.pendingRequests.delete(key);
      
      return address;
    } catch (error) {
      console.warn('Address lookup failed:', error);
      this.pendingRequests.delete(key);
      
      // Return fallback address with coordinates
      const fallback = {
        street: 'Location Update',
        area: this.getNigerianAreaFromCoords(lat, lng),
        city: 'Abeokuta',
        state: 'Ogun State',
        formatted: `Near ${this.getNigerianAreaFromCoords(lat, lng)}, Abeokuta`
      };
      
      this.cache.set(key, fallback);
      return fallback;
    }
  }

  formatNigerianAddress(geocodeData) {
    const addr = geocodeData.address || {};
    
    // Extract relevant address components for Nigerian locations
    const street = addr.road || addr.pedestrian || addr.residential || '';
    const area = addr.suburb || addr.neighbourhood || addr.village || addr.town || '';
    const city = addr.city || addr.state_district || 'Abeokuta';
    const state = addr.state || 'Ogun State';
    
    // Create formatted address string
    let formatted = '';
    if (street) formatted += street;
    if (area) formatted += (formatted ? ', ' : '') + area;
    if (city && city !== area) formatted += (formatted ? ', ' : '') + city;
    
    return {
      street: street || 'Street Update',
      area: area || 'Location',
      city,
      state,
      formatted: formatted || `Location in ${city}`,
      full: geocodeData.display_name || formatted
    };
  }

  getNigerianAreaFromCoords(lat, lng) {
    // Fallback area detection based on coordinates for Abeokuta region
    const areas = [
      { name: 'Kuto', lat: 7.1475, lng: 3.3519 },
      { name: 'Ibara', lat: 7.1600, lng: 3.3400 },
      { name: 'Adatan', lat: 7.1800, lng: 3.3200 },
      { name: 'Oke-Ilewo', lat: 7.1300, lng: 3.3600 },
      { name: 'Camp', lat: 7.2000, lng: 3.4000 },
      { name: 'Akomoje', lat: 7.1250, lng: 3.3450 },
      { name: 'Itoku', lat: 7.1550, lng: 3.3650 }
    ];

    // Find closest area
    let closest = areas[0];
    let minDistance = this.calculateDistance(lat, lng, closest.lat, closest.lng);

    for (const area of areas) {
      const distance = this.calculateDistance(lat, lng, area.lat, area.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closest = area;
      }
    }

    return closest.name;
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Get current location description for live tracking
  getCurrentLocationText(riderPosition, status) {
    if (!riderPosition) {
      return this.getStatusLocation(status);
    }

    // Return cached address if available
    const key = `${riderPosition.lat.toFixed(4)},${riderPosition.lng.toFixed(4)}`;
    const cached = this.cache.get(key);
    
    if (cached) {
      return `📍 ${cached.formatted}`;
    }

    // Return area-based location while address loads
    const area = this.getNigerianAreaFromCoords(riderPosition.lat, riderPosition.lng);
    return `📍 Near ${area}`;
  }

  getStatusLocation(status) {
    const statusLocations = {
      rider_assigned: '🛵 Rider being assigned...',
      heading_to_pickup: '🏃‍♂️ Heading to restaurant',
      picked_up: '📦 Picked up from restaurant',
      on_the_way: '🚀 On the way to you',
      near_destination: '🏃‍♂️ Almost at your location',
      delivered: '🎉 Delivery completed'
    };

    return statusLocations[status] || '📍 Tracking location...';
  }

  // Clear cache (useful for memory management)
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Location cache cleared');
  }
}

export default new LocationService();