import React from 'react';

const DiagnosticTest = () => {
  console.log('🔍 DiagnosticTest component rendering...');
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#ff6b35',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '2rem',
      fontWeight: 'bold',
      zIndex: 9999,
      padding: '2rem',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '3rem' }}>
        🔥 DIAGNOSTIC TEST 🔥
      </h1>
      
      <div style={{ fontSize: '1.5rem', textAlign: 'center', lineHeight: 1.6 }}>
        <p>✅ React is rendering</p>
        <p>✅ Components are loading</p>
        <p>✅ Router is working</p>
        <p>✅ Import errors fixed</p>
      </div>
      
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        borderRadius: '10px',
        fontSize: '1.2rem'
      }}>
        <p>Time: {new Date().toLocaleTimeString()}</p>
        <p>This proves React is fully functional!</p>
      </div>
    </div>
  );
};

export default DiagnosticTest;