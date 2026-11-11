import React, { useState, useEffect } from 'react';
import { 
  getAllRiders, 
  initializeRider, 
  updateRiderStatus,
  clearAllRiders
} from '../lib/lib/riderSystem.js';
import { 
  dispatchOrderToRider, 
  manualAssignOrder,
  getDispatchStats
} from '../lib/lib/autoDispatch.js';

/**
 * Rider Admin Panel
 * Admin interface for testing and managing the rider system
 */
const RiderAdmin = () => {
  const [riders, setRiders] = useState([]);
  const [dispatchStats, setDispatchStats] = useState({});
  const [testOrder, setTestOrder] = useState({
    id: 'TEST_ORDER_001',
    pickup: {
      address: '123 Victoria Island, Lagos',
      lat: 6.4281,
      lng: 3.4219
    },
    dropoff: {
      address: '456 Ikoyi, Lagos', 
      lat: 6.4474,
      lng: 3.4653
    },
    deliveryPriority: 'standard',
    customer: {
      name: 'John Doe'
    },
    items: 'Food delivery',
    routeKm: 5.2,
    total: 5000
  });

  // Refresh data every 5 seconds
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setRiders(getAllRiders());
    setDispatchStats(getDispatchStats());
  };

  const createTestRiders = () => {
    const testRiders = [
      {
        id: 'rider_001',
        name: 'Samuel Rider',
        phone: '+2348987654321',
        vehicle: 'motorcycle',
        location: { lat: 6.4200, lng: 3.4150 } // Near Victoria Island
      },
      {
        id: 'rider_002', 
        name: 'David Express',
        phone: '+2348123456789',
        vehicle: 'motorcycle',
        location: { lat: 6.4400, lng: 3.4300 } // Near Ikoyi
      },
      {
        id: 'rider_003',
        name: 'Mary Swift',
        phone: '+2348555666777',
        vehicle: 'bicycle',
        location: { lat: 6.4100, lng: 3.4500 } // Different area
      }
    ];

    testRiders.forEach(riderData => {
      const rider = initializeRider(riderData.id, riderData);
      // Set some riders online by default
      if (riderData.id !== 'rider_003') {
        updateRiderStatus(riderData.id, 'online');
      }
    });

    refreshData();
  };

  const toggleRiderStatus = (riderId, currentStatus) => {
    const newStatus = currentStatus === 'online' ? 'offline' : 'online';
    updateRiderStatus(riderId, newStatus);
    refreshData();
  };

  const dispatchTestOrder = async () => {
    try {
      const result = await dispatchOrderToRider(testOrder);
      
      if (result) {
        alert(`Order dispatched successfully to ${result.rider.name}!\nDistance: ${result.rider.distanceToPickup.toFixed(2)}km`);
      } else {
        alert('No available riders found for this order.');
      }
      
      refreshData();
    } catch (error) {
      alert('Dispatch failed: ' + error.message);
    }
  };

  const manualAssign = (riderId) => {
    try {
      const orderDetails = {
        pickup: testOrder.pickup,
        dropoff: testOrder.dropoff,
        estimatedPayout: 2500,
        priority: testOrder.deliveryPriority,
        customerName: testOrder.customer.name,
        items: testOrder.items
      };

      manualAssignOrder(testOrder.id, riderId, orderDetails);
      alert(`Order manually assigned to rider ${riderId}`);
      refreshData();
    } catch (error) {
      alert('Manual assignment failed: ' + error.message);
    }
  };

  const clearAllData = () => {
    if (confirm('Clear all rider data? This will reset the demo.')) {
      clearAllRiders();
      refreshData();
    }
  };

  const formatStatus = (status) => {
    const statusConfig = {
      'online': { color: 'bg-green-100 text-green-800', label: '🟢 Online' },
      'offline': { color: 'bg-gray-100 text-gray-800', label: '🔴 Offline' },
      'on-trip': { color: 'bg-blue-100 text-blue-800', label: '🚚 On Trip' },
      'busy': { color: 'bg-yellow-100 text-yellow-800', label: '🟡 Busy' }
    };
    
    const config = statusConfig[status] || statusConfig['offline'];
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Rider Management Admin
          </h1>
          <p className="text-gray-600">
            Test and manage the rider assignment system
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Admin Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={createTestRiders}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Create Test Riders
            </button>
            <button
              onClick={dispatchTestOrder}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Dispatch Test Order
            </button>
            <button
              onClick={refreshData}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Refresh Data
            </button>
            <button
              onClick={clearAllData}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Clear All Data
            </button>
          </div>
        </div>

        {/* Test Order Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Test Order Details</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">Order ID:</div>
              <div className="text-gray-900">{testOrder.id}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Priority:</div>
              <div className="text-gray-900">{testOrder.deliveryPriority}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Pickup:</div>
              <div className="text-gray-900">{testOrder.pickup.address}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Dropoff:</div>
              <div className="text-gray-900">{testOrder.dropoff.address}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Distance:</div>
              <div className="text-gray-900">{testOrder.routeKm} km</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Customer:</div>
              <div className="text-gray-900">{testOrder.customer.name}</div>
            </div>
          </div>
        </div>

        {/* Riders List */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Riders ({riders.length})</h3>
          
          {riders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No riders found. Click "Create Test Riders" to start.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rider
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Distance to Pickup
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {riders.map(rider => {
                    const distanceToPickup = rider.location 
                      ? calculateDistance(
                          rider.location.lat, 
                          rider.location.lng,
                          testOrder.pickup.lat,
                          testOrder.pickup.lng
                        )
                      : null;

                    return (
                      <tr key={rider.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{rider.name}</div>
                          <div className="text-xs text-gray-500">{rider.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          {formatStatus(rider.status)}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {rider.location ? (
                            <div>
                              <div>{rider.location.lat.toFixed(4)}, {rider.location.lng.toFixed(4)}</div>
                              {rider.location.timestamp && (
                                <div className="text-gray-500">
                                  {new Date(rider.location.timestamp).toLocaleTimeString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">No location</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {distanceToPickup ? (
                            <span className={`font-medium ${distanceToPickup <= 5 ? 'text-green-600' : 'text-gray-600'}`}>
                              {distanceToPickup.toFixed(2)} km
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {rider.vehicle}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleRiderStatus(rider.id, rider.status)}
                              className={`text-xs px-2 py-1 rounded ${
                                rider.status === 'online' 
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {rider.status === 'online' ? 'Set Offline' : 'Set Online'}
                            </button>
                            {rider.status === 'online' && (
                              <button
                                onClick={() => manualAssign(rider.id)}
                                className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                              >
                                Assign Order
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Integration Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">System Integration Status</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-green-600 mb-2">✅ Implemented</h4>
              <ul className="text-sm space-y-1">
                <li>• Rider status management (online/offline)</li>
                <li>• Real-time location tracking</li>
                <li>• Order assignment system with timeout</li>
                <li>• Auto-dispatch to closest available rider</li>
                <li>• Assignment acceptance/decline handling</li>
                <li>• Rider web interface (/rider)</li>
                <li>• Distance-based rider selection</li>
                <li>• Estimated payout calculation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-orange-600 mb-2">🔄 TODO - Production Integration</h4>
              <ul className="text-sm space-y-1">
                <li>• Connect with existing order management system</li>
                <li>• Database persistence for rider data</li>
                <li>• WebSocket for real-time assignment notifications</li>
                <li>• Mobile push notifications for riders</li>
                <li>• GPS accuracy validation and filtering</li>
                <li>• Advanced routing and optimization algorithms</li>
                <li>• Rider authentication and authorization</li>
                <li>• Performance metrics and analytics</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h4 className="font-medium text-blue-800 mb-2">Testing Instructions</h4>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Click "Create Test Riders" to set up demo riders</li>
              <li>2. Open /rider in a new tab to simulate a rider interface</li>
              <li>3. Toggle rider status to "Online" in the rider interface</li>
              <li>4. Come back here and click "Dispatch Test Order"</li>
              <li>5. Check the rider interface for the assignment popup</li>
              <li>6. Accept or decline the assignment to test the flow</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderAdmin;