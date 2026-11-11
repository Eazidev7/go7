import React, { useState } from 'react';

const CleanModalDemo = () => {
  const [showModal, setShowModal] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message) => {
    const id = Date.now();
    const newNotification = { id, message };
    setNotifications(prev => [...prev, newNotification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#E30613', textAlign: 'center' }}>Go7 Modal System Demo</h1>
      
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Rider Modal Section */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          marginBottom: '30px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <h2>🛵 Rider Order Modal</h2>
          <p>Click to see the full-screen order modal with countdown timer.</p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              backgroundColor: '#E30613',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            🔔 Show New Order
          </button>
        </div>

        {/* Customer Toast Section */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <h2>📱 Customer Notifications</h2>
          <p>Click buttons to see toast notifications.</p>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => addNotification('Order Accepted! 🎉')}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ✅ Accepted
            </button>
            
            <button
              onClick={() => addNotification('Order Picked Up! 📦')}
              style={{
                backgroundColor: '#FF9800',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              📦 Picked Up
            </button>
            
            <button
              onClick={() => addNotification('Rider En Route! 🛵')}
              style={{
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🛵 En Route
            </button>
            
            <button
              onClick={() => addNotification('Delivered! 🎉')}
              style={{
                backgroundColor: '#E30613',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🎉 Delivered
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '15px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ color: '#E30613' }}>New Order Request</h2>
            <div style={{ marginBottom: '20px' }}>
              <p><strong>Customer:</strong> John Doe</p>
              <p><strong>Phone:</strong> +234 801 234 5678</p>
              <p><strong>From:</strong> Ake Palace, Abeokuta</p>
              <p><strong>To:</strong> MKO Stadium, Abeokuta</p>
              <p><strong>Fee:</strong> ₦1,200</p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  addNotification('Order Accepted! 🎉');
                  setShowModal(false);
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#E30613',
                  color: 'white',
                  border: 'none',
                  padding: '15px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ✅ Accept
              </button>
              
              <button
                onClick={() => {
                  addNotification('Order Rejected');
                  setShowModal(false);
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  padding: '15px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ❌ Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1001
      }}>
        {notifications.map(notification => (
          <div
            key={notification.id}
            style={{
              backgroundColor: 'white',
              border: '2px solid #E30613',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '250px'
            }}
          >
            {notification.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CleanModalDemo;