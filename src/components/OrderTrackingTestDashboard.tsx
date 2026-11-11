import React, { useState } from 'react';
import { setupAllTestData, simulateOrderProgression, SAMPLE_ORDERS } from '../utils/order-tracking-utils';
import { updateRiderGPS, simulateRiderJourney } from '../utils/firestore-rider-gps';

// Type definition for order object
type Order = {
  orderId: string;
  customerId: string;
  riderId: string;
  pickup: [number, number];
  dropoff: [number, number];
  fee: string;
  status: 'accepted' | 'picked_up' | 'en_route' | 'delivered';
  customerName: string;
  customerPhone: string;
  items: string[];
  estimatedDeliveryTime?: string;
};

/**
 * Comprehensive test dashboard for Go7 Order Tracking System
 * 
 * This component provides a complete testing interface for:
 * - Order tracking page functionality
 * - Real-time GPS updates
 * - Chat messaging system
 * - Status progression simulation
 */

const OrderTrackingTestDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('GO-001');
  const [selectedRiderId, setSelectedRiderId] = useState('AKEEM01');

  // Add a test result message
  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Setup all test data
  const handleSetupTestData = async () => {
    setIsLoading(true);
    addTestResult('🚀 Setting up test data...');
    
    try {
      await setupAllTestData();
      addTestResult('✅ Test data setup completed successfully!');
    } catch (error) {
      addTestResult(`❌ Error setting up test data: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate order status progression
  const handleOrderProgression = async () => {
    setIsLoading(true);
    addTestResult(`🎬 Starting order progression for ${selectedOrderId}...`);
    
    try {
      await simulateOrderProgression(selectedOrderId);
      addTestResult(`✅ Order progression completed for ${selectedOrderId}`);
    } catch (error) {
      addTestResult(`❌ Error in order progression: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate rider GPS journey
  const handleRiderGPSSimulation = async () => {
    setIsLoading(true);
    addTestResult(`📍 Starting GPS simulation for rider ${selectedRiderId}...`);
    
    try {
      await simulateRiderJourney(selectedRiderId);
      addTestResult(`✅ GPS simulation completed for rider ${selectedRiderId}`);
    } catch (error) {
      addTestResult(`❌ Error in GPS simulation: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual GPS update
  const handleManualGPSUpdate = async (lat: number, lng: number, status: string) => {
    try {
      await updateRiderGPS(selectedRiderId, lat, lng, status as any);
      addTestResult(`📡 Manual GPS update: Rider ${selectedRiderId} at [${lng}, ${lat}], Status: ${status}`);
    } catch (error) {
      addTestResult(`❌ Error updating GPS: ${error}`);
    }
  };

  // Clear test results
  const clearResults = () => {
    setTestResults([]);
  };

  // Open tracking page in new tab
  const openTrackingPage = (orderId: string) => {
    const url = `/track/${orderId}`;
    window.open(url, '_blank');
    addTestResult(`🔗 Opened tracking page for order: ${orderId}`);
  };

  return (
    <div style={{
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      padding: '20px',
      background: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#E30613', margin: '0 0 10px 0' }}>
            🧪 Go7 Order Tracking Test Dashboard
          </h1>
          <p style={{ color: '#666', margin: 0 }}>
            Comprehensive testing suite for real-time order tracking, GPS updates, and chat functionality
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
          
          {/* Test Data Setup */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#333', marginBottom: '20px' }}>📊 Test Data Setup</h2>
            
            <button
              onClick={handleSetupTestData}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '15px',
                background: isLoading ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginBottom: '15px'
              }}
            >
              {isLoading ? '⏳ Setting up...' : '🚀 Setup All Test Data'}
            </button>
            
            <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
              <strong>This will create:</strong>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li>4 sample orders with different statuses</li>
                <li>Chat messages for each order</li>
                <li>Firestore documents ready for testing</li>
              </ul>
            </div>
          </div>

          {/* Order Testing */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#333', marginBottom: '20px' }}>📋 Order Testing</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', fontWeight: '600' }}>
                Select Test Order:
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              >
                {SAMPLE_ORDERS.map((order: Order) => (
                  <option key={order.orderId} value={order.orderId}>
                    {order.orderId} - {order.customerName} ({order.status})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <button
                onClick={() => openTrackingPage(selectedOrderId)}
                style={{
                  padding: '10px',
                  background: '#E30613',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🔗 Open Tracking Page
              </button>
              
              <button
                onClick={handleOrderProgression}
                disabled={isLoading}
                style={{
                  padding: '10px',
                  background: isLoading ? '#ccc' : '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                🎬 Simulate Progress
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#666' }}>
              <strong>Status Progression:</strong> Accepted → Picked Up → En Route → Delivered (10s intervals)
            </div>
          </div>

          {/* GPS Testing */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#333', marginBottom: '20px' }}>📍 GPS Testing</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', fontWeight: '600' }}>
                Select Rider:
              </label>
              <select
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              >
                <option value="AKEEM01">AKEEM01</option>
                <option value="MUSA22">MUSA22</option>
                <option value="KEMI45">KEMI45</option>
                <option value="BOLA88">BOLA88</option>
              </select>
            </div>

            <button
              onClick={handleRiderGPSSimulation}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                background: isLoading ? '#ccc' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginBottom: '15px'
              }}
            >
              {isLoading ? '🔄 Simulating...' : '🛵 Start GPS Journey'}
            </button>

            {/* Manual GPS Controls */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Manual GPS Updates:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                <button
                  onClick={() => handleManualGPSUpdate(7.1475, 3.3619, 'accepted')}
                  style={{ padding: '8px', fontSize: '12px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
                >
                  📍 At Pickup
                </button>
                <button
                  onClick={() => handleManualGPSUpdate(7.1500, 3.3660, 'en_route')}
                  style={{ padding: '8px', fontSize: '12px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
                >
                  🛵 En Route
                </button>
                <button
                  onClick={() => handleManualGPSUpdate(7.1530, 3.3700, 'delivered')}
                  style={{ padding: '8px', fontSize: '12px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
                >
                  ✅ Delivered
                </button>
                <button
                  onClick={() => handleManualGPSUpdate(7.1510, 3.3675, 'en_route')}
                  style={{ padding: '8px', fontSize: '12px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
                >
                  📡 Custom GPS
                </button>
              </div>
            </div>
          </div>

          {/* Test URLs */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#333', marginBottom: '20px' }}>🔗 Test URLs</h2>
            
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
              Click to open tracking pages in new tabs:
            </div>

            {SAMPLE_ORDERS.map((order: Order) => (
              <div
                key={order.orderId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  background: '#f8f9fa',
                  borderRadius: '5px',
                  marginBottom: '8px',
                  fontSize: '12px'
                }}
              >
                <div>
                  <strong>{order.orderId}</strong><br />
                  {order.customerName} ({order.status})
                </div>
                <button
                  onClick={() => openTrackingPage(order.orderId)}
                  style={{
                    padding: '5px 10px',
                    background: '#E30613',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Test Results Log */}
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginTop: '30px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#333', margin: 0 }}>📊 Test Results Log</h2>
            <button
              onClick={clearResults}
              style={{
                padding: '8px 12px',
                background: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Clear Log
            </button>
          </div>
          
          <div style={{
            background: '#1e1e1e',
            color: '#00ff00',
            padding: '15px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '12px',
            height: '200px',
            overflowY: 'auto',
            border: '1px solid #333'
          }}>
            {testResults.length === 0 ? (
              <div style={{ color: '#666' }}>Test results will appear here...</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} style={{ marginBottom: '5px' }}>
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginTop: '30px'
        }}>
          <h2 style={{ color: '#333', marginBottom: '20px' }}>📋 Testing Instructions</h2>
          
          <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#666' }}>
            <ol>
              <li><strong>Setup Test Data:</strong> Click "Setup All Test Data" to create sample orders and chat messages in Firestore</li>
              <li><strong>Test Order Tracking:</strong> Click "Open Tracking Page" to view any order in the tracking interface</li>
              <li><strong>Simulate Order Progress:</strong> Use "Simulate Progress" to watch real-time status updates</li>
              <li><strong>Test GPS Tracking:</strong> Use "Start GPS Journey" to simulate rider movement on the map</li>
              <li><strong>Manual Testing:</strong> Use the manual GPS buttons to test specific rider positions</li>
              <li><strong>Chat Testing:</strong> Open tracking pages and use the chat feature to test messaging</li>
            </ol>
            
            <div style={{ 
              background: '#fff3cd', 
              border: '1px solid #ffeaa7', 
              borderRadius: '8px', 
              padding: '15px', 
              marginTop: '20px' 
            }}>
              <strong>🔥 Pro Tip:</strong> Open multiple tracking pages in different tabs to see real-time updates 
              across multiple orders simultaneously!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingTestDashboard;