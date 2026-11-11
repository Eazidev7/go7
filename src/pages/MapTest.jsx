import React from 'react';
import Go7Map from '../components/Go7Map';

const MapTest = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Map Test Page</h1>
      <p>Testing the fixed Go7Map component:</p>
      <Go7Map />
      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5' }}>
        <h3>Expected Behavior:</h3>
        <ul>
          <li>✅ Map container should have 400px height</li>
          <li>✅ Map should center on Abeokuta (7.1607, 3.3486)</li>
          <li>✅ OpenStreetMap tiles should load</li>
          <li>✅ No console errors about container size</li>
          <li>✅ Map should be interactive (zoom/pan)</li>
        </ul>
      </div>
    </div>
  );
};

export default MapTest;