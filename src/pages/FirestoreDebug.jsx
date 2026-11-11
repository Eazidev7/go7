import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config.js';

/**
 * 🔍 Firestore Connection Tester
 * Tests Firestore connectivity and helps diagnose 400 errors
 */
export default function FirestoreDebug() {
  const [status, setStatus] = useState({
    connecting: true,
    connected: false,
    canWrite: false,
    canRead: false,
    error: null,
    logs: []
  });

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setStatus(prev => ({
      ...prev,
      logs: [...prev.logs, { message, type, timestamp }]
    }));
    console.log(`[${timestamp}] ${message}`);
  };

  const testFirestore = async () => {
    setStatus(prev => ({ ...prev, connecting: true, logs: [] }));
    addLog('🔄 Starting Firestore connection test...');

    try {
      // Test 1: Check if db exists
      if (!db) {
        throw new Error('Firestore instance not available');
      }
      addLog('✅ Firestore instance found', 'success');

      // Test 2: Try to write a test document
      addLog('📝 Testing write operation...');
      const testDocRef = doc(db, 'health_checks', 'connection_test');
      await setDoc(testDocRef, {
        timestamp: new Date(),
        test: 'connection_test',
        status: 'active',
        userAgent: navigator.userAgent
      });
      addLog('✅ Write operation successful', 'success');
      setStatus(prev => ({ ...prev, canWrite: true }));

      // Test 3: Try to read the document
      addLog('📖 Testing read operation...');
      const docSnap = await getDoc(testDocRef);
      if (docSnap.exists()) {
        addLog('✅ Read operation successful', 'success');
        setStatus(prev => ({ ...prev, canRead: true }));
      } else {
        addLog('⚠️ Document not found after write', 'warning');
      }

      // Test 4: Try to create a document with auto-generated ID
      addLog('🆕 Testing collection add...');
      await addDoc(collection(db, 'health_checks'), {
        timestamp: new Date(),
        test: 'auto_id_test'
      });
      addLog('✅ Collection add successful', 'success');

      setStatus(prev => ({ ...prev, connected: true, connecting: false }));
      addLog('🎉 All Firestore tests passed!', 'success');

    } catch (error) {
      addLog(`❌ Firestore error: ${error.message}`, 'error');
      setStatus(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false, 
        error: error.message 
      }));

      // Diagnose specific errors
      diagnoseFissoreError(error);
    }
  };

  const diagnoseFissoreError = (error) => {
    if (error.code === 'permission-denied') {
      addLog('🚨 Permission denied - Check Firestore rules', 'error');
    } else if (error.message.includes('400')) {
      addLog('🚨 400 Bad Request - Configuration issue detected', 'error');
      addLog('💡 Try: Check project ID, clear cache, restart server', 'info');
    } else if (error.code === 'unavailable') {
      addLog('🚨 Service unavailable - Network or Firebase issue', 'error');
    } else if (error.code === 'failed-precondition') {
      addLog('🚨 Failed precondition - Check indexes', 'error');
    } else {
      addLog(`🚨 Unknown error code: ${error.code}`, 'error');
    }
  };

  useEffect(() => {
    // Auto-run test on component mount
    setTimeout(testFirestore, 1000);
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'monospace', 
      maxWidth: '800px', 
      margin: '0 auto' 
    }}>
      <h2 style={{ color: '#e53935', textAlign: 'center' }}>
        🔍 Firestore Connection Debugger
      </h2>

      {/* Status Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px', 
        marginBottom: '20px' 
      }}>
        <div style={{
          padding: '15px',
          border: `2px solid ${status.connected ? '#4caf50' : status.connecting ? '#ff9800' : '#f44336'}`,
          borderRadius: '8px',
          backgroundColor: status.connected ? '#e8f5e8' : status.connecting ? '#fff3e0' : '#ffebee'
        }}>
          <h4 style={{ margin: '0 0 5px 0' }}>Connection Status</h4>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {status.connecting ? '⏳ Testing...' : status.connected ? '✅ Connected' : '❌ Failed'}
          </p>
        </div>

        <div style={{
          padding: '15px',
          border: `2px solid ${status.canWrite ? '#4caf50' : '#ccc'}`,
          borderRadius: '8px',
          backgroundColor: status.canWrite ? '#e8f5e8' : '#f5f5f5'
        }}>
          <h4 style={{ margin: '0 0 5px 0' }}>Write Access</h4>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {status.canWrite ? '✅ Working' : '❌ Not tested'}
          </p>
        </div>

        <div style={{
          padding: '15px',
          border: `2px solid ${status.canRead ? '#4caf50' : '#ccc'}`,
          borderRadius: '8px',
          backgroundColor: status.canRead ? '#e8f5e8' : '#f5f5f5'
        }}>
          <h4 style={{ margin: '0 0 5px 0' }}>Read Access</h4>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {status.canRead ? '✅ Working' : '❌ Not tested'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button
          onClick={testFirestore}
          disabled={status.connecting}
          style={{
            padding: '12px 24px',
            backgroundColor: status.connecting ? '#ccc' : '#e53935',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: status.connecting ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {status.connecting ? '🔄 Testing...' : '🔄 Run Test Again'}
        </button>

        <button
          onClick={() => setStatus(prev => ({ ...prev, logs: [] }))}
          style={{
            padding: '12px 24px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🗑️ Clear Logs
        </button>
      </div>

      {/* Logs Display */}
      <div style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
        maxHeight: '400px',
        overflowY: 'auto',
        padding: '15px'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Connection Logs:</h4>
        {status.logs.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No logs yet...</p>
        ) : (
          status.logs.map((log, index) => (
            <div 
              key={index} 
              style={{ 
                padding: '5px 0', 
                borderBottom: '1px solid #eee',
                color: log.type === 'error' ? '#f44336' : log.type === 'success' ? '#4caf50' : log.type === 'warning' ? '#ff9800' : '#333'
              }}
            >
              <span style={{ color: '#666', fontSize: '12px' }}>[{log.timestamp}]</span> {log.message}
            </div>
          ))
        )}
      </div>

      {/* Error Details */}
      {status.error && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#ffebee',
          border: '2px solid #f44336',
          borderRadius: '8px'
        }}>
          <h4 style={{ color: '#c62828', margin: '0 0 10px 0' }}>Error Details:</h4>
          <p style={{ margin: 0, color: '#333', fontSize: '14px' }}>
            {status.error}
          </p>
        </div>
      )}

      {/* Quick Fixes */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>🛠️ Quick Fixes for 400 Errors:</h4>
        <ol style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <li><strong>Check Firebase Project:</strong> Ensure project exists and is active</li>
          <li><strong>Verify Configuration:</strong> Check project ID and credentials</li>
          <li><strong>Update Firestore Rules:</strong> Ensure rules allow your operations</li>
          <li><strong>Clear Cache:</strong> Clear browser cache and restart dev server</li>
          <li><strong>Check Network:</strong> Ensure stable internet connection</li>
          <li><strong>Check Billing:</strong> Ensure Firebase project has active billing if required</li>
        </ol>
      </div>
    </div>
  );
}