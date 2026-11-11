import React, { useState } from 'react';
import { simulateOrderJourney, createSampleOrder, updateOrderStatus, sendTestMessage, SAMPLE_ORDERS } from '../utils/order-tracking-utils';

/**
 * Test page for the Go7 Order Tracking System
 * This page allows testing of the /track/[orderId] functionality
 */

const OrderTrackingTestPage: React.FC = () => {
  const [selectedOrderId, setSelectedOrderId] = useState('GO7-001');
  const [customOrderId, setCustomOrderId] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  // Handle order journey simulation
  const handleSimulateJourney = async () => {
    setIsSimulating(true);
    const orderId = customOrderId || selectedOrderId;
    
    try {
      await simulateOrderJourney(orderId);
      alert(`Order journey simulation started for ${orderId}! Check the tracking page.`);
    } catch (error) {
      console.error('Error during simulation:', error);
      alert('Error during simulation. Check console for details.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Handle creating sample order
  const handleCreateSampleOrder = async () => {
    const orderId = customOrderId || selectedOrderId;
    
    try {
      await createSampleOrder(orderId);
      alert(`Sample order created: ${orderId}`);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error creating order. Check console for details.');
    }
  };

  // Handle status update
  const handleStatusUpdate = async (status: 'accepted' | 'picked_up' | 'en_route' | 'delivered') => {
    const orderId = customOrderId || selectedOrderId;
    
    try {
      await updateOrderStatus(orderId, status);
      alert(`Order ${orderId} status updated to: ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status. Check console for details.');
    }
  };

  // Handle sending test message
  const handleSendTestMessage = async (senderType: 'customer' | 'rider' | 'support', message: string) => {
    const orderId = customOrderId || selectedOrderId;
    const senderId = senderType === 'customer' ? 'customer123' : senderType === 'rider' ? 'AKEEM01' : 'support';
    
    try {
      await sendTestMessage(orderId, senderId, senderType, message);
      alert(`Test message sent to ${orderId}`);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Check console for details.');
    }
  };

  // Open tracking page
  const openTrackingPage = () => {
    const orderId = customOrderId || selectedOrderId;
    window.open(`/track/${orderId}`, '_blank');
  };

  return (
    <>
      {/* Document title set inline */}
      {typeof document !== 'undefined' && (document.title = 'Order Tracking Test - Go7')}

      <div style={{
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        background: '#f5f5f5',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            <h1 style={{ color: '#E30613', marginBottom: '10px' }}>🧪 Go7 Order Tracking Test</h1>
            <p style={{ color: '#666', margin: 0 }}>
              Test the customer-facing order tracking page with real-time updates
            </p>
          </div>

          {/* Order Selection */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            marginBottom: '25px'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>📋 Select Test Order</h2>
            
            {/* Pre-defined Orders */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
                Pre-defined Orders:
              </label>
              <select 
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                {SAMPLE_ORDERS.map(order => (
                  <option key={order.orderId} value={order.orderId}>
                    {order.orderId} - {order.items.join(', ')} (Rider: {order.riderId})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Order ID */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
                Or Enter Custom Order ID:
              </label>
              <input
                type="text"
                value={customOrderId}
                onChange={(e) => setCustomOrderId(e.target.value)}
                placeholder="e.g., GO7-CUSTOM-001"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Current Order Display */}
            <div style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <strong>Testing Order ID:</strong> {customOrderId || selectedOrderId}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            marginBottom: '25px'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>🚀 Quick Actions</h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <button
                onClick={handleCreateSampleOrder}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                📝 Create Sample Order
              </button>
              
              <button
                onClick={handleSimulateJourney}
                disabled={isSimulating}
                style={{
                  background: isSimulating ? '#ccc' : '#E30613',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isSimulating ? 'not-allowed' : 'pointer'
                }}
              >
                {isSimulating ? '🔄 Simulating...' : '🎬 Simulate Full Journey'}
              </button>
              
              <button
                onClick={openTrackingPage}
                style={{
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🔍 Open Tracking Page
              </button>
            </div>
            
            {/* Journey Simulation Info */}
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              padding: '15px',
              fontSize: '14px'
            }}>
              <strong>Full Journey Simulation:</strong> Creates order → Updates status (Accepted → Picked Up → En Route → Delivered) 
              with realistic timing and chat messages.
            </div>
          </div>

          {/* Manual Controls */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            marginBottom: '25px'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>🎛️ Manual Controls</h2>
            
            {/* Status Updates */}
            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ marginBottom: '15px', color: '#555' }}>Order Status Updates:</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '10px'
              }}>
                <button
                  onClick={() => handleStatusUpdate('accepted')}
                  style={{
                    background: '#ff9800',
                    color: 'white',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  ✅ Accepted
                </button>
                <button
                  onClick={() => handleStatusUpdate('picked_up')}
                  style={{
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  📦 Picked Up
                </button>
                <button
                  onClick={() => handleStatusUpdate('en_route')}
                  style={{
                    background: '#9C27B0',
                    color: 'white',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  🛵 En Route
                </button>
                <button
                  onClick={() => handleStatusUpdate('delivered')}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  🎉 Delivered
                </button>
              </div>
            </div>

            {/* Test Messages */}
            <div>
              <h3 style={{ marginBottom: '15px', color: '#555' }}>Send Test Messages:</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px'
              }}>
                <button
                  onClick={() => handleSendTestMessage('rider', 'Order received! Heading to restaurant now 🚗')}
                  style={{
                    background: '#E30613',
                    color: 'white',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🛵 Rider Message
                </button>
                <button
                  onClick={() => handleSendTestMessage('support', 'Hi! How can we help you today?')}
                  style={{
                    background: '#607D8B',
                    color: 'white',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🎧 Support Message
                </button>
                <button
                  onClick={() => handleSendTestMessage('customer', 'Thank you for the quick delivery!')}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  👤 Customer Message
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>📖 Testing Instructions</h2>
            
            <ol style={{ lineHeight: '1.8', color: '#555' }}>
              <li><strong>Create Order:</strong> Click "Create Sample Order" to set up test data</li>
              <li><strong>Open Tracking:</strong> Click "Open Tracking Page" to view the customer interface</li>
              <li><strong>Simulate Journey:</strong> Use "Simulate Full Journey" for automated testing</li>
              <li><strong>Manual Testing:</strong> Use manual controls to test specific scenarios</li>
              <li><strong>Real-time Updates:</strong> Changes appear instantly on the tracking page</li>
              <li><strong>Chat Testing:</strong> Send messages and see them appear in the chat box</li>
            </ol>

            <div style={{
              background: '#e8f5e8',
              border: '1px solid #4CAF50',
              borderRadius: '8px',
              padding: '15px',
              marginTop: '20px'
            }}>
              <strong style={{ color: '#4CAF50' }}>💡 Pro Tip:</strong> Open the tracking page in a new tab, 
              then use the controls here to see real-time updates!
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderTrackingTestPage;