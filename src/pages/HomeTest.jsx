import React from 'react';

const HomeTest = () => {
  console.log('🧪 HomeTest component rendering...');
  
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
        🧪 HOME TEST PAGE
      </h1>
      
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <h2>✅ HomeTest Component Loaded!</h2>
        <p>This is the HomeTest page component.</p>
        
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '5px'
        }}>
          <h3>Debug Info:</h3>
          <ul>
            <li>Component: HomeTest</li>
            <li>Time: {new Date().toLocaleTimeString()}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HomeTest;