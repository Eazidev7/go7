// src/pages/Go7MapDemo.jsx
/**
 * Demo page for the Go7 Chowdeck-style delivery map
 * Showcases all features including animation, overlays, and responsive design
 */

import React, { useState } from 'react';
import Go7Map from '../components/Go7Map';
import './Go7MapDemo.css';

const Go7MapDemo = () => {
  const [mapHeight, setMapHeight] = useState('500px');
  const [demoFeatures, setDemoFeatures] = useState({
    animation: true,
    priceOverlay: true,
    riderProfile: true,
    statusBar: true
  });

  const features = [
    {
      icon: '🎨',
      title: 'Chowdeck-Style Design',
      description: 'Cartoon-style MapTiler tiles with cream background and rounded corners'
    },
    {
      icon: '🏍️',
      title: 'Animated Rider',
      description: 'Smooth scooter animation along dashed red route using requestAnimationFrame'
    },
    {
      icon: '📍',
      title: 'Custom Markers',
      description: 'Pickup (bag), dropoff (shop), and landmark (Olumo Rock) with custom SVG icons'
    },
    {
      icon: '💰',
      title: 'Price Overlay',
      description: 'Floating price pill with estimated delivery fee and pulsing animation'
    },
    {
      icon: '👤',
      title: 'Rider Profile',
      description: 'Interactive rider card with rating, deliveries count, and WhatsApp contact'
    },
    {
      icon: '📊',
      title: 'Live Status',
      description: 'Real-time progress bar and status updates with accessibility support'
    },
    {
      icon: '📱',
      title: 'Responsive',
      description: 'Optimized for mobile, tablet, and desktop with adaptive layouts'
    },
    {
      icon: '♿',
      title: 'Accessible',
      description: 'ARIA live regions, focus-visible outlines, and screen reader support'
    }
  ];

  const codeExample = `import Go7Map from './components/Go7Map';

function DeliveryTracker() {
  return (
    <div className="delivery-tracker">
      <h1>Track Your Delivery</h1>
      <Go7Map 
        height="400px"
        className="delivery-map"
        maptilerApiKey="your_api_key"
      />
    </div>
  );
}`;

  return (
    <div className="go7-map-demo">
      {/* Header */}
      <header className="demo-header">
        <div className="header-content">
          <h1>Go7 Delivery Map</h1>
          <p>Chowdeck-style animated delivery tracking with React + Leaflet</p>
          
          <div className="header-stats">
            <div className="stat">
              <span className="stat-number">10</span>
              <span className="stat-label">Features</span>
            </div>
            <div className="stat">
              <span className="stat-number">100%</span>
              <span className="stat-label">Responsive</span>
            </div>
            <div className="stat">
              <span className="stat-number">A11Y</span>
              <span className="stat-label">Accessible</span>
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <section className="demo-controls">
        <div className="controls-container">
          <h2>Interactive Demo</h2>
          <p>Adjust settings to see the map in action</p>
          
          <div className="control-grid">
            <div className="control-group">
              <label htmlFor="height-slider">Map Height</label>
              <input
                id="height-slider"
                type="range"
                min="300"
                max="800"
                step="50"
                value={parseInt(mapHeight)}
                onChange={(e) => setMapHeight(`${e.target.value}px`)}
              />
              <span className="control-value">{mapHeight}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Map Demo */}
      <section className="map-demo-section">
        <div className="map-container">
          <Go7Map 
            height={mapHeight}
            className="demo-map"
          />
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="section-container">
          <h2>Key Features</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Details */}
      <section className="tech-section">
        <div className="section-container">
          <h2>Technical Implementation</h2>
          <div className="tech-grid">
            <div className="tech-card">
              <h3>🗺️ Mapping</h3>
              <ul>
                <li>React Leaflet integration</li>
                <li>MapTiler cartoon tiles</li>
                <li>Custom SVG marker icons</li>
                <li>Polyline route visualization</li>
              </ul>
            </div>
            <div className="tech-card">
              <h3>🎬 Animation</h3>
              <ul>
                <li>requestAnimationFrame API</li>
                <li>Smooth Bézier curve paths</li>
                <li>Easing functions</li>
                <li>Performance optimized</li>
              </ul>
            </div>
            <div className="tech-card">
              <h3>📱 Responsive</h3>
              <ul>
                <li>Mobile-first design</li>
                <li>Adaptive overlays</li>
                <li>Touch-friendly controls</li>
                <li>Cross-device testing</li>
              </ul>
            </div>
            <div className="tech-card">
              <h3>♿ Accessibility</h3>
              <ul>
                <li>ARIA live regions</li>
                <li>Focus management</li>
                <li>Screen reader support</li>
                <li>Keyboard navigation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="code-section">
        <div className="section-container">
          <h2>Usage Example</h2>
          <div className="code-container">
            <pre className="code-block">
              <code>{codeExample}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Locations Info */}
      <section className="locations-section">
        <div className="section-container">
          <h2>Demo Locations</h2>
          <div className="locations-grid">
            <div className="location-card pickup">
              <div className="location-icon">📦</div>
              <h3>Pickup Point</h3>
              <p><strong>Ake, Abeokuta</strong></p>
              <p>Coordinates: 7.1475°N, 3.3619°E</p>
              <p>Traditional market area with local shops and restaurants</p>
            </div>
            <div className="location-card dropoff">
              <div className="location-icon">🏪</div>
              <h3>Dropoff Point</h3>
              <p><strong>Isabo, Abeokuta</strong></p>
              <p>Coordinates: 7.1532°N, 3.3698°E</p>
              <p>Residential area with modern shopping facilities</p>
            </div>
            <div className="location-card landmark">
              <div className="location-icon">🏔️</div>
              <h3>Landmark</h3>
              <p><strong>Olumo Rock</strong></p>
              <p>Coordinates: 7.1567°N, 3.3483°E</p>
              <p>Famous historical landmark and tourist attraction</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="demo-footer">
        <div className="footer-content">
          <p>© 2024 Go7 Platform - Chowdeck-Style Delivery Map Demo</p>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#technical">Technical</a>
            <a href="#code">Code</a>
            <a href="#accessibility">Accessibility</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Go7MapDemo;