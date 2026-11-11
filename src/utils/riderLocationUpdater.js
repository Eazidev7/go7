import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

class RiderLocationUpdater {
  constructor() {
    this.watchId = null;
    this.deliveryId = null;
    this.lastPosition = null;
    this.lastUpdateTime = 0;
    this.isTracking = false;
    this.updateThrottle = 4000; // 4 seconds between updates
    this.minDistanceThreshold = 10; // 10 meters minimum movement
  }

  // Start tracking rider location
  startTracking(deliveryId) {
    if (!deliveryId) {
      throw new Error('Delivery ID is required');
    }

    if (this.isTracking) {
      console.warn('Location tracking already active');
      return;
    }

    this.deliveryId = deliveryId;
    this.isTracking = true;

    console.log(`🏍️ Starting location tracking for delivery: ${deliveryId}`);

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
      this.onPositionUpdate.bind(this),
      this.onPositionError.bind(this),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );
  }

  // Stop tracking
  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.isTracking = false;
    this.deliveryId = null;
    this.lastPosition = null;
    this.lastUpdateTime = 0;

    console.log('🛑 Location tracking stopped');
  }

  // Handle position updates
  async onPositionUpdate(position) {
    const now = Date.now();
    const coords = position.coords;

    // Calculate distance from last position
    let distanceMoved = 0;
    if (this.lastPosition) {
      distanceMoved = this.calculateDistance(
        this.lastPosition.latitude,
        this.lastPosition.longitude,
        coords.latitude,
        coords.longitude
      );
    }

    // Check throttling conditions
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    const shouldUpdate = 
      !this.lastPosition || // First position
      timeSinceLastUpdate >= this.updateThrottle || // Enough time passed
      distanceMoved >= this.minDistanceThreshold; // Moved enough distance

    if (!shouldUpdate) {
      console.log(`📍 Position update throttled (moved: ${distanceMoved.toFixed(1)}m, time: ${timeSinceLastUpdate}ms)`);
      return;
    }

    const locationData = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      speed: coords.speed ? Math.round(coords.speed * 3.6) : 0, // Convert m/s to km/h
      heading: coords.heading || 0,
      timestamp: now
    };

    try {
      // Update Firestore
      const deliveryRef = doc(db, 'deliveries', this.deliveryId);
      await updateDoc(deliveryRef, {
        riderLocation: locationData,
        lastUpdated: serverTimestamp()
      });

      this.lastPosition = locationData;
      this.lastUpdateTime = now;

      console.log(`✅ Location updated for ${this.deliveryId}:`, {
        lat: coords.latitude.toFixed(6),
        lng: coords.longitude.toFixed(6),
        speed: locationData.speed,
        accuracy: coords.accuracy.toFixed(1),
        moved: distanceMoved.toFixed(1) + 'm'
      });

    } catch (error) {
      console.error('❌ Failed to update rider location:', error);
    }
  }

  // Handle position errors
  onPositionError(error) {
    console.error('📍 Geolocation error:', error);
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        console.error('User denied the request for Geolocation');
        break;
      case error.POSITION_UNAVAILABLE:
        console.error('Location information is unavailable');
        break;
      case error.TIMEOUT:
        console.error('The request to get user location timed out');
        break;
      default:
        console.error('An unknown error occurred');
        break;
    }
  }

  // Calculate distance between two points using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Get current tracking status
  getStatus() {
    return {
      isTracking: this.isTracking,
      deliveryId: this.deliveryId,
      lastPosition: this.lastPosition,
      lastUpdateTime: this.lastUpdateTime
    };
  }

  // Force immediate update (useful for testing)
  async forceUpdate() {
    if (!this.isTracking) {
      console.warn('Cannot force update: tracking not active');
      return;
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await this.onPositionUpdate(position);
          resolve(position);
        },
        reject,
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  }
}

// Create singleton instance
const riderLocationUpdater = new RiderLocationUpdater();

// Export functions
export const startTracking = (deliveryId) => riderLocationUpdater.startTracking(deliveryId);
export const stopTracking = () => riderLocationUpdater.stopTracking();
export const getTrackingStatus = () => riderLocationUpdater.getStatus();
export const forceLocationUpdate = () => riderLocationUpdater.forceUpdate();

export default riderLocationUpdater;