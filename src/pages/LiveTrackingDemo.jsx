import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import RiderTrackingInterface from '../components/RiderTrackingInterface';
import MapBase from '../components/shared/MapBase';
import DeliveryStatusIndicator from '../components/DeliveryStatusIndicator';
import { subscribeToRiderLocation } from '../services/riderTracking';

export default function LiveTrackingDemo() {
  const [activeDeliveryId, setActiveDeliveryId] = useState('');
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [riderLocation, setRiderLocation] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState('preparing');

  const handleTrackingStart = (deliveryId, riderId) => {
    console.log('🚀 Tracking started:', { deliveryId, riderId });
    setActiveDeliveryId(deliveryId);
    setIsTrackingActive(true);
  };

  const handleTrackingStop = (deliveryId) => {
    console.log('🛑 Tracking stopped:', deliveryId);
    setActiveDeliveryId('');
    setIsTrackingActive(false);
    setRiderLocation(null);
    setDeliveryStatus('preparing');
  };

  // Listen for rider location updates for the customer view
  useEffect(() => {
    if (activeDeliveryId && isTrackingActive) {
      console.log('🔥 Setting up customer location listener for:', activeDeliveryId);
      
      const unsubscribe = subscribeToRiderLocation(activeDeliveryId, (locationData) => {
        if (locationData) {
          console.log('📍 Customer received location update:', locationData);
          setRiderLocation(locationData);
          
          // Update delivery status if it's included in the location data
          if (locationData.deliveryStatus) {
            setDeliveryStatus(locationData.deliveryStatus);
          }
        }
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [activeDeliveryId, isTrackingActive]);

  return (
    <>
      <Helmet>
        <title>Live Tracking Demo - GO7 Delivery</title>
        <meta name="description" content="Real-time GPS tracking demonstration with Firebase integration" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              🔥 Live GPS Tracking Demo
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Test real-time rider tracking with Firebase. Start tracking on the left, 
              watch live updates on the map on the right.
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Rider Interface */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">🚴‍♂️ Rider Interface</h2>
                <p className="text-gray-600 mb-6">
                  This is what delivery riders would see to start GPS tracking.
                </p>
                
                <RiderTrackingInterface
                  defaultDeliveryId="DEMO-001"
                  defaultRiderId="RIDER-001"
                  onTrackingStart={handleTrackingStart}
                  onTrackingStop={handleTrackingStop}
                  showLocationInfo={true}
                />
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  📋 How to Test
                </h3>
                <ol className="text-blue-800 space-y-2 text-sm">
                  <li><strong>1.</strong> Allow location permissions when prompted</li>
                  <li><strong>2.</strong> Click "Start Tracking" on the left</li>
                  <li><strong>3.</strong> Watch the map on the right for live updates</li>
                  <li><strong>4.</strong> Move around (if on mobile) to see tracking</li>
                  <li><strong>5.</strong> Open in multiple tabs to see both rider and customer views</li>
                </ol>
              </div>
            </div>

            {/* Right Column - Customer Map View */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">📍 Customer View</h2>
                <p className="text-gray-600 mb-6">
                  This is what customers would see when tracking their delivery.
                </p>

                {/* Delivery Status Indicator */}
                {isTrackingActive && (
                  <div className="mb-6">
                    <DeliveryStatusIndicator
                      status={deliveryStatus}
                      riderLocation={riderLocation}
                      totalDistance={riderLocation?.totalDistance || 0}
                      estimatedDelivery={riderLocation?.estimatedDelivery}
                    />
                  </div>
                )}

                {/* Map Container */}
                <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                  <MapBase
                    showZones={true}
                    showRider={isTrackingActive}
                    useRealTracking={isTrackingActive}
                    deliveryId={activeDeliveryId}
                    showBanner={false}
                    style={{ height: '100%' }}
                  />
                </div>

                {/* Status */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      isTrackingActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-sm text-gray-600">
                      Tracking: {isTrackingActive ? `Active (${activeDeliveryId})` : 'Inactive'}
                    </span>
                  </div>
                  
                  {isTrackingActive && (
                    <div className="text-xs text-gray-500">
                      Updates every 5 seconds
                    </div>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  ✨ Real-Time Features
                </h3>
                <ul className="text-green-800 space-y-1 text-sm">
                  <li>🔄 Live GPS position updates</li>
                  <li>📱 Cross-device synchronization</li>
                  <li>⚡ Sub-5-second latency</li>
                  <li>🗺️ Delivery zone integration</li>
                  <li>📊 Speed and direction data</li>
                  <li>🔋 Battery-optimized tracking</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Technical Info */}
          <div className="mt-12 bg-gray-800 text-white rounded-xl p-8">
            <h3 className="text-xl font-semibold mb-4">🔧 Technical Implementation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="font-semibold text-blue-300 mb-2">Frontend</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• React with real-time hooks</li>
                  <li>• Leaflet.js mapping</li>
                  <li>• Geolocation API</li>
                  <li>• Firebase SDK</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-green-300 mb-2">Backend</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• Firebase Firestore</li>
                  <li>• Real-time listeners</li>
                  <li>• Document-based storage</li>
                  <li>• Automatic scaling</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-purple-300 mb-2">Features</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• High-accuracy GPS</li>
                  <li>• Battery optimization</li>
                  <li>• Error handling</li>
                  <li>• Cross-platform support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}