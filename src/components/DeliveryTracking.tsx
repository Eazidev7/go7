import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import WhatsAppChat from './WhatsAppChat';
import NotificationSystem, { useNotifications } from './NotificationSystem';

// MapTiler configuration
const MAPTILER_CONFIG = {
  apiKey: "nRGZ9lGblbV9lFK2KclL",
  tileUrl: "https://api.maptiler.com/maps/019996dd-306b-7019-acc5-de8469c0388d/{z}/{x}/{y}.png?key=nRGZ9lGblbV9lFK2KclL",
  attribution: '© <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
};

// Abeokuta center coordinates
const ABEOKUTA_CENTER: [number, number] = [7.1475, 3.3619];

// Simulation data for demonstration
const PICKUP_LOCATION = { lat: 7.1475, lng: 3.3619, address: "Olumo Rock Area, Abeokuta" };
const DROPOFF_LOCATION = { lat: 7.1575, lng: 3.3719, address: "Ibara Housing Estate, Abeokuta" };

// Route coordinates (simulated path from pickup to dropoff)
const ROUTE_COORDINATES: [number, number][] = [
  [7.1475, 3.3619], // Pickup
  [7.1485, 3.3629],
  [7.1495, 3.3639],
  [7.1505, 3.3649],
  [7.1515, 3.3659],
  [7.1525, 3.3669],
  [7.1535, 3.3679],
  [7.1545, 3.3689],
  [7.1555, 3.3699],
  [7.1565, 3.3709],
  [7.1575, 3.3719]  // Dropoff
];

interface RiderPosition {
  lat: number;
  lng: number;
  timestamp: number;
}

interface RouteInfo {
  distance: number; // in meters
  duration: number; // in seconds
  eta: string;
  lastUpdated: number;
}

interface ApiRouteResponse {
  routes?: Array<{
    distance: number;
    duration: number;
  }>;
}

interface DeliveryTrackingProps {
  orderId?: string;
  customerName?: string;
  estimatedTime?: string;
  className?: string;
}

interface RiderInfo {
  name: string;
  phone: string;
  vehiclePlate: string;
  vehicleType: string;
  rating: number;
  photo: string;
}

// Custom marker icons with SVG for better mobile performance
const createPickupIcon = () => {
  const svgContent = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#10B981" stroke="white" stroke-width="2"/>
      <path d="M12 16l4 4 8-8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  return L.divIcon({
    html: svgContent,
    className: 'custom-pickup-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createDropoffIcon = () => {
  const svgContent = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#DC2626" stroke="white" stroke-width="2"/>
      <path d="M16 8v8l4 4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="16" cy="16" r="2" fill="white"/>
    </svg>
  `;
  return L.divIcon({
    html: svgContent,
    className: 'custom-dropoff-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createRiderIcon = () => {
  const svgContent = `
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="#3B82F6" stroke="white" stroke-width="2"/>
      <circle cx="20" cy="20" r="12" fill="white"/>
      <path d="M15 18l5 2 5-2v6l-5 2-5-2v-6z" fill="#3B82F6"/>
      <circle cx="20" cy="20" r="3" fill="#3B82F6"/>
    </svg>
  `;
  return L.divIcon({
    html: svgContent,
    className: 'custom-rider-icon animate-pulse',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

// Map bounds controller for fullscreen experience
const MapController: React.FC<{ riderPosition: RiderPosition }> = ({ riderPosition }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Auto-center map on rider with padding for bottom panel
    const bounds = L.latLngBounds([
      [PICKUP_LOCATION.lat, PICKUP_LOCATION.lng],
      [DROPOFF_LOCATION.lat, DROPOFF_LOCATION.lng],
      [riderPosition.lat, riderPosition.lng]
    ]);

    try {
      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [20, 20],
          maxZoom: 16
        });
      }
    } catch (e) {
      console.warn('fitBounds error in DeliveryTracking:', e);
    }
  }, [map, riderPosition]);

  return null;
};

// Animated rider marker with smooth transitions
const AnimatedRiderMarker: React.FC<{
  position: [number, number];
  previousPosition?: [number, number];
}> = ({ position, previousPosition }) => {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !previousPosition) return;

    // Animate marker movement
    const startPos = previousPosition;
    const endPos = position;
    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing function
      const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

      const easedProgress = easeInOutCubic(progress);

      const currentLat = startPos[0] + (endPos[0] - startPos[0]) * easedProgress;
      const currentLng = startPos[1] + (endPos[1] - startPos[1]) * easedProgress;

      marker.setLatLng([currentLat, currentLng]);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [position, previousPosition]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={createRiderIcon()}
    />
  );
};

const DeliveryTracking: React.FC<DeliveryTrackingProps> = ({
  orderId = "GO7-2024-001",
  customerName = "Sarah Johnson",
  estimatedTime = "12-15 min",
  className = ""
}) => {
  const [riderPosition, setRiderPosition] = useState<RiderPosition>({
    lat: PICKUP_LOCATION.lat,
    lng: PICKUP_LOCATION.lng,
    timestamp: Date.now()
  });
  const [previousPosition, setPreviousPosition] = useState<[number, number] | undefined>();
  const [routeIndex, setRouteIndex] = useState(0);
  const [isTracking, setIsTracking] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({
    distance: 0,
    duration: 0,
    eta: "Calculating...",
    lastUpdated: Date.now()
  });
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<'pickup' | 'enroute' | 'delivered'>('pickup');
  const [showChat, setShowChat] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Notification system
  const {
    notifications,
    dismissNotification,
    showOrderConfirmed,
    showRiderPickup,
    showRiderArriving,
    showDelivered
  } = useNotifications();

  // Mock rider information
  const riderInfo: RiderInfo = {
    name: "Ahmed Bello",
    phone: "+234 803 123 4567",
    vehiclePlate: "ABJ-123-KM",
    vehicleType: "Honda Motorcycle",
    rating: 4.8,
    photo: "👨🏾‍🦱"
  };

  // Handle calling rider
  const handleCallRider = () => {
    window.location.href = `tel:${riderInfo.phone}`;
  };

  // Handle opening chat
  const handleChatRider = () => {
    setShowChat(true);
  };

  // Handle closing chat
  const handleCloseChat = () => {
    setShowChat(false);
  };

  // Initialize with order confirmed notification
  useEffect(() => {
    const timer = setTimeout(() => {
      showOrderConfirmed(orderId);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Haversine distance calculation fallback
  const calculateHaversineDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }, []);

  // Format distance for display
  const formatDistance = useCallback((distanceInMeters: number): string => {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`;
    } else {
      return `${(distanceInMeters / 1000).toFixed(1)}km`;
    }
  }, []);

  // Format duration for display
  const formatDuration = useCallback((durationInSeconds: number): string => {
    const minutes = Math.round(durationInSeconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  }, []);

  // Fetch route information from MapTiler Distance Matrix API
  const fetchRouteInfo = useCallback(async (fromLat: number, fromLon: number, toLat: number, toLon: number) => {
    setIsLoadingRoute(true);

    try {
      const apiUrl = `https://api.maptiler.com/routes/driving/${fromLon},${fromLat}/${toLon},${toLat}.json?key=${MAPTILER_CONFIG.apiKey}`;

      console.log('🛣️ Fetching route info from MapTiler:', apiUrl);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data: ApiRouteResponse = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const etaTime = new Date(Date.now() + route.duration * 1000);

        setRouteInfo({
          distance: route.distance,
          duration: route.duration,
          eta: etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          lastUpdated: Date.now()
        });

        console.log('✅ Route info updated:', {
          distance: formatDistance(route.distance),
          duration: formatDuration(route.duration),
          eta: etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      } else {
        throw new Error('No routes found in API response');
      }
    } catch (error) {
      console.warn('⚠️ MapTiler API failed, using haversine fallback:', error);

      // Fallback to haversine distance calculation
      const distance = calculateHaversineDistance(fromLat, fromLon, toLat, toLon);
      // Estimate duration assuming average speed of 25 km/h in city traffic
      const estimatedDuration = (distance / 1000) * 3600 / 25; // seconds
      const etaTime = new Date(Date.now() + estimatedDuration * 1000);

      setRouteInfo({
        distance: distance,
        duration: estimatedDuration,
        eta: etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        lastUpdated: Date.now()
      });

      console.log('📐 Fallback route info:', {
        distance: formatDistance(distance),
        duration: formatDuration(estimatedDuration),
        eta: etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } finally {
      setIsLoadingRoute(false);
    }
  }, [calculateHaversineDistance, formatDistance, formatDuration]);

  // Simulate live GPS updates with status changes
  useEffect(() => {
    if (!isTracking) return;

    intervalRef.current = setInterval(() => {
      setRouteIndex(prevIndex => {
        if (prevIndex >= ROUTE_COORDINATES.length - 1) {
          setIsTracking(false);
          setDeliveryStatus('delivered');
          showDelivered(orderId);
          return prevIndex;
        }

        const nextIndex = prevIndex + 1;
        const newPosition = ROUTE_COORDINATES[nextIndex];

        // Update delivery status based on progress and trigger notifications
        if (nextIndex === 1) {
          setDeliveryStatus('pickup');
          showRiderPickup(riderInfo.name, orderId);
        } else if (nextIndex === ROUTE_COORDINATES.length - 3) {
          // Rider arriving soon
          showRiderArriving(riderInfo.name, '2-3 minutes');
        } else if (nextIndex < ROUTE_COORDINATES.length - 1) {
          setDeliveryStatus('enroute');
        }

        // Add realistic GPS noise (±0.0001 degrees)
        const noiseLat = (Math.random() - 0.5) * 0.0002;
        const noiseLng = (Math.random() - 0.5) * 0.0002;

        const noisyPosition: RiderPosition = {
          lat: newPosition[0] + noiseLat,
          lng: newPosition[1] + noiseLng,
          timestamp: Date.now()
        };

        // Store previous position for smooth animation
        setPreviousPosition([riderPosition.lat, riderPosition.lng]);
        setRiderPosition(noisyPosition);

        // Update route info with new rider position
        fetchRouteInfo(noisyPosition.lat, noisyPosition.lng, DROPOFF_LOCATION.lat, DROPOFF_LOCATION.lng);

        return nextIndex;
      });
    }, 3000); // Update every 3 seconds for realistic timing

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTracking, riderPosition]);

  // Initial route info fetch
  useEffect(() => {
    fetchRouteInfo(riderPosition.lat, riderPosition.lng, DROPOFF_LOCATION.lat, DROPOFF_LOCATION.lng);
  }, []); // Only run on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Calculate progress percentage
  const progress = Math.round((routeIndex / (ROUTE_COORDINATES.length - 1)) * 100);

  // Get status message
  const getStatusMessage = () => {
    switch (deliveryStatus) {
      case 'pickup':
        return 'Rider is picking up your order';
      case 'enroute':
        return 'On the way to you';
      case 'delivered':
        return 'Order delivered successfully!';
      default:
        return 'Tracking your order...';
    }
  };

  return (
    <div className={`go7-tracking-screen relative w-full overflow-hidden ${className}`}>
      {/* Fullscreen Map */}
      <MapContainer
        center={ABEOKUTA_CENTER}
        zoom={14}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        style={{ height: '100dvh', width: '100vw' }}
      >
        {/* MapTiler Tile Layer */}
        <TileLayer
          url={MAPTILER_CONFIG.tileUrl}
          attribution={MAPTILER_CONFIG.attribution}
          maxZoom={18}
          minZoom={12}
          tileSize={256}
          detectRetina={true}
        />

        {/* Map Controller for auto-centering */}
        <MapController riderPosition={riderPosition} />

        {/* Pickup Marker */}
        <Marker position={[PICKUP_LOCATION.lat, PICKUP_LOCATION.lng]} icon={createPickupIcon()} />

        {/* Dropoff Marker */}
        <Marker position={[DROPOFF_LOCATION.lat, DROPOFF_LOCATION.lng]} icon={createDropoffIcon()} />

        {/* Animated Rider Marker */}
        <AnimatedRiderMarker
          position={[riderPosition.lat, riderPosition.lng]}
          previousPosition={previousPosition}
        />

        {/* Route Polyline */}
        <Polyline
          positions={ROUTE_COORDINATES}
          color="#3B82F6"
          weight={4}
          opacity={0.8}
          dashArray="5, 10"
        />
      </MapContainer>

      {/* Floating Back Button */}
      <button
        onClick={() => window.history.back()}
        className="go7-tracking-back-btn absolute left-4 z-[1000] bg-white rounded-full p-3 shadow-lg active:scale-95 transition-transform"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Live Status Indicator */}
      <div className="go7-tracking-status-chip absolute right-4 z-[1000] bg-white rounded-full px-4 py-2 shadow-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className="text-sm font-medium text-gray-700">
            {isTracking ? 'LIVE' : 'DELIVERED'}
          </span>
        </div>
      </div>

      {/* Bottom Status Panel */}
      <div className="go7-tracking-bottom-sheet absolute bottom-0 left-0 right-0 z-[1000]">
        {/* Main Status Card */}
        <div
          className="bg-white rounded-t-3xl shadow-2xl"
          style={{
            paddingBottom: showInfoPanel ? 'var(--go7-safe-bottom, 0px)' : 'calc(12px + var(--go7-safe-bottom, env(safe-area-inset-bottom, 0px)))'
          }}
        >
          {/* Handle Bar */}
          <div
            className="flex justify-center pt-3 pb-2 cursor-pointer"
            onClick={() => setShowInfoPanel(!showInfoPanel)}
          >
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Status Content */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${deliveryStatus === 'delivered' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                  {deliveryStatus === 'delivered' ? (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{getStatusMessage()}</h3>
                  <p className="text-sm text-gray-600">Order #{orderId}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  {isLoadingRoute ? '...' : `ETA ${routeInfo.eta}`}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDistance(routeInfo.distance)} away
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-600 mb-2">
                <span>Pickup</span>
                <span>En Route</span>
                <span>Delivered</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${deliveryStatus === 'delivered' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-center text-sm text-gray-600 mt-1">
                {progress}% Complete
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleCallRider}
                className="flex-1 bg-green-600 text-white py-4 rounded-xl font-semibold active:scale-95 transition-transform flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Call Rider</span>
              </button>
              <button
                onClick={handleChatRider}
                className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-semibold active:scale-95 transition-transform flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Chat</span>
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Info Panel */}
        <div
          className={`bg-white transition-all duration-300 overflow-hidden ${
            showInfoPanel ? 'max-h-[42dvh] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="go7-tracking-sheet-scroll px-6 py-4 border-t border-gray-200 max-h-[42dvh] overflow-y-auto overscroll-contain touch-pan-y">
            <h4 className="font-semibold text-gray-900 mb-4">Rider Details</h4>

            {/* Rider Info */}
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                {riderInfo.photo}
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-gray-900">{riderInfo.name}</h5>
                <div className="flex items-center space-x-1 mt-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(riderInfo.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">{riderInfo.rating}</span>
                </div>
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Vehicle</p>
                <p className="font-medium text-gray-900">{riderInfo.vehicleType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Plate Number</p>
                <p className="font-medium text-gray-900">{riderInfo.vehiclePlate}</p>
              </div>
            </div>

            {/* Order Details */}
            <div className="border-t border-gray-200 pt-4">
              <h5 className="font-semibold text-gray-900 mb-3">Order Details</h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Pickup</span>
                  <span className="text-gray-900">{PICKUP_LOCATION.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery to</span>
                  <span className="text-gray-900">{typeof customerName === 'string' ? customerName : customerName?.name || 'Customer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Address</span>
                  <span className="text-gray-900">{DROPOFF_LOCATION.address}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Chat Overlay */}
      {showChat && (
        <WhatsAppChat
          isOpen={showChat}
          onClose={handleCloseChat}
          chatType="rider"
          contactName={riderInfo.name}
          contactAvatar="🚴‍♂️"
          orderId={orderId}
        />
      )}

      {/* Notification System */}
      <NotificationSystem
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </div>
  );
};

export default DeliveryTracking;