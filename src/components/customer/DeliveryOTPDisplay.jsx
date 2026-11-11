import React, { useState, useEffect } from 'react';
import { getDeliveryOTP } from '../../services/deliveryService';

const DeliveryOTPDisplay = ({ deliveryId, userId }) => {
  const [otp, setOtp] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchOTP = async () => {
      if (!deliveryId || !userId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const otpCode = await getDeliveryOTP(deliveryId, userId);
        setOtp(otpCode);
        setError('');
      } catch (err) {
        console.error('Error fetching OTP:', err);
        setError('Could not load your verification code');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOTP();
  }, [deliveryId, userId]);
  
  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <p className="text-gray-500">Loading verification code...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 border rounded-lg bg-blue-50">
      <h3 className="font-medium text-gray-900 mb-2">Delivery Verification Code</h3>
      <p className="text-gray-600 mb-2">Share this code with your delivery rider when they arrive:</p>
      
      <div className="flex justify-center mb-2">
        <div className="py-3 px-6 bg-white rounded-lg border-2 border-blue-500">
          <span className="text-2xl font-bold tracking-wider text-blue-700">{otp}</span>
        </div>
      </div>
      
      <p className="text-sm text-gray-500">
        For your security, the rider needs this code to mark your delivery as completed.
      </p>
    </div>
  );
};

export default DeliveryOTPDisplay;