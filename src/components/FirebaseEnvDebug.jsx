import React, { useEffect, useState } from 'react';

/**
 * 🔍 Firebase Environment Debug Component
 * Checks if Firebase environment variables are loading correctly
 */
export default function FirebaseEnvDebug() {
  const [envData, setEnvData] = useState({});

  useEffect(() => {
    const firebaseEnv = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
      
      // Additional debug info
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      prod: import.meta.env.PROD
    };

    setEnvData(firebaseEnv);

    console.log('🔍 Firebase Environment Debug:', {
      'API Key': firebaseEnv.apiKey ? `${firebaseEnv.apiKey.substring(0, 20)}...` : '❌ Missing',
      'Auth Domain': firebaseEnv.authDomain || '❌ Missing',
      'Project ID': firebaseEnv.projectId || '❌ Missing',
      'Storage Bucket': firebaseEnv.storageBucket || '❌ Missing',
      'Messaging Sender ID': firebaseEnv.messagingSenderId || '❌ Missing',
      'App ID': firebaseEnv.appId ? `${firebaseEnv.appId.substring(0, 30)}...` : '❌ Missing',
      'Database URL': firebaseEnv.databaseURL || '❌ Missing',
      'Mode': firebaseEnv.mode,
      'Is Dev': firebaseEnv.dev,
      'Is Prod': firebaseEnv.prod
    });
  }, []);

  const checkEnvironmentStatus = () => {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missingFields = requiredFields.filter(field => !envData[field]);
    const hasValidApiKey = envData.apiKey && envData.apiKey.startsWith('AIza');
    
    return {
      allFieldsPresent: missingFields.length === 0,
      missingFields,
      hasValidApiKey,
      ready: missingFields.length === 0 && hasValidApiKey
    };
  };

  const status = checkEnvironmentStatus();

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h2 style={{ color: '#e53935', textAlign: 'center' }}>
        🔍 Firebase Environment Variables Debug
      </h2>

      {/* Overall Status */}
      <div style={{
        padding: '20px',
        marginBottom: '20px',
        backgroundColor: status.ready ? '#e8f5e8' : '#ffebee',
        border: `2px solid ${status.ready ? '#4caf50' : '#f44336'}`,
        borderRadius: '8px'
      }}>
        <h3 style={{ 
          margin: '0 0 10px 0', 
          color: status.ready ? '#2e7d32' : '#c62828' 
        }}>
          {status.ready ? '✅ Environment Status: Ready' : '❌ Environment Status: Issues Detected'}
        </h3>
        
        {!status.ready && (
          <div>
            <p style={{ color: '#c62828', margin: '5px 0' }}>
              Missing fields: {status.missingFields.join(', ')}
            </p>
            {!status.hasValidApiKey && (
              <p style={{ color: '#c62828', margin: '5px 0' }}>
                Invalid API key format (should start with 'AIza')
              </p>
            )}
          </div>
        )}
      </div>

      {/* Environment Variables Table */}
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '20px'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                Variable
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                Status
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                Value Preview
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              { key: 'apiKey', label: 'VITE_FIREBASE_API_KEY', critical: true },
              { key: 'authDomain', label: 'VITE_FIREBASE_AUTH_DOMAIN', critical: true },
              { key: 'projectId', label: 'VITE_FIREBASE_PROJECT_ID', critical: true },
              { key: 'storageBucket', label: 'VITE_FIREBASE_STORAGE_BUCKET', critical: false },
              { key: 'messagingSenderId', label: 'VITE_FIREBASE_MESSAGING_SENDER_ID', critical: false },
              { key: 'appId', label: 'VITE_FIREBASE_APP_ID', critical: true },
              { key: 'databaseURL', label: 'VITE_FIREBASE_DATABASE_URL', critical: false }
            ].map(({ key, label, critical }) => (
              <tr key={key}>
                <td style={{ 
                  padding: '12px', 
                  borderBottom: '1px solid #eee',
                  fontWeight: critical ? 'bold' : 'normal'
                }}>
                  {label} {critical && <span style={{ color: '#f44336' }}>*</span>}
                </td>
                <td style={{ 
                  padding: '12px', 
                  borderBottom: '1px solid #eee',
                  color: envData[key] ? '#4caf50' : '#f44336'
                }}>
                  {envData[key] ? '✅ Found' : '❌ Missing'}
                </td>
                <td style={{ 
                  padding: '12px', 
                  borderBottom: '1px solid #eee',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}>
                  {envData[key] 
                    ? key === 'apiKey' 
                      ? `${envData[key].substring(0, 20)}...`
                      : key === 'appId' 
                        ? `${envData[key].substring(0, 30)}...`
                        : envData[key]
                    : 'Not found'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Debug Information */}
      <div style={{
        padding: '15px',
        backgroundColor: '#f0f7ff',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>🔧 Debug Information:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li><strong>Environment Mode:</strong> {envData.mode || 'Unknown'}</li>
          <li><strong>Development Mode:</strong> {envData.dev ? 'Yes' : 'No'}</li>
          <li><strong>Production Mode:</strong> {envData.prod ? 'Yes' : 'No'}</li>
          <li><strong>Vite Version:</strong> {import.meta.env.VITE ? 'Available' : 'Not detected'}</li>
        </ul>
      </div>

      {/* Troubleshooting */}
      {!status.ready && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>🛠️ Troubleshooting Steps:</h4>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
            <li>Check your <code>.env</code> file in the project root</li>
            <li>Ensure all <code>VITE_FIREBASE_*</code> variables are present</li>
            <li>Restart the development server after changing .env</li>
            <li>Clear browser cache and hard refresh (Ctrl+F5)</li>
            <li>Verify no spaces or quotes around environment values</li>
          </ol>
        </div>
      )}
    </div>
  );
}