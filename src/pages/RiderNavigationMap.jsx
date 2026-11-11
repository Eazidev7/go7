/**
 * 🚴 GO7 RIDER NAVIGATION MAP
 * Real-time navigation for delivery riders with live location upload
 * 
 * Features:
 * - Continuous GPS tracking
 * - Upload location to Firestore every 5 seconds
 * - Turn-by-turn navigation
 * - Pickup and dropoff markers
 * - Traffic layer
 * - Auto-stop on delivery completion
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { GoogleMap, useLoadScript, Marker, DirectionsRenderer, TrafficLayer } from '@react-google-maps/api';
import { Navigation, Phone, Package, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  MAP_CONFIGS, 
  MAP_TYPES, 
  FIRESTORE_PATHS,
  startRiderLocationTracking,
  stopRiderLocationTracking 
} from '../config/mapConfig';

const GOOGLE_MAPS_LIBRARIES = ['places', 'directions'];
const mapConfig = MAP_CONFIGS[MAP_TYPES.RIDER_NAV];

const mapContainerStyle = {
  width: '100%',
  height: '100vh',
};

export default function RiderNavigationMap() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  // Google Maps
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // State
  const [orderData, setOrderData] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [orderStatus, setOrderStatus] = useState('pending');
  
  // Refs
  const watchIdRef = useRef(null);
  const mapRef = useRef(null);

  // Load order data
  useEffect(() => {
    if (!orderId) return;

    const orderRef = doc(db, 'orders', orderId);
    const unsubscribe = onSnapshot(orderRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setOrderData(data);
        setOrderStatus(data.orderStatus);
        
        // Stop tracking when delivered
        if (data.orderStatus === 'delivered' && isTracking) {
          handleStopTracking();
        }
      }
    });

    return () => unsubscribe();
  }, [orderId, isTracking]);

  // Start location tracking
  const handleStartTracking = useCallback(() => {
    if (!orderId) {
      toast.error('Order ID missing');
      return;
    }

    const watchId = startRiderLocationTracking(
      orderId,
      db,
      (error) => {
        toast.error(`Location error: ${error}`);
        console.error('Location tracking error:', error);
      }
    );

    if (watchId) {
      watchIdRef.current = watchId;
      setIsTracking(true);
      toast.success('📍 Location tracking started');
      
      // Also start local position tracking for map centering
      startLocalTracking();
    }
  }, [orderId]);

  // Stop location tracking
  const handleStopTracking = useCallback(() => {
    if (watchIdRef.current) {
      stopRiderLocationTracking(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
      toast.success('🛑 Location tracking stopped');
    }
  }, []);

  // Local position tracking for map
  const startLocalTracking = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentLocation(newLocation);
        
        // Center map on current location
        if (mapRef.current) {
          mapRef.current.panTo(newLocation);
        }
      },
      (error) => console.error('Local tracking error:', error),
      mapConfig.geolocationOptions
    );
  };

  // Calculate route and ETA
  useEffect(() => {
    if (!isLoaded || !currentLocation || !orderData) return;

    const directionsService = new window.google.maps.DirectionsService();
    
    // Determine destination based on order status
    const destination = orderStatus === 'picked_up' || orderStatus === 'en_route'
      ? orderData.dropoffCoords
      : orderData.pickupCoords;

    if (!destination) return;

    directionsService.route(
      {
        origin: currentLocation,
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS
        }
      },
      (result, status) => {
        if (status === 'OK') {
          setDirections(result);
          const leg = result.routes[0].legs[0];
          setEta(leg.duration_in_traffic?.text || leg.duration.text);
          setDistance(leg.distance.text);
        }
      }
    );
  }, [isLoaded, currentLocation, orderData, orderStatus]);

  // Mark order as picked up
  const handlePickup = async () => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        orderStatus: 'picked_up',
        pickedUpAt: new Date().toISOString()
      });
      toast.success('📦 Package picked up!');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Mark order as delivered
  const handleDeliver = async () => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        orderStatus: 'delivered',
        deliveredAt: new Date().toISOString()
      });
      toast.success('✅ Delivery completed!');
      handleStopTracking();
      
      setTimeout(() => {
        navigate('/rider/dashboard');
      }, 2000);
    } catch (error) {
      toast.error('Failed to complete delivery');
    }
  };

  if (loadError) {
    return <div className="flex items-center justify-center h-screen">Error loading maps</div>;
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={currentLocation || { lat: 7.1475, lng: 3.3619 }}
        zoom={15}
        options={{
          ...mapConfig.mapOptions,
          zoomControl: true
        }}
        onLoad={map => mapRef.current = map}
      >
        {/* Traffic Layer */}
        <TrafficLayer />

        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            position={currentLocation}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3
            }}
          />
        )}

        {/* Pickup Marker */}
        {orderData?.pickupCoords && (
          <Marker
            position={{ lat: orderData.pickupCoords.lat, lng: orderData.pickupCoords.lng }}
            label="P"
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
            }}
          />
        )}

        {/* Dropoff Marker */}
        {orderData?.dropoffCoords && (
          <Marker
            position={{ lat: orderData.dropoffCoords.lat, lng: orderData.dropoffCoords.lng }}
            label="D"
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
            }}
          />
        )}

        {/* Directions */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#E61E25',
                strokeWeight: 5,
                strokeOpacity: 0.8
              }
            }}
          />
        )}
      </GoogleMap>

      {/* Top Status Bar */}
      <div className="absolute top-0 left-0 right-0 bg-white shadow-lg p-4 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="font-semibold">
              {isTracking ? '📍 Tracking Active' : '⚠️ Tracking Paused'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">ETA</div>
            <div className="font-bold text-lg">{eta || '--'}</div>
          </div>
        </div>
      </div>

      {/* Bottom Action Card */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 z-10">
        <div className="max-w-2xl mx-auto">
          {/* Order Info */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Order #{orderId?.slice(-6)}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                orderStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                orderStatus === 'picked_up' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {orderStatus}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin size={16} />
              <span>Distance: {distance || '--'}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!isTracking ? (
              <button
                onClick={handleStartTracking}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 transition"
              >
                <Navigation size={20} />
                <span>Start Navigation</span>
              </button>
            ) : (
              <>
                {orderStatus !== 'picked_up' && orderStatus !== 'en_route' && (
                  <button
                    onClick={handlePickup}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 transition"
                  >
                    <Package size={20} />
                    <span>Confirm Pickup</span>
                  </button>
                )}
                
                {(orderStatus === 'picked_up' || orderStatus === 'en_route') && (
                  <button
                    onClick={handleDeliver}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 transition"
                  >
                    <CheckCircle size={20} />
                    <span>Complete Delivery</span>
                  </button>
                )}
                
                <button
                  onClick={handleStopTracking}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold transition"
                >
                  Pause Tracking
                </button>
              </>
            )}
          </div>

          {/* Customer Contact */}
          {orderData?.customerPhone && (
            <a
              href={`tel:${orderData.customerPhone}`}
              className="mt-3 w-full border-2 border-gray-200 hover:border-gray-300 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition"
            >
              <Phone size={18} />
              <span>Call Customer</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
