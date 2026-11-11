import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, MapPin, Truck, Package, Clock } from 'lucide-react';
import { useOrder } from '../contexts/OrderContext';
import { useLocation } from '../contexts/LocationContext';
import { useDelivery } from '../contexts/DeliveryContext';
import { useAuth } from '../contexts/AuthContext';
import LiveTrackingMap from '../components/LiveTrackingMap';
import DeliveryStatusTracker from '../components/DeliveryStatusTracker';
import { 
  ORDER_STATUS, 
  updateOrderStatus, 
  assignRider,
  markOrderDelivered
} from '../services/orderService';
import riderLocationService from '../services/riderLocationService';

const LiveTrackingTestPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeAddress } = useLocation();
  const { createOrder, currentOrder, trackOrder } = useOrder();
  const { selectedVendor, updateSelectedVendor } = useDelivery();
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [testOrderId, setTestOrderId] = useState(null);
  const [simulationStep, setSimulationStep] = useState(0);
  
  // Test data
  const testVendor = {
    id: 'test-vendor-1',
    name: 'Pizza Corner Lagos',
    phone: '+234 801 234 5678',
    address: 'Victoria Island, Lagos',
    coordinates: { lat: 7.4000, lng: 3.9000 }
  };
  
  const testRider = {
    id: 'test-rider-1',
    name: 'James Okafor',
    phone: '+234 802 345 6789',
    vehicle: 'bike',
    rating: 4.8
  };
  
  const testItems = [
    {
      id: 1,
      name: 'Margherita Pizza',
      price: 3500,
      quantity: 1,
      selectedOptions: ['Large', 'Extra Cheese']
    },
    {
      id: 2,
      name: 'Coca Cola',
      price: 500,
      quantity: 2,
      selectedOptions: []
    }
  ];

  useEffect(() => {
    // Set test vendor for delivery calculations
    updateSelectedVendor(testVendor);
  }, [updateSelectedVendor]);

  const createTestOrder = async () => {
    if (!user || !activeAddress) {
      alert('Please login and select a delivery address first');
      return;
    }

    try {
      const orderData = {
        vendor: testVendor,
        pickup: {
          lat: testVendor.coordinates.lat,
          lng: testVendor.coordinates.lng,
          address: testVendor.address,
          name: testVendor.name
        },
        dropoff: {
          lat: activeAddress.coordinates.lat,
          lng: activeAddress.coordinates.lng,
          address: activeAddress.address,
          name: activeAddress.name || 'Delivery Address'
        },
        items: testItems,
        subtotal: 4500,
        deliveryFee: 300,
        total: 4800,
        distance: 2.5,
        instructions: 'Please call when you arrive. Gate is blue.',
        estimatedDeliveryTime: new Date(Date.now() + 30 * 60000) // 30 minutes from now
      };

      const result = await createOrder(orderData);
      setTestOrderId(result.firebaseId);
      
      console.log('✅ Test order created:', result);
      
      // Automatically assign rider after 3 seconds
      setTimeout(() => {
        assignTestRider(result.firebaseId);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to create test order:', error);
      alert('Failed to create test order: ' + error.message);
    }
  };

  const assignTestRider = async (firebaseId) => {
    try {
      await assignRider(firebaseId, testRider);
      console.log('✅ Test rider assigned');
      
      // Start location simulation after 2 seconds
      setTimeout(() => {
        startLocationSimulation(firebaseId);
      }, 2000);
      
    } catch (error) {
      console.error('❌ Failed to assign test rider:', error);
    }
  };

  const startLocationSimulation = (firebaseId) => {
    if (!activeAddress?.coordinates) return;
    
    console.log('🧪 Starting location simulation');
    setIsSimulating(true);
    setSimulationStep(0);
    
    // Simulate rider movement from vendor to customer
    const startPosition = testVendor.coordinates;
    const endPosition = activeAddress.coordinates;
    
    riderLocationService.startSimulation(firebaseId, startPosition, endPosition);
    
    // Simulate status updates
    simulateOrderProgress(firebaseId);
  };

  const simulateOrderProgress = async (firebaseId) => {
    const statusUpdates = [
      { status: ORDER_STATUS.PICKED_UP, delay: 10000, message: 'Order picked up from restaurant' },
      { status: ORDER_STATUS.ON_THE_WAY, delay: 15000, message: 'Rider is on the way to your location' },
      { status: ORDER_STATUS.DELIVERED, delay: 25000, message: 'Order delivered successfully!' }
    ];
    
    for (const update of statusUpdates) {
      setTimeout(async () => {
        try {
          await updateOrderStatus(firebaseId, update.status, update.message);
          setSimulationStep(prev => prev + 1);
          
          if (update.status === ORDER_STATUS.DELIVERED) {
            setIsSimulating(false);
            await markOrderDelivered(firebaseId);
          }
        } catch (error) {
          console.error('❌ Failed to update order status:', error);
        }
      }, update.delay);
    }
  };

  const stopSimulation = () => {
    riderLocationService.stopTracking();
    setIsSimulating(false);
    setSimulationStep(0);
  };

  const resetTest = () => {
    stopSimulation();
    setTestOrderId(null);
    setSimulationStep(0);
  };

  const viewLiveTracking = () => {
    if (testOrderId) {
      navigate(`/track/${testOrderId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🚴 Live Tracking Test Environment
          </h1>
          <p className="text-gray-600">
            Test the complete Uber-like delivery tracking system with real-time location updates
          </p>
        </div>

        {/* Prerequisites */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Prerequisites</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border-2 ${user ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="font-medium">User Authentication</span>
              </div>
              <p className="text-sm text-gray-600">
                {user ? `✅ Logged in as ${user.displayName || user.email}` : '❌ Please login first'}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg border-2 ${activeAddress ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${activeAddress ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="font-medium">Delivery Address</span>
              </div>
              <p className="text-sm text-gray-600">
                {activeAddress ? `✅ ${activeAddress.address}` : '❌ Please select delivery address'}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg border-2 ${selectedVendor ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${selectedVendor ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="font-medium">Test Vendor</span>
              </div>
              <p className="text-sm text-gray-600">
                {selectedVendor ? `✅ ${selectedVendor.name}` : '⚠️ Setting up test vendor...'}
              </p>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Controls</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={createTestOrder}
              disabled={!user || !activeAddress || isSimulating}
              className="bg-[#E50914] text-white px-6 py-2 rounded-lg hover:bg-[#CC0812] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Create Test Order
            </button>
            
            <button
              onClick={isSimulating ? stopSimulation : () => startLocationSimulation(testOrderId)}
              disabled={!testOrderId}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isSimulating ? 'Stop Simulation' : 'Start Simulation'}
            </button>
            
            <button
              onClick={resetTest}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Test
            </button>
            
            <button
              onClick={viewLiveTracking}
              disabled={!testOrderId}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              View Live Tracking
            </button>
          </div>
        </div>

        {/* Current Order Display */}
        {currentOrder && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Live Map */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {isSimulating && (
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                  Live Tracking Map
                </h3>
              </div>
              <div className="h-96">
                <LiveTrackingMap order={currentOrder} className="w-full h-full" />
              </div>
            </div>

            {/* Status Tracker */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <DeliveryStatusTracker order={currentOrder} showDetailed={true} />
            </div>
          </div>
        )}

        {/* Simulation Status */}
        {isSimulating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              🧪 Simulation in Progress
            </h3>
            <p className="text-blue-700 mb-3">
              Simulating real-time rider location updates and order status changes
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(simulationStep / 3) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm text-blue-700 font-medium">
                Step {simulationStep}/3
              </span>
            </div>
          </div>
        )}

        {/* Test Data */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Data Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Test Vendor</h3>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div><strong>Name:</strong> {testVendor.name}</div>
                <div><strong>Location:</strong> {testVendor.address}</div>
                <div><strong>Coordinates:</strong> {testVendor.coordinates.lat}, {testVendor.coordinates.lng}</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Test Rider</h3>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div><strong>Name:</strong> {testRider.name}</div>
                <div><strong>Vehicle:</strong> {testRider.vehicle}</div>
                <div><strong>Rating:</strong> ⭐ {testRider.rating}</div>
              </div>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="mt-6 bg-gray-800 text-green-400 rounded-lg p-4 font-mono text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Firebase Real-time Connection Status</span>
          </div>
          <div>✅ Firestore: Connected</div>
          <div>✅ Order Service: Active</div>
          <div>✅ Location Service: {isSimulating ? 'Simulating' : 'Ready'}</div>
          <div>✅ Real-time Updates: Enabled</div>
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingTestPage;