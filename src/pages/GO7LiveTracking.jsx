// GO7 LiveTracking.jsx — Customer tracking page
// Reads orderId from ?orderId= query param, shows real-time rider location

import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import CustomerTracker from '../components/CustomerTracker';

export default function GO7LiveTracking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');

  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load order data to get dropoff coords and customer location
  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(doc(db, 'orders', orderId), (snap) => {
      if (snap.exists()) {
        setOrderData({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [orderId]);

  // Derive customer dropoff coords from order
  const dropoffCoords = orderData?.dropoff?.coordinates
    || (orderData?.dropoffCoords)
    || null;
  const customerLocation = dropoffCoords
    ? [dropoffCoords.lat, dropoffCoords.lng]
    : [7.1516, 3.3467];

  return (
    <>
      <Helmet>
        <title>Track Your GO7 Delivery</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-red-600 text-white px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-white text-xl">←</button>
          <div>
            <h1 className="text-lg font-bold">Track Your Delivery</h1>
            {orderId && (
              <p className="text-red-200 text-xs font-mono">Order #{orderId.slice(0, 12)}...</p>
            )}
          </div>
          {orderData && (
            <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${
              orderData.status === 'delivered' ? 'bg-green-500' :
              orderData.status === 'enroute' ? 'bg-blue-500' :
              orderData.status === 'Assigned' ? 'bg-yellow-400 text-gray-900' :
              'bg-red-400'
            }`}>
              {orderData.status || 'Pending'}
            </span>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-600" />
          </div>
        )}

        {!loading && !orderId && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
            <span className="text-4xl">📦</span>
            <p className="font-medium">No order ID provided.</p>
            <button onClick={() => navigate('/book-delivery')} className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Book a Delivery</button>
          </div>
        )}

        {!loading && orderId && (
          <CustomerTracker
            deliveryId={orderId}
            customerLocation={customerLocation}
            dropoffAddress={orderData?.dropoff?.address || orderData?.dropoffAddress}
            riderName={orderData?.riderName}
            riderPhone={orderData?.riderPhone}
          />
        )}
      </div>
    </>
  );
}
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🚴‍♂️ GO7 Live Delivery Tracking
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Real-time GPS tracking system for GO7 delivery operations. 
                Live tracking between delivery riders and customers with Firebase integration.
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Bar */}
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center">
                <span className="text-green-600 font-medium">Delivery ID:</span>
                <span className="ml-2 font-mono bg-white px-2 py-1 rounded border">
                  {activeDeliveryId}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-green-600 font-medium">Rider ID:</span>
                <span className="ml-2 font-mono bg-white px-2 py-1 rounded border">
                  {activeRiderId}
                </span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  trackingStatus === 'tracking' ? 'bg-green-500 animate-pulse' : 
                  trackingStatus === 'stopped' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-green-600 font-medium">
                  Status: {trackingStatus === 'tracking' ? 'Live Tracking Active' : 
                          trackingStatus === 'stopped' ? 'Tracking Stopped' : 'Ready to Start'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Rider Interface */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center mb-6">
                  <div className="bg-green-100 p-3 rounded-full mr-4">
                    <span className="text-2xl">🚴‍♂️</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Rider Interface</h2>
                    <p className="text-gray-600">This is what delivery riders see</p>
                  </div>
                </div>
                
                <RiderTracker
                  deliveryId={activeDeliveryId}
                  riderId={activeRiderId}
                  onStatusChange={handleTrackingStatusChange}
                />
              </div>

              {/* Rider Instructions */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  📱 Rider Operations
                </h3>
                <ol className="text-green-800 space-y-2 text-sm">
                  <li><strong>1.</strong> Allow location permissions when prompted</li>
                  <li><strong>2.</strong> Click "Start Live Tracking" to begin GPS tracking</li>
                  <li><strong>3.</strong> Your location is sent to Firebase every 5 seconds</li>
                  <li><strong>4.</strong> Customer can see your live location in real-time</li>
                  <li><strong>5.</strong> Move around to provide real-time tracking</li>
                </ol>
              </div>
            </div>

            {/* Right Column - Customer Interface */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 pb-0">
                  <div className="flex items-center mb-6">
                    <div className="bg-blue-100 p-3 rounded-full mr-4">
                      <span className="text-2xl">📍</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Customer View</h2>
                      <p className="text-gray-600">This is what customers see</p>
                    </div>
                  </div>
                </div>
                
                <CustomerTracker
                  deliveryId="DELIVERY_ABC123"
                />
              </div>

              {/* Real-time Chat Integration */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 pb-0">
                  <div className="flex items-center mb-4">
                    <div className="bg-green-100 p-3 rounded-full mr-4">
                      <span className="text-2xl">💬</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Live Chat</h2>
                      <p className="text-gray-600">Real-time communication with rider</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 pt-0">
                  <div className="h-80">
                    <EnhancedChatComponent
                      deliveryId="DELIVERY_ABC123"
                      recipientId="go7_rider_001"
                      className="h-full"
                      enableTypingIndicator={true}
                      enableStatusUpdates={true}
                      onMessageSent={() => console.log('✅ Message sent in live tracking')}
                      onError={(error) => console.error('❌ Chat error:', error)}
                      onTyping={(isTyping) => console.log('✍️ Typing status:', isTyping)}
                    />
                  </div>
                </div>
              </div>

              {/* Customer Experience */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  👀 Customer Experience
                </h3>
                <ul className="text-blue-800 space-y-2 text-sm">
                  <li><strong>•</strong> See your delivery location (blue marker)</li>
                  <li><strong>•</strong> Watch rider location update in real-time (green marker)</li>
                  <li><strong>•</strong> Get live status updates every 5 seconds</li>
                  <li><strong>•</strong> View last update timestamp</li>
                  <li><strong>•</strong> Click markers for delivery information</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Production Implementation Details */}
          <div className="mt-12 bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ⚙️ Production System Architecture
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">🔴 Rider Side (Live)</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• Real GPS tracking every 5 seconds</li>
                  <li>• Firebase Firestore live updates</li>
                  <li>• High accuracy positioning</li>
                  <li>• Production error handling</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">🔵 Customer Side (Live)</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• Real-time Firestore listener</li>
                  <li>• Live Leaflet map updates</li>
                  <li>• Dynamic marker positioning</li>
                  <li>• Auto map bounds adjustment</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">🔥 Firebase (Production)</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• Collection: rider_locations</li>
                  <li>• Document: {activeDeliveryId.slice(0, 15)}...</li>
                  <li>• Fields: lat, lng, riderId, updatedAt</li>
                  <li>• Sub-5 second synchronization</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Production Ready Banner */}
          <div className="mt-8 text-center">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                🚀 GO7 Live Delivery Tracking System
              </h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Production-ready real-time delivery tracking system. 
                This is the live system used for actual GO7 delivery operations.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="bg-green-50 px-4 py-2 rounded-lg">
                  <span className="text-green-700 font-medium">✅ Live GPS Tracking</span>
                </div>
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <span className="text-blue-700 font-medium">✅ Real-time Firebase</span>
                </div>
                <div className="bg-purple-50 px-4 py-2 rounded-lg">
                  <span className="text-purple-700 font-medium">✅ Production Ready</span>
                </div>
                <div className="bg-orange-50 px-4 py-2 rounded-lg">
                  <span className="text-orange-700 font-medium">✅ Live Operations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}