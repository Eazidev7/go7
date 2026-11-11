import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  addDoc,
  query,
  where,
  getDocs,
  getDoc
} from 'firebase/firestore';

const UnifiedRiderOrderModal = ({ order, isOpen, onClose, riderId, riderName }) => {
  const [countdown, setCountdown] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);
  const [eta, setEta] = useState(null);
  const countdownRef = useRef(null);

  // Calculate ETA based on distance
  useEffect(() => {
    if (order?.distance) {
      const distance = parseFloat(order.distance);
      const averageSpeed = 25; // km/h for motorcycle in city
      const etaMinutes = Math.round((distance / averageSpeed) * 60);
      setEta(etaMinutes);
    }
  }, [order]);

  // Countdown timer with auto-reject
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleAutoReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [isOpen]);

  // Reset countdown when modal opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(30);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Auto-reject on timeout
  const handleAutoReject = async () => {
    if (isProcessing) return;
    await handleReject(true);
  };

  // Handle order acceptance
  const handleAccept = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Update order status
      const orderRef = doc(db, 'orders', order.orderId);
      await updateDoc(orderRef, {
        status: 'accepted',
        riderId: riderId,
        riderName: riderName,
        acceptedAt: serverTimestamp(),
        estimatedDeliveryTime: eta ? `${eta} mins` : 'calculating...',
        updatedAt: serverTimestamp()
      });

      // 2. Add automated chat message
      await addAutomatedChatMessage(order.orderId, 'accepted', {
        riderName,
        eta: eta ? `${eta} mins` : 'calculating...'
      });

      // 3. Update rider status
      const riderRef = doc(db, 'riders', riderId);
      await updateDoc(riderRef, {
        status: 'busy',
        currentOrderId: order.orderId,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Order accepted and chat message added');
      onClose();
      
    } catch (error) {
      console.error('❌ Error accepting order:', error);
      setIsProcessing(false);
    }
  };

  // Handle order rejection
  const handleReject = async (isTimeout = false) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Find next available rider
      const nextRiderId = await findNextAvailableRider(riderId);
      
      if (nextRiderId) {
        // Assign to next rider
        const orderRef = doc(db, 'orders', order.orderId);
        await updateDoc(orderRef, {
          assignedRiderId: nextRiderId,
          rejectedBy: riderId,
          rejectionReason: isTimeout ? 'timeout' : 'manual_reject',
          updatedAt: serverTimestamp()
        });
        
        console.log(`🔄 Order reassigned to next rider: ${nextRiderId}`);
      } else {
        // No riders available
        const orderRef = doc(db, 'orders', order.orderId);
        await updateDoc(orderRef, {
          status: 'pending',
          assignedRiderId: null,
          rejectedBy: riderId,
          rejectionReason: isTimeout ? 'timeout' : 'manual_reject',
          updatedAt: serverTimestamp()
        });
        
        // Add chat message about delay
        await addAutomatedChatMessage(order.orderId, 'pending', {
          reason: 'Finding available rider...'
        });
        
        console.log('⚠️ No available riders, order marked as pending');
      }

      onClose();
      
    } catch (error) {
      console.error('❌ Error rejecting order:', error);
      setIsProcessing(false);
    }
  };

  // Find next available rider
  const findNextAvailableRider = async (currentRiderId) => {
    try {
      const ridersRef = collection(db, 'riders');
      const availableRidersQuery = query(
        ridersRef,
        where('status', '==', 'available'),
        where('isOnline', '==', true)
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

  // Add automated chat message
  const addAutomatedChatMessage = async (orderId, status, details = {}) => {
    try {
      const messages = {
        accepted: `🚀 Rider ${details.riderName} accepted your delivery! ETA: ${details.eta}`,
        picked_up: `🛍️ Order picked up and on the way!`,
        en_route: `🛵 Rider en route, ETA: ${details.eta || 'calculating...'}`,
        delivered: `🎉 Your order has been delivered successfully!`,
        pending: `⏳ ${details.reason || 'Order is being processed...'}`
      };

      const chatRef = collection(db, 'chats', orderId, 'messages');
      await addDoc(chatRef, {
        senderId: 'system',
        senderType: 'system',
        message: messages[status] || `Order status updated to: ${status}`,
        timestamp: serverTimestamp(),
        isRead: false,
        automated: true,
        status: status
      });

      console.log(`💬 Automated chat message added for status: ${status}`);
    } catch (error) {
      console.error('❌ Error adding chat message:', error);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '25px',
        padding: '35px',
        maxWidth: '550px',
        width: '100%',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4)',
        position: 'relative',
        animation: 'slideUp 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      }}>
        {/* Countdown Timer Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          paddingBottom: '20px',
          borderBottom: '3px solid #f0f0f0'
        }}>
          <h2 style={{
            color: '#E30613',
            fontSize: '28px',
            fontWeight: '800',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            🚚 New Order Request
          </h2>
          <div style={{
            backgroundColor: countdown > 10 ? '#E30613' : '#ff3333',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '30px',
            fontSize: '18px',
            fontWeight: '700',
            minWidth: '80px',
            textAlign: 'center',
            animation: countdown <= 10 ? 'urgentPulse 1s infinite' : 'none',
            boxShadow: '0 4px 15px rgba(227, 6, 19, 0.4)'
          }}>
            {countdown}s
          </div>
        </div>

        {/* Customer Information */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '15px',
          marginBottom: '20px',
          border: '2px solid #e9ecef'
        }}>
          <h3 style={{ 
            color: '#333', 
            margin: '0 0 15px 0', 
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            👤 Customer Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <p style={{ margin: '5px 0', color: '#555', fontWeight: '500' }}>
              <strong>Name:</strong> {order.customerName}
            </p>
            <p style={{ margin: '5px 0', color: '#555', fontWeight: '500' }}>
              <strong>Phone:</strong> {order.customerPhone}
            </p>
          </div>
        </div>

        {/* Delivery Locations */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '20px'
        }}>
          <div style={{
            backgroundColor: '#e3f2fd',
            padding: '20px',
            borderRadius: '15px',
            border: '2px solid #90caf9'
          }}>
            <h4 style={{ 
              color: '#1976d2', 
              margin: '0 0 10px 0', 
              fontSize: '16px',
              fontWeight: '700'
            }}>
              📍 PICKUP
            </h4>
            <p style={{ 
              color: '#333', 
              fontSize: '14px', 
              margin: 0, 
              lineHeight: '1.5',
              fontWeight: '500'
            }}>
              {order.pickupAddress || `${order.pickup?.[1]}, ${order.pickup?.[0]}`}
            </p>
          </div>
          
          <div style={{
            backgroundColor: '#e8f5e8',
            padding: '20px',
            borderRadius: '15px',
            border: '2px solid #81c784'
          }}>
            <h4 style={{ 
              color: '#388e3c', 
              margin: '0 0 10px 0', 
              fontSize: '16px',
              fontWeight: '700'
            }}>
              🎯 DROPOFF
            </h4>
            <p style={{ 
              color: '#333', 
              fontSize: '14px', 
              margin: 0, 
              lineHeight: '1.5',
              fontWeight: '500'
            }}>
              {order.dropoffAddress || `${order.dropoff?.[1]}, ${order.dropoff?.[0]}`}
            </p>
          </div>
        </div>

        {/* Order Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '15px',
          backgroundColor: '#fff5f5',
          padding: '25px',
          borderRadius: '15px',
          border: '2px solid #ffcdd2',
          marginBottom: '25px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              color: '#E30613', 
              fontSize: '28px', 
              fontWeight: '800',
              marginBottom: '5px'
            }}>
              ₦{order.fee}
            </div>
            <div style={{ color: '#666', fontSize: '13px', fontWeight: '600' }}>
              Delivery Fee
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              color: '#333', 
              fontSize: '22px', 
              fontWeight: '700',
              marginBottom: '5px'
            }}>
              {order.distance || '2.5'}km
            </div>
            <div style={{ color: '#666', fontSize: '13px', fontWeight: '600' }}>
              Distance
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              color: '#ff9800', 
              fontSize: '22px', 
              fontWeight: '700',
              marginBottom: '5px'
            }}>
              {eta || '~15'} mins
            </div>
            <div style={{ color: '#666', fontSize: '13px', fontWeight: '600' }}>
              Est. Time
            </div>
          </div>
        </div>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <div style={{
            backgroundColor: '#fafafa',
            padding: '20px',
            borderRadius: '15px',
            marginBottom: '25px',
            border: '2px solid #f0f0f0'
          }}>
            <h4 style={{ 
              color: '#333', 
              margin: '0 0 10px 0', 
              fontSize: '16px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📦 Order Items
            </h4>
            <p style={{ 
              color: '#555', 
              fontSize: '14px', 
              margin: 0,
              fontWeight: '500'
            }}>
              {order.items.join(', ')}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '20px' }}>
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            style={{
              flex: 1,
              backgroundColor: isProcessing ? '#ccc' : '#E30613',
              color: 'white',
              border: 'none',
              padding: '18px',
              borderRadius: '15px',
              fontSize: '18px',
              fontWeight: '700',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: isProcessing ? 'none' : '0 6px 20px rgba(227, 6, 19, 0.4)',
              transform: isProcessing ? 'none' : 'translateY(-2px)'
            }}
            onMouseOver={(e) => {
              if (!isProcessing) {
                e.target.style.backgroundColor = '#c5050f';
                e.target.style.transform = 'translateY(-4px)';
                e.target.style.boxShadow = '0 8px 25px rgba(227, 6, 19, 0.5)';
              }
            }}
            onMouseOut={(e) => {
              if (!isProcessing) {
                e.target.style.backgroundColor = '#E30613';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(227, 6, 19, 0.4)';
              }
            }}
          >
            {isProcessing ? '⏳ Processing...' : '✅ Accept Order'}
          </button>
          
          <button
            onClick={() => handleReject(false)}
            disabled={isProcessing}
            style={{
              flex: 1,
              backgroundColor: isProcessing ? '#ccc' : '#6c757d',
              color: 'white',
              border: 'none',
              padding: '18px',
              borderRadius: '15px',
              fontSize: '18px',
              fontWeight: '700',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: isProcessing ? 'none' : '0 6px 20px rgba(108, 117, 125, 0.4)',
              transform: isProcessing ? 'none' : 'translateY(-2px)'
            }}
            onMouseOver={(e) => {
              if (!isProcessing) {
                e.target.style.backgroundColor = '#545b62';
                e.target.style.transform = 'translateY(-4px)';
                e.target.style.boxShadow = '0 8px 25px rgba(108, 117, 125, 0.5)';
              }
            }}
            onMouseOut={(e) => {
              if (!isProcessing) {
                e.target.style.backgroundColor = '#6c757d';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(108, 117, 125, 0.4)';
              }
            }}
          >
            {isProcessing ? '⏳ Processing...' : '❌ Reject'}
          </button>
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
              transform: translateY(50px) scale(0.9);
            }
            to { 
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          
          @keyframes urgentPulse {
            0%, 100% { 
              transform: scale(1);
              box-shadow: 0 4px 15px rgba(255, 51, 51, 0.4);
            }
            50% { 
              transform: scale(1.1);
              box-shadow: 0 8px 25px rgba(255, 51, 51, 0.6);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default UnifiedRiderOrderModal;