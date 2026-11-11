import React, { useState } from 'react';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { hardResetFirebase, detectFirebaseConflicts } from '../utils/firebaseReset';

const FirebaseAuthDebug = () => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authResult, setAuthResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Test Firebase configuration loading
  const testConfig = () => {
    console.log('🔥 Firebase Auth Debug - Configuration Test:');
    console.log('Auth instance:', auth);
    console.log('Auth app:', auth.app);
    console.log('Auth app options:', auth.app.options);
    console.log('Project ID:', auth.app.options.projectId);
    console.log('API Key (first 10 chars):', auth.app.options.apiKey?.substring(0, 10));
    
    // Check environment variables
    console.log('🌍 Environment Variables:');
    console.log('VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10));
    console.log('VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
    console.log('Full env object:', import.meta.env);
  };

  const testSignIn = async () => {
    setLoading(true);
    try {
      console.log('🔐 Testing Firebase Authentication...');
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Sign in successful:', result);
      setAuthResult({
        success: true,
        user: result.user,
        message: 'Authentication successful!'
      });
    } catch (error) {
      console.error('❌ Sign in failed:', error);
      setAuthResult({
        success: false,
        error: error.code,
        message: error.message,
        fullError: error
      });
    } finally {
      setLoading(false);
    }
  };

  const testExistingUserLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setAuthResult({
        success: false,
        message: 'Please enter email and password for existing user test'
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Testing login with existing user credentials...');
      console.log('Email:', loginEmail);
      
      const result = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      console.log('✅ Existing user login successful:', result);
      setAuthResult({
        success: true,
        user: result.user,
        message: `Existing user login successful! Welcome back ${result.user.email}`
      });
    } catch (error) {
      console.error('❌ Existing user login failed:', error);
      setAuthResult({
        success: false,
        error: error.code,
        message: error.message,
        fullError: error
      });
    } finally {
      setLoading(false);
    }
  };

  const testCreateUser = async () => {
    setLoading(true);
    try {
      console.log('👤 Testing Firebase User Creation...');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ User creation successful:', result);
      setAuthResult({
        success: true,
        user: result.user,
        message: 'User creation successful!'
      });
    } catch (error) {
      console.error('❌ User creation failed:', error);
      setAuthResult({
        success: false,
        error: error.code,
        message: error.message,
        fullError: error
      });
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    // Clear browser storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear service worker cache if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
    
    // Clear Firebase Auth persistence
    auth.signOut().catch(() => {});
    
    console.log('🧹 Browser cache and storage cleared');
    setAuthResult({ success: true, message: 'Cache cleared! Refresh the page.' });
  };

  const performHardReset = async () => {
    setLoading(true);
    try {
      const result = await hardResetFirebase();
      console.log('🔄 Hard reset result:', result);
      setAuthResult({
        success: result.success,
        message: result.success ? 
          `Hard reset complete! Cleared ${result.clearedApps} apps, ${result.clearedLocalStorage} localStorage keys. Refresh the page.` : 
          `Hard reset failed: ${result.error}`,
        fullError: result.error
      });
    } catch (error) {
      console.error('❌ Hard reset error:', error);
      setAuthResult({
        success: false,
        message: `Hard reset failed: ${error.message}`,
        fullError: error
      });
    } finally {
      setLoading(false);
    }
  };

  const scanConflicts = () => {
    const conflicts = detectFirebaseConflicts();
    console.log('🔍 Firebase conflicts:', conflicts);
    setAuthResult({
      success: conflicts.length === 0,
      message: conflicts.length === 0 ? 
        'No Firebase conflicts detected!' : 
        `Found ${conflicts.length} conflicts. Check console for details.`,
      conflicts: conflicts
    });
  };

  const getCurrentUser = () => {
    const currentUser = auth.currentUser;
    console.log('👤 Current Firebase user:', currentUser);
    
    if (currentUser) {
      setAuthResult({
        success: true,
        message: `Current user: ${currentUser.email}`,
        user: currentUser
      });
    } else {
      setAuthResult({
        success: false,
        message: 'No user is currently signed in'
      });
    }
  };

  const signOutUser = async () => {
    try {
      await auth.signOut();
      console.log('✅ User signed out successfully');
      setAuthResult({
        success: true,
        message: 'User signed out successfully'
      });
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      setAuthResult({
        success: false,
        message: `Sign out failed: ${error.message}`
      });
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🔥 Firebase Authentication Debugger</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Configuration Test</h3>
        <button onClick={testConfig} style={{ padding: '10px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px' }}>
          Test Firebase Config
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Authentication Test (New User)</h3>
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="email" 
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '8px', marginRight: '10px', width: '200px' }}
          />
          <input 
            type="password" 
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '8px', width: '150px' }}
          />
        </div>
        <button 
          onClick={testSignIn} 
          disabled={loading}
          style={{ padding: '10px', backgroundColor: '#34a853', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}
        >
          {loading ? 'Testing...' : 'Test Sign In'}
        </button>
        <button 
          onClick={testCreateUser} 
          disabled={loading}
          style={{ padding: '10px', backgroundColor: '#fbbc04', color: 'black', border: 'none', borderRadius: '4px' }}
        >
          {loading ? 'Creating...' : 'Test Create User'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Existing User Login Test</h3>
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="email" 
            placeholder="Existing user email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            style={{ padding: '8px', marginRight: '10px', width: '200px' }}
          />
          <input 
            type="password" 
            placeholder="Existing user password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            style={{ padding: '8px', width: '150px' }}
          />
        </div>
        <button 
          onClick={testExistingUserLogin} 
          disabled={loading}
          style={{ padding: '10px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {loading ? 'Testing...' : 'Test Existing User Login'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Cache Management</h3>
        <button 
          onClick={clearCache}
          style={{ padding: '10px', backgroundColor: '#ea4335', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}
        >
          Clear Browser Cache & Storage
        </button>
        <button 
          onClick={performHardReset}
          disabled={loading}
          style={{ padding: '10px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}
        >
          {loading ? 'Resetting...' : 'Firebase Hard Reset'}
        </button>
        <button 
          onClick={scanConflicts}
          style={{ padding: '10px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}
        >
          Scan for Conflicts
        </button>
        <button 
          onClick={getCurrentUser}
          style={{ padding: '10px', backgroundColor: '#9c27b0', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}
        >
          Get Current User
        </button>
        <button 
          onClick={signOutUser}
          style={{ padding: '10px', backgroundColor: '#607d8b', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Sign Out
        </button>
      </div>

      {authResult && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: authResult.success ? '#d4edda' : '#f8d7da', 
          color: authResult.success ? '#155724' : '#721c24',
          border: `1px solid ${authResult.success ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          marginTop: '20px'
        }}>
          <h4>{authResult.success ? '✅ Success' : '❌ Error'}</h4>
          <p><strong>Message:</strong> {authResult.message}</p>
          {authResult.error && <p><strong>Error Code:</strong> {authResult.error}</p>}
          {authResult.user && (
            <div>
              <p><strong>User ID:</strong> {authResult.user.uid}</p>
              <p><strong>Email:</strong> {authResult.user.email}</p>
            </div>
          )}
          {authResult.conflicts && (
            <div>
              <h5>Detected Conflicts:</h5>
              {authResult.conflicts.map((conflict, index) => (
                <div key={index} style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                  <strong>{conflict.type}:</strong> {JSON.stringify(conflict.details)}
                  <span style={{ color: conflict.severity === 'high' ? '#d32f2f' : '#ff9800' }}> ({conflict.severity} priority)</span>
                </div>
              ))}
            </div>
          )}
          {authResult.fullError && (
            <details style={{ marginTop: '10px' }}>
              <summary>Full Error Details</summary>
              <pre style={{ fontSize: '12px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                {JSON.stringify(authResult.fullError, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>Debugging Tips:</h4>
        <ul style={{ fontSize: '14px' }}>
          <li>Check the browser console for detailed Firebase config logs</li>
          <li>Verify that the Firebase project ID is 'go7-delivery', not 'fir-demo-project'</li>
          <li>Clear cache if you see old project references</li>
          <li>Check network tab for failed requests to wrong Firebase project</li>
          <li>Ensure .env file is being loaded correctly</li>
        </ul>
      </div>
    </div>
  );
};

export default FirebaseAuthDebug;