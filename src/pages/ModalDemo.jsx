import React, { useState } from 'react';
import RiderOrderModal from '../components/modals/RiderOrderModal';
import { useToast } from '../components/modals/CustomerToast';

const ModalDemo = () => {
  const [showRiderModal, setShowRiderModal] = useState(false);
  const { showToast, ToastManager } = useToast();

  // Sample order data for demo
  const sampleOrder = {
    orderId: 'demo-order-123',
    customerId: 'demo-customer',
    customerName: 'John Doe',
    customerPhone: '+234 801 234 5678',
    pickupAddress: '123 Ake Palace, Abeokuta',
    dropoffAddress: '456 MKO Abiola Stadium, Abeokuta',
    pickup: [7.1475, 3.3619],
    dropoff: [7.1556, 3.3441],
    fee: '1200',
    items: ['Jollof Rice', 'Grilled Chicken', 'Soft Drinks'],
    status: 'new',
    distance: '2.5',
    timestamp: new Date()
  };

  const demoRiderId = 'demo-rider-123';

  return (
    <div style={{
      padding: '40px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          color: '#E30613',
          textAlign: 'center',
          marginBottom: '40px',
          fontSize: '2.5rem'
        }}>
          Go7 Modal System Demo
        </h1>

        {/* Rider Modal Demo */}
        <div style={{
          marginBottom: '40px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px',
          border: '2px solid #e9ecef'
        }}>
          <h2 style={{ color: '#333', marginBottom: '20px' }}>🛵 Rider Order Modal</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Full-screen modal with 30-second countdown, order details, and Accept/Reject buttons.
          </p>
          <button
            onClick={() => setShowRiderModal(true)}
            style={{
              backgroundColor: '#E30613',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#c5050f'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#E30613'}
          >
            🔔 Show Incoming Order
          </button>
        </div>

        {/* Customer Toast Demo */}
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px',
          border: '2px solid #e9ecef'
        }}>
          <h2 style={{ color: '#333', marginBottom: '20px' }}>📱 Customer Toast Notifications</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Toast-style notifications for order status updates with 5-second auto-close.
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            <button
              onClick={() => showToast('accepted', 'Your order has been accepted by a rider! 🎉')}
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
              ✅ Order Accepted
            </button>
            
            <button
              onClick={() => showToast('picked_up', 'Your order has been picked up! 📦')}
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
              📦 Order Picked Up
            </button>
            
            <button
              onClick={() => showToast('en_route', 'Your rider is on the way! 🛵')}
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
              🛵 Rider En Route
            </button>
            
            <button
              onClick={() => showToast('delivered', 'Your order has been delivered! 🎉')}
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
              🎉 Order Delivered
            </button>
          </div>
        </div>

        {/* Features List */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#fff5f5',
          borderRadius: '10px',
          border: '2px solid #ffe6e6'
        }}>
          <h3 style={{ color: '#E30613', marginBottom: '15px' }}>✨ Features Implemented</h3>
          <ul style={{ color: '#333', lineHeight: '1.8' }}>
            <li><strong>Rider Modal:</strong> 30-second countdown, full order details, Accept/Reject buttons</li>
            <li><strong>Customer Toasts:</strong> Status-based notifications with auto-close after 5 seconds</li>
            <li><strong>Real-time Updates:</strong> Firebase integration for live order status changes</li>
            <li><strong>Go7 Theme:</strong> Red/white color scheme matching brand guidelines</li>
            <li><strong>Responsive Design:</strong> Works on desktop and mobile devices</li>
            <li><strong>Smart Routing:</strong> Automatic rider assignment and fallback handling</li>
            <li><strong>Animations:</strong> Smooth slide-in/fade effects for better UX</li>
          </ul>
        </div>
      </div>

      {/* Modal Components */}
      <RiderOrderModal
        order={sampleOrder}
        isOpen={showRiderModal}
        onClose={() => setShowRiderModal(false)}
        riderId={demoRiderId}
      />
      
      <ToastManager />
    </div>
  );
};

export default ModalDemo;