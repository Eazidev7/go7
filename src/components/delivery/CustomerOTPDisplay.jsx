// Customer OTP Display Component
// Shows the customer their delivery OTP code

import React, { useState, useEffect } from 'react';
import { getDeliveryOTP } from '../../services/deliveryService';

const CustomerOTPDisplay = ({ deliveryId, userId, delivery }) => {
  const [otp, setOtp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchOTP = async () => {
      try {
        setLoading(true);
        const otpCode = await getDeliveryOTP(deliveryId, userId);
        setOtp(otpCode);
      } catch (error) {
        console.error('❌ Error fetching OTP:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (deliveryId && userId) {
      fetchOTP();
    }
  }, [deliveryId, userId]);

  const copyToClipboard = async () => {
    if (otp) {
      try {
        await navigator.clipboard.writeText(otp);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy OTP:', error);
      }
    }
  };

  // Only show OTP when delivery is assigned or enroute
  const shouldShowOTP = delivery?.status === 'assigned' || delivery?.status === 'enroute';

  if (!shouldShowOTP) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-blue-700">Loading delivery code...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-700">Unable to load delivery code</span>
        </div>
      </div>
    );
  }

  if (!otp) {
    return null;
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            🔐 Your Delivery Code
          </h3>
          <p className="text-green-700 text-sm mb-3">
            Give this 6-digit code to your delivery rider when they arrive
          </p>
          
          {/* OTP Display */}
          <div className="bg-white border-2 border-green-300 rounded-lg p-4 mb-3">
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-gray-900 tracking-widest">
                {otp}
              </div>
            </div>
          </div>

          {/* Copy Button */}
          <button
            onClick={copyToClipboard}
            className="flex items-center justify-center w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {copied ? (
              <>
                <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy Code
              </>
            )}
          </button>

          {/* Instructions */}
          <div className="mt-3 text-xs text-green-600">
            <p>• Keep this code safe and only share it with your GO7 rider</p>
            <p>• The rider will need this code to complete your delivery</p>
            <p>• Do not share this code until the rider has your order</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerOTPDisplay;