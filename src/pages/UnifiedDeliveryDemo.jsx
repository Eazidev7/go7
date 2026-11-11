import React, { useState, useEffect } from 'react';
import UnifiedRiderOrderModal from '../components/modals/UnifiedRiderOrderModal';
import { useUnifiedToast } from '../components/modals/UnifiedCustomerToast';
// import unifiedDeliveryEvents from '../services/UnifiedDeliveryEventSystem'; // TEMPORARILY COMMENTED - FIREBASE DEPENDENCY MISSING

const UnifiedDeliveryDemo = () => {
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentOrderId] = useState('demo-order-unified-123');
  const [currentRiderId] = useState('demo-rider-unified-456');
  const [currentRiderName] = useState('Ahmed Bello');
  
  const { showStatusToast, ToastManager } = useUnifiedToast();

  // Sample order data
  const sampleOrder = {
    orderId: currentOrderId,
    customerId: 'demo-customer-789',
    customerName: 'Fatima Adebayo',
    customerPhone: '+234 805 123 4567',
    pickupAddress: '15 Ake Palace Way, Abeokuta, Ogun State',
    dropoffAddress: '42 MKO Abiola Stadium Road, Abeokuta, Ogun State',
    pickup: [7.1475, 3.3619],
    dropoff: [7.1556, 3.3441],
    fee: '1500',
    distance: '3.2',
    items: ['Jollof Rice & Chicken', 'Fried Plantain', '2x Soft Drinks', 'Extra Sauce'],
    status: 'assigned',
    timestamp: new Date(),
    estimatedDeliveryTime: '18 mins'
  };

  // Simulate order status progression
  const simulateOrderStatusChange = async (newStatus) => {
    const riderName = currentRiderName;
    const eta = newStatus === 'accepted' ? '18 mins' : 
                newStatus === 'en_route' ? '12 mins' : null;

    // Show toast notification
    showStatusToast(newStatus, riderName, eta);

    // Add chat message
    addChatMessage(newStatus, riderName, eta);

    console.log(`🔔 Simulated status change: ${newStatus}`);
  };

  // Add chat message based on status
  const addChatMessage = (status, riderName, eta) => {
    const messages = {
      accepted: `🚀 Great news! Rider ${riderName} has accepted your delivery. Estimated delivery time: ${eta}`,
      picked_up: `🛍️ Your order has been picked up and is now on its way to you!`,
      en_route: `🛵 Your rider is en route with an ETA of ${eta}. You can track their progress in real-time.`,
      delivered: `🎉 Congratulations! Your order has been successfully delivered. Thank you for choosing Go7!`,
      pending: `⏳ We're finding the best available rider for your delivery. This may take a few minutes.`
    };

    const newMessage = {
      id: Date.now(),
      senderId: 'go7-system',
      senderName: 'Go7 Assistant',
      senderType: 'system',
      message: messages[status] || `Order status updated to: ${status}`,
      timestamp: new Date(),
      automated: true,
      status: status
    };

    setChatMessages(prev => [...prev, newMessage]);
  };

  // Handle rider modal acceptance
  const handleRiderAccept = () => {
    setShowRiderModal(false);
    simulateOrderStatusChange('accepted');
  };

  // Handle rider modal rejection
  const handleRiderReject = () => {
    setShowRiderModal(false);
    simulateOrderStatusChange('pending');
  };

  return (
    <div style={{
      padding: '40px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '50px'
        }}>
          <h1 style={{
            color: '#E30613',
            fontSize: '3rem',
            fontWeight: '800',
            marginBottom: '10px'
          }}>
            🚚 Go7 Unified Delivery System
          </h1>
          <p style={{
            color: '#666',
            fontSize: '18px',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Experience the complete delivery workflow with synchronized popups, chat messages, and real-time notifications.
          </p>
        </div>

        {/* Main Demo Sections */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '30px',
          marginBottom: '40px'
        }}>
          {/* Rider Experience */}
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '3px solid #e3f2fd'
          }}>
            <h2 style={{
              color: '#1976d2',
              marginBottom: '20px',
              fontSize: '24px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              🛵 Rider Experience
            </h2>
            
            <p style={{ color: '#666', marginBottom: '25px', lineHeight: '1.6' }}>
              Enhanced order modal with pickup/dropoff details, ETA calculation, and 30-second countdown timer.
            </p>

            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '25px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>✨ Features:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
                <li>Complete order details with customer info</li>
                <li>Real-time ETA calculation (18 mins)</li>
                <li>30-second auto-timeout with visual countdown</li>
                <li>Accept/Reject with automatic chat integration</li>
              </ul>
            </div>

            <button
              onClick={() => setShowRiderModal(true)}
              style={{
                width: '100%',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                padding: '15px 25px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#1565c0'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#1976d2'}
            >
              🔔 Show New Order Request
            </button>
          </div>

          {/* Customer Experience */}
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '3px solid #e8f5e8'
          }}>
            <h2 style={{
              color: '#388e3c',
              marginBottom: '20px',
              fontSize: '24px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              📱 Customer Experience
            </h2>
            
            <p style={{ color: '#666', marginBottom: '25px', lineHeight: '1.6' }}>
              Status toast notifications with rider information, ETA updates, and automated chat messages.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '25px'
            }}>
              <button
                onClick={() => simulateOrderStatusChange('accepted')}
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ✅ Accepted
              </button>
              
              <button
                onClick={() => simulateOrderStatusChange('picked_up')}
                style={{
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                📦 Picked Up
              </button>
              
              <button
                onClick={() => simulateOrderStatusChange('en_route')}
                style={{
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🛵 En Route
              </button>
              
              <button
                onClick={() => simulateOrderStatusChange('delivered')}
                style={{
                  backgroundColor: '#E30613',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🎉 Delivered
              </button>
            </div>

            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '15px',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              <strong>Note:</strong> Each status change triggers both a toast notification and an automated chat message.
            </div>
          </div>
        </div>

        {/* Chat Messages Display */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          border: '3px solid #fff3e0'
        }}>
          <h2 style={{
            color: '#f57c00',
            marginBottom: '25px',
            fontSize: '24px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            💬 Automated Chat Integration
          </h2>

          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: '#fafafa',
            borderRadius: '15px',
            padding: '20px'
          }}>
            {chatMessages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#999',
                padding: '40px',
                fontStyle: 'italic'
              }}>
                📨 Automated chat messages will appear here when you trigger status changes...
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  key={message.id}
                  style={{
                    backgroundColor: 'white',
                    padding: '15px 20px',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    border: '2px solid #e0e0e0',
                    borderLeft: '4px solid #E30613'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <strong style={{ color: '#E30613', fontSize: '14px' }}>
                      {message.senderName}
                    </strong>
                    <span style={{
                      backgroundColor: '#e8f5e8',
                      color: '#2e7d32',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {message.status?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{
                    color: '#333',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}>
                    {message.message}
                  </div>
                </div>
              ))
            )}
          </div>

          {chatMessages.length > 0 && (
            <button
              onClick={() => setChatMessages([])}
              style={{
                marginTop: '15px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              🗑️ Clear Messages
            </button>
          )}
        </div>

        {/* Features Summary */}
        <div style={{
          backgroundColor: '#fff5f5',
          padding: '40px',
          borderRadius: '20px',
          marginTop: '40px',
          border: '3px solid #ffcdd2'
        }}>
          <h2 style={{
            color: '#E30613',
            textAlign: 'center',
            marginBottom: '30px',
            fontSize: '28px',
            fontWeight: '800'
          }}>
            🎯 Unified System Features
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '25px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🛵</div>
              <h3 style={{ color: '#333', marginBottom: '10px' }}>Enhanced Rider Modal</h3>
              <p style={{ color: '#666', fontSize: '14px' }}>
                Complete order details, ETA calculation, 30-second countdown, and automatic next-rider assignment.
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>📱</div>
              <h3 style={{ color: '#333', marginBottom: '10px' }}>Smart Toast Notifications</h3>
              <p style={{ color: '#666', fontSize: '14px' }}>
                Status-based toasts with rider names, ETAs, and Go7 branding. Auto-close after 5 seconds.
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>💬</div>
              <h3 style={{ color: '#333', marginBottom: '10px' }}>Automated Chat Integration</h3>
              <p style={{ color: '#666', fontSize: '14px' }}>
                Synchronized chat messages for every status change with rider information and delivery updates.
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚡</div>
              <h3 style={{ color: '#333', marginBottom: '10px' }}>Real-Time Synchronization</h3>
              <p style={{ color: '#666', fontSize: '14px' }}>
                Single event triggers both popups and chat messages. Everything stays perfectly synchronized.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Rider Order Modal */}
      <UnifiedRiderOrderModal
        order={sampleOrder}
        isOpen={showRiderModal}
        onClose={() => setShowRiderModal(false)}
        riderId={currentRiderId}
        riderName={currentRiderName}
      />

      {/* Toast Manager */}
      <ToastManager />
    </div>
  );
};

export default UnifiedDeliveryDemo;