import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Phone, MessageCircle, Clock, Package } from 'lucide-react';

// Since we don't have Mapbox installed, I'll create a map simulation for now
// In production, you would use Mapbox GL JS or Google Maps

const LiveTrackingMap = ({ order, className = '' }) => {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [riderMarker, setRiderMarker] = useState(null);
  
  // Default locations for Lagos, Nigeria
  const defaultCenter = { lat: 7.4000, lng: 3.9000 };
  
  // Map simulation state
  const [simulatedRiderPosition, setSimulatedRiderPosition] = useState(null);

  useEffect(() => {
    if (!order) return;
    
    // Initialize map simulation
    initializeMap();
    
    // Update rider position when order data changes
    if (order.riderLocation) {
      updateRiderPosition(order.riderLocation);
    }
    
  }, [order]);

  const initializeMap = () => {
    // This is a simulation - in production you would initialize Mapbox or Google Maps here
    setMapLoaded(true);
    
    // Set initial rider position if available
    if (order?.riderLocation) {
      setSimulatedRiderPosition(order.riderLocation);
    }
  };

  const updateRiderPosition = (location) => {
    setSimulatedRiderPosition(location);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getDistanceToDestination = () => {
    if (!simulatedRiderPosition || !order?.dropoff) return null;
    
    return calculateDistance(
      simulatedRiderPosition.lat,
      simulatedRiderPosition.lng,
      order.dropoff.lat,
      order.dropoff.lng
    );
  };

  // Map simulation component
  const MapSimulation = () => (
    <div className="relative w-full h-full bg-gray-100 overflow-hidden">
      {/* Background grid to simulate map */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#666" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Pickup pin */}
      {order?.pickup && (
        <div 
          className="absolute transform -translate-x-1/2 -translate-y-full z-10"
          style={{ 
            left: '30%', 
            top: '40%' 
          }}
        >
          <div className="flex flex-col items-center">
            <div className="bg-blue-500 text-white p-2 rounded-full shadow-lg">
              <Package className="w-6 h-6" />
            </div>
            <div className="bg-white px-2 py-1 rounded shadow text-xs mt-1 whitespace-nowrap">
              📦 Pickup: {order.pickup.name}
            </div>
          </div>
        </div>
      )}
      
      {/* Dropoff pin */}
      {order?.dropoff && (
        <div 
          className="absolute transform -translate-x-1/2 -translate-y-full z-10"
          style={{ 
            left: '70%', 
            top: '60%' 
          }}
        >
          <div className="flex flex-col items-center">
            <div className="bg-[#E50914] text-white p-2 rounded-full shadow-lg">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="bg-white px-2 py-1 rounded shadow text-xs mt-1 whitespace-nowrap">
              🏠 Drop-off: {order.dropoff.name}
            </div>
          </div>
        </div>
      )}
      
      {/* Rider pin (moving) */}
      {simulatedRiderPosition && (
        <div 
          className="absolute transform -translate-x-1/2 -translate-y-full z-20 transition-all duration-1000"
          style={{ 
            left: `${45 + (simulatedRiderPosition.lat - 7.4) * 1000}%`, 
            top: `${50 + (simulatedRiderPosition.lng - 3.9) * 1000}%` 
          }}
        >
          <div className="flex flex-col items-center">
            <div className="bg-green-500 text-white p-2 rounded-full shadow-lg animate-pulse">
              <Navigation className="w-6 h-6" />
            </div>
            <div className="bg-white px-2 py-1 rounded shadow text-xs mt-1 whitespace-nowrap">
              🚴 {order.rider?.name || 'Rider'}
            </div>
          </div>
        </div>
      )}
      
      {/* Route line simulation */}
      {order?.pickup && order?.dropoff && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line
            x1="30%"
            y1="40%"
            x2="70%"
            y2="60%"
            stroke="#E50914"
            strokeWidth="3"
            strokeDasharray="10,5"
            className="opacity-60"
          />
        </svg>
      )}
      
      {/* Map overlay info */}
      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Live Tracking</span>
          </div>
          {getDistanceToDestination() && (
            <span className="text-gray-600">
              {getDistanceToDestination().toFixed(1)} km away
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (!order) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No order to track</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map container */}
      <div ref={mapRef} className="w-full h-full min-h-[300px] rounded-lg overflow-hidden">
        <MapSimulation />
      </div>
      
      {/* Rider contact overlay */}
      {order.rider && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">
                {order.rider.name?.charAt(0) || 'R'}
              </span>
            </div>
            <div>
              <div className="font-medium text-sm">{order.rider.name}</div>
              <div className="text-xs text-gray-500">
                {order.rider.vehicle || 'Bike'} • ⭐ {order.rider.rating || '5.0'}
              </div>
            </div>
            <div className="flex gap-1">
              <button className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors">
                <Phone className="w-4 h-4" />
              </button>
              <button className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Location details */}
      <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4">
        <div className="space-y-3">
          {/* Pickup location */}
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5"></div>
            <div className="flex-1">
              <div className="font-medium text-sm">Pickup Location</div>
              <div className="text-xs text-gray-600">{order.pickup?.address}</div>
            </div>
          </div>
          
          {/* Dropoff location */}
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5"></div>
            <div className="flex-1">
              <div className="font-medium text-sm">Delivery Address</div>
              <div className="text-xs text-gray-600">{order.dropoff?.address}</div>
            </div>
          </div>
          
          {/* Distance and ETA */}
          <div className="flex justify-between items-center pt-2 border-t">
            <div className="text-xs text-gray-500">
              Distance: {order.distance ? `${order.distance.toFixed(1)} km` : 'Calculating...'}
            </div>
            <div className="text-xs text-gray-500">
              ETA: {order.estimatedDeliveryTime ? '20-30 mins' : 'Calculating...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingMap;