import React, { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';

const FirebaseAuthTest = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Checking...');

  useEffect(() => {
    // Check Firebase initialization
    if (!auth) {
      setStatus('❌ Firebase Auth not initialized');
      return;
    }
    
    setStatus('✅ Firebase Auth initialized');
    
    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setStatus(`✅ Logged in as: ${currentUser.email}`);
      } else {
        setStatus('⚪ Not logged in');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus('Logging in...');
    
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setStatus(`✅ Login successful: ${result.user.email}`);
    } catch (err) {
      setError(`❌ ${err.code}: ${err.message}`);
      setStatus('❌ Login failed');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus('Creating account...');
    
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      setStatus(`✅ Account created: ${result.user.email}`);
    } catch (err) {
      setError(`❌ ${err.code}: ${err.message}`);
      setStatus('❌ Signup failed');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setStatus('⚪ Logged out');
    } catch (err) {
      setError(`❌ ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ color: '#E30613' }}>🔥 Firebase Auth Test</h1>
      
      <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Status:</h3>
        <p style={{ fontSize: '16px', fontWeight: 'bold' }}>{status}</p>
        {error && (
          <p style={{ color: 'red', fontSize: '14px', marginTop: '10px' }}>{error}</p>
        )}
      </div>

      {user ? (
        <div>
          <p>✅ Logged in as: <strong>{user.email}</strong></p>
          <button 
            onClick={handleLogout}
            style={{ 
              padding: '10px 20px', 
              background: '#E30613', 
              color: 'white', 
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Logout
          </button>
        </div>
      ) : (
        <form>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              style={{ 
                width: '100%', 
                padding: '10px', 
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password123"
              style={{ 
                width: '100%', 
                padding: '10px', 
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleLogin}
              style={{ 
                flex: 1,
                padding: '12px', 
                background: '#E30613', 
                color: 'white', 
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Login
            </button>
            
            <button
              onClick={handleSignup}
              style={{ 
                flex: 1,
                padding: '12px', 
                background: '#333', 
                color: 'white', 
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Sign Up
            </button>
          </div>
        </form>
      )}

      <div style={{ marginTop: '30px', padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
        <h4>Firebase Config Check:</h4>
        <ul style={{ fontSize: '14px', lineHeight: '1.8' }}>
          <li>API Key: {import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing'}</li>
          <li>Project ID: {import.meta.env.VITE_FIREBASE_PROJECT_ID || '❌ Missing'}</li>
          <li>Auth Domain: {import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '❌ Missing'}</li>
          <li>Auth Instance: {auth ? '✅ Initialized' : '❌ Not initialized'}</li>
        </ul>
      </div>
    </div>
  );
};

export default FirebaseAuthTest;
