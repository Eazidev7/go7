import React from 'react';
import PaystackPopup, { PaystackTest } from '../components/PaystackPopup.jsx';

/**
 * 🧪 Paystack Payment Test Page
 * Route: /paystack-test
 * 
 * This page tests the Paystack payment popup component
 * with various scenarios and configurations.
 */
export default function PaystackTestPage() {
  const handleWalletTopUp = (response) => {
    console.log('💳 Wallet Top-up Success:', response);
    
    // Here you would normally call your backend to verify and credit wallet
    // fetch('/api/wallet/credit', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ reference: response.reference })
    // });
    
    alert(`🎉 Wallet Top-up Successful!\\n\\nReference: ${response.reference}\\n\\nYour wallet has been credited.`);
  };

  const handleOrderPayment = (response) => {
    console.log('📦 Order Payment Success:', response);
    alert(`✅ Order Payment Complete!\\n\\nReference: ${response.reference}\\n\\nYour order is being processed.`);
  };

  return (
    <div style={{ 
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#e53935', fontSize: '2.5rem', marginBottom: '10px' }}>
          🚀 Go7 Paystack Test
        </h1>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>
          Test live Paystack payments with your Go7 configuration
        </p>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '30px',
        marginBottom: '40px'
      }}>
        {/* Wallet Top-up Section */}
        <div style={{
          padding: '25px',
          border: '2px solid #e53935',
          borderRadius: '12px',
          backgroundColor: '#fafafa'
        }}>
          <h3 style={{ color: '#e53935', marginBottom: '15px' }}>
            💰 Wallet Top-up
          </h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Add money to your Go7 wallet for seamless payments
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PaystackPopup 
              amount={500} 
              email="user@go7.ng"
              buttonText="Add ₦500"
              onSuccess={handleWalletTopUp}
              metadata={{ "Payment Type": "Wallet Top-up", "Amount": "500" }}
            />
            <PaystackPopup 
              amount={1000} 
              email="user@go7.ng"
              buttonText="Add ₦1,000"
              onSuccess={handleWalletTopUp}
              metadata={{ "Payment Type": "Wallet Top-up", "Amount": "1000" }}
            />
            <PaystackPopup 
              amount={2500} 
              email="user@go7.ng"
              buttonText="Add ₦2,500"
              onSuccess={handleWalletTopUp}
              metadata={{ "Payment Type": "Wallet Top-up", "Amount": "2500" }}
            />
          </div>
        </div>

        {/* Order Payment Section */}
        <div style={{
          padding: '25px',
          border: '2px solid #4caf50',
          borderRadius: '12px',
          backgroundColor: '#fafafa'
        }}>
          <h3 style={{ color: '#4caf50', marginBottom: '15px' }}>
            📦 Order Payment
          </h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Pay for delivery orders and services
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PaystackPopup 
              amount={800} 
              email="customer@go7.ng"
              buttonText="Pay for Delivery - ₦800"
              onSuccess={handleOrderPayment}
              metadata={{ 
                "Payment Type": "Delivery Fee", 
                "Service": "Package Delivery",
                "Distance": "5km"
              }}
            />
            <PaystackPopup 
              amount={1200} 
              email="customer@go7.ng"
              buttonText="Express Delivery - ₦1,200"
              onSuccess={handleOrderPayment}
              metadata={{ 
                "Payment Type": "Express Delivery", 
                "Service": "Same Day Delivery",
                "Priority": "High"
              }}
            />
          </div>
        </div>
      </div>

      {/* General Test Section */}
      <div style={{
        padding: '25px',
        border: '2px solid #ff9800',
        borderRadius: '12px',
        backgroundColor: '#fafafa',
        marginBottom: '40px'
      }}>
        <h3 style={{ color: '#ff9800', marginBottom: '15px' }}>
          🧪 General Tests
        </h3>
        <PaystackTest />
      </div>

      {/* Debug Information */}
      <div style={{
        padding: '20px',
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#333'
      }}>
        <h4 style={{ color: '#333', marginBottom: '10px' }}>🔍 Debug Information</h4>
        <ul style={{ lineHeight: '1.6' }}>
          <li><strong>Paystack SDK:</strong> {typeof window.PaystackPop !== 'undefined' ? '✅ Loaded' : '❌ Not Loaded'}</li>
          <li><strong>Public Key:</strong> {import.meta.env.VITE_PAYSTACK_PUBLIC_KEY?.substring(0, 20)}...</li>
          <li><strong>Environment:</strong> {import.meta.env.MODE}</li>
          <li><strong>Test Cards:</strong> 4084084084084081 (Success), 4084084084084081 (CVV: 408)</li>
        </ul>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        border: '1px solid #2196f3'
      }}>
        <h4 style={{ color: '#1976d2', marginBottom: '10px' }}>📋 Testing Instructions</h4>
        <ol style={{ color: '#333', lineHeight: '1.6' }}>
          <li>Click any payment button to open Paystack popup</li>
          <li>Use test card number: <code>4084084084084081</code></li>
          <li>CVV: <code>408</code>, Expiry: any future date (e.g., 12/26)</li>
          <li>Check browser console for detailed payment logs</li>
          <li>Successful payments will show success alert</li>
          <li>Cancelled payments will show cancellation alert</li>
        </ol>
      </div>
    </div>
  );
}