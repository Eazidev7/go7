// src/pages/StyledMapDemo.jsx
/**
 * Demo page for the Enhanced Styled Delivery Map
 * Showcases all themes and features
 */

import React, { useState } from 'react';
import StyledDeliveryMap from '../components/StyledDeliveryMap';
import '../styles/styledDeliveryMap.css';
import '../styles/styledMapDemo.css';

const StyledMapDemo = () => {
  const [demoMode, setDemoMode] = useState('full');

  return (
    <div className="styled-map-demo">
      {/* Demo Header */}
      <header className="demo-header">
        <div className="demo-header-content">
          <h1>Go7 Enhanced Delivery Map</h1>
          <p>Professional location selector with multiple themes and styling options</p>
          
          <div className="demo-controls">
            <div className="demo-mode-selector">
              <label>Demo Mode:</label>
              <select 
                value={demoMode} 
                onChange={(e) => setDemoMode(e.target.value)}
              >
                <option value="full">Full Featured</option>
                <option value="embedded">Embedded View</option>
                <option value="minimal">Minimal View</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Features Overview */}
      <section className="features-overview">
        <div className="features-container">
          <h2>Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <h3>Multiple Themes</h3>
              <p>Chowdeck-style, Dark mode, and Modern themes with smooth transitions</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📍</div>
              <h3>GPS Integration</h3>
              <p>Auto-detect user location with precise geolocation services</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Smart Search</h3>
              <p>Intelligent area search with real-time suggestions</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Responsive Design</h3>
              <p>Optimized for mobile, tablet, and desktop experiences</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Performance</h3>
              <p>Optimized map rendering with lazy loading and caching</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Popular Areas</h3>
              <p>Highlight frequently selected delivery locations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Map Demo Container */}
      <section className={`map-demo-section ${demoMode}`}>
        <div className="map-demo-container">
          {demoMode === 'full' && (
            <>
              <h2>Interactive Map Demo</h2>
              <p>Try switching themes, using GPS, and selecting different areas</p>
            </>
          )}
          
          <div className={`map-container ${demoMode}`}>
            <StyledDeliveryMap />
          </div>
        </div>
      </section>

      {/* Technical Details */}
      <section className="technical-details">
        <div className="technical-container">
          <h2>Technical Implementation</h2>
          <div className="tech-grid">
            <div className="tech-item">
              <h3>Frontend</h3>
              <ul>
                <li>React 18 with Hooks</li>
                <li>Leaflet.js for mapping</li>
                <li>Custom CSS with CSS Variables</li>
                <li>Responsive Grid System</li>
              </ul>
            </div>
            <div className="tech-item">
              <h3>Mapping Services</h3>
              <ul>
                <li>MapTiler for styled tiles</li>
                <li>styled-map-package integration</li>
                <li>Multiple theme support</li>
                <li>Offline map capabilities</li>
              </ul>
            </div>
            <div className="tech-item">
              <h3>Features</h3>
              <ul>
                <li>Theme switching system</li>
                <li>GPS geolocation</li>
                <li>Area selection</li>
                <li>Popular locations</li>
              </ul>
            </div>
            <div className="tech-item">
              <h3>Performance</h3>
              <ul>
                <li>Lazy loading</li>
                <li>Map caching</li>
                <li>Optimized rendering</li>
                <li>Mobile optimization</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Usage Examples */}
      <section className="usage-examples">
        <div className="usage-container">
          <h2>Usage Examples</h2>
          <div className="usage-tabs">
            <div className="usage-tab active">
              <h3>Basic Integration</h3>
              <pre className="code-block">
{`import StyledDeliveryMap from './components/StyledDeliveryMap';
import './styles/styledDeliveryMap.css';

function App() {
  return (
    <div className="app">
      <StyledDeliveryMap />
    </div>
  );
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="demo-footer">
        <div className="footer-content">
          <p>© 2024 Go7 Delivery Platform - Enhanced Map Integration</p>
          <div className="footer-links">
            <a href="#documentation">Documentation</a>
            <a href="#api">API Reference</a>
            <a href="#support">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StyledMapDemo;