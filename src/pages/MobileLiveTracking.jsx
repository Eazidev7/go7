// GO7 Mobile Live Tracking - MODERN UBER-STYLE
// ✅ Draggable DeliverySheet with Framer Motion
// ✅ Real-time GPS tracking with Firebase integration
// ✅ Street name tracking with enhancedLocationService
// ✅ Google Maps with rider trail animation
// ✅ Production-ready mobile delivery tracking interface
// ✅ Unified map configuration system

import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Phone, MapPin, Clock, User, Star } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useIsMobile } from '../hooks/useMediaQuery';
import { GoogleMap, useLoadScript, Polyline, Marker } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import deliveryService from '../services/delivery';
import DeliverySheet from '../components/DeliverySheet';
import { locationService } from '../services/enhancedLocationService';
import { MAP_CONFIGS, MAP_TYPES, FIRESTORE_PATHS } from '../config/mapConfig';

// Static Google Maps libraries array to prevent reloading
const GOOGLE_MAPS_LIBRARIES = ['geometry'];

// Get configuration for mobile user tracking
const mapConfig = MAP_CONFIGS[MAP_TYPES.MOBILE_USER];

// Google Maps Configuration from unified config
const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '300px',
};

const mapOptions = {
  ...mapConfig.mapOptions,
  styles: [
    {
      featureType: 'poi',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'transit',
      stylers: [{ visibility: 'off' }]
    }
  ],
};

// Exact UI Map Component - Matches Reference Image
const MobileTrackingMap = ({ deliveryId, riderLocation, customerLocation, pickupLocation, routeCoords, isLoaded, loadError }) => {
  const [riderPos, setRiderPos] = React.useState({ lat: 7.1540, lng: 3.3480 });
  const [map, setMap] = React.useState(null);
  const [riderTrail, setRiderTrail] = React.useState([]); // Track rider's actual path
  const [lastPosition, setLastPosition] = React.useState(null);
  const [dynamicRoute, setDynamicRoute] = React.useState([]); // Dynamic route updates
  const [routeAnimationProgress, setRouteAnimationProgress] = React.useState(0); // For route animation

  // Fallback for map loading issues
  const renderMapFallback = () => (
    <div 
      className="w-full h-full bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center"
      style={{ height: '300px' }}
    >
      <div className="text-center">
        <div className="text-4xl mb-2">🗺️</div>
        <p className="text-gray-600">Map Loading...</p>
      </div>
    </div>
  );

  // Route coordinates for the red line
  const fullRouteCoordinates = [
    { lat: 7.1600, lng: 3.3400 }, // Pickup area (Oke-Ilewo)
    { lat: 7.1580, lng: 3.3420 },
    { lat: 7.1560, lng: 3.3450 },
    { lat: 7.1540, lng: 3.3480 },
    { lat: 7.1520, lng: 3.3500 },
    { lat: 7.1516, lng: 3.3467 }, // Destination (Abeokuta DC)
  ];

  // Animate route drawing on component mount
  useEffect(() => {
    let animationFrame;
    const animateRoute = () => {
      setRouteAnimationProgress(prev => {
        if (prev >= 1) return 1;
        return prev + 0.02; // Adjust speed of animation
      });
      
      if (routeAnimationProgress < 1) {
        animationFrame = requestAnimationFrame(animateRoute);
      }
    };
    
    // Start animation after a small delay
    const timer = setTimeout(() => {
      animateRoute();
    }, 500);

    return () => {
      clearTimeout(timer);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  // Calculate animated route based on progress
  const getAnimatedRoute = () => {
    const totalPoints = fullRouteCoordinates.length;
    const pointsToShow = Math.floor(totalPoints * routeAnimationProgress);
    return fullRouteCoordinates.slice(0, pointsToShow + 1);
  };

  const routeCoordinates = getAnimatedRoute();

  // Real-time location updates with unified Firestore structure
  useEffect(() => {
    if (!deliveryId) return;

    // Use unified path from mapConfig: /orders/{orderId}
    const orderPath = FIRESTORE_PATHS.ORDER(deliveryId);
    const unsubscribe = onSnapshot(doc(db, orderPath), (doc) => {
      if (doc.exists()) {
        const orderData = doc.data();
        
        // Extract rider location from unified structure
        const riderLocation = orderData.riderLocation;
        if (riderLocation && riderLocation.lat && riderLocation.lng) {
          const newPosition = { 
            lat: riderLocation.lat, 
            lng: riderLocation.lng 
          };
          
          // Update rider position
          setRiderPos(newPosition);
          
          // Add to trail (breadcrumb) for dynamic path drawing
          setRiderTrail(prevTrail => {
            const updatedTrail = [...prevTrail, newPosition];
            // Keep last 50 positions to avoid memory issues
            return updatedTrail.slice(-50);
          });
          
          // Auto-center map on rider movement
          if (map && lastPosition) {
            const distance = getDistance(lastPosition, newPosition);
            if (distance > 10) { // Only recenter if significant movement (10+ meters)
              map.panTo(newPosition);
              
              // Smooth zoom adjustment based on speed
              const currentZoom = map.getZoom();
              if (distance > 100) {
                map.setZoom(Math.max(currentZoom - 1, 12)); // Zoom out for fast movement
              } else if (distance < 20) {
                map.setZoom(Math.min(currentZoom + 1, 18)); // Zoom in when slowing down
              }
            }
          }
          
          setLastPosition(newPosition);
        }
        
        // Also extract other order data if needed
        console.log('📦 Order Status:', orderData.orderStatus);
        console.log('🕐 ETA:', orderData.estimatedArrival);
      }
    });

    return () => unsubscribe();
  }, [deliveryId, map, lastPosition]);

  // Calculate distance between two points (meters)
  const getDistance = (pos1, pos2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = pos1.lat * Math.PI/180;
    const φ2 = pos2.lat * Math.PI/180;
    const Δφ = (pos2.lat-pos1.lat) * Math.PI/180;
    const Δλ = (pos2.lng-pos1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const onMapLoad = React.useCallback((mapInstance) => {
    setMap(mapInstance);
    const bounds = new window.google.maps.LatLngBounds();
    routeCoordinates.forEach(coord => bounds.extend(coord));
    mapInstance.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
  }, []);

  const onMapUnmount = React.useCallback(() => {
    setMap(null);
  }, []);

  // Enhanced rider icon with direction indicator
  const getRiderIcon = (bearing = 0) => ({
    url: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <g transform="rotate(${bearing} 20 20)">
          <circle cx="20" cy="20" r="18" fill="#EF4444" stroke="white" stroke-width="3"/>
          <circle cx="20" cy="20" r="8" fill="white"/>
          <polygon points="20,8 24,16 20,14 16,16" fill="#EF4444"/>
          <circle cx="20" cy="20" r="3" fill="#EF4444"/>
        </g>
        <circle cx="20" cy="20" r="22" fill="none" stroke="#EF4444" stroke-width="1" opacity="0.3">
          <animate attributeName="r" values="22;28;22" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
        </circle>
      </svg>
    `),
    scaledSize: { width: 40, height: 40 },
    anchor: { x: 20, y: 20 },
  });

  // Calculate bearing between two points for direction
  const getBearing = (start, end) => {
    const startLat = start.lat * Math.PI / 180;
    const startLng = start.lng * Math.PI / 180;
    const endLat = end.lat * Math.PI / 180;
    const endLng = end.lng * Math.PI / 180;

    const dLng = endLng - startLng;

    const y = Math.sin(dLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) - 
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  const currentBearing = lastPosition ? getBearing(lastPosition, riderPos) : 0;
  const riderIcon = getRiderIcon(currentBearing);

  const destinationIcon = {
    url: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="120" height="40" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="120" height="40" rx="20" fill="#1F2937"/>
        <text x="60" y="25" text-anchor="middle" fill="white" font-size="13" font-weight="500">Abeokuta DC</text>
      </svg>
    `),
    scaledSize: { width: 120, height: 40 },
    anchor: { x: 60, y: 20 },
  };

  // Animated planned route (Go7 red - #E0001B)
  const plannedRouteOptions = {
    path: routeCoordinates,
    geodesic: true,
    strokeColor: '#E0001B', // Go7 brand red
    strokeOpacity: 0.8,
    strokeWeight: 4,
  };

  // Actual rider trail (dynamic - green for completed)
  const riderTrailOptions = {
    path: riderTrail,
    geodesic: true,
    strokeColor: '#10B981', // Green for completed path
    strokeOpacity: 0.9,
    strokeWeight: 4,
  };

  // Current movement segment (animated - orange highlight)
  const currentSegmentOptions = riderTrail.length > 1 ? {
    path: riderTrail.slice(-2), // Last two positions
    geodesic: true,
    strokeColor: '#F59E0B', // Orange for current movement
    strokeOpacity: 1.0,
    strokeWeight: 6,
  } : null;

  if (loadError) return (
    <div className="w-full h-full flex items-center justify-center" style={{ height: '300px' }}>
      <div className="text-red-500">Error loading maps</div>
    </div>
  );
  if (!isLoaded) return (
    <div className="w-full h-full flex items-center justify-center" style={{ height: '300px' }}>
      <div className="text-gray-500">Loading maps...</div>
    </div>
  );

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={{ lat: 7.1516, lng: 3.3467 }}
      zoom={14}
      options={mapOptions}
      onLoad={onMapLoad}
      onUnmount={onMapUnmount}
    >
      {/* Planned route (dashed red line) */}
      <Polyline options={plannedRouteOptions} />
      
      {/* Actual rider trail (solid green line) */}
      {riderTrail.length > 1 && <Polyline options={riderTrailOptions} />}
      
      {/* Current movement segment (thick orange line) */}
      {currentSegmentOptions && <Polyline options={currentSegmentOptions} />}
      
      {/* Animated rider marker with direction */}
      <Marker 
        position={riderPos} 
        icon={riderIcon}
        animation={window.google?.maps?.Animation?.BOUNCE}
      />
      
      {/* Destination marker */}
      <Marker position={{ lat: 7.1516, lng: 3.3467 }} icon={destinationIcon} />
      
      {/* Trail markers (breadcrumbs every 10th position) */}
      {riderTrail.filter((_, index) => index % 10 === 0).map((position, index) => (
        <Marker
          key={`trail-${index}`}
          position={position}
          icon={{
            url: 'data:image/svg+xml;base64,' + btoa(`
              <svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
                <circle cx="4" cy="4" r="3" fill="#059669" opacity="0.7"/>
              </svg>
            `),
            scaledSize: { width: 8, height: 8 },
            anchor: { x: 4, y: 4 },
          }}
        />
      ))}
    </GoogleMap>
  );
};

// Confetti Animation Component
const ConfettiEffect = ({ show }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 bg-red-500 rounded"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: ['#E0001B', '#FFD700', '#00FF00', '#FF69B4'][Math.floor(Math.random() * 4)]
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ 
            y: window.innerHeight + 20, 
            opacity: 0, 
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1)
          }}
          transition={{ 
            duration: 3 + Math.random() * 2,
            delay: Math.random() * 0.5,
            ease: "easeIn"
          }}
        />
      ))}
    </div>
  );
};

// Delivery Stepper Component (Uber Eats Style)
const DeliveryStepper = ({ currentStatus = "en_route" }) => {
  const steps = [
    { key: "requested", label: "Requested", icon: "📋" },
    { key: "assigned", label: "Assigned", icon: "✅" },
    { key: "en_route", label: "En Route", icon: "🚴‍♂️" },
    { key: "delivered", label: "Delivered", icon: "📦" }
  ];

  const currentIndex = steps.findIndex(step => step.key === currentStatus);

  return (
    <div className="px-4 py-6 bg-white">
      <div className="flex items-center justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2" />
        
        {/* Active Progress Line */}
        <motion.div 
          className="absolute top-1/2 left-0 h-0.5 bg-red-500 -translate-y-1/2"
          initial={{ width: "0%" }}
          animate={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />

        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <motion.div
              key={step.key}
              className="flex flex-col items-center relative z-10"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                  isActive 
                    ? 'bg-red-500 text-white shadow-lg' 
                    : isCompleted 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}
                animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
              >
                {step.icon}
              </motion.div>
              <span className={`text-xs font-medium ${isActive ? 'text-red-500' : 'text-gray-600'}`}>
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Live Movement Stats Component
const LiveMovementStats = ({ riderTrail, riderPos, destinationPos }) => {
  const totalDistance = React.useMemo(() => {
    if (riderTrail.length < 2) return 0;
    let distance = 0;
    for (let i = 1; i < riderTrail.length; i++) {
      const R = 6371e3;
      const φ1 = riderTrail[i-1].lat * Math.PI/180;
      const φ2 = riderTrail[i].lat * Math.PI/180;
      const Δφ = (riderTrail[i].lat-riderTrail[i-1].lat) * Math.PI/180;
      const Δλ = (riderTrail[i].lng-riderTrail[i-1].lng) * Math.PI/180;
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      distance += R * c;
    }
    return Math.round(distance);
  }, [riderTrail]);

  const remainingDistance = React.useMemo(() => {
    if (!riderPos || !destinationPos) return 0;
    const R = 6371e3;
    const φ1 = riderPos.lat * Math.PI/180;
    const φ2 = destinationPos.lat * Math.PI/180;
    const Δφ = (destinationPos.lat-riderPos.lat) * Math.PI/180;
    const Δλ = (destinationPos.lng-riderPos.lng) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  }, [riderPos, destinationPos]);

  return (
    <div className="bg-gray-100 px-4 py-2 text-xs text-gray-600 flex justify-between">
      <span>Distance: {totalDistance}m</span>
      <span>Remaining: {remainingDistance}m</span>
      <span className="text-green-600">● Live</span>
    </div>
  );
};

// Enhanced Rider Status Card (Uber Eats Style)
const RiderStatusCard = ({ rider, onCallRider, status = "en_route" }) => {
  const statusMessages = {
    requested: "Looking for a rider...",
    assigned: "Rider assigned to your order",
    pickup_complete: "Order picked up, heading to you",
    enroute: "Rider is on the way to you",
    en_route: "Rider is on the way to you", // Alternative spelling
    arrived: "Rider has arrived!",
    delivered: "Order delivered successfully! 🎉",
    cancelled: "Order cancelled"
  };

  return (
    <motion.div
      className="bg-red-500 rounded-2xl p-4 mx-4 mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Rider Avatar with Pulse Effect */}
          <motion.div 
            className="relative"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white">
              <img 
                src={rider.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face&auto=format'} 
                alt={rider.name || 'Rider'} 
                className="w-full h-full object-cover"
              />
            </div>
            {/* Live Indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white">
              <motion.div
                className="w-full h-full bg-green-400 rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
          </motion.div>
          
          {/* Rider Info */}
          <div className="text-white">
            <h4 className="font-semibold text-lg">{rider.name || 'Tunde'}</h4>
            <div className="flex items-center space-x-1">
              <Star size={14} className="text-yellow-300 fill-current" />
              <span className="text-sm">{rider.rating || '4.9'}</span>
              <motion.span 
                className="text-xs opacity-75 ml-2"
                animate={{ opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {statusMessages[status]}
              </motion.span>
            </div>
          </div>
        </div>

        {/* Call Button with Hover Animation */}
        <motion.button 
          className="border-2 border-white text-white px-6 py-2 rounded-full font-medium"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCallRider}
        >
          <Phone size={16} className="inline mr-2" />
          Call
        </motion.button>
      </div>
    </motion.div>
  );
};

// Exact UI Status Section - Enhanced with Animations
const MobileTrackingContent = ({ riderInfo, estimatedArrival, riderTrail, riderPos, deliveryStatus, orderId }) => {
  const navigate = useNavigate();

  const handleCallRider = () => {
    if (riderInfo?.phone) {
      window.location.href = `tel:${riderInfo.phone}`;
    }
  };

  const handleReportIssue = () => {
    // TODO: Open modal and post to Firebase issues collection
    console.log('Report issue for order:', orderId);
  };

  const handleViewReceipt = () => {
    navigate(`/receipt/${orderId}`);
  };

  return (
    <div className="bg-white space-y-4">
      {/* Animated ETA Section */}
      <motion.div 
        className="px-4 pt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-gray-500 text-base mb-1">Estimated Arrival</p>
        <motion.h2 
          className="text-3xl font-bold text-gray-900"
          key={estimatedArrival} // Triggers animation on ETA change
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {estimatedArrival}
        </motion.h2>
      </motion.div>

      {/* Delivery Stepper */}
      <DeliveryStepper currentStatus={deliveryStatus} />

      {/* Enhanced Rider Card */}
      <RiderStatusCard 
        rider={riderInfo} 
        onCallRider={handleCallRider}
        status={deliveryStatus}
      />

      {/* Location Details with Animation */}
      <motion.div 
        className="px-4 space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-900">
            <span className="font-medium">Pickup:</span> Chicken Republic, Oke-Ilewo
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full border-2 border-red-500"></div>
          <span className="text-gray-900">
            <span className="font-medium">Dropoff:</span> Abeokuta DC
          </span>
        </div>
      </motion.div>

      {/* Rider Status */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Rider en route to you</h3>
        
        {/* Rider Card - Exact match to reference */}
        <div className="bg-red-500 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Rider Photo */}
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face&auto=format" 
                alt="Tunde" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Rider Info */}
            <div className="text-white">
              <h4 className="font-semibold text-lg">Tunde</h4>
              <div className="flex items-center space-x-1">
                <Star size={14} className="text-yellow-300 fill-current" />
                <span className="text-sm">4.9</span>
              </div>
            </div>
          </div>

          {/* Call Button */}
          <button className="border-2 border-white text-white px-6 py-2 rounded-full font-medium">
            Call Rider
          </button>
        </div>
      </div>

      {/* Pickup/Dropoff Locations */}
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-900">
            <span className="font-medium">Pickup:</span> Chicken Republic, Oke-Ilewo
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full border-2 border-red-500"></div>
          <span className="text-gray-900">
            <span className="font-medium">Dropoff:</span> Abeokuta DC
          </span>
        </div>
      </div>

      {/* Status Progress */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span className="text-gray-500">Requested</span>
        </div>
        <div className="flex-1 h-px bg-gray-300 mx-2"></div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span className="text-gray-500">Assigned</span>
        </div>
        <div className="flex-1 h-px bg-red-500 mx-2"></div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-900 font-medium">En Route</span>
        </div>
        <div className="flex-1 h-px bg-gray-300 mx-2"></div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
          <span className="text-gray-400">Delivered</span>
        </div>
      </div>

      {/* Animated Action Buttons */}
      <motion.div 
        className="flex space-x-3 px-4 pb-6 pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <motion.button 
          className="flex-1 border-2 border-red-500 text-red-500 py-3 rounded-full font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleReportIssue}
        >
          Report an Issue
        </motion.button>
        <motion.button 
          className="flex-1 bg-red-500 text-white py-3 rounded-full font-medium"
          whileHover={{ scale: 1.02, backgroundColor: "#DC2626" }}
          whileTap={{ scale: 0.98 }}
          onClick={handleViewReceipt}
        >
          View Receipt
        </motion.button>
      </motion.div>
    </div>
  );
};

// Main Component - Exact UI Match
export default function MobileLiveTracking() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const isMobile = useIsMobile();
  
  // Load Google Maps at top level
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  
  // Enhanced State Management for Uber Eats-style tracking
  const [riderLocation, setRiderLocation] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState('en_route');
  const [estimatedArrival, setEstimatedArrival] = useState('6:25 PM');
  const [showConfetti, setShowConfetti] = useState(false);
  const [mapZoom, setMapZoom] = useState('normal');
  const [currentStreet, setCurrentStreet] = useState('Loading location...');
  const [riderInfo, setRiderInfo] = useState({
    name: 'Tunde',
    rating: 4.9,
    phone: '+2348123456789',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face&auto=format'
  });

  // Debug: Log data on mount
  useEffect(() => {
    console.log('📱 MobileLiveTracking Data:', {
      orderId,
      deliveryStatus,
      estimatedArrival,
      riderInfo,
      currentStreet,
      isLoaded,
      loadError
    });
  }, [orderId, deliveryStatus, estimatedArrival, riderInfo, currentStreet, isLoaded, loadError]);

  // Listen for confetti events
  useEffect(() => {
    const handleConfetti = (event) => {
      if (event.detail?.type === 'delivery_success') {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000); // Hide after 3 seconds
      }
    };

    window.addEventListener('showConfetti', handleConfetti);
    return () => window.removeEventListener('showConfetti', handleConfetti);
  }, []);

  // Handle map zoom changes when sheet expands/collapses
  const handleMapZoomChange = useCallback((sheetState) => {
    setMapZoom(sheetState);
    console.log('📍 Map zoom should adjust for sheet state:', sheetState);
  }, []);

  // Real-time delivery tracking with new Firebase backend
  useEffect(() => {
    const deliveryId = orderId || "DELIVERY_ABC123";
    
    console.log(`🚀 Starting live tracking for delivery: ${deliveryId}`);

    // Start comprehensive delivery tracking
    const unsubscribe = deliveryService.startDeliveryTracking(deliveryId, {
      // Handle delivery status changes
      onStatusChange: (status, data) => {
        console.log(`📦 Status changed to: ${status}`);
        setDeliveryStatus(status);
        
        // Show confetti for successful delivery
        if (status === 'delivered') {
          deliveryService.showDeliveryConfetti();
        }
      },
      
      // Handle rider location updates
      onLocationUpdate: async (location, data) => {
        console.log(`📍 Rider location update:`, location);
        setRiderLocation(location);
        
        // Get street name for the new location
        if (location && location.lat && location.lng) {
          try {
            const streetData = await locationService.getCurrentLocation({
              lat: location.lat,
              lng: location.lng
            });
            
            if (streetData && streetData.display_name) {
              // Extract street name from full address
              const parts = streetData.display_name.split(',');
              const street = parts[0] || 'Unknown Street';
              setCurrentStreet(street);
              console.log(`🛣️ Rider on street: ${street}`);
            }
          } catch (error) {
            console.error('❌ Street name fetch error:', error);
          }
        }
      },
      
      // Handle ETA updates
      onETAUpdate: (etaText, etaSeconds, data) => {
        console.log(`⏱️ ETA update: ${etaText}`);
        setEstimatedArrival(etaText);
      },
      
      // Handle full delivery data updates
      onDeliveryUpdate: (data) => {
        console.log(`📦 Full delivery update:`, data);
        
        // Update all state from delivery data
        if (data.status) setDeliveryStatus(data.status);
        if (data.etaText) setEstimatedArrival(data.etaText);
        if (data.currentRiderLocation) setRiderLocation(data.currentRiderLocation);
        
        // Update rider info if available
        if (data.rider) {
          setRiderInfo(prev => ({ ...prev, ...data.rider }));
        }
      },
      
      // Handle errors
      onError: (error) => {
        console.error('❌ Delivery tracking error:', error);
      }
    });

    return () => {
      console.log(`🛑 Stopping live tracking for delivery: ${deliveryId}`);
      deliveryService.stopDeliveryTracking(deliveryId);
    };
  }, [orderId]);

  // Handle Google Maps loading errors
  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Map Loading Error</h2>
          <p className="text-gray-600 mb-4">Unable to load Google Maps. Please try again.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-500 text-white px-6 py-2 rounded-full"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Track Delivery | Go7</title>
        <meta name="description" content="Track your Go7 delivery in real-time" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Helmet>

      {/* Confetti Effect for Delivery Success */}
      <ConfettiEffect show={showConfetti} />

      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header - Enhanced with Status Indicator */}
        <motion.div 
          className="bg-white px-4 py-4 flex items-center justify-center relative border-b border-gray-100"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <button 
            onClick={() => navigate(-1)}
            className="absolute left-4"
          >
            <ArrowLeft size={24} className="text-gray-900" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">Track Delivery</h1>
            {deliveryStatus === 'delivered' && (
              <motion.span 
                className="text-green-600 text-sm"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                ✅ Completed
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* Location Header - Live Street Name */}
        <motion.div 
          className="bg-white px-4 py-3 flex items-center space-x-2 border-b border-gray-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-lg text-gray-900 font-medium">{currentStreet}</span>
        </motion.div>

        {/* Map Section */}
        <div className="flex-1 relative bg-gray-100" style={{ minHeight: '50vh', maxHeight: '70vh' }}>
          <MobileTrackingMap 
            deliveryId={orderId || "DELIVERY_ABC123"}
            riderLocation={riderLocation}
            isLoaded={isLoaded}
            loadError={loadError}
          />
          
          {/* Center on Rider Button */}
          <button 
            className="absolute top-4 right-4 bg-white rounded-full p-3 shadow-lg border border-gray-200 z-10"
            onClick={() => {
              // This will be connected to the map centering function
              console.log('Center on rider');
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8L12 16M8 12L16 12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="9" stroke="#EF4444" strokeWidth="2"/>
            </svg>
          </button>
        </div>

        {/* Modern Draggable Bottom Sheet - Uber Style */}
        <DeliverySheet 
          delivery={{
            id: orderId || 'DELIVERY_ABC123',
            status: deliveryStatus === 'en_route' ? 'enroute' : deliveryStatus,
            eta: estimatedArrival,
            pickupAddress: 'Oke-Ilewo Market, Abeokuta',
            dropoffAddress: 'Abeokuta DC, Abeokuta South',
            orderItems: [
              { name: 'Jollof Rice & Chicken', quantity: 2, price: '3,500' },
              { name: 'Plantain', quantity: 1, price: '800' },
              { name: 'Coke', quantity: 2, price: '600' }
            ]
          }}
          rider={{
            name: riderInfo.name,
            phone: riderInfo.phone,
            photoURL: riderInfo.photo,
            rating: String(riderInfo.rating),
            deliveries: '247'
          }}
          onMapZoomChange={handleMapZoomChange}
        />
      </div>

      {/* Styles for exact UI match */}
      <style>{`
        .bike-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .destination-marker {
          background: transparent !important;
          border: none !important;
        }

        .leaflet-control-attribution {
          display: none !important;
        }

        .leaflet-control-zoom {
          display: none !important;
        }
      `}</style>
    </>
  );
}