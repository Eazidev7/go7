import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import checkoutService from '../services/checkoutService';
import './PaymentCallback.css';

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, failed
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);

  const reference = searchParams.get('reference');
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    verifyPayment();
  }, [reference]);

  const verifyPayment = async () => {
    if (!reference) {
      setStatus('failed');
      setError('No payment reference provided');
      return;
    }

    try {
      // Verify payment with Paystack
      const paymentData = await checkoutService.verifyPayment(reference);

      if (paymentData.status === 'success') {
        // Get order details
        if (orderId) {
          const orderRef = doc(db, 'orders', orderId);
          const orderDoc = await getDoc(orderRef);
          
          if (orderDoc.exists()) {
            setOrderData({
              orderId: orderId,
              ...orderDoc.data(),
            });
          }
        }

        setStatus('success');
      } else {
        setStatus('failed');
        setError('Payment was not successful');
      }
    } catch (error) {
      console.error('❌ Payment verification error:', error);
      setStatus('failed');
      setError(error.message || 'Failed to verify payment');
    }
  };

  if (status === 'verifying') {
    return (
      <div className="payment-callback">
        <div className="callback-card">
          <Loader className="spinner" size={64} />
          <h1>Verifying Payment...</h1>
          <p>Please wait while we confirm your payment</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="payment-callback">
        <div className="callback-card success">
          <CheckCircle size={64} color="#10b981" />
          <h1>Payment Successful!</h1>
          <p>Your order has been placed successfully</p>
          
          {orderData && (
            <div className="order-details">
              <div className="detail-row">
                <span>Order ID:</span>
                <strong>{orderData.orderId}</strong>
              </div>
              <div className="detail-row">
                <span>Total Amount:</span>
                <strong>₦{orderData.totalAmount?.toLocaleString()}</strong>
              </div>
              <div className="detail-row">
                <span>Status:</span>
                <strong className="status-badge">{orderData.orderStatus}</strong>
              </div>
            </div>
          )}

          <div className="callback-actions">
            <button 
              onClick={() => navigate(`/orders/${orderId}`)} 
              className="btn-primary"
            >
              View Order
            </button>
            <button 
              onClick={() => navigate('/orders')} 
              className="btn-secondary"
            >
              All Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="payment-callback">
        <div className="callback-card failed">
          <XCircle size={64} color="#ef4444" />
          <h1>Payment Failed</h1>
          <p>{error || 'We could not verify your payment'}</p>
          
          <div className="callback-actions">
            <button 
              onClick={() => navigate('/checkout')} 
              className="btn-primary"
            >
              Try Again
            </button>
            <button 
              onClick={() => navigate('/cart')} 
              className="btn-secondary"
            >
              Back to Cart
            </button>
          </div>
        </div>
      </div>
    );
  }
}
