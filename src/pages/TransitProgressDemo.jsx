// GO7 Transit Progress Demo
// Shows how the progress bar integrates with tracking interface

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TransitProgressBar, { useTransitProgress } from '../components/TransitProgressBar';
import './TransitProgressDemo.css';

const TransitProgressDemo = () => {
  const {
    progress,
    isActive,
    estimatedArrival,
    startProgress,
    updateProgress,
    completeDelivery,
    resetProgress,
    setEstimatedArrival
  } = useTransitProgress(0);

  const [simulationSpeed, setSimulationSpeed] = useState(1000); // ms per update

  // Mock order data
  const mockOrder = {
    items: [
      { name: 'Jollof Rice & Chicken', quantity: 2 },
      { name: 'Fried Plantain', quantity: 1 },
      { name: 'Fresh Orange Juice', quantity: 2 },
      { name: 'Meat Pie', quantity: 1 }
    ],
    rider: {
      name: 'Emeka Johnson',
      rating: 4.8,
      phone: '+234 802 345 6789'
    }
  };

  // Auto-simulate progress
  useEffect(() => {
    if (!isActive || progress >= 100) return;

    const interval = setInterval(() => {
      updateProgress(progress + Math.random() * 5); // Random increment
    }, simulationSpeed);

    return () => clearInterval(interval);
  }, [isActive, progress, simulationSpeed]);

  const startSimulation = () => {
    const arrivalTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    setEstimatedArrival(arrivalTime);
    startProgress(arrivalTime);
    updateProgress(5); // Start with small progress
  };

  const simulationControls = [
    { label: '🚀 Start Delivery', action: startSimulation },
    { label: '⏸️ Complete Now', action: completeDelivery },
    { label: '🔄 Reset', action: resetProgress }
  ];

  return (
    <div className="transit-demo">
      <div className="demo-header">
        <h1>🚀 GO7 Transit Progress Bar</h1>
        <p>Visual progress indicator for delivery tracking</p>
      </div>

      {/* Demo Controls */}
      <div className="demo-controls">
        <div className="control-section">
          <h3>📱 Simulation Controls</h3>
          <div className="control-buttons">
            {simulationControls.map((control, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={control.action}
                className="control-btn"
              >
                {control.label}
              </motion.button>
            ))}
          </div>

          <div className="speed-control">
            <label>Simulation Speed:</label>
            <select 
              value={simulationSpeed} 
              onChange={(e) => setSimulationSpeed(Number(e.target.value))}
            >
              <option value={500}>Fast (0.5s)</option>
              <option value={1000}>Normal (1s)</option>
              <option value={2000}>Slow (2s)</option>
            </select>
          </div>

          <div className="manual-progress">
            <label>Manual Progress:</label>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => updateProgress(Number(e.target.value))}
              className="progress-slider"
            />
            <span>{Math.floor(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Main Progress Component */}
      <div className="demo-showcase">
        <div className="phone-frame">
          <div className="phone-header">
            <div className="status-bar">
              <span>9:41</span>
              <span>📶 📶 📶 🔋</span>
            </div>
            <div className="app-header">
              <h2>📦 Order Tracking</h2>
              <span className="order-id">#GO7-2024-001</span>
            </div>
          </div>

          {/* The Transit Progress Bar Component */}
          <TransitProgressBar
            estimatedArrival={estimatedArrival}
            riderStatus="En Route to You"
            progress={progress}
            isActive={isActive}
            riderName={mockOrder.rider.name}
            orderItems={mockOrder.items}
            showDetails={true}
          />

          {/* Additional UI Context */}
          <div className="tracking-context">
            <div className="rider-card">
              <div className="rider-avatar">🛵</div>
              <div className="rider-details">
                <div className="rider-name">{mockOrder.rider.name}</div>
                <div className="rider-rating">⭐ {mockOrder.rider.rating}</div>
              </div>
              <button className="call-btn">📞</button>
            </div>

            <div className="map-placeholder">
              <div className="map-content">
                <span>🗺️ Google Maps</span>
                <p>Live tracking view would be here</p>
                <div className="map-marker">📍</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="features-grid">
        <div className="feature-card">
          <h3>⏱️ Real-time Updates</h3>
          <p>Progress updates automatically as rider moves closer to destination</p>
        </div>
        
        <div className="feature-card">
          <h3>🎯 Visual Milestones</h3>
          <p>Clear progress indicators: Confirmed → Pickup → Delivering → Delivered</p>
        </div>
        
        <div className="feature-card">
          <h3>✨ Smooth Animations</h3>
          <p>Beautiful transitions and shimmer effects for engaging user experience</p>
        </div>
        
        <div className="feature-card">
          <h3>📱 Mobile Optimized</h3>
          <p>Responsive design that works perfectly on all screen sizes</p>
        </div>
      </div>

      {/* Implementation Guide */}
      <div className="implementation-guide">
        <h2>🛠️ Implementation</h2>
        <div className="code-example">
          <pre>{`// Basic Usage
import TransitProgressBar from './components/TransitProgressBar';

// In your tracking component
<TransitProgressBar
  estimatedArrival={new Date('2024-12-07T14:30:00')}
  riderStatus="En Route to You"
  progress={65} // 0-100%
  isActive={true}
  riderName="Emeka Johnson"
  orderItems={orderItems}
  showDetails={true}
/>`}</pre>
        </div>
      </div>
    </div>
  );
};

export default TransitProgressDemo;