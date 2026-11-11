// GO7 Delivery System Demo
// Complete demonstration of delivery tracking and replay features

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DeliveryIntegration from '../components/DeliveryIntegration';
import DeliveryReplay from './DeliveryReplay';
import { generateMockRoute } from '../utils/mockRouteGenerator';
import { db } from '../firebase/config';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import './DeliveryDemo.css';

const DeliveryDemo = () => {
  const [currentView, setCurrentView] = useState('integration');
  const [mockDelivery, setMockDelivery] = useState(null);
  const [mockRider, setMockRider] = useState(null);
  const [demoRoutes, setDemoRoutes] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize demo data
  useEffect(() => {
    initializeDemoData();
  }, []);

  const initializeDemoData = () => {
    // Mock delivery data
    const delivery = {
      orderId: `DEMO_${Date.now()}`,
      userId: 'demo_user_123',
      status: 'assigned',
      pickup: {
        address: 'Victoria Island, Lagos',
        coordinates: { lat: 6.4281, lng: 3.4219 },
        contactName: 'Chowdeck Restaurant',
        contactPhone: '+234 800 CHOW (2469)'
      },
      delivery: {
        address: 'Ikoyi, Lagos', 
        coordinates: { lat: 6.4474, lng: 3.4539 },
        contactName: 'John Doe',
        contactPhone: '+234 901 234 5678'
      },
      items: [
        { name: 'Jollof Rice & Chicken', quantity: 2, price: 3500 },
        { name: 'Fried Plantain', quantity: 1, price: 800 },
        { name: 'Fresh Orange Juice', quantity: 2, price: 1200 }
      ],
      totalAmount: 5500,
      createdAt: new Date().toISOString()
    };

    // Mock rider data
    const rider = {
      id: 'rider_demo_456',
      name: 'Emeka Johnson',
      phone: '+234 802 345 6789',
      vehicleType: 'motorcycle',
      plateNumber: 'LAG-123-AA',
      rating: 4.8,
      totalDeliveries: 1247,
      status: 'active'
    };

    setMockDelivery(delivery);
    setMockRider(rider);
  };

  // Generate demo routes for testing
  const generateDemoRoutes = async () => {
    setIsGenerating(true);
    
    try {
      const routeTypes = ['express', 'normal', 'long', 'stops'];
      const newRoutes = [];
      
      for (const type of routeTypes) {
        const route = generateMockRoute(type, `DEMO_${type.toUpperCase()}_${Date.now()}`);
        newRoutes.push({
          ...route,
          type,
          generated: new Date()
        });
      }
      
      setDemoRoutes(newRoutes);
      console.log('✅ Generated demo routes:', newRoutes.length);
      
    } catch (error) {
      console.error('❌ Error generating demo routes:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Upload route to Firestore for testing
  const uploadDemoRoute = async (route) => {
    try {
      // Note: This would require Firebase config in a real implementation
      console.log('📤 Would upload route to Firestore:', route.orderId);
      alert(`Demo: Route ${route.orderId} would be uploaded to Firestore`);
    } catch (error) {
      console.error('❌ Error uploading route:', error);
      alert('Error uploading route');
    }
  };

  const viewOptions = [
    { id: 'integration', label: 'Live Tracking', icon: '🛵' },
    { id: 'replay', label: 'Route Replay', icon: '🎬' },
    { id: 'routes', label: 'Demo Routes', icon: '🗺️' }
  ];

  return (
    <div className="delivery-demo">
      <div className="demo-header">
        <h1>🚀 GO7 Delivery System Demo</h1>
        <p>Complete delivery tracking and replay system demonstration</p>
        
        {/* View Switcher */}
        <div className="view-switcher">
          {viewOptions.map(option => (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentView(option.id)}
              className={`view-option ${currentView === option.id ? 'active' : ''}`}
            >
              <span className="option-icon">{option.icon}</span>
              {option.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="demo-content">
        <AnimatePresence mode="wait">
          {/* Live Tracking Integration */}
          {currentView === 'integration' && (
            <motion.div
              key="integration"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="demo-section"
            >
              <div className="section-header">
                <h2>🛵 Live Delivery Tracking</h2>
                <p>Real-time GPS tracking with automatic route recording</p>
              </div>
              
              {mockDelivery && mockRider && (
                <DeliveryIntegration
                  delivery={mockDelivery}
                  rider={mockRider}
                  onStatusChange={(status) => console.log('Tracking status:', status)}
                  showReplayButton={true}
                />
              )}
              
              <div className="demo-notes">
                <h3>📝 Live Tracking Features:</h3>
                <ul>
                  <li>🎯 Real-time GPS location tracking (3-second intervals)</li>
                  <li>📊 Live statistics: duration, distance, accuracy</li>
                  <li>💾 Automatic Firestore route recording</li>
                  <li>🔄 Smart buffering and batch uploads</li>
                  <li>📱 Mobile-optimized with permission handling</li>
                  <li>🎬 Instant replay access after completion</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Route Replay */}
          {currentView === 'replay' && (
            <motion.div
              key="replay"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="demo-section"
            >
              <div className="section-header">
                <h2>🎬 Route Replay System</h2>
                <p>Professional delivery route playback with analytics</p>
              </div>
              
              {mockDelivery ? (
                <DeliveryReplay orderId={mockDelivery.orderId} />
              ) : (
                <div className="demo-placeholder">
                  <p>Loading replay system...</p>
                </div>
              )}
              
              <div className="demo-notes">
                <h3>📝 Replay Features:</h3>
                <ul>
                  <li>🎮 Professional playback controls (play/pause/speed/seek)</li>
                  <li>🗺️ Smooth Google Maps animation with interpolation</li>
                  <li>📊 Real-time analytics: speed, stops, distance</li>
                  <li>📤 Export capabilities (GIF/MP4 via Firebase Functions)</li>
                  <li>🛵 Animated rider marker with speed indicators</li>
                  <li>⌨️ Keyboard shortcuts for easy navigation</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Demo Routes */}
          {currentView === 'routes' && (
            <motion.div
              key="routes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="demo-section"
            >
              <div className="section-header">
                <h2>🗺️ Demo Route Generator</h2>
                <p>Generate realistic delivery routes for testing</p>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={generateDemoRoutes}
                  disabled={isGenerating}
                  className="generate-btn"
                >
                  {isGenerating ? '⏳ Generating...' : '🎲 Generate Demo Routes'}
                </motion.button>
              </div>

              {demoRoutes.length > 0 && (
                <div className="routes-grid">
                  {demoRoutes.map((route, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="route-card"
                    >
                      <div className="route-header">
                        <h3>{route.type.toUpperCase()} Route</h3>
                        <span className="route-id">#{route.orderId}</span>
                      </div>
                      
                      <div className="route-stats">
                        <div className="stat">
                          <span className="label">📍 Points:</span>
                          <span className="value">{route.path.length}</span>
                        </div>
                        <div className="stat">
                          <span className="label">📏 Distance:</span>
                          <span className="value">{route.meta.distanceMeters.toFixed(0)}m</span>
                        </div>
                        <div className="stat">
                          <span className="label">⚡ Max Speed:</span>
                          <span className="value">{route.meta.maxSpeed.toFixed(1)} m/s</span>
                        </div>
                        <div className="stat">
                          <span className="label">⏱️ Duration:</span>
                          <span className="value">{Math.floor(route.meta.duration / 60)}m</span>
                        </div>
                      </div>
                      
                      <div className="route-actions">
                        <button 
                          onClick={() => uploadDemoRoute(route)}
                          className="action-btn upload"
                        >
                          📤 Upload
                        </button>
                        <button 
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(route, null, 2)], 
                              { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `route_${route.orderId}.json`;
                            a.click();
                          }}
                          className="action-btn download"
                        >
                          💾 Download
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              
              <div className="demo-notes">
                <h3>📝 Route Generation Features:</h3>
                <ul>
                  <li>🎯 Lagos-based realistic coordinates</li>
                  <li>🚦 Traffic simulation with speed variations</li>
                  <li>🛑 Automatic stop detection and analysis</li>
                  <li>📊 Comprehensive route statistics</li>
                  <li>💾 JSON export for testing purposes</li>
                  <li>📤 Firestore upload capability</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* System Overview */}
      <div className="system-overview">
        <h2>🔧 System Architecture</h2>
        <div className="architecture-grid">
          <div className="arch-component">
            <h3>🛵 Live Tracking</h3>
            <p>Real-time GPS with automatic Firestore recording</p>
          </div>
          <div className="arch-component">
            <h3>🎬 Route Replay</h3>
            <p>Professional playback with Google Maps animation</p>
          </div>
          <div className="arch-component">
            <h3>☁️ Firebase Backend</h3>
            <p>Functions for export, Firestore for data, Auth for security</p>
          </div>
          <div className="arch-component">
            <h3>🔐 Security</h3>
            <p>RBAC rules, user access control, data protection</p>
          </div>
          <div className="arch-component">
            <h3>📱 Mobile Optimized</h3>
            <p>Responsive design, performance optimization, PWA ready</p>
          </div>
          <div className="arch-component">
            <h3>🎯 Admin Tools</h3>
            <p>Route management, bulk export, user control panel</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDemo;