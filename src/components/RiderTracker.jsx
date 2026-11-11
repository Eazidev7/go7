// GO7 RiderTracker.jsx
// ✅ This component uses the device's GPS to send live location updates to Firebase Firestore
// ✅ It writes to: /rider_locations/{deliveryId}
// ✅ Use in rider dashboard or mobile view when rider starts delivery
// ✅ Requires: deliveryId and riderId props

import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { startRiderTracking as startProductionTracking, stopRiderTracking } from '../services/productionTracking';

export default function RiderTracker({ deliveryId, riderId, onStatusChange }) {
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [trackingInterval, setTrackingInterval] = useState(null);

  // 📍 PRODUCTION RIDER TRACKING FUNCTION - LIVE CODE
  function startRiderTracking(deliveryId, riderId) {
    if (!navigator.geolocation) {
      alert("Device does not support location tracking.");
      return false;
    }

    console.log(`🚴‍♂️ Starting PRODUCTION GO7 rider tracking for delivery: ${deliveryId}`);

    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;

          try {
            // PRODUCTION FIRESTORE WRITE - LIVE
            await setDoc(doc(db, "rider_locations", deliveryId), {
              lat: latitude,
              lng: longitude,
              riderId,
              updatedAt: new Date().toISOString(),
            });

            setLastUpdate(new Date().toLocaleTimeString());
            setLocationError(null);
            console.log(`📍 PRODUCTION Location sent: ${latitude}, ${longitude}`);
            
          } catch (error) {
            console.error("❌ PRODUCTION tracking error:", error);
            setLocationError("Failed to send location");
          }
        },
        (error) => {
          console.error("❌ PRODUCTION GPS Error:", error);
          setLocationError(error.message);
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
    }, 5000); // PRODUCTION: every 5 seconds

    setTrackingInterval(interval);
    return true;
  }

  // Stop tracking function
  function stopRiderTracking() {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
      console.log("🛑 GO7 rider tracking stopped");
    }
  }

  // Handle start tracking
  const handleStartTracking = () => {
    if (!deliveryId || !riderId) {
      alert("Delivery ID and Rider ID are required");
      return;
    }

    const success = startRiderTracking(deliveryId, riderId);
    if (success) {
      setIsTracking(true);
      onStatusChange?.({ status: 'tracking', deliveryId, riderId });
    }
  };

  // Handle stop tracking
  const handleStopTracking = () => {
    stopRiderTracking();
    setIsTracking(false);
    setLastUpdate(null);
    setLocationError(null);
    onStatusChange?.({ status: 'stopped', deliveryId, riderId });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
    };
  }, [trackingInterval]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🚴‍♂️ GO7 Rider Tracker</h2>
        <p className="text-gray-600">Live GPS tracking for delivery</p>
      </div>

      {/* Delivery Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery ID:</span>
            <span className="font-mono text-sm">{deliveryId || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Rider ID:</span>
            <span className="font-mono text-sm">{riderId || 'Not set'}</span>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-center mb-6">
        <div className={`w-4 h-4 rounded-full mr-3 ${
          isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        }`}></div>
        <span className={`font-medium ${
          isTracking ? 'text-green-600' : 'text-gray-600'
        }`}>
          {isTracking ? 'Live Tracking Active' : 'Tracking Inactive'}
        </span>
      </div>

      {/* Control Button */}
      <div className="space-y-4">
        {!isTracking ? (
          <button
            onClick={handleStartTracking}
            disabled={!deliveryId || !riderId}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            📍 Start Live Tracking
          </button>
        ) : (
          <button
            onClick={handleStopTracking}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            🛑 Stop Tracking
          </button>
        )}
      </div>

      {/* Status Messages */}
      {lastUpdate && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">
            ✅ Last location sent: {lastUpdate}
          </p>
        </div>
      )}

      {locationError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">
            ❌ {locationError}
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">📋 Instructions:</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Allow location permissions when prompted</li>
          <li>• Keep this page open during delivery</li>
          <li>• Location updates every 5 seconds</li>
          <li>• Customer can see live updates on map</li>
        </ul>
      </div>
    </div>
  );
}