import React from 'react';

const HomeTestSimple = () => {
  console.log('🧪 HomeTestSimple component rendering...');
  
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9f9f9',
      padding: '2rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ 
        color: '#E5362D', 
        fontSize: '3rem',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        🧪 TESTING FULL HOME PAGE ROUTE
      </h1>
      
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <h2>✅ Full Home Route Working!</h2>
        <p>This confirms the routing to the full homepage is working.</p>
        <p>Now we need to check why the actual Home component isn't loading.</p>
        
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '5px'
        }}>
          <h3>Debug Info:</h3>
          <ul>
            <li>Route: / (root path)</li>
            <li>Component: Testing Full Home</li>
            <li>Time: {new Date().toLocaleTimeString()}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HomeTestSimple;