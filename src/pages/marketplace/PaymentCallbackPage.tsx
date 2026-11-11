import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyPayment, updateOrderPaymentStatus } from '../../services/orderService';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const PaymentCallbackPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPaymentStatus = async () => {
      try {
        // Get payment reference from URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const reference = urlParams.get('reference') || urlParams.get('tx_ref');

        if (!reference) {
          setError('Payment reference not found');
          setStatus('failed');
          return;
        }

        // Determine payment provider (could be passed as a URL parameter)
        const provider = urlParams.get('provider') || 'paystack';

        // Verify payment
        const result = await verifyPayment(reference, provider);

        if (result && 'success' in result && result.success) {
          // Update order payment status
          await updateOrderPaymentStatus(orderId!, 'paid');
          setStatus('success');
        } else {
          // Update order payment status to failed
          await updateOrderPaymentStatus(orderId!, 'failed');
          setError('Payment verification failed');
          setStatus('failed');
        }
      } catch (err) {
        console.error('Error verifying payment:', err);
        setError('An error occurred while verifying your payment');
        setStatus('failed');
      }
    };

    if (orderId) {
      verifyPaymentStatus();
    } else {
      setError('Order ID not found');
      setStatus('failed');
    }
  }, [orderId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
                Verifying Payment
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Please wait while we verify your payment...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center">
              <CheckCircleIcon className="h-16 w-16 text-green-500" />
              <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
                Payment Successful
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Thank you for your order. Your payment has been confirmed.
              </p>
              <div className="mt-6">
                <Link
                  to={`/order-confirmation/${orderId}`}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  View Order Details
                </Link>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="flex flex-col items-center">
              <XCircleIcon className="h-16 w-16 text-red-500" />
              <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
                Payment Failed
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {error || 'Something went wrong with your payment. Please try again.'}
              </p>
              <div className="mt-6 space-y-3">
                <Link
                  to="/checkout"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Try Again
                </Link>
                <Link
                  to="/"
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentCallbackPage;
