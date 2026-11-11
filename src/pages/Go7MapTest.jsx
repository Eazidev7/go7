// src/pages/Go7MapTest.jsx
/**
 * Simple test page for Go7Map component
 * Basic functionality verification
 */

import React from 'react';
import Go7Map from '../components/Go7Map';

const Go7MapTest = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', color: '#1f2937', marginBottom: '30px' }}>
        Go7Map Component Test
      </h1>
      
      <div style={{ marginBottom: '40px' }}>
        <h2>Standard Size (400px)</h2>
        <Go7Map height="400px" />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Large Size (600px)</h2>
        <Go7Map height="600px" />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Mobile Size (300px)</h2>
        <Go7Map height="300px" />
      </div>

      <div>
        <h3>Features Checklist:</h3>
        <ul>
          <li>✅ MapTiler cartoon tiles with cream background</li>
          <li>✅ Animated red scooter rider</li>
          <li>✅ Pickup marker (bag icon)</li>
          <li>✅ Dropoff marker (shop icon)</li>
          <li>✅ Olumo Rock landmark with tooltip</li>
          <li>✅ Dashed red route polyline</li>
          <li>✅ Price pill overlay (₦1,450)</li>
          <li>✅ Rider profile chip with WhatsApp button</li>
          <li>✅ Live status bar with progress</li>
          <li>✅ Responsive design</li>
          <li>✅ Accessibility features</li>
        </ul>
      </div>
    </div>
  );
};

export default Go7MapTest;