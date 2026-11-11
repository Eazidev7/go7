// GO7 Rider Location Tracking Service
// Handles real-time location tracking during deliveries for route recording

import { collection, doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export class RiderLocationTracker {
  constructor(deliveryId, riderId) {
    this.deliveryId = deliveryId;
    this.riderId = riderId;
    this.isTracking = false;
    this.locationBuffer = [];
    this.lastPosition = null;
    this.trackingInterval = null;
    this.uploadInterval = null;
    
    // Configuration
    this.config = {
      trackingIntervalMs: 2000,        // Track location every 2 seconds
      uploadIntervalMs: 10000,         // Upload batch every 10 seconds
      maxBufferSize: 10,               // Max points to buffer before upload
      minDistanceMeters: 5,            // Minimum distance to record new point
      maxAccuracy: 50                  // Maximum GPS accuracy to accept (meters)
    };
  }

  // Start location tracking
  async startTracking() {
    if (this.isTracking) return;
    
    try {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      this.isTracking = true;
      console.log(`🛵 Starting location tracking for delivery ${this.deliveryId}`);

      // Start location tracking
      this.trackingInterval = setInterval(() => {
        this.getCurrentLocation();
      }, this.config.trackingIntervalMs);

      // Start periodic upload
      this.uploadInterval = setInterval(() => {
        this.uploadLocationBatch();
      }, this.config.uploadIntervalMs);

      // Initial location
      await this.getCurrentLocation();
      
      return { success: true };
    } catch (error) {
      console.error('Error starting location tracking:', error);
      this.isTracking = false;
      return { success: false, error: error.message };
    }
  }

  // Stop location tracking
  async stopTracking() {
    if (!this.isTracking) return;
    
    console.log(`🛑 Stopping location tracking for delivery ${this.deliveryId}`);
    
    this.isTracking = false;
    
    // Clear intervals
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }

    // Upload any remaining buffered locations
    if (this.locationBuffer.length > 0) {
      await this.uploadLocationBatch();
    }

    return { success: true };
  }

  // Get current location
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          try {
            const { latitude, longitude, accuracy, speed, heading } = position.coords;
            
            // Filter out inaccurate readings
            if (accuracy > this.config.maxAccuracy) {
              console.warn(`📍 Location accuracy too low: ${accuracy}m`);
              resolve(null);
              return;
            }

            const newLocation = {
              lat: latitude,
              lng: longitude,
              accuracy: accuracy,
              speed: speed || 0, // m/s
              bearing: heading || 0, // degrees
              ts: Date.now()
            };

            // Check if we should record this location
            if (this.shouldRecordLocation(newLocation)) {
              this.addLocationToBuffer(newLocation);
              this.lastPosition = newLocation;
            }

            resolve(newLocation);
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
    });
  }

  // Check if location should be recorded
  shouldRecordLocation(newLocation) {
    if (!this.lastPosition) return true;
    
    // Calculate distance from last position
    const distance = this.calculateDistance(
      this.lastPosition.lat, this.lastPosition.lng,
      newLocation.lat, newLocation.lng
    );
    
    // Record if moved minimum distance or significant time passed
    const timeDiff = newLocation.ts - this.lastPosition.ts;
    const significantTimeGap = timeDiff > 30000; // 30 seconds
    
    return distance >= this.config.minDistanceMeters || significantTimeGap;
  }

  // Add location to buffer
  addLocationToBuffer(location) {
    this.locationBuffer.push(location);
    
    // Upload if buffer is full
    if (this.locationBuffer.length >= this.config.maxBufferSize) {
      this.uploadLocationBatch();
    }
  }

  // Upload location batch to Firestore
  async uploadLocationBatch() {
    if (this.locationBuffer.length === 0) return;
    
    try {
      const batch = [...this.locationBuffer];
      this.locationBuffer = []; // Clear buffer immediately
      
      console.log(`📤 Uploading ${batch.length} location points for delivery ${this.deliveryId}`);
      
      // Update delivery route document
      const routeRef = doc(db, 'deliveryRoutes', this.deliveryId);
      
      await updateDoc(routeRef, {
        path: arrayUnion(...batch),
        lastUpdated: Timestamp.now(),
        'meta.totalPoints': batch.length // This will need proper increment logic
      });

      console.log(`✅ Successfully uploaded ${batch.length} points`);
      
    } catch (error) {
      console.error('Error uploading location batch:', error);
      
      // Re-add failed locations to buffer for retry
      this.locationBuffer.unshift(...this.locationBuffer);
    }
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Convert degrees to radians
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Get tracking status
  getStatus() {
    return {
      isTracking: this.isTracking,
      bufferSize: this.locationBuffer.length,
      lastPosition: this.lastPosition,
      deliveryId: this.deliveryId,
      riderId: this.riderId
    };
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Singleton tracker instance
let activeTracker = null;

// Factory functions for easy use
export const startDeliveryTracking = async (deliveryId, riderId, config = {}) => {
  // Stop any existing tracker
  if (activeTracker) {
    await activeTracker.stopTracking();
  }
  
  // Create new tracker
  activeTracker = new RiderLocationTracker(deliveryId, riderId);
  
  if (config) {
    activeTracker.updateConfig(config);
  }
  
  return await activeTracker.startTracking();
};

export const stopDeliveryTracking = async () => {
  if (activeTracker) {
    const result = await activeTracker.stopTracking();
    activeTracker = null;
    return result;
  }
  return { success: true };
};

export const getTrackingStatus = () => {
  return activeTracker ? activeTracker.getStatus() : null;
};

// Initialize delivery route document
export const initializeDeliveryRoute = async (deliveryData) => {
  try {
    const routeRef = doc(db, 'deliveryRoutes', deliveryData.orderId);
    
    await updateDoc(routeRef, {
      orderId: deliveryData.orderId,
      userId: deliveryData.userId,
      riderId: deliveryData.riderId,
      startedAt: Timestamp.now(),
      status: 'active',
      path: [],
      meta: {
        distanceMeters: 0,
        avgSpeed: 0,
        totalPoints: 0
      },
      pickup: deliveryData.pickup || null,
      delivery: deliveryData.delivery || null
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing delivery route:', error);
    return { success: false, error: error.message };
  }
};

// Finalize delivery route
export const finalizeDeliveryRoute = async (deliveryId, finalStats = {}) => {
  try {
    const routeRef = doc(db, 'deliveryRoutes', deliveryId);
    
    await updateDoc(routeRef, {
      endedAt: Timestamp.now(),
      status: 'completed',
      'meta.distanceMeters': finalStats.totalDistance || 0,
      'meta.avgSpeed': finalStats.avgSpeed || 0,
      'meta.maxSpeed': finalStats.maxSpeed || 0,
      'meta.duration': finalStats.duration || 0
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error finalizing delivery route:', error);
    return { success: false, error: error.message };
  }
};

// Export default class for advanced usage
export default RiderLocationTracker;