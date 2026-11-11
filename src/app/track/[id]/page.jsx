'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Map as MLMap, Marker, LngLatBounds, LngLat } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { doc, onSnapshot, getFirestore, Timestamp } from 'firebase/firestore';
import { app } from '../../../lib/firebase';
import CustomerOTPDisplay from '../../../components/delivery/CustomerOTPDisplay';

// ---- Types ----
/**
 * @typedef {'PENDING'|'IN_TRANSIT'|'DELIVERED'} OrderStatus
 * @typedef {{lat: number, lng: number}} LatLng
 * @typedef {Object} Order
 * @property {string} pickupAddress
 * @property {string} dropoffAddress
 * @property {LatLng} pickupLatLng
 * @property {LatLng} dropoffLatLng
 * @property {OrderStatus} status
 * @property {number} priceNaira
 * @property {number} distanceKm
 * @property {string} pin
 * @property {string|null} [riderId]
 * @property {Timestamp} [createdAt]
 * @property {Timestamp} [riderAssignedAt]
 * @property {Timestamp} [deliveredAt]
 */

/**
 * @typedef {Object} RiderLocation
 * @property {number} lat
 * @property {number} lng
 * @property {Timestamp} ts
 */

// ---- Utility Functions ----
/**
 * Format a timestamp to a readable time string
 * @param {Timestamp|null} timestamp
 * @returns {string}
 */
const formatTime = (timestamp) => {
  if (!timestamp) return '—';
  return new Date(timestamp.seconds * 1000).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Format a timestamp to a readable date + time string
 * @param {Timestamp|null} timestamp
 * @returns {string}
 */
const formatDateTime = (timestamp) => {
  if (!timestamp) return '—';
  return new Date(timestamp.seconds * 1000).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get color class for a status
 * @param {OrderStatus} status
 * @returns {string}
 */
const getStatusColor = (status) => {
  switch (status) {
    case 'PENDING':
      return 'bg-blue-100/20 text-blue-200';
    case 'IN_TRANSIT':
      return 'bg-emerald-100/20 text-emerald-200';
    case 'DELIVERED':
      return 'bg-green-100/20 text-green-200';
    default:
      return 'bg-gray-100/20 text-gray-200';
  }
};

/**
 * Format status label
 * @param {OrderStatus} status
 * @returns {string}
 */
const formatStatus = (status) => {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'IN_TRANSIT':
      return 'In Transit';
    case 'DELIVERED':
      return 'Delivered';
    default:
      return status;
  }
};

/**
 * Create a marker element
 * @param {string} label
 * @param {string} bgColor
 * @returns {HTMLDivElement}
 */
const createMarkerElement = (label, bgColor) => {
  const el = document.createElement('div');
  el.className = `w-8 h-8 rounded-full flex items-center justify-center font-bold text-white`;
  el.style.backgroundColor = bgColor;
  el.style.boxShadow = '0 0 0 2px white';
  el.innerHTML = label;
  return el;
};

/**
 * Main Track Order Component
 */
export default function TrackPage({ params }) {
  const [order, setOrder] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const orderId = params?.id || '';
  
  const mapContainer = useRef(null);
  const map = useRef(null);
  const pickupMarker = useRef(null);
  const dropoffMarker = useRef(null);
  const riderMarker = useRef(null);
  const routeLineId = 'route-line';
  const prevRiderPos = useRef(null);
  const animationFrame = useRef(0);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsOffline(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to order data
  useEffect(() => {
    if (!orderId) return;
    
    const db = getFirestore(app);
    const orderRef = doc(db, 'orders', orderId);
    
    const unsubscribe = onSnapshot(orderRef, (doc) => {
      if (doc.exists()) {
        const orderData = doc.data();
        setOrder(orderData);
        setLoading(false);
      } else {
        // Order not found
        setLoading(false);
      }
    }, (error) => {
      console.error("Error fetching order:", error);
      setLoading(false);
    });
    
    return unsubscribe;
  }, [orderId]);

  // Subscribe to rider location if available
  useEffect(() => {
    if (!order?.riderId) return;
    
    const db = getFirestore(app);
    const riderLocationRef = doc(db, 'riderLocations', order.riderId);
    
    const unsubscribe = onSnapshot(riderLocationRef, (doc) => {
      if (doc.exists()) {
        const locationData = doc.data();
        setRiderLocation({ lat: locationData.lat, lng: locationData.lng });
      }
    });
    
    return unsubscribe;
  }, [order?.riderId]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    
    const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY || 'get_your_own_key';
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${mapTilerKey}`,
      center: [3.3792, 6.5244], // Default center (Lagos, Nigeria)
      zoom: 12,
      attributionControl: false
    });
    
    map.current.addControl(new maplibregl.AttributionControl(), 'bottom-left');
    
    return () => {
      if (map.current) {
        cancelAnimationFrame(animationFrame.current);
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when order data is available
  useEffect(() => {
    if (!map.current || !order) return;
    
    const mapInstance = map.current;
    
    // Ensure map is loaded
    if (!mapInstance.loaded()) {
      mapInstance.on('load', updateMap);
      return;
    }
    
    updateMap();
    
    function updateMap() {
      // Add pickup marker if not exists
      if (!pickupMarker.current && order.pickupLatLng) {
        const el = createMarkerElement('A', '#38bdf8'); // Blue
        pickupMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat([order.pickupLatLng.lng, order.pickupLatLng.lat])
          .addTo(mapInstance);
      }
      
      // Add dropoff marker if not exists
      if (!dropoffMarker.current && order.dropoffLatLng) {
        const el = createMarkerElement('B', '#22c55e'); // Green
        dropoffMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat([order.dropoffLatLng.lng, order.dropoffLatLng.lat])
          .addTo(mapInstance);
      }
      
      // Fit bounds to include pickup and dropoff
      if (order.pickupLatLng && order.dropoffLatLng) {
        try {
          const bounds = new maplibregl.LngLatBounds()
            .extend([order.pickupLatLng.lng, order.pickupLatLng.lat])
            .extend([order.dropoffLatLng.lng, order.dropoffLatLng.lat]);
          
          mapInstance.fitBounds(bounds, { padding: 60 });
        } catch (e) {
          console.warn('fitBounds error in track page:', e);
        }
        
        // Add a simple route line between pickup and dropoff
        const routeCoordinates = [
          [order.pickupLatLng.lng, order.pickupLatLng.lat],
          [order.dropoffLatLng.lng, order.dropoffLatLng.lat]
        ];
        
        // Add route line layer if not exists
        if (!mapInstance.getSource(routeLineId)) {
          mapInstance.addSource(routeLineId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: routeCoordinates
              }
            }
          });
          
          mapInstance.addLayer({
            id: routeLineId,
            type: 'line',
            source: routeLineId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#36c2c2',
              'line-width': 4,
              'line-opacity': 0.8
            }
          });
        } else {
          // Update existing route
          mapInstance.getSource(routeLineId).setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoordinates
            }
          });
        }
      }
    }
  }, [order]);

  // Update rider marker when location changes
  useEffect(() => {
    if (!map.current || !riderLocation) return;
    
    const mapInstance = map.current;
    const newPos = [riderLocation.lng, riderLocation.lat];
    
    // Create rider marker if it doesn't exist
    if (!riderMarker.current) {
      const el = createMarkerElement('🛵', '#ef4444'); // Red
      riderMarker.current = new maplibregl.Marker({ element: el })
        .setLngLat(newPos)
        .addTo(mapInstance);
      prevRiderPos.current = riderLocation;
    } else {
      // Animate rider marker to new position
      if (prevRiderPos.current) {
        animateMarker(
          prevRiderPos.current,
          riderLocation,
          riderMarker.current,
          () => {
            prevRiderPos.current = riderLocation;
          }
        );
      } else {
        riderMarker.current.setLngLat(newPos);
        prevRiderPos.current = riderLocation;
      }
    }
  }, [riderLocation]);

  /**
   * Animate marker from one position to another
   * @param {LatLng} start
   * @param {LatLng} end
   * @param {Marker} marker
   * @param {Function} onComplete
   */
  const animateMarker = (start, end, marker, onComplete) => {
    const duration = 2000; // Animation duration in ms
    const startTime = performance.now();
    
    cancelAnimationFrame(animationFrame.current);
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Simple linear interpolation
      const lng = start.lng + (end.lng - start.lng) * progress;
      const lat = start.lat + (end.lat - start.lat) * progress;
      
      marker.setLngLat([lng, lat]);
      
      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };
    
    animationFrame.current = requestAnimationFrame(animate);
  };
  
  // Handle copy PIN
  const copyPin = () => {
    if (!order?.pin) return;
    
    navigator.clipboard.writeText(order.pin)
      .then(() => {
        alert('PIN copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy PIN:', err);
      });
  };
  
  // Handle WhatsApp click
  const openWhatsApp = () => {
    if (!order) return;
    
    // Extract digits only from phone number
    const phone = order.phone?.replace(/\D/g, '') || '2348012345678';
    window.open(`https://wa.me/${phone}`, '_blank');
  };
  
  // Handle share
  const shareTracking = () => {
    if (!navigator.share) return;
    
    const shareData = {
      title: 'Track your Go7 delivery',
      text: `Track your delivery with order ID: ${orderId}`,
      url: window.location.href
    };
    
    navigator.share(shareData).catch(err => console.error('Error sharing:', err));
  };
  
  // Get last updated time
  const getLastUpdatedText = () => {
    if (!order) return '';
    
    const riderLocationTime = riderLocation ? 
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
    
    let latestTime = order.createdAt;
    
    if (order.riderAssignedAt && (!latestTime || order.riderAssignedAt.seconds > latestTime.seconds)) {
      latestTime = order.riderAssignedAt;
    }
    
    if (order.deliveredAt && (!latestTime || order.deliveredAt.seconds > latestTime.seconds)) {
      latestTime = order.deliveredAt;
    }
    
    return `Last updated ${riderLocationTime || formatTime(latestTime)}`;
  };
  
  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F12] text-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-white/10 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-xl h-[420px]"></div>
              <div className="space-y-6">
                <div className="bg-white/5 rounded-xl h-32"></div>
                <div className="bg-white/5 rounded-xl h-40"></div>
                <div className="bg-white/5 rounded-xl h-36"></div>
              </div>
            </div>
            <div className="bg-white/5 rounded-xl h-48 mt-6"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Order not found
  if (!order) {
    return (
      <div className="min-h-screen bg-[#0F0F12] text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-gray-400 mb-6">We couldn't find the order you're looking for.</p>
          <button 
            className="bg-[#E01E28] text-white py-2 px-6 rounded-full font-medium"
            onClick={() => window.history.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#0F0F12] text-white p-4">
      {isOffline && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-900/80 text-yellow-100 px-4 py-2 rounded-full text-sm">
          Offline — showing last update
        </div>
      )}
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <div className="text-2xl font-bold">Go7</div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-400">#{orderId}</div>
            <div className={`text-xs px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
              {formatStatus(order.status)}
            </div>
          </div>
        </header>
        
        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Map */}
          <div 
            ref={mapContainer} 
            className="bg-white/5 border border-white/10 rounded-xl h-[420px] overflow-hidden"
          ></div>
          
          {/* Right column cards */}
          <div className="space-y-6">
            {/* OTP Display - show when delivery is assigned or in transit */}
            <CustomerOTPDisplay 
              deliveryId={orderId}
              userId={order.customerId || order.userId}
              delivery={order}
            />

            {/* PIN card - fallback if OTP not available */}
            {order.status !== 'DELIVERED' && order.pin && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h2 className="text-lg font-semibold mb-2">PIN</h2>
                <div className="flex justify-between items-center">
                  <div className="text-4xl font-bold">{order.pin}</div>
                  <button 
                    onClick={copyPin}
                    className="bg-[#E01E28] text-white py-2 px-4 rounded-lg text-sm font-medium"
                  >
                    Copy PIN
                  </button>
                </div>
              </div>
            )}
            
            {/* Route card */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4">Route</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center">
                    <span className="text-blue-200 text-xs">A</span>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">From</div>
                    <div>{order.pickupAddress}</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center">
                    <span className="text-green-200 text-xs">B</span>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">To</div>
                    <div>{order.dropoffAddress}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contact card */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4">Contact</h2>
              <div className="mb-4">
                <div className="text-gray-400 text-sm">Rider Phone</div>
                <div>080***312</div>
              </div>
              <div className="flex gap-3">
                <button 
                  className="flex-1 bg-white/10 hover:bg-white/15 py-2 px-4 rounded-lg text-sm font-medium"
                  onClick={() => alert('Calling...')}
                >
                  Call
                </button>
                <button 
                  className="flex-1 bg-white/10 hover:bg-white/15 py-2 px-4 rounded-lg text-sm font-medium"
                  onClick={openWhatsApp}
                >
                  WhatsApp
                </button>
                <button 
                  className="flex-1 bg-white/10 hover:bg-white/15 py-2 px-4 rounded-lg text-sm font-medium"
                  onClick={shareTracking}
                >
                  Share
                </button>
              </div>
            </div>
            
            {/* Order summary card */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-gray-400 text-sm">Order ID</div>
                  <div>#{orderId}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Distance</div>
                  <div>{order.distanceKm.toFixed(1)} km</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Price</div>
                  <div>₦{order.priceNaira.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Last Update</div>
                  <div>{getLastUpdatedText()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Status Timeline */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-6">
          <h2 className="text-lg font-semibold mb-4">Status Timeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/30 flex items-center justify-center text-green-200">
                ✓
              </div>
              <div>
                <div className="font-medium">Order Placed</div>
                <div className="text-gray-400 text-sm">{formatDateTime(order.createdAt)}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                order.status !== 'PENDING' 
                  ? 'bg-green-500/30 text-green-200' 
                  : 'bg-gray-500/30 text-gray-200'
              }`}>
                {order.status !== 'PENDING' ? '✓' : '⏳'}
              </div>
              <div>
                <div className="font-medium">Rider Assigned</div>
                <div className="text-gray-400 text-sm">
                  {order.riderAssignedAt ? formatDateTime(order.riderAssignedAt) : '—'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                order.status === 'DELIVERED' 
                  ? 'bg-green-500/30 text-green-200' 
                  : 'bg-gray-500/30 text-gray-200'
              }`}>
                {order.status === 'DELIVERED' ? '✓' : '⏳'}
              </div>
              <div>
                <div className="font-medium">Delivered</div>
                <div className="text-gray-400 text-sm">
                  {order.deliveredAt ? formatDateTime(order.deliveredAt) : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
