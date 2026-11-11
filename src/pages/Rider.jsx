/**
 * Rider Dashboard Page
 * Allows riders to go online/offline and receive order assignments
 */
import React, { useState, useEffect, useRef } from 'react';

// Mock rider data store
const useRider = () => {
  const [rider, setRider] = useState({
    id: 'rider_001',
    name: 'Demo Rider',
    zone: 'medellin_poblado',
    status: 'offline',
    coords: {
      lat: 6.4281,
      lng: 3.4219,
      acc: 10,
      ts: Date.now()
    }
  });

  const setStatus = (status) => {
    setRider(prev => ({ ...prev, status }));
  };

  const setCoords = (coords) => {
    setRider(prev => ({ ...prev, coords: { ...coords, ts: Date.now() } }));
  };

  const setZone = (zone) => {
    setRider(prev => ({ ...prev, zone }));
  };

  return { rider, setStatus, setCoords, setZone };
};

const ZONES = [
  'medellin_poblado',
  'medellin_laureles', 
  'medellin_centro',
  'medellin_sabaneta',
  'bogota_zona_rosa',
  'bogota_chapinero'
];

export default function Rider() {
  const { rider, setStatus, setCoords, setZone } = useRider();
  const [currentOrder, setCurrentOrder] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [geoStatus, setGeoStatus] = useState({ accuracy: null, lastUpdate: null, error: null });
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({ trips: 12, earnings: 24500 });

  const locationInterval = useRef(null);
  const assignmentInterval = useRef(null);

  const isOnline = rider?.status === 'online';
  const riderZone = rider?.zone || 'medellin_poblado';
  const riderName = rider?.name || 'John Rider';

  // Start/stop geolocation when going online/offline
  useEffect(() => {
    if (isOnline) {
      // Start mock location updates
      startLocationUpdates();
      
      // Check for assignments periodically
      assignmentInterval.current = setInterval(() => {
        if (!currentOrder && !activeOrder && Math.random() > 0.85) {
          createMockAssignment();
        }
      }, 10000);
    } else {
      // Stop everything when offline
      if (locationInterval.current) {
        clearInterval(locationInterval.current);
        locationInterval.current = null;
      }
      
      if (assignmentInterval.current) {
        clearInterval(assignmentInterval.current);
        assignmentInterval.current = null;
      }
    }

    return () => {
      // Cleanup on unmount
      if (locationInterval.current) clearInterval(locationInterval.current);
      if (assignmentInterval.current) clearInterval(assignmentInterval.current);
    };
  }, [isOnline]);

  const startLocationUpdates = () => {
    // Try real geolocation first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            acc: position.coords.accuracy
          };
          setCoords(newCoords);
          setGeoStatus({
            accuracy: position.coords.accuracy,
            lastUpdate: new Date(),
            error: null
          });
        },
        (error) => {
          // Use mock location
          const mockCoords = {
            lat: 6.4281 + (Math.random() - 0.5) * 0.01,
            lng: 3.4219 + (Math.random() - 0.5) * 0.01,
            acc: 25 + Math.random() * 25
          };
          setCoords(mockCoords);
          setGeoStatus({
            accuracy: mockCoords.acc,
            lastUpdate: new Date(),
            error: "Using mock location"
          });
        }
      );
    }

    // Update location every 10 seconds
    locationInterval.current = setInterval(() => {
      const currentLat = rider.coords.lat;
      const currentLng = rider.coords.lng;
      const newCoords = {
        lat: currentLat + (Math.random() - 0.5) * 0.001,
        lng: currentLng + (Math.random() - 0.5) * 0.001,
        acc: 15 + Math.random() * 20
      };
      setCoords(newCoords);
      setGeoStatus({
        accuracy: newCoords.acc,
        lastUpdate: new Date(),
        error: null
      });
    }, 10000);
  };

  const createMockAssignment = () => {
    const newOrder = {
      id: `order_${Date.now()}`,
      status: 'assigned',
      pickupZone: rider.zone,
      pickup: {
        address: '123 Poblado Ave, Medellin',
        lat: rider.coords.lat + (Math.random() - 0.5) * 0.01,
        lng: rider.coords.lng + (Math.random() - 0.5) * 0.01
      },
      dropoff: {
        address: '456 Centro Street, Medellin',
        lat: rider.coords.lat + (Math.random() - 0.5) * 0.015,
        lng: rider.coords.lng + (Math.random() - 0.5) * 0.015
      },
      customer: {
        name: 'John Customer',
        phone: '+57123456789'
      },
      items: 'Food delivery',
      estimatedPayout: 12000 + Math.round(Math.random() * 8000)
    };
    
    setCurrentOrder(newOrder);
    showToast('New order assignment!', 'info');
  };

  const handleToggleOnline = () => {
    const newStatus = isOnline ? 'offline' : 'online';
    setStatus(newStatus);
    
    if (newStatus === 'offline') {
      // Going offline - clear assignments
      setCurrentOrder(null);
      setActiveOrder(null);
    }
  };

  const handleAcceptOrder = () => {
    if (currentOrder) {
      const acceptedOrder = { ...currentOrder, status: 'en_route' };
      setActiveOrder(acceptedOrder);
      setCurrentOrder(null);
      showToast('Order accepted! Heading to pickup...', 'success');
    }
  };

  const handleDeclineOrder = () => {
    setCurrentOrder(null);
    showToast('Order declined', 'info');
  };

  const handleZoneChange = (newZone) => {
    setZone(newZone);
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const formatAccuracy = (accuracy) => {
    if (accuracy < 10) return 'High Accuracy';
    if (accuracy < 50) return 'Good Accuracy';
    return 'Low Accuracy';
  };

  // Assignment Card
  const AssignmentCard = ({ order, onAccept, onDecline }) => {
    const [countdown, setCountdown] = useState(10);
    
    useEffect(() => {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            onDecline();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }, []);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
        <div className="bg-white w-full max-w-md rounded-t-xl p-6 animate-slide-up">
          <div className="flex justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">New Assignment</h3>
              <p className="text-sm text-gray-500">Order #{order.id.slice(-4)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              {countdown}
            </div>
          </div>
          
          <div className="mb-4 space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 mt-1.5 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-xs text-gray-500">Pickup</p>
                <p className="font-medium">{order.pickup.address}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 mt-1.5 bg-red-500 rounded-full"></div>
              <div>
                <p className="text-xs text-gray-500">Dropoff</p>
                <p className="font-medium">{order.dropoff.address}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg mb-4 flex justify-between">
            <div className="text-center">
              <p className="text-xs text-gray-500">Estimated Payout</p>
              <p className="font-bold text-green-600">₦{order.estimatedPayout.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Distance</p>
              <p className="font-bold">3.2 km</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Est. Time</p>
              <p className="font-bold">15 min</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={onDecline}
              className="flex-1 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg"
            >
              Decline
            </button>
            <button 
              onClick={onAccept}
              className="flex-1 py-3 bg-green-500 text-white font-medium rounded-lg"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Go7 Rider</h1>
              <p className="text-sm text-gray-600">{riderName}</p>
            </div>
            
            {/* Online/Offline Toggle */}
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${
                isOnline ? 'text-green-600' : 'text-gray-600'
              }`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              <button
                onClick={handleToggleOnline}
                className={`
                  relative inline-flex h-8 w-16 items-center rounded-full transition-colors
                  ${isOnline ? 'bg-green-600' : 'bg-gray-300'}
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                `}
              >
                <span
                  className={`
                    inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg
                    ${isOnline ? 'translate-x-9' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Zone Selector */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Operating Zone</h3>
          <select
            value={riderZone}
            onChange={(e) => handleZoneChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            {ZONES.map(zone => (
              <option key={zone} value={zone}>
                {zone.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Active Order Banner */}
        {activeOrder && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-800">
                {activeOrder.status === 'en_route' ? 'Heading to pickup...' : 'Order picked up'}
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Order #{activeOrder.id?.slice(-4)} • {activeOrder.pickupZone}
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="text-sm font-medium text-gray-500">Today's Trips</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.trips}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="text-sm font-medium text-gray-500">Earnings</h3>
            <p className="text-2xl font-bold text-green-600">₦{stats.earnings.toLocaleString()}</p>
          </div>
        </div>

        {/* GPS Status */}
        {isOnline && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">GPS Status</h3>
              <div className={`
                px-2 py-1 rounded-full text-xs font-medium
                ${geoStatus.accuracy && geoStatus.accuracy < 50 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
                }
              `}>
                {geoStatus.accuracy ? formatAccuracy(geoStatus.accuracy) : 'Acquiring...'}
              </div>
            </div>
            
            {geoStatus.lastUpdate && (
              <p className="text-xs text-gray-500 mt-2">
                Last updated: {geoStatus.lastUpdate.toLocaleTimeString()}
              </p>
            )}
            
            {geoStatus.error && (
              <p className="text-xs text-red-600 mt-1">
                {geoStatus.error}
              </p>
            )}
          </div>
        )}

        {/* Offline Message */}
        {!isOnline && (
          <div className="bg-gray-100 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-gray-600 text-xl">📱</span>
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">You're offline</h3>
            <p className="text-xs text-gray-500">
              Toggle online to start receiving order assignments
            </p>
          </div>
        )}
        
        {/* Demo Controls */}
        {isOnline && !currentOrder && !activeOrder && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <button
              onClick={createMockAssignment}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg"
            >
              Generate Test Assignment
            </button>
          </div>
        )}
      </div>

      {/* Assignment Card */}
      {currentOrder && (
        <AssignmentCard
          order={currentOrder}
          onAccept={handleAcceptOrder}
          onDecline={handleDeclineOrder}
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className={`
          fixed top-4 left-4 right-4 z-40 max-w-md mx-auto p-4 rounded-lg shadow-lg
          ${toast.type === 'error' ? 'bg-red-500 text-white' : 
            toast.type === 'success' ? 'bg-green-500 text-white' : 
            'bg-blue-500 text-white'}
        `}>
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}
    </div>
  );
}