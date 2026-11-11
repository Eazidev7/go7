/**
 * Example integration of DeliveryChatComponent
 * Shows how to use the chat component in delivery pages
 */

import React, { useState, useEffect } from 'react';
import DeliveryChatComponent from './DeliveryChatComponent';
import { useAuth } from '../../contexts/AuthContext';

const ChatIntegrationExample = ({ deliveryId }) => {
  const [recipientId, setRecipientId] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Fetch delivery information to determine recipient
  useEffect(() => {
    const fetchDeliveryInfo = async () => {
      try {
        // This would typically fetch from your delivery service
        // For now, we'll simulate getting delivery data
        const mockDeliveryData = {
          id: deliveryId,
          customerId: 'customer_123',
          riderId: 'rider_456',
          status: 'in_progress'
        };
        
        setDeliveryInfo(mockDeliveryData);
        
        // Determine recipient based on current user role
        if (user?.role === 'customer') {
          setRecipientId(mockDeliveryData.riderId);
        } else if (user?.role === 'rider') {
          setRecipientId(mockDeliveryData.customerId);
        }
      } catch (error) {
        console.error('Error fetching delivery info:', error);
        setError('Unable to load delivery information');
      }
    };

    if (deliveryId) {
      fetchDeliveryInfo();
    }
  }, [deliveryId, user?.role]);

  const handleMessageSent = () => {
    console.log('Message sent successfully');
    // You can add additional logic here like showing notifications
  };

  const handleChatError = (error) => {
    console.error('Chat error:', error);
    setError(error.message || 'Chat error occurred');
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!deliveryInfo) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="animate-pulse flex items-center justify-center">
          <div className="text-gray-500">Loading delivery information...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96">
      <DeliveryChatComponent
        deliveryId={deliveryId}
        recipientId={recipientId}
        className="h-full"
        onMessageSent={handleMessageSent}
        onError={handleChatError}
      />
    </div>
  );
};

export default ChatIntegrationExample;