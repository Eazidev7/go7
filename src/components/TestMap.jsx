// src/components/TestMap.jsx
import React from 'react';

const TestMap = () => {
  return (
    <div style={{ 
      height: '400px', 
      background: '#e8f5e8', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      border: '2px solid #4CAF50',
      borderRadius: '8px',
      margin: '20px 0'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>🗺️ Map Test Component</h2>
        <p>If you see this, React components are working!</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
          <img src="/bag-icon.jpg" alt="Bag" style={{ width: '50px', height: '50px', borderRadius: '50%' }} />
          <img src="/shop-icon.jpg" alt="Shop" style={{ width: '50px', height: '50px', borderRadius: '50%' }} />
          <img src="/rider-icon.jpg" alt="Rider" style={{ width: '50px', height: '50px', borderRadius: '50%' }} />
          <img src="/olumo-rock-icon.jpg" alt="Olumo Rock" style={{ width: '50px', height: '50px', borderRadius: '50%' }} />
        </div>
      </div>
    </div>
  );
};

export default TestMap;