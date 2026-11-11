import React, { useState, useEffect } from 'react';
import { verifyDeliveryOTP } from '../../services/deliveryService';

const OTPVerificationModal = ({ 
  isOpen, 
  onClose, 
  deliveryId, 
  riderId, 
  onVerificationSuccess, 
  onVerificationError 
}) => {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  
  // Clear the form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setOtp('');
      setError('');
    }
  }, [isOpen]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!otp) {
      setError('Please enter the OTP code');
      return;
    }
    
    setIsVerifying(true);
    setError('');
    
    try {
      const result = await verifyDeliveryOTP(deliveryId, riderId, otp);
      
      if (result.success) {
        onVerificationSuccess(otp);
      } else {
        setError(result.message || 'Invalid OTP code');
        onVerificationError(result.message);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setError(error.message || 'An error occurred during verification');
      onVerificationError(error.message);
    } finally {
      setIsVerifying(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Verify Delivery OTP</h2>
        
        <p className="text-gray-600 mb-4">
          Please ask the customer for their OTP code to complete the delivery.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
              OTP Code
            </label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              maxLength={6}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={isVerifying}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isVerifying}
            >
              {isVerifying ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OTPVerificationModal;