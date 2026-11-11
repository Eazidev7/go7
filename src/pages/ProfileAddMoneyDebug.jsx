import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfileAddMoneyDebug = () => {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    const checkAuthStatus = () => {
      const results = {
        timestamp: new Date().toISOString(),
        userExists: !!user,
        isLoggedIn: isLoggedIn,
        userEmail: user?.email || 'Not logged in',
        userUID: user?.uid || 'No UID',
        navigateFunction: typeof navigate,
        currentPath: window.location.pathname
      };
      
      console.log('🔍 Profile Add Money Debug:', results);
      setTestResults(results);
    };
    
    checkAuthStatus();
  }, [user, isLoggedIn, navigate]);

  const testDirectNavigation = () => {
    console.log('🧪 Testing direct navigation to /wallet/topup...');
    try {
      navigate('/wallet/topup');
      console.log('✅ Navigation successful');
    } catch (error) {
      console.error('❌ Navigation failed:', error);
    }
  };

  const testProfileScreenAddMoney = () => {
    console.log('🔄 Simulating ProfileScreen Add Money click...');
    console.log('📱 Current user:', user);
    console.log('🧭 Navigating to wallet top-up page...');
    
    try {
      navigate('/wallet/topup');
      console.log('✅ Navigation to wallet topup successful');
    } catch (error) {
      console.error('❌ Navigation to wallet topup failed:', error);
      alert(`Navigation failed: ${error.message}`);
    }
  };

  const checkWalletTopUpPage = () => {
    console.log('🔍 Testing wallet topup page directly...');
    window.open('/wallet/topup', '_blank');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🔧 Profile "Add Money" Button Debug</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Authentication Status</h3>
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '8px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <pre>{JSON.stringify(testResults, null, 2)}</pre>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Navigation Tests</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={testDirectNavigation}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Test Direct Navigation
          </button>
          
          <button 
            onClick={testProfileScreenAddMoney}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Simulate ProfileScreen Add Money
          </button>
          
          <button 
            onClick={checkWalletTopUpPage}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Open Wallet TopUp (New Tab)
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Direct Links</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a href="/profile" style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>
            Go to Profile Page
          </a>
          <a href="/wallet/topup" style={{ padding: '10px 20px', backgroundColor: '#e91e63', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>
            Go to Wallet TopUp
          </a>
        </div>
      </div>

      {!isLoggedIn && (
        <div style={{
          padding: '15px',
          backgroundColor: '#fff3cd',
          color: '#856404',
          border: '1px solid #ffeaa7',
          borderRadius: '6px',
          marginTop: '20px'
        }}>
          <h4>⚠️ Authentication Required</h4>
          <p>You need to be logged in to access the profile and add money functionality.</p>
          <p>Please sign up or log in first.</p>
        </div>
      )}

      <div style={{ marginTop: '30px', fontSize: '14px' }}>
        <h4>Debug Steps:</h4>
        <ol>
          <li>Check if you're logged in (Authentication Status above)</li>
          <li>If not logged in, go to the homepage and sign up/log in</li>
          <li>Try "Test Direct Navigation" - should go to wallet topup</li>
          <li>Try "Simulate ProfileScreen Add Money" - should do same thing</li>
          <li>Check browser console for error messages</li>
          <li>If navigation works but profile button doesn't, there's a ProfileScreen issue</li>
        </ol>
      </div>
    </div>
  );
};

export default ProfileAddMoneyDebug;