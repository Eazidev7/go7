import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, updateDoc, serverTimestamp, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

const RiderOrderModal = ({ order, isOpen, onClose, riderId }) => {
  const [countdown, setCountdown] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto-reject on timeout
          handleReject(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  // Reset countdown when modal opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(30);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Handle order acceptance
  const handleAccept = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Import notification service dynamically to avoid circular dependency
      const { default: notificationService } = await import('../../services/NotificationService');
      
      const success = await notificationService.acceptOrder(order.orderId, riderId);
      
      if (success) {
        console.log('✅ Order accepted:', order.orderId);
        onClose();
      } else {
        throw new Error('Failed to accept order');
      }
    } catch (error) {
      console.error('❌ Error accepting order:', error);
      setIsProcessing(false);
    }
  };

  // Handle order rejection or timeout
  const handleReject = async (isTimeout = false) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Import notification service dynamically to avoid circular dependency
      const { default: notificationService } = await import('../../services/NotificationService');
      
      const reason = isTimeout ? 'timeout' : 'manual_reject';
      const success = await notificationService.rejectOrder(order.orderId, riderId, reason);
      
      if (success) {
        console.log(`❌ Order rejected: ${order.orderId} (${reason})`);
        onClose();
      } else {
        throw new Error('Failed to reject order');
      }
    } catch (error) {
      console.error('❌ Error rejecting order:', error);
      setIsProcessing(false);
    }
  };

  // Find next available rider
  const findNextRider = async (currentRiderId) => {
    try {
      const ridersRef = collection(db, 'riders');
      const availableRidersQuery = query(
        ridersRef,
        where('status', '==', 'available'),
        where('isOnline', '==', true),
        orderBy('lastActive', 'desc'),
        limit(10)
      );

      const ridersSnapshot = await getDocs(availableRidersQuery);
      const availableRiders = ridersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(rider => rider.id !== currentRiderId);

      return availableRiders.length > 0 ? availableRiders[0].id : null;
    } catch (error) {
      console.error('❌ Error finding next rider:', error);
      return null;
    }
  };

  // Calculate distance for display
  const getDistance = () => {
    if (order.distance) return `${order.distance}km`;
    return 'Distance calculating...';
  };

  if (!isOpen || !order) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '30px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        animation: 'slideUp 0.3s ease-out'
      }}>
        {/* Header with countdown */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          paddingBottom: '15px',
          borderBottom: '2px solid #f0f0f0'
        }}>
          <h2 style={{
            color: '#E30613',
            fontSize: '24px',
            fontWeight: '700',
            margin: 0
          }}>
            New Order Request
          </h2>
          <div style={{
            backgroundColor: countdown > 10 ? '#E30613' : '#ff4444',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '25px',
            fontSize: '16px',
            fontWeight: '600',
            minWidth: '60px',
            textAlign: 'center',
            animation: countdown <= 10 ? 'pulse 1s infinite' : 'none'
          }}>
            {countdown}s
          </div>
        </div>

        {/* Order Details */}
        <div style={{ marginBottom: '25px' }}>
          {/* Customer Info */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '12px',
            marginBottom: '15px'
          }}>
            <h3 style={{ color: '#333', margin: '0 0 10px 0', fontSize: '16px' }}>Customer</h3>
            <p style={{ margin: '5px 0', color: '#666' }}>📞 {order.customerPhone}</p>
            <p style={{ margin: '5px 0', color: '#666' }}>👤 {order.customerName}</p>
          </div>

          {/* Delivery Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            marginBottom: '15px'
          }}>
            <div style={{
              backgroundColor: '#f0f8ff',
              padding: '15px',
              borderRadius: '12px',
              border: '2px solid #e6f3ff'
            }}>
              <h4 style={{ color: '#0066cc', margin: '0 0 8px 0', fontSize: '14px' }}>📍 PICKUP</h4>
              <p style={{ color: '#333', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>
                {order.pickupAddress || `${order.pickup[1]}, ${order.pickup[0]}`}
              </p>
            </div>
            <div style={{
              backgroundColor: '#f0fff0',
              padding: '15px',
              borderRadius: '12px',
              border: '2px solid #e6ffe6'
            }}>
              <h4 style={{ color: '#009900', margin: '0 0 8px 0', fontSize: '14px' }}>🎯 DROPOFF</h4>
              <p style={{ color: '#333', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>
                {order.dropoffAddress || `${order.dropoff[1]}, ${order.dropoff[0]}`}
              </p>
            </div>
          </div>

          {/* Fee and Distance */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            backgroundColor: '#fff5f5',
            padding: '15px',
            borderRadius: '12px',
            border: '2px solid #ffe6e6'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#E30613', fontSize: '24px', fontWeight: '700' }}>
                ₦{order.fee}
              </div>
              <div style={{ color: '#666', fontSize: '12px' }}>Delivery Fee</div>
            </div>
            <div style={{
              width: '1px',
              backgroundColor: '#ddd',
              margin: '0 15px'
            }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#333', fontSize: '18px', fontWeight: '600' }}>
                {getDistance()}
              </div>
              <div style={{ color: '#666', fontSize: '12px' }}>Distance</div>
            </div>
          </div>

          {/* Items */}
          {order.items && order.items.length > 0 && (
            <div style={{
              backgroundColor: '#fafafa',
              padding: '15px',
              borderRadius: '12px',
              marginTop: '15px'
            }}>
              <h4 style={{ color: '#333', margin: '0 0 8px 0', fontSize: '14px' }}>📦 Items</h4>
              <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
                {order.items.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '15px'
        }}>
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            style={{
              flex: 1,
              backgroundColor: '#E30613',
              color: 'white',
              border: 'none',
              padding: '15px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {isProcessing ? '⏳ Processing...' : '✅ Accept Order'}
          </button>
          <button
            onClick={() => handleReject(false)}
            disabled={isProcessing}
            style={{
              flex: 1,
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              padding: '15px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {isProcessing ? '⏳ Processing...' : '❌ Reject'}
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7);
          }
          50% { 
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(255, 68, 68, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default RiderOrderModal;