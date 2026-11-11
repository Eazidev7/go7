// GO7 CustomerTracker.jsx
// ✅ This component listens to rider's live location using Firestore onSnapshot()
// ✅ It updates the rider marker on the Leaflet map in real-time
// ✅ Used in customer view (track-order page or dashboard)
// ✅ Requires: deliveryId prop

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-ant-path';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeToDelivery } from '../services/deliveryService';
import { initCustomerTrackingMap as initProductionTracking, stopCustomerTracking } from '../services/productionTracking';
import { formatDistanceToNow } from 'date-fns';
import ChatWindow, { ChatButton } from './ChatWindow';
import SimpleChatUI, { SimpleChatButton } from './SimpleChatUI';
import GO7ChatUI, { GO7ChatButton, useGO7Chat } from './GO7ChatUI';

// Haversine distance calculation
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Use simple speed + distance to calculate ETA
// OR hardcode "Rider is 5 mins away" for simplicity
function calculateETA(lat1, lon1, lat2, lon2) {
  const distance = haversineDistance(lat1, lon1, lat2, lon2); // in KM
  const speed = 30; // km/h for bike in city
  const eta = (distance / speed) * 60; // minutes
  return Math.round(eta);
}

// GO7 Rider Icon Styling
const riderIconStyle = `
  .go7-rider-icon {
    border-radius: 50%;
    border: 3px solid #10B981;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    animation: pulse-green 2s infinite;
  }
  
  @keyframes pulse-green {
    0% { box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); }
    50% { box-shadow: 0 4px 20px rgba(16, 185, 129, 0.8); }
    100% { box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); }
  }

  .order-progress {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 20px 0;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
  }

  .step {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 500;
    font-size: 14px;
    background: #e5e7eb;
    color: #6b7280;
    transition: all 0.3s ease;
  }

  .step.active {
    background: #10b981;
    color: white;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .step:before {
    content: '';
    margin-right: 8px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }
`;

// Fix for Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function CustomerTracker({ deliveryId, customerLocation = [7.1516, 3.3467], dropoffAddress, riderName, riderPhone }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const unsubscribeRef = useRef(null);
  
  const [riderStatus, setRiderStatus] = useState('waiting');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [lastSeenTime, setLastSeenTime] = useState(null);
  const [antPath, setAntPath] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState('assigned');
  const [showWarning, setShowWarning] = useState(false);
  const [estimatedETA, setEstimatedETA] = useState(null);
  const [almostThereShown, setAlmostThereShown] = useState(false);
  const [orderStatus, setOrderStatus] = useState('pending');
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  // Use GO7 Chat hook
  const { 
    isChatOpen: isGO7ChatOpen, 
    selectedDelivery, 
    selectedReceiver, 
    recipientName,
    openChat: openGO7Chat, 
    closeChat: closeGO7Chat 
  } = useGO7Chat();

  // Listen to real order status changes
  useEffect(() => {
    if (!deliveryId) return;
    const unsub = onSnapshot(doc(db, 'orders', deliveryId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const status = (data.status || '').toLowerCase();
        setOrderStatus(status);
        setDeliveryStatus(status);
      }
    });
    return () => unsub();
  }, [deliveryId]);

  // Contact functions
  const handleCallRider = () => {
    if (riderPhone) {
      window.location.href = `tel:${riderPhone}`;
    } else {
      alert('Rider phone not available yet.');
    }
  };

  const handleChatRider = () => {
    openGO7Chat(deliveryId, 'rider', riderName || 'Rider');
  };

  // 🗺 PRODUCTION DELIVERY TRACKING - LIVE CODE
  function initCustomerTrackingMap(deliveryId, mapInstance) {
    console.log(`👀 Starting PRODUCTION GO7 delivery tracking for: ${deliveryId}`);
    
    let marker;
    
    // Subscribe to delivery updates instead of rider_locations
    const unsubscribe = subscribeToDelivery(deliveryId, (deliveryData) => {
      if (!deliveryData) {
        console.log("📍 PRODUCTION: No delivery data");
        setRiderStatus('waiting');
        return;
      }

      console.log('📦 Delivery update received:', deliveryData);

      // Update delivery status from the delivery document
      setDeliveryStatus(deliveryData.status || 'pending');

      // If there's no rider assigned yet, wait
      if (!deliveryData.riderId) {
        setRiderStatus('waiting');
        return;
      }

      // Listen to rider location once rider is assigned (use deliveryId as the key, not riderId)
      const statusLower = (deliveryData.status || '').toLowerCase();
      if (deliveryData.riderId && ['enroute', 'picked', 'arrived_pickup', 'arrived_dropoff', 'assigned'].includes(statusLower)) {
        // rider_locations/{deliveryId} — keyed by orderId, not riderId
        const riderLocationUnsub = onSnapshot(doc(db, "rider_locations", deliveryId), (snap) => {
          const locationData = snap.data();
          if (!locationData) {
            console.log("📍 PRODUCTION: No rider location data");
            return;
          }

          const { lat, lng, updatedAt } = locationData;
          console.log(`📍 PRODUCTION rider location update:`, { lat, lng });

          const lastUpdated = new Date(updatedAt);
          
          // Check connection freshness
          const now = new Date();
          const lastPing = new Date(locationData.updatedAt);
          const secondsAgo = (now - lastPing) / 1000;

          if (secondsAgo > 30) {
            setShowWarning(true);
          } else {
            setShowWarning(false);
          }
          
          setRiderLocation({ lat, lng });
          setLastUpdate(new Date(updatedAt).toLocaleTimeString());
          setLastSeenTime(lastUpdated);
          setRiderStatus('tracking');

          // Calculate ETA based on distance and speed
          const etaMinutes = calculateETA(lat, lng, customerLocation[0], customerLocation[1]);
          setEstimatedETA(etaMinutes);

          // "Almost there" notification when rider is < 1 km away
          const distKm = haversineDistance(lat, lng, customerLocation[0], customerLocation[1]);
          if (distKm < 1 && !almostThereShown) {
            setAlmostThereShown(true);
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('GO7 Delivery', { body: '🚴 Your rider is less than 1 km away! Almost there!' });
            }
            // Show visible toast on the page too
            setShowWarning(false);
            const banner = document.createElement('div');
            banner.id = 'go7-almost-there';
            banner.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:#10b981;color:white;padding:12px 24px;border-radius:12px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
            banner.textContent = '🚴 Your rider is almost there!';
            document.body.appendChild(banner);
            setTimeout(() => banner.remove(), 6000);
          }

          if (!marker) {
            // PRODUCTION: Create new rider marker with custom GO7 icon
            marker = L.marker([lat, lng], {
              icon: L.icon({
                iconUrl: locationData.riderProfilePhoto || "/icons/go7-scooter.png",
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40],
                className: "go7-rider-icon"
              }),
            }).addTo(mapInstance);

            // PRODUCTION: Add popup with rider info
            marker.bindPopup(`
              <div style="text-align: center; font-family: Arial;">
                <strong>🚴‍♂️ Your GO7 Delivery Rider</strong><br/>
                <small>Rider: ${deliveryData.riderId}</small><br/>
                <small>Last update: ${new Date(updatedAt).toLocaleTimeString()}</small>
              </div>
            `);

            // PRODUCTION: Center map to show both customer and rider
            try {
              const group = new L.featureGroup([
                L.marker(customerLocation),
                marker
              ]);
              const groupBounds = group.getBounds();
              if (groupBounds && groupBounds.isValid()) {
                mapInstance.fitBounds(groupBounds.pad(0.1));
              }
            } catch (e) {
              console.warn('fitBounds error in CustomerTracker:', e);
            }

          } else {
            // PRODUCTION: Smooth animated marker movement
            const oldLatLng = marker.getLatLng();
            const newLatLng = [lat, lng];
            
            // Remove old ant-path if exists
            if (riderMarkerRef.current?.antPath) {
              mapInstance.removeLayer(riderMarkerRef.current.antPath);
            }
            
            // Create ant-path trail from old to new position
            const antPathLine = L.polyline.antPath([
              [oldLatLng.lat, oldLatLng.lng],
              newLatLng
            ], {
              "color": "#ff3d00",
              "pulseColor": "#ffffff", 
              "delay": 400,
              "dashArray": [10, 20],
              "weight": 4,
              "opacity": 0.8
            }).addTo(mapInstance);
            
            // Store ant-path reference
            riderMarkerRef.current.antPath = antPathLine;
            
            // Animate marker to new position
            setTimeout(() => {
              marker.setLatLng(newLatLng);
              
              // Remove ant-path after animation
              setTimeout(() => {
                if (antPathLine && mapInstance.hasLayer(antPathLine)) {
                  mapInstance.removeLayer(antPathLine);
                }
              }, 2000);
            }, 200);
            
            // PRODUCTION: Update popup content
            marker.setPopupContent(`
              <div style="text-align: center; font-family: Arial;">
                <strong>🚴‍♂️ Your GO7 Delivery Rider</strong><br/>
                <small>Rider: ${deliveryData.riderId}</small><br/>
                <small>Last update: ${new Date(updatedAt).toLocaleTimeString()}</small>
              </div>
            `);
          }
        }, (error) => {
          console.error("❌ PRODUCTION rider location error:", error);
        });

        // Store the unsubscribe function for rider location
        riderMarkerRef.current.riderLocationUnsub = riderLocationUnsub;
      }
    });

    return unsubscribe;
  }

  // Initialize map
  useEffect(() => {
    // Inject GO7 rider icon styles
    if (!document.getElementById('go7-rider-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'go7-rider-styles';
      styleSheet.textContent = riderIconStyle;
      document.head.appendChild(styleSheet);
    }

    if (mapRef.current && !mapInstanceRef.current) {
      // Create map instance
      mapInstanceRef.current = L.map(mapRef.current).setView(customerLocation, 13);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Add customer location marker
      L.marker(customerLocation, {
        icon: L.icon({
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        })
      }).addTo(mapInstanceRef.current)
        .bindPopup('<strong>📍 Your Location</strong><br/>Delivery destination');
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Start tracking when deliveryId is provided
  useEffect(() => {
    if (deliveryId && mapInstanceRef.current) {
      unsubscribeRef.current = initCustomerTrackingMap(deliveryId, mapInstanceRef.current);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [deliveryId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'tracking': return 'text-green-600';
      case 'waiting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'tracking': return '🟢 Rider is on the way';
      case 'waiting': return '🟡 Waiting for rider to start';
      case 'error': return '🔴 Connection error';
      default: return '⚪ Unknown status';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4">
        <h2 className="text-xl font-bold mb-2">📍 Track Your GO7 Delivery</h2>
        <div className="flex justify-between items-center">
          <span className="text-sm">Delivery ID: {deliveryId || 'Not set'}</span>
          <span className={`text-sm font-medium ${getStatusColor(riderStatus)}`}>
            {getStatusMessage(riderStatus)}
          </span>
        </div>
      </div>

      {/* Delivery Progress */}
      <div className="order-progress">
        <div className={`step ${deliveryStatus === 'assigned' ? 'active' : ''}`}>
          🟡 Rider Assigned
        </div>
        <div className={`step ${deliveryStatus === 'enroute' ? 'active' : ''}`}>
          🟢 En Route
        </div>
        <div className={`step ${deliveryStatus === 'delivered' ? 'active' : ''}`}>
          🏁 Delivered
        </div>
      </div>

      {/* Delivery Details */}
      <div className="bg-blue-50 border border-blue-200 p-4">
        <div className="space-y-3">
          <div className="flex items-start">
            <span className="text-blue-600 text-lg mr-3">📍</span>
            <div>
              <p className="text-sm text-blue-800 font-medium">Dropping at:</p>
              <p className="text-blue-900 font-semibold">{dropoffAddress || 'Your delivery address'}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-blue-600 text-lg mr-3">🚴</span>
              <div>
                <p className="text-sm text-blue-800 font-medium">Rider:</p>
                <p className="text-blue-900 font-semibold">{riderName || (orderStatus === 'pending' ? 'Finding rider...' : 'Assigned')}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handleCallRider}
                className="flex items-center px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              >
                <span className="mr-1">📞</span>
                Call Rider
              </button>
              <GO7ChatButton 
                deliveryId={deliveryId}
                receiverId="go7_rider_001"
                recipientName="Musa A. (Rider)"
                onClick={handleChatRider}
                unreadCount={unreadMessages}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Connection Warning */}
      {showWarning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-lg">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Connection Issue:</strong> Rider hasn't been seen for more than 30 seconds. 
                They may be in an area with poor network coverage.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Info */}
      {lastUpdate && (
        <div className="bg-gray-50 p-3 border-b">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Last rider update:</span>
            <span className="font-medium">{lastUpdate}</span>
          </div>
          {lastSeenTime && (
            <div className="mt-1 text-sm text-green-600 font-medium">
              <p>🟢 Rider last seen {formatDistanceToNow(lastSeenTime, { addSuffix: true })}</p>
            </div>
          )}
          {estimatedETA && deliveryStatus === 'enroute' && (
            <div className="mt-1 text-sm text-blue-600 font-medium">
              <p>🕐 Estimated arrival: {estimatedETA} minutes</p>
            </div>
          )}
          {riderLocation && (
            <div className="mt-1 text-xs text-gray-500">
              Position: {riderLocation.lat.toFixed(6)}, {riderLocation.lng.toFixed(6)}
            </div>
          )}
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapRef} 
        style={{ height: '400px', width: '100%' }}
        className="leaflet-container"
      />

      {/* Legend */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            <span>Your Location</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            <span>Delivery Rider</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Live tracking updates every 5 seconds • Powered by GO7
        </p>
      </div>
      
      {/* GO7 Chat UI */}
      <GO7ChatUI 
        deliveryId={selectedDelivery}
        receiverId={selectedReceiver}
        recipientName={recipientName}
        isOpen={isGO7ChatOpen}
        onClose={closeGO7Chat}
      />
    </div>
  );
}