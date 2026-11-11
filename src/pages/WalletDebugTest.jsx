import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PaystackPopup from '../components/PaystackPopup.jsx';

const WalletDebugTest = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Comprehensive debug check
    const runDiagnostics = () => {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        userLoggedIn: !!user,
        userEmail: user?.email || 'Not logged in',
        paystackSDK: !!window.PaystackPop,
        paystackType: typeof window.PaystackPop,
        envVar: !!import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY,
        envVarValue: import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY ? 'Present' : 'Missing',
        paystackPopupComponent: typeof PaystackPopup,
        loadingState: loading,
        browserSupport: {
          localStorage: !!window.localStorage,
          sessionStorage: !!window.sessionStorage,
          fetch: !!window.fetch,
          Promise: !!window.Promise
        }
      };
      
      console.log('🔍 Wallet Debug Diagnostics:', diagnostics);
      setTestResults(diagnostics);
    };

    runDiagnostics();
    
    // Re-run diagnostics every 2 seconds to catch async loading
    const interval = setInterval(runDiagnostics, 2000);
    
    // Cleanup
    return () => clearInterval(interval);
  }, [user, loading]);

  const handlePaymentStart = () => {
    setLoading(true);
    console.log('🔄 Test Payment Starting...');
  };

  const handlePaymentSuccess = (response) => {
    setLoading(false);
    console.log('✅ Test Payment Success:', response);
    alert(`✅ Test Payment Successful!\n\nAmount: ₦${response.amount / 100}\nReference: ${response.reference}`);
  };

  const handlePaymentClose = () => {
    setLoading(false);
    console.log('💭 Test Payment Cancelled');
    alert('💭 Test Payment was cancelled');
  };

  const testDirectPaystack = () => {
    console.log('🧪 Testing Paystack directly...');
    
    if (!window.PaystackPop) {
      alert('❌ Paystack SDK not loaded');
      return;
    }

    try {
      const handler = window.PaystackPop.setup({
        key: import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_c04fd74b02d6034f4f1cf946887b8e3fc1a06831',
        email: user?.email || 'test@go7.ng',
        amount: 100000, // ₦1000 in kobo
        currency: 'NGN',
        ref: `DIRECT-TEST-${Date.now()}`,
        metadata: {
          userId: user?.uid || 'test-user',
          testType: 'wallet-debug-test'
        },
        callback: (response) => {
          console.log('✅ Direct Paystack Success:', response);
          alert(`✅ Direct Paystack Success!\nReference: ${response.reference}`);
        },
        onClose: () => {
          console.log('💭 Direct Paystack Closed');
          alert('💭 Direct Paystack was closed');
        }
      });

      handler.openIframe();
      console.log('🚀 Direct Paystack popup opened');
      
    } catch (error) {
      console.error('❌ Direct Paystack failed:', error);
      alert(`❌ Direct Paystack failed: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🔧 Wallet Payment Debug Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>System Status</h3>
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
        <h3>PaystackPopup Component Test</h3>
        <div style={{ 
          border: '2px solid #ddd', 
          padding: '15px', 
          borderRadius: '8px',
          backgroundColor: 'white'
        }}>
          <p><strong>Amount:</strong> ₦500</p>
          <p><strong>Email:</strong> {user?.email || 'test@go7.ng'}</p>
          <PaystackPopup
            amount={500}
            email={user?.email || "test@go7.ng"}
            buttonText="TEST: Pay ₦500"
            onStart={handlePaymentStart}
            onSuccess={handlePaymentSuccess}
            onClose={handlePaymentClose}
            disabled={loading}
            metadata={{
              "Test Type": "Wallet Debug Test",
              "Component": "PaystackPopup"
            }}
            className="w-full"
          />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Direct Paystack SDK Test</h3>
        <button 
          onClick={testDirectPaystack}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Test Direct Paystack (₦1000)
        </button>
      </div>

      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p>🔄 Processing payment...</p>
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', fontSize: '14px' }}>
        <h4>Debug Instructions:</h4>
        <ol>
          <li>Check "System Status" - all should be true/present</li>
          <li>Try "PaystackPopup Component Test" - should open popup</li>
          <li>Try "Direct Paystack SDK Test" - should also work</li>
          <li>Check browser console for detailed logs</li>
          <li>If popup doesn't open, check for JavaScript errors</li>
        </ol>
      </div>
    </div>
  );
};

export default WalletDebugTest;