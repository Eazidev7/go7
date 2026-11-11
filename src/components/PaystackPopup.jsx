import React, { useState, useEffect } from "react";

/**
 * 🚀 Go7 Paystack Payment Popup Component
 * 
 * ✅ Features:
 * - Immediate popup on button click
 * - Proper Naira → Kobo conversion
 * - Success/close callbacks with alerts
 * - Debug logging for troubleshooting
 * - Works with live Paystack keys
 * 
 * Usage:
 * <PaystackPopup 
 *   amount={1500} 
 *   email="user@go7.ng" 
 *   onSuccess={(response) => console.log('Payment success:', response)}
 *   onClose={() => console.log('Payment cancelled')}
 * />
 */
export default function PaystackPopup({ 
  amount = 1000, 
  email = "test@go7.ng", 
  onSuccess,
  onClose,
  onStart,
  buttonText,
  disabled = false,
  className = "",
  metadata = {}
}) {
  const [loading, setLoading] = useState(false);
  const [paystackReady, setPaystackReady] = useState(false);

  // Check if Paystack SDK is loaded
  useEffect(() => {
    const checkPaystack = () => {
      if (window.PaystackPop) {
        console.log('✅ Paystack SDK is ready');
        setPaystackReady(true);
      } else {
        console.warn('⚠️ Paystack SDK not loaded, retrying...');
        setTimeout(checkPaystack, 100);
      }
    };
    checkPaystack();
  }, []);

  const handlePayment = () => {
    if (!window.PaystackPop) {
      alert("⚠️ Payment system not loaded. Please refresh the page and try again.");
      console.error('❌ PaystackPop not available');
      return;
    }

    if (!amount || amount <= 0) {
      alert("⚠️ Invalid amount. Please check the payment amount.");
      console.error('❌ Invalid amount:', amount);
      return;
    }

    if (!email || !email.includes('@')) {
      alert("⚠️ Invalid email address. Please check your email.");
      console.error('❌ Invalid email:', email);
      return;
    }

    setLoading(true);
    
    // Notify parent component that payment is starting
    if (onStart) {
      onStart();
    }
    
    // Get Paystack public key from environment (Vite)
    const publicKey = import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY || 
                     "pk_live_c04fd74b02d6034f4f1cf946887b8e3fc1a06831"; // Your live key fallback

    console.log('🔍 Environment Check:', {
      viteKey: import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY ? 'Found' : 'Not found',
      buildSystem: 'Vite',
      mode: import.meta.env?.MODE || 'Unknown'
    });
    
    console.log('🔑 Using Paystack Key:', publicKey ? `${publicKey.substring(0, 20)}...${publicKey.substring(publicKey.length - 10)}` : '❌ No key found');
    
    // Validate key before proceeding
    if (!publicKey || !publicKey.startsWith('pk_')) {
      alert(`⚠️ Invalid Paystack key configuration!

Key: ${publicKey || 'None found'}
Length: ${publicKey?.length || 0}

Please check your .env file and restart the dev server.`);
      setLoading(false);
      return;
    }
    console.log('💰 Payment Details:', {
      amount: amount,
      amountInKobo: Math.round(amount * 100),
      email: email,
      currency: 'NGN'
    });

    try {
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: email,
        amount: Math.round(amount * 100), // Convert Naira to Kobo
        currency: "NGN",
        ref: `GO7-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        metadata: {
          paymentType: 'wallet_topup',  // This SHOULD credit wallet
          customerId: metadata["User ID"] || metadata.userId || metadata.customerId || "unknown",
          // Add userId directly for webhook compatibility
          userId: metadata["User ID"] || metadata.userId || "unknown",
          "User ID": metadata["User ID"] || metadata.userId || "unknown",
          custom_fields: [
            {
              display_name: "Platform",
              variable_name: "platform",
              value: "Go7.ng"
            },
            {
              display_name: "Payment Type", 
              variable_name: "payment_type",
              value: "Wallet Top-Up"
            },
            {
              display_name: "User ID",
              variable_name: "user_id", 
              value: metadata["User ID"] || metadata.userId || "unknown"
            },
            ...Object.entries(metadata).map(([key, value]) => ({
              display_name: key,
              variable_name: key.toLowerCase().replace(/\s+/g, '_'),
              value: value.toString()
            }))
          ]
        },
        callback: function (response) {
          console.log('✅ Payment Successful!', response);
          alert(`✅ Payment Successful!\\n\\nReference: ${response.reference}\\nAmount: ₦${amount}\\n\\nYour wallet will be updated shortly.`);
          
          setLoading(false);
          
          // Call success callback if provided
          if (onSuccess && typeof onSuccess === 'function') {
            onSuccess(response);
          }
          
          // Optional: Call verification endpoint
          // verifyPayment(response.reference);
        },
        onClose: function () {
          console.log('❌ Payment popup closed by user');
          alert('Payment was cancelled. You can try again anytime.');
          
          setLoading(false);
          
          // Call close callback if provided
          if (onClose && typeof onClose === 'function') {
            onClose();
          }
        }
      });

      console.log('🚀 Opening Paystack popup...');
      handler.openIframe();
      
    } catch (error) {
      console.error('❌ Paystack setup error:', error);
      alert('⚠️ Payment system error. Please try again or contact support.');
      setLoading(false);
    }
  };

  return (
    <div className={`paystack-popup-container ${className}`}>
      <button
        onClick={handlePayment}
        disabled={loading || disabled || !paystackReady}
        className={`paystack-pay-button ${loading ? 'loading' : ''}`}
        style={{
          backgroundColor: loading ? '#ccc' : '#e53935',
          color: '#fff',
          padding: '12px 28px',
          fontSize: '16px',
          border: 'none',
          borderRadius: '8px',
          cursor: loading || disabled || !paystackReady ? 'not-allowed' : 'pointer',
          fontWeight: '600',
          minWidth: '140px',
          transition: 'background-color 0.3s ease',
          opacity: !paystackReady ? 0.5 : 1
        }}
      >
        {loading ? (
          <>
            <span>Processing...</span>
            <div 
              style={{
                display: 'inline-block',
                marginLeft: '8px',
                width: '12px',
                height: '12px',
                border: '2px solid #fff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
          </>
        ) : (
          buttonText || `Pay ₦${amount?.toLocaleString()}`
        )}
      </button>
      
      {!paystackReady && (
        <div style={{ 
          fontSize: '12px', 
          color: '#666', 
          marginTop: '4px',
          textAlign: 'center'
        }}>
          Loading payment system...
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .paystack-pay-button:hover:not(:disabled) {
          background-color: #d32f2f !important;
        }
      `}</style>
    </div>
  );
}

/**
 * 🧪 Test Component - Use this for quick testing
 */
export function PaystackTest() {
  return (
    <div style={{ 
      textAlign: 'center', 
      marginTop: '50px',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2 style={{ color: '#333', marginBottom: '30px' }}>
        🚀 Go7 Paystack Payment Test
      </h2>
      
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <PaystackPopup 
          amount={500} 
          email="test@go7.ng"
          buttonText="Test ₦500"
          onSuccess={(response) => {
            console.log('Test payment success:', response);
          }}
          onClose={() => {
            console.log('Test payment cancelled');
          }}
        />
        
        <PaystackPopup 
          amount={1000} 
          email="user@go7.ng"
          buttonText="Test ₦1,000"
          metadata={{
            "User Type": "Premium",
            "Test Mode": "Yes"
          }}
        />
        
        <PaystackPopup 
          amount={2500} 
          email="customer@go7.ng"
          buttonText="Test ₦2,500"
        />
      </div>
      
      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px',
        fontSize: '14px',
        color: '#666'
      }}>
        <strong>✅ Test Instructions:</strong>
        <br />
        1. Click any button to open Paystack popup
        <br />
        2. Use test card: 4084084084084081
        <br />
        3. CVV: 408, Expiry: any future date
        <br />
        4. Check console for payment logs
      </div>
    </div>
  );
}