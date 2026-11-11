import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * RiderLocationSync - Manages real-time rider location updates
 * Updates rider location in Firestore every 10 seconds
 * Handles status tracking: active, offline, delivering
 */

let locationUpdateInterval = null;
let currentRiderId = null;

/**
 * Start syncing rider location to Firebase
 * @param {string} riderId - The rider's unique ID
 * @param {Object} options - Configuration options
 * @param {number} options.interval - Update interval in milliseconds (default: 10000)
 * @param {boolean} options.enableGeolocation - Whether to use GPS (default: true)
 */
export const startLocationSync = async (riderId, options = {}) => {
  const { 
    interval = 10000, // 10 seconds
    enableGeolocation = true 
  } = options;

  if (!riderId) {
    console.error('RiderLocationSync: riderId is required');
    return;
  }

  if (!db) {
    console.warn('RiderLocationSync: Firebase not configured, using mock updates');
    startMockLocationSync(riderId, interval);
    return;
  }

  currentRiderId = riderId;

  // Clear any existing interval
  if (locationUpdateInterval) {
    clearInterval(locationUpdateInterval);
  }

  console.log(`Starting location sync for rider ${riderId} every ${interval}ms`);

  // Update location immediately
  await updateRiderLocation(riderId, null, 'active');

  // Set up interval for regular updates
  locationUpdateInterval = setInterval(async () => {
    try {
      if (enableGeolocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              heading: position.coords.heading,
              speed: position.coords.speed
            };
            await updateRiderLocation(riderId, location, 'active');
          },
          (error) => {
            console.warn('Geolocation error:', error);
            // Use mock location on error
            const mockLocation = generateMockLocation();
            updateRiderLocation(riderId, mockLocation, 'active');
          },
          {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 5000
          }
        );
      } else {
        // Fallback to mock location if geolocation not available
        const mockLocation = generateMockLocation();
        await updateRiderLocation(riderId, mockLocation, 'active');
      }
    } catch (error) {
      console.error('Location sync error:', error);
    }
  }, interval);
};

/**
 * Stop syncing rider location
 * Sets rider status to offline
 */
export const stopLocationSync = async () => {
  if (locationUpdateInterval) {
    clearInterval(locationUpdateInterval);
    locationUpdateInterval = null;
  }

  if (currentRiderId) {
    try {
      await updateRiderLocation(currentRiderId, null, 'offline');
      console.log(`Stopped location sync for rider ${currentRiderId}`);
      currentRiderId = null;
    } catch (error) {
      console.error('Error stopping location sync:', error);
    }
  }
};

/**
 * Update rider location and status in Firestore
 * @param {string} riderId - Rider ID
 * @param {Object} location - Location object {lat, lng}
 * @param {string} status - Rider status (active, offline, delivering)
 */
export const updateRiderLocation = async (riderId, location, status = 'active') => {
  try {
    if (!db) {
      console.log(`Mock update - Rider ${riderId}: ${status}`, location);
      return;
    }

    const updateData = {
      status,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (location) {
      updateData.currentLocation = location;
      updateData.locationTimestamp = serverTimestamp();
    }

    await updateDoc(doc(db, 'riders', riderId), updateData);
    
    console.log(`Updated rider ${riderId} location:`, { location, status });
  } catch (error) {
    console.error('Error updating rider location:', error);
    throw error;
  }
};

/**
 * Set rider status (active, offline, delivering)
 * @param {string} riderId - Rider ID  
 * @param {string} status - New status
 */
export const setRiderStatus = async (riderId, status) => {
  try {
    await updateRiderLocation(riderId, null, status);
  } catch (error) {
    console.error('Error setting rider status:', error);
    throw error;
  }
};

/**
 * Generate mock location for testing (Lagos area)
 * Simulates rider movement around Lagos
 */
const generateMockLocation = () => {
  // Lagos center coordinates with some random movement
  const baseLat = 6.5244;
  const baseLng = 3.3792;
  
  // Random movement within ~5km radius
  const latOffset = (Math.random() - 0.5) * 0.05; // ~2.5km
  const lngOffset = (Math.random() - 0.5) * 0.05; // ~2.5km
  
  return {
    lat: baseLat + latOffset,
    lng: baseLng + lngOffset,
    accuracy: Math.random() * 20 + 5, // 5-25 meter accuracy
    heading: Math.random() * 360, // Random direction
    speed: Math.random() * 15 + 5 // 5-20 km/h
  };
};

/**
 * Mock location sync for demo purposes
 */
const startMockLocationSync = (riderId, interval) => {
  console.log(`Starting mock location sync for rider ${riderId}`);
  
  locationUpdateInterval = setInterval(() => {
    const mockLocation = generateMockLocation();
    console.log(`Mock location update for ${riderId}:`, mockLocation);
  }, interval);
};

/**
 * Get current rider status
 */
export const getCurrentRiderId = () => currentRiderId;

/**
 * Check if location sync is active
 */
export const isLocationSyncActive = () => locationUpdateInterval !== null;

/**
 * Batch update multiple riders (for admin use)
 * @param {Array} riderUpdates - Array of {riderId, location, status}
 */
export const batchUpdateRiders = async (riderUpdates) => {
  try {
    if (!db) {
      console.log('Mock batch update:', riderUpdates);
      return;
    }

    const promises = riderUpdates.map(({ riderId, location, status }) => 
      updateRiderLocation(riderId, location, status)
    );

    await Promise.all(promises);
    console.log(`Batch updated ${riderUpdates.length} riders`);
  } catch (error) {
    console.error('Error in batch update:', error);
    throw error;
  }
};

/**
 * Emergency location update (immediate)
 * @param {string} riderId - Rider ID
 * @param {string} emergencyType - Type of emergency
 */
export const emergencyLocationUpdate = async (riderId, emergencyType = 'emergency') => {
  try {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            emergency: true,
            emergencyType,
            timestamp: new Date().toISOString()
          };
          
          await updateRiderLocation(riderId, location, 'emergency');
          console.log('Emergency location sent:', location);
        },
        (error) => {
          console.error('Emergency geolocation failed:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  } catch (error) {
    console.error('Emergency update error:', error);
    throw error;
  }
};

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stopLocationSync();
  });
  
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && currentRiderId) {
      // App is backgrounded, reduce update frequency
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
        startLocationSync(currentRiderId, { interval: 30000 }); // 30 seconds when backgrounded
      }
    } else if (document.visibilityState === 'visible' && currentRiderId) {
      // App is active, resume normal frequency
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
        startLocationSync(currentRiderId, { interval: 10000 }); // 10 seconds when active
      }
    }
  });
}

export default {
  startLocationSync,
  stopLocationSync,
  updateRiderLocation,
  setRiderStatus,
  getCurrentRiderId,
  isLocationSyncActive,
  batchUpdateRiders,
  emergencyLocationUpdate
};