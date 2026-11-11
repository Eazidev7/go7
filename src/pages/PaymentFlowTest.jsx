import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';

/**
 * 🧪 Payment Flow Test Page
 * Test Paystack integration with proper userId metadata
 */
export default function PaymentFlowTest() {
  const { user } = useAuth();

  const testPayment = (amount, description) => {
    if (!user) {
      Swal.fire({
        icon: 'warning',
        title: 'Login Required',
        text: 'Please login to test payments'
      });
      return;
    }

    if (!window.PaystackPop) {
      Swal.fire({
        icon: 'error',
        title: 'Paystack Not Loaded',
        text: 'Paystack SDK is not available'
      });
      return;
    }

    const amountKobo = amount * 100; // Convert to kobo

    console.log('🧪 Testing payment with:', {
      amount: `₦${amount}`,
      amountKobo,
      userId: user.uid,
      email: user.email
    });

    try {
      const handler = window.PaystackPop.setup({
        key: 'pk_live_c04fd74b02d6034f4f1cf946887b8e3fc1a06831',
        email: user.email,
        amount: amountKobo,
        currency: 'NGN',
        ref: `TEST-${Date.now()}-${user.uid.slice(0, 6)}`,
        metadata: {
          userId: user.uid, // ✅ This is crucial for webhook processing
          testType: 'payment-flow-test',
          description,
          userEmail: user.email
        },
        callback: function(response) {
          console.log('✅ Payment successful:', response);
          Swal.fire({
            icon: 'success',
            title: 'Payment Successful!',
            html: `
              <p><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
              <p><strong>Reference:</strong> ${response.reference}</p>
              <p><strong>Status:</strong> ${response.status}</p>
              <p style="margin-top: 15px; color: #666;">
                Check your wallet balance and notifications!
              </p>
            `,
            confirmButtonColor: '#e53935'
          });
        },
        onClose: function() {
          console.log('💭 Payment window closed');
          Swal.fire({
            icon: 'info',
            title: 'Payment Cancelled',
            text: 'You closed the payment window',
            confirmButtonColor: '#e53935'
          });
        }
      });

      handler.openIframe();
    } catch (error) {
      console.error('❌ Payment setup failed:', error);
      Swal.fire({
        icon: 'error',
        title: 'Payment Setup Failed',
        text: error.message || 'Failed to initialize payment'
      });
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '500px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#e53935',
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '10px'
        }}>
          🧪 Payment Flow Test
        </h1>
        
        <p style={{
          textAlign: 'center',
          color: '#666',
          marginBottom: '30px',
          fontSize: '14px'
        }}>
          Test automatic payment processing with notifications
        </p>

        {user ? (
          <div>
            <div style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <p><strong>User:</strong> {user.email}</p>
              <p><strong>UID:</strong> {user.uid}</p>
            </div>

            <div style={{
              display: 'grid',
              gap: '15px',
              gridTemplateColumns: '1fr 1fr'
            }}>
              <button
                onClick={() => testPayment(50, 'Test Payment ₦50')}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '15px 20px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.background = '#218838'}
                onMouseOut={(e) => e.target.style.background = '#28a745'}
              >
                💳 Pay ₦50
              </button>

              <button
                onClick={() => testPayment(100, 'Test Payment ₦100')}
                style={{
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  padding: '15px 20px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.background = '#138496'}
                onMouseOut={(e) => e.target.style.background = '#17a2b8'}
              >
                💰 Pay ₦100
              </button>

              <button
                onClick={() => testPayment(200, 'Test Payment ₦200')}
                style={{
                  background: '#ffc107',
                  color: '#212529',
                  border: 'none',
                  padding: '15px 20px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.background = '#e0a800'}
                onMouseOut={(e) => e.target.style.background = '#ffc107'}
              >
                🎯 Pay ₦200
              </button>

              <button
                onClick={() => testPayment(500, 'Test Payment ₦500')}
                style={{
                  background: '#e53935',
                  color: 'white',
                  border: 'none',
                  padding: '15px 20px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.background = '#c62828'}
                onMouseOut={(e) => e.target.style.background = '#e53935'}
              >
                🚀 Pay ₦500
              </button>
            </div>

            <div style={{
              background: '#e8f5e8',
              padding: '15px',
              borderRadius: '10px',
              marginTop: '20px',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#28a745' }}>✅ What to expect:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Payment popup opens with Paystack</li>
                <li>Webhook processes payment instantly</li>
                <li>Push notification sent to your device</li>
                <li>Wallet balance updates in real-time</li>
                <li>Transaction logged in history</li>
              </ul>
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <h3>Please Login</h3>
            <p>You need to be logged in to test payments</p>
          </div>
        )}
      </div>
      
      {/* Load Paystack SDK */}
      <script async src="https://js.paystack.co/v1/inline.js"></script>
    </div>
  );
}