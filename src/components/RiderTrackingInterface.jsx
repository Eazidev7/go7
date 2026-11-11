import React, { useState, useEffect } from 'react';
import { FaPlay, FaPause, FaStop, FaMapMarkerAlt, FaTachometerAlt, FaCompass, FaBox, FaCheckCircle } from 'react-icons/fa';
import { 
  startRiderTracking, 
  stopRiderTracking, 
  pauseRiderTracking, 
  formatSpeed,
  updateDeliveryStatus,
  markOrderPickedUp,
  markOrderDelivered 
} from '../services/riderTracking';

export default function RiderTrackingInterface({ 
  defaultDeliveryId = '', 
  defaultRiderId = '',
  onTrackingStart,
  onTrackingStop,
  showLocationInfo = true 
}) {
  const [deliveryId, setDeliveryId] = useState(defaultDeliveryId);
  const [riderId, setRiderId] = useState(defaultRiderId);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState('preparing'); // preparing, picked_up, en_route, delivered

  // Monitor GPS location for display
  useEffect(() => {
    if (isTracking && !isPaused) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: new Date().toLocaleTimeString()
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError(error.message);
          console.error('Location error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000
        }
      );

      return () => {
        if (id) navigator.geolocation.clearWatch(id);
      };
    }
  }, [isTracking, isPaused]);

  const handleStartTracking = () => {
    if (!deliveryId.trim() || !riderId.trim()) {
      alert('Please enter both Delivery ID and Rider ID');
      return;
    }

    if (!navigator.geolocation) {
      alert('GPS is not available on this device');
      return;
    }

    console.log('🚴‍♂️ Starting rider tracking');
    const id = startRiderTracking(deliveryId.trim(), riderId.trim());
    
    if (id) {
      setWatchId(id);
      setIsTracking(true);
      setIsPaused(false);
      onTrackingStart?.(deliveryId.trim(), riderId.trim());
    }
  };

  const handlePauseTracking = () => {
    console.log('⏸️ Pausing rider tracking');
    pauseRiderTracking(deliveryId);
    setIsPaused(true);
  };

  const handleResumeTracking = () => {
    console.log('▶️ Resuming rider tracking');
    // Resume by starting tracking again
    const id = startRiderTracking(deliveryId.trim(), riderId.trim());
    if (id) {
      setWatchId(id);
      setIsPaused(false);
    }
  };

  const handleStopTracking = () => {
    console.log('🛑 Stopping rider tracking');
    stopRiderTracking(deliveryId);
    setIsTracking(false);
    setIsPaused(false);
    setCurrentLocation(null);
    setWatchId(null);
    onTrackingStop?.(deliveryId);
  };

  // Delivery Status Handlers
  const handlePickedUp = async () => {
    try {
      await markOrderPickedUp(deliveryId, 'GO7 Restaurant');
      setDeliveryStatus('picked_up');
      console.log('📦 Order marked as picked up');
    } catch (error) {
      console.error('Error marking picked up:', error);
    }
  };

  const handleEnRoute = async () => {
    try {
      await updateDeliveryStatus(deliveryId, 'en_route');
      setDeliveryStatus('en_route');
      console.log('🚗 Order marked as en route');
    } catch (error) {
      console.error('Error marking en route:', error);
    }
  };

  const handleDelivered = async () => {
    try {
      await markOrderDelivered(deliveryId, { deliveryNotes: 'Delivered successfully' });
      setDeliveryStatus('delivered');
      handleStopTracking(); // Auto-stop tracking when delivered
      console.log('✅ Order marked as delivered');
    } catch (error) {
      console.error('Error marking delivered:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center mb-6">
        <FaMapMarkerAlt className="text-red-500 text-2xl mr-3" />
        <h2 className="text-xl font-bold text-gray-800">Rider GPS Tracking</h2>
      </div>

      {/* Input Fields */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery ID
          </label>
          <input
            type="text"
            value={deliveryId}
            onChange={(e) => setDeliveryId(e.target.value)}
            placeholder="Enter delivery ID (e.g., DEL-12345)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            disabled={isTracking}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rider ID
          </label>
          <input
            type="text"
            value={riderId}
            onChange={(e) => setRiderId(e.target.value)}
            placeholder="Enter rider ID (e.g., RIDER-001)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            disabled={isTracking}
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="space-y-3 mb-6">
        {!isTracking ? (
          <button
            onClick={handleStartTracking}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            <FaPlay className="mr-2" />
            Start Tracking
          </button>
        ) : (
          <div className="space-y-2">
            {!isPaused ? (
              <button
                onClick={handlePauseTracking}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
              >
                <FaPause className="mr-2" />
                Pause Tracking
              </button>
            ) : (
              <button
                onClick={handleResumeTracking}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
              >
                <FaPlay className="mr-2" />
                Resume Tracking
              </button>
            )}
            
            <button
              onClick={handleStopTracking}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
            >
              <FaStop className="mr-2" />
              Stop Tracking
            </button>
          </div>
        )}
      </div>

      {/* Delivery Status Controls */}
      {isTracking && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">📦 Delivery Status</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePickedUp}
              disabled={deliveryStatus !== 'preparing'}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                deliveryStatus === 'picked_up' ? 'bg-green-100 text-green-800 cursor-not-allowed' :
                deliveryStatus === 'preparing' ? 'bg-blue-500 hover:bg-blue-600 text-white' :
                'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FaBox className="mr-1 text-xs" />
              {deliveryStatus === 'picked_up' ? 'Picked Up ✓' : 'Pick Up'}
            </button>
            
            <button
              onClick={handleEnRoute}
              disabled={deliveryStatus !== 'picked_up'}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                deliveryStatus === 'en_route' ? 'bg-green-100 text-green-800 cursor-not-allowed' :
                deliveryStatus === 'picked_up' ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FaMapMarkerAlt className="mr-1 text-xs" />
              {deliveryStatus === 'en_route' ? 'En Route ✓' : 'En Route'}
            </button>
            
            <button
              onClick={handleDelivered}
              disabled={deliveryStatus !== 'en_route'}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-colors col-span-2 ${
                deliveryStatus === 'delivered' ? 'bg-green-100 text-green-800 cursor-not-allowed' :
                deliveryStatus === 'en_route' ? 'bg-green-500 hover:bg-green-600 text-white' :
                'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FaCheckCircle className="mr-1 text-xs" />
              {deliveryStatus === 'delivered' ? 'Delivered ✓' : 'Mark Delivered'}
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-600 text-center">
            Current: <span className="font-medium capitalize">{deliveryStatus.replace('_', ' ')}</span>
          </div>
        </div>
      )}

      {/* Status Display */}
      <div className="mb-4">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            isTracking && !isPaused ? 'bg-green-500 animate-pulse' : 
            isPaused ? 'bg-yellow-500' : 'bg-gray-400'
          }`}></div>
          <span className="text-sm font-medium text-gray-700">
            Status: {
              isTracking && !isPaused ? 'Active' :
              isPaused ? 'Paused' : 'Inactive'
            }
          </span>
        </div>
      </div>

      {/* Location Information */}
      {showLocationInfo && currentLocation && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h3 className="font-medium text-gray-800 mb-3">📍 Current Location</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Latitude:</span>
              <div className="font-mono">{currentLocation.lat.toFixed(6)}</div>
            </div>
            <div>
              <span className="text-gray-600">Longitude:</span>
              <div className="font-mono">{currentLocation.lng.toFixed(6)}</div>
            </div>
          </div>

          {currentLocation.accuracy && (
            <div className="flex items-center text-sm">
              <FaMapMarkerAlt className="text-blue-500 mr-2" />
              <span className="text-gray-600">Accuracy: </span>
              <span className="font-medium">{Math.round(currentLocation.accuracy)}m</span>
            </div>
          )}

          {currentLocation.speed && currentLocation.speed > 0 && (
            <div className="flex items-center text-sm">
              <FaTachometerAlt className="text-green-500 mr-2" />
              <span className="text-gray-600">Speed: </span>
              <span className="font-medium">{formatSpeed(currentLocation.speed)}</span>
            </div>
          )}

          {currentLocation.heading && (
            <div className="flex items-center text-sm">
              <FaCompass className="text-purple-500 mr-2" />
              <span className="text-gray-600">Direction: </span>
              <span className="font-medium">{Math.round(currentLocation.heading)}°</span>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-2">
            Last updated: {currentLocation.timestamp}
          </div>
        </div>
      )}

      {/* Error Display */}
      {locationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
          <div className="text-red-800 text-sm">
            <strong>Location Error:</strong> {locationError}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 text-xs text-gray-500">
        <p>• Make sure location permissions are enabled</p>
        <p>• Keep this page open while delivering</p>
        <p>• Your location is updated every 5 seconds</p>
      </div>
    </div>
  );
}