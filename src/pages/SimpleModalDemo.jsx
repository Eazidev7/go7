import React, { useState, useEffect } from 'react';

const SimpleModalDemo = () => {
  const [showModal, setShowModal] = useState(false);
  const [toasts, setToasts] = useState([]);

  const showToast = (type, message) => {
    const newToast = {
      id: Date.now(),
      type,
      message,
      show: true
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== newToast.id));
    }, 5000);
  };

  const SimpleRiderModal = ({ isOpen, onClose }) => {
    const [countdown, setCountdown] = useState(30);

    React.useEffect(() => {
      if (!isOpen) return;
      
      setCountdown(30);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            onClose();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

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
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '30px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '25px'
          }}>
            <h2 style={{ color: '#E30613', margin: 0 }}>New Order Request</h2>
            <div style={{
              backgroundColor: countdown > 10 ? '#E30613' : '#ff4444',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '25px',
              fontWeight: '600'
            }}>
              {countdown}s
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '12px',
              marginBottom: '15px'
            }}>
              <h3 style={{ margin: '0 0 10px 0' }}>Customer: John Doe</h3>
              <p style={{ margin: 0 }}>📞 +234 801 234 5678</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginBottom: '15px'
            }}>
              <div style={{
                backgroundColor: '#f0f8ff',
                padding: '15px',
                borderRadius: '12px'
              }}>
                <h4 style={{ color: '#0066cc', margin: '0 0 8px 0' }}>📍 PICKUP</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>123 Ake Palace, Abeokuta</p>
              </div>
              <div style={{
                backgroundColor: '#f0fff0',
                padding: '15px',
                borderRadius: '12px'
              }}>
                <h4 style={{ color: '#009900', margin: '0 0 8px 0' }}>🎯 DROPOFF</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>456 MKO Stadium, Abeokuta</p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              backgroundColor: '#fff5f5',
              padding: '15px',
              borderRadius: '12px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#E30613', fontSize: '24px', fontWeight: '700' }}>₦1200</div>
                <div style={{ fontSize: '12px' }}>Delivery Fee</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>2.5km</div>
                <div style={{ fontSize: '12px' }}>Distance</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={() => {
                showToast('success', 'Order Accepted! 🎉');
                onClose();
              }}
              style={{
                flex: 1,
                backgroundColor: '#E30613',
                color: 'white',
                border: 'none',
                padding: '15px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ✅ Accept Order
            </button>
            <button
              onClick={() => {
                showToast('error', 'Order Rejected');
                onClose();
              }}
              style={{
                flex: 1,
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                padding: '15px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ❌ Reject
            </button>
          </div>
        </div>
      </div>
    );
  };

  const Toast = ({ toast }) => (
    <div style={{
      backgroundColor: toast.type === 'success' ? '#E8F5E8' : '#FFEBEE',
      border: `2px solid ${toast.type === 'success' ? '#4CAF50' : '#F44336'}`,
      borderRadius: '12px',
      padding: '16px 20px',
      minWidth: '300px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{ fontSize: '24px' }}>
        {toast.type === 'success' ? '✅' : '❌'}
      </div>
      <div>
        <div style={{
          color: toast.type === 'success' ? '#4CAF50' : '#F44336',
          fontWeight: '700',
          marginBottom: '4px'
        }}>
          {toast.type === 'success' ? 'Success!' : 'Notification'}
        </div>
        <div style={{ fontSize: '14px' }}>{toast.message}</div>
      </div>
    </div>
  );

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

        <div style={{
          marginBottom: '40px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px'
        }}>
          <h2 style={{ color: '#333', marginBottom: '20px' }}>🛵 Rider Order Modal</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Full-screen modal with 30-second countdown, order details, and Accept/Reject buttons.
          </p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              backgroundColor: '#E30613',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔔 Show Incoming Order
          </button>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px'
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
              onClick={() => showToast('success', 'Your order has been accepted! 🎉')}
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
              onClick={() => showToast('success', 'Your order has been picked up! 📦')}
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
              onClick={() => showToast('success', 'Your rider is on the way! 🛵')}
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
              onClick={() => showToast('success', 'Your order has been delivered! 🎉')}
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
      </div>

      {/* Modal */}
      <SimpleRiderModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />

      {/* Toasts */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000
      }}>
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
};

export default SimpleModalDemo;