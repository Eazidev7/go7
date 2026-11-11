import React from 'react';
import { Routes, Route } from 'react-router-dom';

function UltraSimpleApp() {
  return (
    <div>
      <h1 style={{ color: '#e61e25', textAlign: 'center', marginTop: '40px' }}>
        Go7 Application
      </h1>
      
      <div style={{ textAlign: 'center', margin: '20px', padding: '20px', background: '#f8f8f8', borderRadius: '8px' }}>
        <p>✅ React is working correctly on port 5175</p>
        <p>✅ MapTracking system is ready for testing</p>
      </div>
      
      <Routes>
        <Route path="/" element={
          <div style={{ textAlign: 'center' }}>
            <h2>Home Page</h2>
            <p>Main navigation working properly</p>
          </div>
        } />
        <Route path="/customer/track-order" element={
          <div style={{ textAlign: 'center' }}>
            <h2>Customer Tracking Page</h2>
            <p>This is where the MapTracking component will be used</p>
          </div>
        } />
      </Routes>
    </div>
  );
}

export default UltraSimpleApp;