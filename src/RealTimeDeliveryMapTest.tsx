import React, { useState } from 'react';
import DeliveryMap from './components/DeliveryMap';
import { simulateRiderJourney, updateRiderGPS } from './utils/firestore-rider-gps';

/**
 * Test page for the enhanced DeliveryMap component with real-time GPS tracking
 * This demonstrates how to use the component with Firebase Firestore integration
 */

const RealTimeDeliveryMapTest: React.FC = () => {
  const [activeRider, setActiveRider] = useState('AKEEM01');
  const [isSimulating, setIsSimulating] = useState(false);

  // Test riders with different scenarios
  const testRiders = [
    {
      riderId: 'AKEEM01',
      pickup: [3.3619, 7.1475] as [number, number],
      dropoff: [3.3700, 7.1530] as [number, number],
      fee: '₦1450',
      description: 'Central Abeokuta Delivery'
    },
    {
      riderId: 'MUSA22',
      pickup: [3.3580, 7.1450] as [number, number],
      dropoff: [3.3650, 7.1500] as [number, number],
      fee: '₦1200',
      description: 'University Area Delivery'
    },
    {
      riderId: 'KEMI45',
      pickup: [3.3480, 7.1600] as [number, number],
      dropoff: [3.3550, 7.1550] as [number, number],
      fee: '₦1600',
      description: 'Olumo Rock Area Delivery'
    }
  ];

  const currentRider = testRiders.find(r => r.riderId === activeRider) || testRiders[0];

  // Start GPS simulation for testing
  const handleStartSimulation = async () => {
    setIsSimulating(true);
    console.log(`🚀 Starting GPS simulation for rider: ${activeRider}`);
    
    try {
      await simulateRiderJourney(activeRider);
    } catch (error) {
      console.error('❌ Error during simulation:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  // Manual GPS update for testing
  const handleManualUpdate = async (lat: number, lng: number, status: string) => {
    try {
      await updateRiderGPS(activeRider, lat, lng, status as any);
      console.log(`✅ Manual GPS update sent for ${activeRider}`);
    } catch (error) {
      console.error('❌ Error updating GPS:', error);
    }
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'white',
        padding: '15px',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        zIndex: 2000,
        minWidth: '250px',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#E30613' }}>🧪 Real-time GPS Test</h3>
        
        {/* Rider Selection */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: '600' }}>
            Select Test Rider:
          </label>
          <select 
            value={activeRider}
            onChange={(e) => setActiveRider(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
          >
            {testRiders.map(rider => (
              <option key={rider.riderId} value={rider.riderId}>
                {rider.riderId} - {rider.description}
              </option>
            ))}
          </select>
        </div>

        {/* Simulation Controls */}
        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={handleStartSimulation}
            disabled={isSimulating}
            style={{
              width: '100%',
              padding: '10px',
              background: isSimulating ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontWeight: '600',
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              marginBottom: '8px'
            }}
          >
            {isSimulating ? '🔄 Simulating Journey...' : '🚀 Start GPS Simulation'}
          </button>
          
          <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
            Simulates complete delivery journey with real-time GPS updates
          </div>
        </div>

        {/* Manual GPS Controls */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Manual GPS Updates:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            <button
              onClick={() => handleManualUpdate(7.1475, 3.3619, 'accepted')}
              style={{ padding: '6px', fontSize: '10px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '3px', cursor: 'pointer' }}
            >
              📍 Pickup
            </button>
            <button
              onClick={() => handleManualUpdate(7.1488, 3.3655, 'picked_up')}
              style={{ padding: '6px', fontSize: '10px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '3px', cursor: 'pointer' }}
            >
              🎒 Picked Up
            </button>
            <button
              onClick={() => handleManualUpdate(7.1500, 3.3660, 'en_route')}
              style={{ padding: '6px', fontSize: '10px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '3px', cursor: 'pointer' }}
            >
              🛵 En Route
            </button>
            <button
              onClick={() => handleManualUpdate(7.1530, 3.3700, 'delivered')}
              style={{ padding: '6px', fontSize: '10px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '3px', cursor: 'pointer' }}
            >
              ✅ Delivered
            </button>
          </div>
        </div>

        {/* Current Rider Info */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '8px', 
          borderRadius: '5px', 
          fontSize: '11px',
          border: '1px solid #e9ecef'
        }}>
          <div><strong>Rider:</strong> {currentRider.riderId}</div>
          <div><strong>Fee:</strong> {currentRider.fee}</div>
          <div><strong>Route:</strong> {currentRider.description}</div>
        </div>
      </div>

      {/* Real-time Delivery Map */}
      <DeliveryMap
        pickup={currentRider.pickup}
        dropoff={currentRider.dropoff}
        fee={currentRider.fee}
        riderId={currentRider.riderId}
      />
    </div>
  );
};

// Instructions for using the test page
export const RealTimeGPSInstructions = () => (
  <div style={{ padding: '20px', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
    <h2>🗺️ Real-time GPS Tracking Instructions</h2>
    
    <h3>📋 Setup Required:</h3>
    <ol>
      <li><strong>Firebase Project:</strong> Ensure your Firebase project is configured</li>
      <li><strong>Firestore Database:</strong> Create a collection called <code>riders</code></li>
      <li><strong>Environment Variables:</strong> Set up your Firebase config in environment variables</li>
    </ol>

    <h3>🧪 Testing the Component:</h3>
    <ol>
      <li><strong>Select a Rider:</strong> Choose from AKEEM01, MUSA22, or KEMI45</li>
      <li><strong>Start Simulation:</strong> Click "Start GPS Simulation" to see automated journey</li>
      <li><strong>Manual Updates:</strong> Use manual GPS buttons to test specific positions</li>
      <li><strong>Watch Real-time:</strong> See the scooter marker move smoothly with status updates</li>
    </ol>

    <h3>📊 Firestore Document Structure:</h3>
    <pre style={{ background: '#f8f9fa', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
{`riders/{riderId} {
  "lat": 7.1475,        // Latitude (number)
  "lng": 3.3619,        // Longitude (number)
  "status": "en_route", // accepted | picked_up | en_route | delivered
  "timestamp": [server timestamp],
  "riderId": "AKEEM01"
}`}
    </pre>

    <h3>🔧 Production Usage:</h3>
    <pre style={{ background: '#f8f9fa', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
{`import DeliveryMap from './components/DeliveryMap';

<DeliveryMap 
  pickup={[3.3619, 7.1475]}
  dropoff={[3.3700, 7.1530]}
  fee="₦1450"
  riderId="AKEEM01"
/>`}
    </pre>
  </div>
);

export default RealTimeDeliveryMapTest;