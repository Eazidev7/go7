// OTP Verification Component
// Used by riders to verify delivery completion with customer's OTP code

import React, { useState } from 'react';
import { verifyDeliveryOTP, completeDelivery } from '../../services/deliveryService';

const OTPVerification = ({ 
  deliveryId, 
  riderId, 
  onSuccess, 
  onCancel, 
  deliveryData,
  amountEarned = 0 
}) => {
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleOTPChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setOtpCode(value);
      setError('');
    }
  };

  const handleVerifyAndComplete = async () => {
    if (otpCode.length !== 6) {
      setError('Please enter a 6-digit OTP code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // First verify the OTP
      const verificationResult = await verifyDeliveryOTP(deliveryId, riderId, otpCode);
      
      if (!verificationResult.success) {
        setError(verificationResult.message);
        setIsVerifying(false);
        return;
      }

      // If OTP is valid, complete the delivery
      await completeDelivery(deliveryId, riderId, amountEarned, otpCode);
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('❌ Error completing delivery with OTP:', error);
      setError(error.message || 'Failed to complete delivery');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Complete Delivery
          </h2>
          <p className="text-gray-600 text-sm">
            Ask the customer for their 6-digit OTP code to complete this delivery
          </p>
        </div>

        {/* Delivery Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-600 mb-1">Delivery to:</div>
          <div className="font-medium text-gray-900">
            {deliveryData?.dropoff?.address || 'Customer location'}
          </div>
          {amountEarned > 0 && (
            <div className="text-sm text-green-600 mt-2">
              Earnings: ${amountEarned.toFixed(2)}
            </div>
          )}
        </div>

        {/* OTP Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter OTP Code
          </label>
          <input
            type="text"
            value={otpCode}
            onChange={handleOTPChange}
            placeholder="123456"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={6}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1 text-center">
            6-digit code provided by the customer
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isVerifying}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleVerifyAndComplete}
            disabled={isVerifying || otpCode.length !== 6}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </span>
            ) : (
              'Complete Delivery'
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            The customer received this OTP code when they placed their order
          </p>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;