import React from 'react';

function TestApp() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#e61e25', marginBottom: '20px' }}>🎉 React is Working!</h1>
        <p>Go7 MapTracking System is ready to go!</p>
        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          Current Time: {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export default TestApp;