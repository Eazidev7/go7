import React from 'react';
import MobileHomePage from '../components/MobileHomePage';

const MobileHomeTest = () => {
  return (
    <div style={{ 
      width: '100%', 
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      padding: 0,
      margin: 0
    }}>
      {/* Giant banner to prove v3.0 loaded */}
      <div style={{
        background: 'linear-gradient(135deg, #e61e25 0%, #ff4b4b 100%)',
        color: 'white',
        padding: '24px',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '16px',
        boxShadow: '0 4px 12px rgba(230, 30, 37, 0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 9999
      }}>
        ✅ NEW UBER EATS STYLE LOADED v3.0!
        <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.9 }}>
          Fresh Cache - {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      {/* The actual new homepage with all modern features */}
      <MobileHomePage />
    </div>
  );
};

export default MobileHomeTest;