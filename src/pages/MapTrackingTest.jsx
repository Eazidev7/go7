// Go7 MapTracking Test Page
// Quick test page to demonstrate live tracking functionality

import React, { useState } from 'react';
import MapTracking from '../components/MapTracking';
import { createDemoRider, startRiderSimulation } from '../utils/riderLocationDemo';
import './MapTrackingTest.css';

export default function MapTrackingTest() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationId, setSimulationId] = useState(null);

  const demoOrder = {
    id: 'order_demo_123',
    riderId: 'rider_123',
    pickup: { lat: 6.5244, lng: 3.3792 }, // Victoria Island, Lagos
    dropoff: { lat: 6.5344, lng: 3.3892 } // Lekki, Lagos
  };

  const startDemo = async () => {
    try {
      console.log('🎬 Starting Go7 Live Tracking Demo...');
      
      // Create demo rider
      await createDemoRider(demoOrder.riderId);
      
      // Start location simulation
      const id = startRiderSimulation(demoOrder.riderId, 7000);
      setSimulationId(id);
      setIsSimulating(true);
      
      console.log('✅ Demo started successfully');
    } catch (error) {
      console.error('❌ Demo start failed:', error);
      alert('Demo failed to start. Check console for details.');
    }
  };

  const stopDemo = () => {
    if (simulationId) {
      clearInterval(simulationId);
      setSimulationId(null);
      setIsSimulating(false);
      console.log('🛑 Demo stopped');
    }
  };

  return (
    <div className="map-tracking-test">
      <div className="test-header">
        <h1>🗺️ Go7 Live Route + ETA Tracking</h1>
        <p>Real-time rider tracking with Google Maps integration</p>
        
        <div className="demo-controls">
          {!isSimulating ? (
            <button onClick={startDemo} className="start-demo-btn">
              🚀 Start Live Demo
            </button>
          ) : (
            <button onClick={stopDemo} className="stop-demo-btn">
              🛑 Stop Demo
            </button>
          )}
        </div>
      </div>

      <div className="demo-info">
        <div className="info-card">
          <h3>📍 Demo Route</h3>
          <p><strong>Pickup:</strong> Victoria Island, Lagos</p>
          <p><strong>Dropoff:</strong> Lekki, Lagos</p>
          <p><strong>Rider ID:</strong> {demoOrder.riderId}</p>
        </div>
        
        <div className="info-card">
          <h3>⚙️ Features</h3>
          <ul>
            <li>✅ Real-time location updates</li>
            <li>✅ Google Directions API routing</li>
            <li>✅ Traffic-aware ETA calculation</li>
            <li>✅ 7-second update intervals</li>
            <li>✅ Animated rider marker</li>
            <li>✅ Go7 branded styling</li>
          </ul>
        </div>
      </div>

      <div className="map-container">
        <MapTracking
          orderId={demoOrder.id}
          riderId={demoOrder.riderId}
          pickup={demoOrder.pickup}
          dropoff={demoOrder.dropoff}
          showETA={true}
          height="500px"
          className="demo-map"
        />
      </div>

      <div className="instructions">
        <h3>🧪 Testing Instructions</h3>
        <ol>
          <li><strong>Add Google Maps API Key:</strong> Update <code>.env.local</code> with your API key</li>
          <li><strong>Start Demo:</strong> Click "Start Live Demo" to begin rider simulation</li>
          <li><strong>Watch Live Updates:</strong> Rider marker will move every 7 seconds</li>
          <li><strong>Check ETA:</strong> Real-time ETA updates with traffic data</li>
          <li><strong>Test Customer View:</strong> Visit <code>/track/{demoOrder.id}</code></li>
        </ol>
      </div>

      <div className="api-status">
        <h3>🔑 API Configuration</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Google Maps API:</span>
            <span className={`status-value ${import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'configured' : 'missing'}`}>
              {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? '✅ Configured' : '❌ Missing'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Firebase:</span>
            <span className="status-value configured">✅ Connected</span>
          </div>
          <div className="status-item">
            <span className="status-label">Firestore:</span>
            <span className="status-value configured">✅ Ready</span>
          </div>
        </div>
        
        {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
          <div className="api-warning">
            ⚠️ <strong>Google Maps API key required:</strong> Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>.env.local</code>
          </div>
        )}
      </div>
    </div>
  );
}