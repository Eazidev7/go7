import React, { useState, useEffect } from 'react';

const PaystackDebugPage = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    // Debug Paystack loading
    const checkPaystack = () => {
      console.log('🔍 Checking Paystack SDK...');
      
      const info = {
        paystackAvailable: !!window.PaystackPop,
        paystackType: typeof window.PaystackPop,
        windowKeys: Object.keys(window).filter(key => key.toLowerCase().includes('paystack')),
        envVar: import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY,
        timestamp: new Date().toISOString()
      };
      
      console.log('📊 Paystack Debug Info:', info);
      setDebugInfo(info);
      
      if (window.PaystackPop) {
        console.log('✅ PaystackPop available');
        console.log('📦 PaystackPop object:', window.PaystackPop);
      } else {
        console.error('❌ PaystackPop not available');
      }
    };

    // Check immediately
    checkPaystack();
    
    // Check again after a delay in case SDK is still loading
    const timer = setTimeout(checkPaystack, 2000);
    return () => clearTimeout(timer);
  }, []);

  const testPaystackPopup = () => {
    console.log('🧪 Testing Paystack popup...');
    
    if (!window.PaystackPop) {
      setTestResult({
        success: false,
        message: 'PaystackPop not available'
      });
      return;
    }

    try {
      const handler = window.PaystackPop.setup({
        key: import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_c04fd74b02d6034f4f1cf946887b8e3fc1a06831',
        email: 'test@go7.ng',
        amount: 100000, // ₦1000 in kobo
        currency: 'NGN',
        ref: `TEST-${Date.now()}`,
        callback: (response) => {
          console.log('✅ Payment successful:', response);
          setTestResult({
            success: true,
            message: `Payment successful! Reference: ${response.reference}`
          });
        },
        onClose: () => {
          console.log('💭 Payment popup closed');
          setTestResult({
            success: false,
            message: 'Payment popup was closed'
          });
        }
      });

      handler.openIframe();
      
      setTestResult({
        success: true,
        message: 'Paystack popup opened successfully!'
      });
      
    } catch (error) {
      console.error('❌ Paystack test failed:', error);
      setTestResult({
        success: false,
        message: `Paystack test failed: ${error.message}`
      });
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🔍 Paystack SDK Debug Page</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Debug Information</h3>
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '8px',
          fontSize: '12px'
        }}>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Paystack Test</h3>
        <button 
          onClick={testPaystackPopup}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: '#00C851', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Test Paystack Popup (₦1000)
        </button>
      </div>

      {testResult && (
        <div style={{
          padding: '15px',
          backgroundColor: testResult.success ? '#d4edda' : '#f8d7da',
          color: testResult.success ? '#155724' : '#721c24',
          border: `1px solid ${testResult.success ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '6px',
          marginTop: '10px'
        }}>
          <h4>{testResult.success ? '✅ Success' : '❌ Error'}</h4>
          <p>{testResult.message}</p>
        </div>
      )}

      <div style={{ marginTop: '30px', fontSize: '14px' }}>
        <h4>Troubleshooting Tips:</h4>
        <ul>
          <li>Check if Paystack script loaded in network tab</li>
          <li>Verify VITE_PAYSTACK_PUBLIC_KEY in .env file</li>
          <li>Look for any JavaScript errors in console</li>
          <li>Try refreshing the page if SDK didn't load</li>
          <li>Check if ad blocker is interfering</li>
        </ul>
      </div>
    </div>
  );
};

export default PaystackDebugPage;