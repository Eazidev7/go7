import React, { useEffect } from 'react';

const DebugPage = () => {
  useEffect(() => {
    console.log('✅ DebugPage mounted successfully');
    console.log('🔍 Checking environment:', {
      NODE_ENV: import.meta.env.NODE_ENV,
      BASE_URL: import.meta.env.BASE_URL,
      DEV: import.meta.env.DEV,
    });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔍 Debug Page</h1>
      <p>This page loaded successfully!</p>
      <div style={{ background: '#f5f5f5', padding: '10px', marginTop: '20px' }}>
        <h3>Environment Info:</h3>
        <pre>{JSON.stringify(import.meta.env, null, 2)}</pre>
      </div>
      <div style={{ marginTop: '20px' }}>
        <h3>Navigation Test:</h3>
        <a href="/book" style={{ color: 'blue' }}>Go to BookDelivery (/book)</a>
        <br />
        <a href="/" style={{ color: 'blue' }}>Go to Home (/)</a>
      </div>
    </div>
  );
};

export default DebugPage;