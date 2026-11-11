import React from 'react';

const MinimalHome = () => {
  console.log('MinimalHome component is rendering!');
  
  return (
    <div style={{ 
      padding: '40px', 
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ 
        color: '#E5362D', 
        fontSize: '3rem',
        marginBottom: '20px'
      }}>
        🚀 GO7 DELIVERY 🚀
      </h1>
      
      <div style={{
        backgroundColor: '#f0f0f0',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <h2>System Status:</h2>
        <ul style={{ fontSize: '18px', lineHeight: '1.6' }}>
          <li>✅ React App Loading</li>
          <li>✅ Vite Server Running</li>
          <li>✅ Components Rendering</li>
          <li>✅ Routing Working</li>
        </ul>
      </div>

      <div style={{
        backgroundColor: '#E5362D',
        color: 'white',
        padding: '20px',
        borderRadius: '10px'
      }}>
        <h3>🎉 GO7 App is Working! 🎉</h3>
        <p>Your delivery platform is ready for action!</p>
      </div>
    </div>
  );
};

export default MinimalHome;