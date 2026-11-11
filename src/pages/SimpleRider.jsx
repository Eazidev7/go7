/**
 * Simple Rider Web Prototype page
 * Clean implementation for the requested /rider route
 */
import React, { useState, useEffect, useRef } from 'react';
import { useOrders } from '../state/ordersStore.jsx';

// Simple in-memory rider store 
const useSimpleRider = () => {
  const [rider, setRider] = useState({
    id: 'rider_001',
    name: 'Samuel Rider',
    status: 'offline', // offline, online, on-trip
    location: {
      lat: 6.4281,
      lng: 3.4219,
      timestamp: new Date().toISOString()
    },
    stats: {
      todayTrips: 8,
      todayEarnings: 12500
    }
  });

  const updateStatus = (status) => {
    setRider(prev => ({ ...prev, status, lastUpdate: new Date().toISOString() }));
  };

  const updateLocation = (location) => {
    setRider(prev => ({ ...prev, location: { ...location, timestamp: new Date().toISOString() } }));
  };

  return { rider, updateStatus, updateLocation };
};

// Mock Map Component
const SimpleMap = ({ location }) => (
  <div className="h-48 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center relative">
    <div className="absolute inset-0 bg-gray-50 opacity-20 rounded-lg" />
    <div className="text-center z-10">
      <div className="w-4 h-4 bg-red-500 rounded-full mx-auto mb-2 animate-pulse" />
      <p className="text-sm font-medium text-gray-700">Your Location</p>
      <p className="text-xs text-gray-500">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
    </div>
    <div className="absolute bottom-2 right-2 text-xs bg-white px-2 py-1 rounded opacity-75">
      GO7 Maps
    </div>
  </div>
);

// Assignment Bottom Sheet
const AssignmentBottomSheet = ({ assignment, isVisible, onAccept, onDecline, countdown }) => {
  if (!isVisible || !assignment) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
      <div className="bg-white w-full rounded-t-2xl p-6 animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">New Delivery Assignment</h3>
            <p className="text-sm text-gray-600">Order #{assignment.id}</p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${countdown <= 3 ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}>
            {countdown}
          </div>
        </div>

        {/* Route */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full mt-2" />
            <div>
              <p className="text-sm text-gray-600">Pickup</p>
              <p className="font-medium">{assignment.pickup?.address}</p>
            </div>
          </div>
          <div className="ml-1.5 w-0.5 h-6 bg-gray-300" />
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 bg-red-500 rounded-full mt-2" />
            <div>
              <p className="text-sm text-gray-600">Dropoff</p>
              <p className="font-medium">{assignment.dropoff?.address}</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{formatCurrency(assignment.estimatedPayout || 1500)}</p>
            <p className="text-xs text-gray-600">Est. Payout</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">~25m</p>
            <p className="text-xs text-gray-600">Est. Time</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex space-x-3">
          <button onClick={onDecline} className="flex-1 py-4 bg-gray-200 text-gray-800 font-semibold rounded-lg">
            Decline
          </button>
          <button onClick={onAccept} className="flex-1 py-4 bg-green-600 text-white font-semibold rounded-lg">
            Accept Order
          </button>
        </div>

        {countdown <= 5 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 text-center">⚠️ Auto-decline in {countdown}s</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SimpleRider = () => {
  const { rider, updateStatus, updateLocation } = useSimpleRider();
  const { orders, updateOrder, addOrder } = useOrders();
  
  // Assignment state
  const [showAssignment, setShowAssignment] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [countdown, setCountdown] = useState(10);
  
  // Location tracking
  const locationInterval = useRef(null);
  const assignmentTimer = useRef(null);

  // Toggle online/offline
  const toggleOnline = () => {
    const newStatus = rider.status === 'offline' ? 'online' : 'offline';
    updateStatus(newStatus);
    
    if (newStatus === 'online') {
      startLocationTracking();
      checkForAssignments();
    } else {
      stopLocationTracking();
    }
  };

  // Start location tracking
  const startLocationTracking = () => {
    // Try real geolocation first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        () => {
          // Use mock location for Lagos
          updateLocation({
            lat: 6.4281 + (Math.random() - 0.5) * 0.01,
            lng: 3.4219 + (Math.random() - 0.5) * 0.01,
            accuracy: 10
          });
        }
      );
    }

    // Update location every 10 seconds
    locationInterval.current = setInterval(() => {
      const currentLat = rider.location.lat;
      const currentLng = rider.location.lng;
      updateLocation({
        lat: currentLat + (Math.random() - 0.5) * 0.001,
        lng: currentLng + (Math.random() - 0.5) * 0.001,
        accuracy: 10
      });
    }, 10000);
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationInterval.current) {
      clearInterval(locationInterval.current);
      locationInterval.current = null;
    }
  };

  // Check for new assignments
  const checkForAssignments = () => {
    if (rider.status !== 'online') return;

    // Look for assigned orders
    const assignedOrder = orders.find(order => 
      order.riderId === rider.id && 
      order.status === 'assigned' && 
      !order.assignmentDeclined
    );

    if (assignedOrder && !currentAssignment) {
      const assignment = {
        id: assignedOrder.id,
        pickup: assignedOrder.pickup,
        dropoff: assignedOrder.dropoff,
        estimatedPayout: assignedOrder.totalAmount * 0.15 // 15% commission
      };
      
      setCurrentAssignment(assignment);
      setShowAssignment(true);
      setCountdown(10);
      
      // Start countdown timer
      assignmentTimer.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            handleDecline();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Handle assignment acceptance
  const handleAccept = () => {
    if (currentAssignment) {
      updateOrder(currentAssignment.id, {
        status: 'pickup_in_progress',
        assignedTo: rider.id,
        pickupStartedAt: new Date().toISOString()
      });
      
      updateStatus('on-trip');
      closeAssignment();
    }
  };

  // Handle assignment decline
  const handleDecline = () => {
    if (currentAssignment) {
      updateOrder(currentAssignment.id, {
        assignmentDeclined: true,
        declinedBy: rider.id,
        declinedAt: new Date().toISOString()
      });
      
      closeAssignment();
    }
  };

  // Close assignment
  const closeAssignment = () => {
    if (assignmentTimer.current) {
      clearInterval(assignmentTimer.current);
      assignmentTimer.current = null;
    }
    setShowAssignment(false);
    setCurrentAssignment(null);
    setCountdown(10);
  };

  // Create test assignment
  const createTestAssignment = () => {
    const testOrder = {
      id: `test-${Date.now()}`,
      status: 'assigned',
      riderId: rider.id,
      pickup: { address: '123 Victoria Island, Lagos', lat: 6.4281, lng: 3.4219 },
      dropoff: { address: '456 Ikoyi, Lagos', lat: 6.4474, lng: 3.4653 },
      totalAmount: 4500,
      customer: { name: 'John Doe', phone: '+2348123456789' },
      createdAt: new Date().toISOString(),
      payment: { method: 'online' }
    };
    addOrder(testOrder);
  };

  // Check for assignments when online
  useEffect(() => {
    if (rider.status === 'online') {
      const interval = setInterval(checkForAssignments, 3000);
      return () => clearInterval(interval);
    }
  }, [rider.status, orders]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
      if (assignmentTimer.current) {
        clearInterval(assignmentTimer.current);
      }
    };
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">GO7 Rider</h1>
              <p className="text-sm text-gray-600">Welcome back, {rider.name}</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                rider.status === 'online' ? 'bg-green-500' :
                rider.status === 'on-trip' ? 'bg-blue-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm font-medium capitalize">{rider.status}</span>
            </div>
          </div>

          {/* Today's Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Today's Trips</p>
              <p className="text-2xl font-bold text-blue-900">{rider.stats.todayTrips}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Today's Earnings</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(rider.stats.todayEarnings)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Online/Offline Toggle */}
      <div className="p-4">
        <button
          onClick={toggleOnline}
          className={`w-full py-6 rounded-xl font-bold text-lg transition-all ${
            rider.status === 'offline' 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {rider.status === 'offline' ? 'Go Online' : 'Go Offline'}
        </button>
      </div>

      {/* Map */}
      {rider.status !== 'offline' && (
        <div className="p-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Your Location</h2>
            <SimpleMap location={rider.location} />
            <p className="text-sm text-gray-500 mt-2 text-center">
              Updated: {new Date(rider.location.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {rider.status === 'online' && (
        <div className="p-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-green-900 mb-1">Ready for Orders</h3>
            <p className="text-green-700">You're online and available for deliveries</p>
          </div>
        </div>
      )}

      {rider.status === 'on-trip' && (
        <div className="p-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-blue-900 mb-1">On Trip</h3>
            <p className="text-blue-700">Currently handling a delivery</p>
          </div>
        </div>
      )}

      {/* Test Button */}
      {rider.status === 'online' && (
        <div className="p-4">
          <button
            onClick={createTestAssignment}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            🧪 Create Test Assignment
          </button>
        </div>
      )}

      {/* Assignment Bottom Sheet */}
      <AssignmentBottomSheet
        assignment={currentAssignment}
        isVisible={showAssignment}
        onAccept={handleAccept}
        onDecline={handleDecline}
        countdown={countdown}
      />
    </div>
  );
};

export default SimpleRider;