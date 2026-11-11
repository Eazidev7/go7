import React, { useEffect } from 'react';

const BookDeliverySimpleTest = () => {
  useEffect(() => {
    console.log('✅ BookDeliverySimpleTest component mounted');
  }, []);

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      background: 'white'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>📦 Book Delivery - Test Page</h1>
      <p>This is a simplified test version of the BookDelivery component.</p>

      <div style={{
        background: '#f0f8ff',
        padding: '15px',
        margin: '20px 0',
        borderRadius: '8px',
        border: '1px solid #ccc'
      }}>
        <h3>🧪 Component Status</h3>
        <ul>
          <li>✅ Component rendered successfully</li>
          <li>✅ React hooks working</li>
          <li>✅ Basic styling applied</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button
          style={{
            background: '#007bff',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
          onClick={() => {
            console.log('Button clicked - React events working');
            alert('React events are working!');
          }}
        >
          Test Button
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>🔗 Navigation Links</h3>
        <a href="/" style={{ color: 'blue', marginRight: '15px' }}>← Back to Home</a>
        <a href="/debug" style={{ color: 'blue' }}>Debug Page</a>
      </div>
    </div>
  );
};

export default BookDeliverySimpleTest;