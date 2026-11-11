import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { updatePaymentStatus } from '../../services/paymentService';

/**
 * Payment callback page to handle redirects from payment gateways
 */
const PaymentCallbackPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing your payment...');

  useEffect(() => {
    const processPaymentCallback = async () => {
      try {
        // Parse query parameters from URL
        const params = new URLSearchParams(location.search);
        const reference = params.get('reference') || params.get('tx_ref');
        const status = params.get('status');
        const orderId = params.get('orderId');
        
        if (!reference) {
          setStatus('error');
          setMessage('Invalid payment reference');
          return;
        }
        
        // Update payment status in database
        const result = await updatePaymentStatus({
          reference,
          status,
          orderId
        });
        
        if (result.success) {
          setStatus('success');
          setMessage('Payment processed successfully!');
          
          // Redirect to order confirmation page after short delay
          setTimeout(() => {
            navigate(`/orders/${orderId}?status=${status}`);
          }, 2000);
        } else {
          setStatus('error');
          setMessage(result.message || 'Failed to process payment');
        }
      } catch (error) {
        console.error('Payment callback error:', error);
        setStatus('error');
        setMessage('An error occurred while processing your payment');
      }
    };
    
    processPaymentCallback();
  }, [location, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-700 mx-auto"></div>
            <h2 className="mt-6 text-2xl font-bold text-gray-800">Processing Payment</h2>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="mt-6 text-2xl font-bold text-gray-800">Payment Successful</h2>
          </>
        )}
        
        {status === 'error' && (
          <>
            <ExclamationCircleIcon className="h-16 w-16 text-red-500 mx-auto" />
            <h2 className="mt-6 text-2xl font-bold text-gray-800">Payment Failed</h2>
          </>
        )}
        
        <p className="mt-2 text-gray-600">{message}</p>
        
        {status === 'error' && (
          <div className="mt-6">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentCallbackPage;
