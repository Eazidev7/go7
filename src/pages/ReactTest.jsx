// Minimal React Test Component
// Basic test to verify React rendering is working

import React from 'react';

export default function ReactTest() {
  console.log('✅ ReactTest component rendering...');
  
  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e61e25, #ff6b6b)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{ 
        background: 'rgba(255,255,255,0.1)', 
        padding: '32px', 
        borderRadius: '16px',
        backdropFilter: 'blur(10px)',
        maxWidth: '500px'
      }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 16px 0' }}>
          ✅ React is Working!
        </h1>
        <p style={{ fontSize: '1.2rem', margin: '0 0 24px 0', opacity: 0.9 }}>
          Go7 React application is successfully rendering
        </p>
        <div style={{ 
          background: 'rgba(255,255,255,0.2)', 
          padding: '16px', 
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <strong>Timestamp:</strong> {new Date().toLocaleString()}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          fontSize: '0.9rem'
        }}>
          <div>✅ React 18</div>
          <div>✅ Vite Dev Server</div>
          <div>✅ ES6 Modules</div>
          <div>✅ Hot Module Reload</div>
        </div>
        <p style={{ 
          marginTop: '24px', 
          fontSize: '0.9rem', 
          opacity: 0.8 
        }}>
          If you see this, React is rendering correctly!
        </p>
      </div>
    </div>
  );
}