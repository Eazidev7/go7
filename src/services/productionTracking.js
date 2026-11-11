// GO7 Production Live Tracking Service
// 🔴 Real rider tracking: Use navigator.geolocation to get GPS and send live coordinates to Firestore.
// 🟢 Real customer map: Use Leaflet to subscribe to Firestore updates and move rider marker in real-time.
// This is production-level logic for RiderTracker.jsx and CustomerTracker.jsx inside Go7 delivery app.

import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase'; // <- actual Firebase config file
import L from 'leaflet';

// -------------------------------
// 📍 RIDER TRACKING FUNCTION (for RiderTracker component)
// -------------------------------

export function startRiderTracking(deliveryId, riderId) {
  if (!navigator.geolocation) {
    console.error("❌ GPS not supported on this device");
    return null;
  }

  console.log(`🚴‍♂️ Starting production rider tracking for delivery: ${deliveryId}`);

  const trackingInterval = setInterval(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          await setDoc(doc(db, "rider_locations", deliveryId), {
            lat: latitude,
            lng: longitude,
            riderId,
            updatedAt: new Date().toISOString(),
          });

          console.log(`📍 Production location sent: ${latitude}, ${longitude}`);
        } catch (error) {
          console.error("❌ Production tracking error:", error);
        }
      },
      (error) => {
        console.error("❌ GPS error:", error);
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  }, 5000);

  return trackingInterval;
}

// -------------------------------
// 🗺 CUSTOMER SIDE MAP TRACKING (for CustomerTracker component)
// -------------------------------

export function initCustomerTrackingMap(deliveryId, map) {
  let marker;

  console.log(`👀 Starting production customer tracking for delivery: ${deliveryId}`);

  const unsubscribe = onSnapshot(doc(db, "rider_locations", deliveryId), (snap) => {
    const data = snap.data();
    if (!data) {
      console.log("📍 No rider data available");
      return;
    }

    const { lat, lng } = data;
    console.log(`📍 Production customer update: ${lat}, ${lng}`);

    if (!marker) {
      // Create new rider marker
      marker = L.marker([lat, lng], {
        icon: L.icon({
          iconUrl: "https://cdn-icons-png.flaticon.com/512/1048/1048318.png",
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36]
        }),
      }).addTo(map);

      // Center map on rider
      map.setView([lat, lng], 15);
    } else {
      // Update existing marker position
      marker.setLatLng([lat, lng]);
    }
  }, (error) => {
    console.error("❌ Production customer tracking error:", error);
  });

  return unsubscribe;
}

// -------------------------------
// 🧹 CLEANUP FUNCTIONS
// -------------------------------

export function stopRiderTracking(trackingInterval) {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    console.log("🛑 Production rider tracking stopped");
  }
}

export function stopCustomerTracking(unsubscribe) {
  if (unsubscribe) {
    unsubscribe();
    console.log("🛑 Production customer tracking stopped");
  }
}

// -------------------------------
// 🎯 PRODUCTION DEMO HELPER
// -------------------------------

export function createDeliverySession() {
  const deliveryId = `GO7-${Date.now()}`;
  const riderId = `RIDER-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  console.log(`🎯 Production delivery session created: ${deliveryId} | Rider: ${riderId}`);
  
  return { deliveryId, riderId };
}