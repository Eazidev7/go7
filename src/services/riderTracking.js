// GO7 – REAL-TIME RIDER TRACKING WITH FIREBASE + LEAFLET
// ✅ Rider location is sent every few seconds to Firestore (deliveryId-based)
// ✅ Customer page listens for changes to rider location and updates the map marker
// ✅ Firestore structure: /rider_locations/{deliveryId} = { lat, lng, updatedAt, riderId }
// ✅ Use GeoLocation API on rider side, and Leaflet map + Firestore on customer side

import { doc, setDoc, onSnapshot, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase"; // import your firebase config
import L from 'leaflet'; // For direct map integration

// -------------------------------
// 🔧 UTILITY FUNCTIONS
// -------------------------------

/**
 * Calculate total distance traveled from route history
 * @param {Array} routeHistory - Array of lat/lng points
 * @returns {number} Distance in meters
 */
function calculateRouteDistance(routeHistory) {
  if (routeHistory.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < routeHistory.length; i++) {
    const prev = routeHistory[i - 1];
    const curr = routeHistory[i];
    totalDistance += getDistanceBetweenPoints(prev.lat, prev.lng, curr.lat, curr.lng);
  }
  return Math.round(totalDistance);
}

/**
 * Calculate distance between two GPS points using Haversine formula
 * @param {number} lat1 
 * @param {number} lng1 
 * @param {number} lat2 
 * @param {number} lng2 
 * @returns {number} Distance in meters
 */
function getDistanceBetweenPoints(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// -------------------------------
// 🔴 RIDER SIDE (send location)
// -------------------------------

let trackingInterval = null;
let watchId = null;
let lastLocationUpdate = 0;
const MIN_UPDATE_INTERVAL = 3000; // Minimum 3 seconds between updates
const MIN_DISTANCE_THRESHOLD = 10; // Minimum 10 meters to trigger update

/**
 * Check if location update should be sent based on time and distance thresholds
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {Object} lastLocation 
 * @returns {boolean}
 */
function shouldUpdateLocation(latitude, longitude, lastLocation) {
  const now = Date.now();
  
  // Always update if enough time has passed
  if (now - lastLocationUpdate < MIN_UPDATE_INTERVAL) {
    return false;
  }
  
  // Always update if we don't have a previous location
  if (!lastLocation) {
    return true;
  }
  
  // Check distance threshold
  const distance = getDistanceBetweenPoints(
    latitude, longitude, 
    lastLocation.lat, lastLocation.lng
  );
  
  return distance >= MIN_DISTANCE_THRESHOLD;
}

/**
 * Start sending rider location to Firebase every few seconds
 * @param {string} deliveryId - Unique delivery ID
 * @param {string} riderId - Rider's unique ID
 * @param {number} intervalMs - Update interval in milliseconds (default: 5000)
 */
export function startRiderTracking(deliveryId, riderId, intervalMs = 5000) {
  if (!navigator.geolocation) {
    console.warn("❌ No GPS available on this device");
    return null;
  }

  console.log(`🚴‍♂️ Starting rider tracking for delivery: ${deliveryId}`);

  // Stop any existing tracking
  stopRiderTracking();

  let lastLocation = null;

  // Use watchPosition for more accurate real-time tracking
  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, accuracy, speed, heading } = position.coords;
      
      // Apply throttling to reduce Firebase calls
      if (!shouldUpdateLocation(latitude, longitude, lastLocation)) {
        console.log('📍 Location update skipped (throttled)');
        return;
      }
      
      try {
        const locationData = {
          lat: latitude,
          lng: longitude,
          accuracy: accuracy, // GPS accuracy in meters
          speed: speed || 0, // Speed in m/s
          heading: heading || 0, // Direction in degrees
          updatedAt: new Date().toISOString(),
          riderId: riderId,
          status: 'active', // active, paused, completed
          timestamp: Date.now()
        };

        // Get existing data to maintain route history
        const existingDoc = await getDoc(doc(db, "rider_locations", deliveryId));
        const existingData = existingDoc.exists() ? existingDoc.data() : {};
        const routeHistory = existingData.routeHistory || [];
        
        // Add current location to route history (keep last 50 points)
        const newRoutePoint = {
          lat: latitude,
          lng: longitude,
          timestamp: Date.now(),
          accuracy: accuracy
        };
        
        const updatedHistory = [...routeHistory, newRoutePoint].slice(-50);

        // Update with route history
        await setDoc(doc(db, "rider_locations", deliveryId), {
          ...locationData,
          routeHistory: updatedHistory,
          totalDistance: calculateRouteDistance(updatedHistory)
        });
        
        lastLocation = { lat: latitude, lng: longitude };
        lastLocationUpdate = Date.now();
        
        console.log(`📍 Location updated:`, { lat: latitude, lng: longitude, accuracy, routePoints: updatedHistory.length });
        
      } catch (error) {
        console.error("❌ Error updating rider location:", error);
      }
    },
    (error) => {
      console.error("❌ GPS error:", error);
      // Handle different error types
      switch(error.code) {
        case error.PERMISSION_DENIED:
          console.error("❌ Location permission denied");
          break;
        case error.POSITION_UNAVAILABLE:
          console.error("❌ Location information unavailable");
          break;
        case error.TIMEOUT:
          console.error("❌ Location request timed out");
          break;
      }
    },
    {
      enableHighAccuracy: true, // Use GPS if available
      timeout: 10000, // 10 second timeout
      maximumAge: 1000 // Use cached position if less than 1 second old
    }
  );

  return watchId;
}

/**
 * Stop rider tracking and clean up
 * @param {string} deliveryId - Delivery ID to clean up
 */
export function stopRiderTracking(deliveryId = null) {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }

  if (deliveryId) {
    // Mark rider as inactive
    try {
      setDoc(doc(db, "rider_locations", deliveryId), {
        status: 'completed',
        updatedAt: new Date().toISOString(),
        timestamp: Date.now()
      }, { merge: true });
    } catch (error) {
      console.error("❌ Error updating rider status:", error);
    }
  }

  console.log("🛑 Rider tracking stopped");
}

/**
 * Pause rider tracking temporarily
 * @param {string} deliveryId - Delivery ID
 */
export function pauseRiderTracking(deliveryId) {
  if (deliveryId) {
    try {
      setDoc(doc(db, "rider_locations", deliveryId), {
        status: 'paused',
        updatedAt: new Date().toISOString(),
        timestamp: Date.now()
      }, { merge: true });
    } catch (error) {
      console.error("❌ Error pausing rider tracking:", error);
    }
  }
}

// -------------------------------
// 🔵 CUSTOMER SIDE (listen for location)
// -------------------------------

/**
 * Listen for real-time rider location updates
 * @param {string} deliveryId - Delivery ID to track
 * @param {function} onLocationUpdate - Callback function called with location data
 * @returns {function} Unsubscribe function
 */
export function subscribeToRiderLocation(deliveryId, onLocationUpdate) {
  console.log(`👀 Subscribing to rider location for delivery: ${deliveryId}`);
  
  const unsubscribe = onSnapshot(
    doc(db, "rider_locations", deliveryId),
    (doc) => {
      if (doc.exists()) {
        const locationData = doc.data();
        console.log(`📍 Rider location updated:`, locationData);
        
        // Call the callback with the new location
        onLocationUpdate(locationData);
      } else {
        console.log("📍 No rider location data found");
        onLocationUpdate(null);
      }
    },
    (error) => {
      console.error("❌ Error listening to rider location:", error);
    }
  );

  return unsubscribe;
}

/**
 * Get current rider location (one-time fetch)
 * @param {string} deliveryId - Delivery ID
 * @returns {Promise<Object|null>} Location data or null
 */
export async function getCurrentRiderLocation(deliveryId) {
  try {
    const docRef = doc(db, "rider_locations", deliveryId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.log("📍 No rider location found");
      return null;
    }
  } catch (error) {
    console.error("❌ Error fetching rider location:", error);
    return null;
  }
}

// -------------------------------
// � CUSTOMER SIDE (direct map integration)
// -------------------------------

let riderMarker;

/**
 * Initialize customer tracking with direct map integration
 * @param {string} deliveryId - Delivery ID to track
 * @param {Object} mapInstance - Leaflet map instance
 * @returns {Function} Unsubscribe function
 */
export function initCustomerTrackingMap(deliveryId, mapInstance) {
  console.log(`🗺️ Initializing customer map tracking for delivery: ${deliveryId}`);
  
  const riderRef = doc(db, "rider_locations", deliveryId);

  const unsubscribe = onSnapshot(riderRef, (docSnap) => {
    const data = docSnap.data();
    if (!data) {
      console.log("📍 No rider data available");
      return;
    }

    const { lat, lng } = data;
    console.log(`📍 Customer map update:`, { lat, lng });

    if (!riderMarker) {
      // Create new rider marker
      riderMarker = L.marker([lat, lng], {
        icon: L.icon({
          iconUrl: "https://cdn-icons-png.flaticon.com/512/1048/1048318.png",
          iconSize: [38, 38],
          iconAnchor: [19, 38],
          popupAnchor: [0, -38]
        }),
      }).addTo(mapInstance);
      
      // Add popup with rider info
      riderMarker.bindPopup(`
        <div style="text-align: center;">
          <strong>🚴‍♂️ Your Delivery Rider</strong><br/>
          <small>Last updated: ${new Date(data.updatedAt).toLocaleTimeString()}</small>
        </div>
      `);
    } else {
      // Update existing marker position
      riderMarker.setLatLng([lat, lng]);
      
      // Update popup content
      riderMarker.setPopupContent(`
        <div style="text-align: center;">
          <strong>🚴‍♂️ Your Delivery Rider</strong><br/>
          <small>Last updated: ${new Date(data.updatedAt).toLocaleTimeString()}</small>
          ${data.speed > 0 ? `<br/><small>Speed: ${Math.round(data.speed * 3.6)} km/h</small>` : ''}
        </div>
      `);
    }
  }, (error) => {
    console.error("❌ Error in customer map tracking:", error);
  });

  return unsubscribe;
}

/**
 * Clean up customer map tracking
 */
export function cleanupCustomerMap(mapInstance) {
  if (riderMarker && mapInstance) {
    mapInstance.removeLayer(riderMarker);
    riderMarker = null;
    console.log("🧹 Customer map tracking cleaned up");
  }
}

// -------------------------------
// �📦 DELIVERY STATUS MANAGEMENT
// -------------------------------

/**
 * Update delivery status (picked up, en route, delivered, etc.)
 * @param {string} deliveryId - Delivery ID
 * @param {string} status - New status ('preparing', 'picked_up', 'en_route', 'delivered', 'cancelled')
 * @param {Object} extraData - Additional data to include
 */
export async function updateDeliveryStatus(deliveryId, status, extraData = {}) {
  try {
    const statusData = {
      deliveryStatus: status,
      statusUpdatedAt: new Date().toISOString(),
      statusTimestamp: Date.now(),
      ...extraData
    };

    await setDoc(doc(db, "rider_locations", deliveryId), statusData, { merge: true });
    console.log(`📦 Delivery status updated to: ${status}`);
    
    return true;
  } catch (error) {
    console.error("❌ Error updating delivery status:", error);
    throw error;
  }
}

/**
 * Mark order as picked up from restaurant
 * @param {string} deliveryId 
 * @param {string} restaurantName 
 */
export async function markOrderPickedUp(deliveryId, restaurantName = '') {
  return updateDeliveryStatus(deliveryId, 'picked_up', {
    pickupTime: new Date().toISOString(),
    restaurant: restaurantName,
    estimatedDelivery: new Date(Date.now() + 20 * 60 * 1000).toISOString() // +20 minutes
  });
}

/**
 * Mark order as delivered
 * @param {string} deliveryId 
 * @param {Object} deliveryDetails 
 */
export async function markOrderDelivered(deliveryId, deliveryDetails = {}) {
  // Stop tracking when delivered
  stopRiderTracking(deliveryId);
  
  return updateDeliveryStatus(deliveryId, 'delivered', {
    deliveryTime: new Date().toISOString(),
    ...deliveryDetails
  });
}

/**
 * Delete rider location data (cleanup after delivery completion)
 * @param {string} deliveryId - Delivery ID to clean up
 */
export async function deleteRiderLocation(deliveryId) {
  try {
    await deleteDoc(doc(db, "rider_locations", deliveryId));
    console.log(`🗑️ Rider location data deleted for delivery: ${deliveryId}`);
  } catch (error) {
    console.error("❌ Error deleting rider location:", error);
  }
}

// -------------------------------
// 🔧 UTILITY FUNCTIONS
// -------------------------------

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude 1
 * @param {number} lng1 - Longitude 1  
 * @param {number} lat2 - Latitude 2
 * @param {number} lng2 - Longitude 2
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Format speed from m/s to km/h
 * @param {number} speedMs - Speed in meters per second
 * @returns {string} Formatted speed string
 */
export function formatSpeed(speedMs) {
  if (!speedMs || speedMs < 0) return "0 km/h";
  const kmh = speedMs * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

/**
 * Check if location data is recent (within last 30 seconds)
 * @param {string} updatedAt - ISO timestamp
 * @returns {boolean} True if recent
 */
export function isLocationRecent(updatedAt) {
  const now = new Date();
  const locationTime = new Date(updatedAt);
  const diffMs = now - locationTime;
  return diffMs < 30000; // 30 seconds
}