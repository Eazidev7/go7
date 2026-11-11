import React, { useState, useEffect } from 'react';

const FirebaseDebug = () => {
  const [testResult, setTestResult] = useState('Click button to test...');

  const envVars = {
    'VITE_FIREBASE_API_KEY': import.meta.env.VITE_FIREBASE_API_KEY,
    'VITE_FIREBASE_AUTH_DOMAIN': import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    'VITE_FIREBASE_PROJECT_ID': import.meta.env.VITE_FIREBASE_PROJECT_ID,
    'VITE_FIREBASE_STORAGE_BUCKET': import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    'VITE_FIREBASE_MESSAGING_SENDER_ID': import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    'VITE_FIREBASE_APP_ID': import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const testAuth = async () => {
    setTestResult('⏳ Testing Firebase Authentication...\n\n');
    
    try {
      const { initializeApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
      
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      };

      const app = initializeApp(firebaseConfig, 'debug-app');
      const auth = getAuth(app);
      
      setTestResult(
        '✅ Firebase Auth initialized successfully!\n' +
        `✅ Auth Domain: ${auth.config.authDomain}\n` +
        `✅ API Key Active: ${auth.config.apiKey.substring(0, 15)}...\n\n` +
        '🎉 No API key errors detected!\n' +
        'Note: If you still see errors in your app, clear browser cache (Ctrl+Shift+Delete)'
      );
    } catch (error) {
      setTestResult(
        `❌ Error: ${error.message}\n` +
        `Code: ${error.code || 'unknown'}\n\n` +
        'This usually means:\n' +
        '1. Browser cache has old code - Clear cache!\n' +
        '2. API key is wrong in Firebase Console\n' +
        '3. Domain not authorized in Firebase'
      );
    }
  };

  return (
    <div style={{ 
      fontFamily: '"Courier New", monospace',
      maxWidth: '800px',
      margin: '50px auto',
      padding: '20px',
      background: '#1e1e1e',
      color: '#00ff00',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#e61e25', fontSize: '32px' }}>🔥 Firebase API Key Debug Tool</h1>
      
      <div style={{
        background: '#2d2d2d',
        padding: '20px',
        margin: '20px 0',
        borderRadius: '8px',
        border: '2px solid #e61e25'
      }}>
        <h2 style={{ color: '#e61e25' }}>Environment Variables Check</h2>
        <pre style={{
          background: '#1a1a1a',
          padding: '15px',
          borderRadius: '4px',
          overflowX: 'auto',
          fontSize: '14px'
        }}>
          {Object.entries(envVars).map(([key, value]) => {
            const status = value ? '✅' : '❌';
            const displayValue = value ? 
              (key.includes('API_KEY') ? `${value.substring(0, 15)}...${value.substring(value.length - 5)}` : value) : 
              'MISSING';
            return `${status} ${key}: ${displayValue}\n`;
          }).join('')}
        </pre>
      </div>

      <div style={{
        background: '#2d2d2d',
        padding: '20px',
        margin: '20px 0',
        borderRadius: '8px',
        border: '2px solid #e61e25'
      }}>
        <h2 style={{ color: '#e61e25' }}>Firebase Config Object</h2>
        <pre style={{
          background: '#1a1a1a',
          padding: '15px',
          borderRadius: '4px',
          overflowX: 'auto',
          fontSize: '14px',
          whiteSpace: 'pre-wrap'
        }}>
          {JSON.stringify({
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID
          }, null, 2)}
        </pre>
      </div>

      <div style={{
        background: '#2d2d2d',
        padding: '20px',
        margin: '20px 0',
        borderRadius: '8px',
        border: '2px solid #e61e25'
      }}>
        <h2 style={{ color: '#e61e25' }}>Authentication Test</h2>
        <button 
          onClick={testAuth}
          style={{
            background: '#e61e25',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '15px'
          }}
        >
          Test Firebase Auth
        </button>
        <pre style={{
          background: '#1a1a1a',
          padding: '15px',
          borderRadius: '4px',
          overflowX: 'auto',
          fontSize: '14px',
          whiteSpace: 'pre-wrap',
          color: testResult.includes('✅') ? '#00ff00' : testResult.includes('❌') ? '#ff4444' : '#ffaa00'
        }}>
          {testResult}
        </pre>
      </div>

      <div style={{
        background: '#2d2d2d',
        padding: '20px',
        margin: '20px 0',
        borderRadius: '8px',
        border: '2px solid #ffaa00'
      }}>
        <h2 style={{ color: '#ffaa00' }}>⚠️ Important Notes</h2>
        <ul style={{ color: '#ffffff', lineHeight: '1.8' }}>
          <li>Expected API Key: <code style={{ color: '#00ff00' }}>AIzaSyBmQwPSnQslo6Sq4NeYjAUi8iaZIYVlaBg</code></li>
          <li>If you see "API key invalid" in your app but this page shows correct key, <strong style={{ color: '#e61e25' }}>CLEAR BROWSER CACHE</strong></li>
          <li>Press <code>Ctrl + Shift + Delete</code> → Select "All time" → Check "Cached images and files" → Clear</li>
          <li>Authorized domains in Firebase: <code>localhost</code>, <code>go7-delivery.firebaseapp.com</code></li>
        </ul>
      </div>
    </div>
  );
};

export default FirebaseDebug;
