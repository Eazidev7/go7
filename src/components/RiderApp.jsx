import React, { useEffect, useState } from 'react';
import { 
  startLocationSync, 
  stopLocationSync, 
  setRiderStatus, 
  isLocationSyncActive,
  getCurrentRiderId
} from '../utils/RiderLocationSync';
import { FaPlay, FaStop, FaMapMarkerAlt, FaMotorcycle } from 'react-icons/fa';

/**
 * RiderApp - Example implementation of rider location tracking
 * This demonstrates how riders would use the location sync system
 */
const RiderApp = () => {
  const [riderId] = useState('rider_demo_001'); // In real app, this comes from auth
  const [isTracking, setIsTracking] = useState(false);
  const [riderStatus, setRiderStatusState] = useState('offline');
  const [lastLocation, setLastLocation] = useState(null);

  useEffect(() => {
    // Check if already tracking on mount
    setIsTracking(isLocationSyncActive());
    
    // Cleanup on unmount
    return () => {
      if (isLocationSyncActive()) {
        stopLocationSync();
      }
    };
  }, []);

  const handleStartTracking = async () => {
    try {
      await startLocationSync(riderId, {
        interval: 10000, // 10 seconds
        enableGeolocation: true
      });
      setIsTracking(true);
      setRiderStatusState('active');
      console.log('Started tracking for rider:', riderId);
    } catch (error) {
      console.error('Failed to start tracking:', error);
      alert('Failed to start location tracking');
    }
  };

  const handleStopTracking = async () => {
    try {
      await stopLocationSync();
      setIsTracking(false);
      setRiderStatusState('offline');
      console.log('Stopped tracking');
    } catch (error) {
      console.error('Failed to stop tracking:', error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await setRiderStatus(riderId, newStatus);
      setRiderStatusState(newStatus);
      console.log('Status changed to:', newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500 text-white';
      case 'offline': return 'bg-gray-500 text-white';
      case 'delivering': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaMotorcycle className="text-white text-2xl" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Go7 Rider</h1>
            <p className="text-gray-600">Rider ID: {riderId}</p>
          </div>

          <div className="space-y-4">
            {/* Tracking Status */}
            <div className="text-center">
              <div className={`inline-flex items-center px-4 py-2 rounded-full font-medium ${
                isTracking ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <FaMapMarkerAlt className="mr-2" />
                {isTracking ? 'Location Tracking Active' : 'Location Tracking Inactive'}
              </div>
            </div>

            {/* Current Status */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Current Status:</p>
              <span className={`px-4 py-2 rounded-full font-medium ${getStatusColor(riderStatus)}`}>
                {riderStatus.toUpperCase()}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="space-y-3">
              {!isTracking ? (
                <button
                  onClick={handleStartTracking}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center transition-colors"
                >
                  <FaPlay className="mr-2" />
                  Start Location Tracking
                </button>
              ) : (
                <button
                  onClick={handleStopTracking}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 flex items-center justify-center transition-colors"
                >
                  <FaStop className="mr-2" />
                  Stop Location Tracking
                </button>
              )}

              {/* Status Change Buttons */}
              {isTracking && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleStatusChange('active')}
                    className={`py-2 px-3 rounded text-sm font-medium transition-colors ${
                      riderStatus === 'active' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Available
                  </button>
                  <button
                    onClick={() => handleStatusChange('delivering')}
                    className={`py-2 px-3 rounded text-sm font-medium transition-colors ${
                      riderStatus === 'delivering' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Delivering
                  </button>
                  <button
                    onClick={() => handleStatusChange('offline')}
                    className={`py-2 px-3 rounded text-sm font-medium transition-colors ${
                      riderStatus === 'offline' 
                        ? 'bg-gray-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Offline
                  </button>
                </div>
              )}
            </div>

            {/* Usage Instructions */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Start tracking to share your location with Go7</li>
                <li>• Your location updates every 10 seconds</li>
                <li>• Change status based on your availability</li>
                <li>• Admins can assign orders when you're "Available"</li>
                <li>• Set to "Delivering" during active deliveries</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderApp;