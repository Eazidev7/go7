import { updateRiderLocation } from './orderService';

class RiderLocationService {
  constructor() {
    this.isTracking = false;
    this.trackingInterval = null;
    this.currentOrderId = null;
    this.updateInterval = 15000; // 15 seconds
    this.watchId = null;
    this.lastPosition = null;
    
    // Geolocation options
    this.geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    };
  }

  /**
   * Start tracking rider location for an order
   * @param {string} firebaseOrderId - Firebase order document ID
   */
  startTracking(firebaseOrderId) {
    console.log('🚴 Starting rider location tracking for order:', firebaseOrderId);
    
    this.currentOrderId = firebaseOrderId;
    this.isTracking = true;
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.error('❌ Geolocation is not supported by this browser');
      return false;
    }
    
    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
      this.onPositionUpdate.bind(this),
      this.onPositionError.bind(this),
      this.geoOptions
    );
    
    // Set up periodic updates
    this.trackingInterval = setInterval(() => {
      this.getCurrentPosition();
    }, this.updateInterval);
    
    return true;
  }

  /**
   * Stop tracking rider location
   */
  stopTracking() {
    console.log('🛑 Stopping rider location tracking');
    
    this.isTracking = false;
    this.currentOrderId = null;
    
    // Clear intervals and watchers
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Get current position once
   */
  getCurrentPosition() {
    if (!this.isTracking || !this.currentOrderId) return;
    
    navigator.geolocation.getCurrentPosition(
      this.onPositionUpdate.bind(this),
      this.onPositionError.bind(this),
      this.geoOptions
    );
  }

  /**
   * Handle successful position update
   * @param {Position} position - Geolocation position object
   */
  async onPositionUpdate(position) {
    if (!this.isTracking || !this.currentOrderId) return;
    
    const newPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date()
    };
    
    console.log('📍 Rider position updated:', newPosition);
    
    try {
      // Only update if position has changed significantly (>5 meters)
      if (this.hasPositionChanged(newPosition)) {
        await updateRiderLocation(this.currentOrderId, newPosition);
        this.lastPosition = newPosition;
        
        // Trigger custom event for UI updates
        this.dispatchLocationUpdate(newPosition);
      }
    } catch (error) {
      console.error('❌ Failed to update rider location:', error);
    }
  }

  /**
   * Handle geolocation errors
   * @param {PositionError} error - Geolocation error object
   */
  onPositionError(error) {
    console.error('❌ Geolocation error:', error);
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        console.error('Location access denied by user');
        break;
      case error.POSITION_UNAVAILABLE:
        console.error('Location information is unavailable');
        break;
      case error.TIMEOUT:
        console.error('Location request timed out');
        break;
      default:
        console.error('An unknown geolocation error occurred');
        break;
    }
    
    // Dispatch error event
    this.dispatchLocationError(error);
  }

  /**
   * Check if position has changed significantly
   * @param {object} newPosition - New position object
   * @returns {boolean} True if position changed significantly
   */
  hasPositionChanged(newPosition) {
    if (!this.lastPosition) return true;
    
    const distance = this.calculateDistance(
      this.lastPosition.lat,
      this.lastPosition.lng,
      newPosition.lat,
      newPosition.lng
    );
    
    // Update if moved more than 5 meters
    return distance > 0.005; // ~5 meters
  }

  /**
   * Calculate distance between two coordinates in kilometers
   * @param {number} lat1 - Latitude 1
   * @param {number} lng1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lng2 - Longitude 2
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Dispatch location update event
   * @param {object} position - Position object
   */
  dispatchLocationUpdate(position) {
    const event = new CustomEvent('riderLocationUpdate', {
      detail: {
        orderId: this.currentOrderId,
        position: position
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Dispatch location error event
   * @param {PositionError} error - Geolocation error
   */
  dispatchLocationError(error) {
    const event = new CustomEvent('riderLocationError', {
      detail: {
        orderId: this.currentOrderId,
        error: error
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Set update interval
   * @param {number} interval - Interval in milliseconds
   */
  setUpdateInterval(interval) {
    this.updateInterval = interval;
    
    // Restart tracking with new interval if currently tracking
    if (this.isTracking && this.currentOrderId) {
      const orderId = this.currentOrderId;
      this.stopTracking();
      setTimeout(() => this.startTracking(orderId), 100);
    }
  }

  /**
   * Get current tracking status
   * @returns {object} Tracking status object
   */
  getStatus() {
    return {
      isTracking: this.isTracking,
      currentOrderId: this.currentOrderId,
      updateInterval: this.updateInterval,
      lastPosition: this.lastPosition
    };
  }

  /**
   * Simulate rider movement for testing
   * @param {string} firebaseOrderId - Firebase order document ID
   * @param {object} startPosition - Starting position {lat, lng}
   * @param {object} endPosition - Ending position {lat, lng}
   */
  startSimulation(firebaseOrderId, startPosition, endPosition) {
    console.log('🧪 Starting rider location simulation');
    
    this.currentOrderId = firebaseOrderId;
    this.isTracking = true;
    
    let step = 0;
    const totalSteps = 100;
    
    this.trackingInterval = setInterval(async () => {
      if (!this.isTracking) return;
      
      step++;
      const progress = step / totalSteps;
      
      // Interpolate position
      const simulatedPosition = {
        lat: startPosition.lat + (endPosition.lat - startPosition.lat) * progress,
        lng: startPosition.lng + (endPosition.lng - startPosition.lng) * progress
      };
      
      try {
        await updateRiderLocation(this.currentOrderId, simulatedPosition);
        this.dispatchLocationUpdate(simulatedPosition);
        
        console.log(`🧪 Simulation step ${step}/${totalSteps}:`, simulatedPosition);
        
        if (step >= totalSteps) {
          this.stopTracking();
          console.log('🧪 Simulation completed');
        }
      } catch (error) {
        console.error('❌ Simulation update failed:', error);
      }
    }, 2000); // Update every 2 seconds for simulation
  }
}

// Create singleton instance
const riderLocationService = new RiderLocationService();

export default riderLocationService;