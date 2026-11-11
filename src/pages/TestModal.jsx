import React from 'react';

const TestModal = () => {
  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#E30613' }}>Modal Demo Test Page</h1>
      <p>If you can see this, the routing is working!</p>
      
      <div style={{
        backgroundColor: '#f0f0f0',
        padding: '20px',
        borderRadius: '10px',
        margin: '20px auto',
        maxWidth: '600px'
      }}>
        <h2>🎯 Modal System Components</h2>
        <p>This is a simplified test to verify the page loads correctly.</p>
        
        <button style={{
          backgroundColor: '#E30613',
          color: 'white',
          border: 'none',
          padding: '15px 30px',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer',
          margin: '10px'
        }}>
          Test Button
        </button>
      </div>
    </div>
  );
};

export default TestModal;