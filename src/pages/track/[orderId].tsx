'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, collection, addDoc, orderBy, query, serverTimestamp, getDoc } from 'firebase/firestore';
import DeliveryMap from '../../components/DeliveryMap';
import CustomerToast from '../../components/modals/CustomerToast';
import { useToast } from '../../hooks/useToast';

// TypeScript interfaces for data structures
interface Order {
  orderId: string;
  customerId: string;
  riderId: string;
  pickup: [number, number];
  dropoff: [number, number];
  fee: string;
  status: 'accepted' | 'picked_up' | 'en_route' | 'delivered';
  customerName: string;
  customerPhone: string;
  items: string[];
  timestamp: any;
  estimatedDeliveryTime?: string;
}

interface ChatMessage {
  messageId: string;
  senderId: string;
  senderType: 'customer' | 'rider' | 'support';
  message: string;
  timestamp: any;
  isRead: boolean;
}

// Order status configuration for UI display
const ORDER_STEPS = [
  { id: 'accepted', text: 'Order Accepted', icon: '✅', description: 'Your order has been confirmed' },
  { id: 'picked_up', text: 'Picked Up', icon: '📦', description: 'Rider has collected your order' },
  { id: 'en_route', text: 'En Route', icon: '🛵', description: 'Rider is heading to you' },
  { id: 'delivered', text: 'Delivered', icon: '🎉', description: 'Order successfully delivered' }
];

const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  
  // State management
  const [order, setOrder] = useState<Order | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Refs for functionality
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const orderUnsubscribe = useRef<(() => void) | null>(null);
  const chatUnsubscribe = useRef<(() => void) | null>(null);
  const previousStatus = useRef<string | null>(null);

  // Toast notifications
  const { showToast, ToastManager } = useToast();

  // Get current order status step index
  const getCurrentStatusIndex = (status: string): number => {
    return ORDER_STEPS.findIndex(step => step.id === status);
  };

  // Fetch order data from Firestore
  const fetchOrderData = async () => {
    if (!orderId || typeof orderId !== 'string') return;

    console.log(`📋 Fetching order data for: ${orderId}`);
    
    try {
      const orderDocRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderDocRef);
      
      if (orderSnap.exists()) {
        const orderData = orderSnap.data() as Order;
        setOrder({ ...orderData, orderId });
        setIsLoading(false);
        setIsConnected(true);
        console.log('✅ Order data loaded:', orderData);
      } else {
        console.error('❌ Order not found');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Error fetching order:', error);
      setIsLoading(false);
    }
  };

  // Subscribe to real-time order updates
  const subscribeToOrderUpdates = () => {
    if (!orderId || typeof orderId !== 'string') return;

    console.log(`📡 Subscribing to order updates: ${orderId}`);
    
    const orderDocRef = doc(db, 'orders', orderId);
    
    const unsubscribe = onSnapshot(orderDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const orderData = docSnapshot.data() as Order;
        
        // Check for status changes and show toast notifications
        if (previousStatus.current && previousStatus.current !== orderData.status) {
          console.log(`🔔 Status changed: ${previousStatus.current} → ${orderData.status}`);
          
          // Show toast notification for status change
          const statusMessages = {
            accepted: 'Your order has been accepted by a rider! 🎉',
            picked_up: 'Your order has been picked up! 📦',
            en_route: 'Your rider is on the way! 🛵',
            delivered: 'Your order has been delivered! 🎉'
          };
          
          const message = statusMessages[orderData.status];
          if (message) {
            showToast(orderData.status, message);
          }
        }
        
        // Update state and previous status
        setOrder({ ...orderData, orderId });
        previousStatus.current = orderData.status;
        setIsConnected(true);
        console.log('🔄 Order updated:', orderData.status);
      } else {
        setIsConnected(false);
        console.warn('⚠️ Order document not found');
      }
    }, (error) => {
      console.error('❌ Error subscribing to order updates:', error);
      setIsConnected(false);
    });

    orderUnsubscribe.current = unsubscribe;
  };

  // Subscribe to chat messages
  const subscribeToChatMessages = () => {
    if (!orderId || typeof orderId !== 'string') return;

    console.log(`💬 Subscribing to chat messages: ${orderId}`);
    
    const chatRef = collection(db, 'chats', orderId, 'messages');
    const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(chatQuery, (querySnapshot) => {
      const messages: ChatMessage[] = [];
      let unreadMessages = 0;
      
      querySnapshot.forEach((doc) => {
        const messageData = doc.data() as ChatMessage;
        messages.push({ ...messageData, messageId: doc.id });
        
        // Count unread messages from rider/support
        if (!messageData.isRead && messageData.senderType !== 'customer') {
          unreadMessages++;
        }
      });
      
      setChatMessages(messages);
      setUnreadCount(unreadMessages);
      
      // Auto-scroll to latest message
      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
      }, 100);
      
      console.log(`💬 Chat messages updated: ${messages.length} messages`);
    }, (error) => {
      console.error('❌ Error subscribing to chat:', error);
    });

    chatUnsubscribe.current = unsubscribe;
  };

  // Send a chat message
  const sendMessage = async () => {
    if (!newMessage.trim() || !orderId) return;

    try {
      const messageData = {
        senderId: 'customer', // In real app, get from auth
        senderType: 'customer' as const,
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
        isRead: false
      };

      const chatRef = collection(db, 'chats', orderId as string, 'messages');
      await addDoc(chatRef, messageData);
      
      setNewMessage('');
      console.log('✅ Message sent:', messageData.message);
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  };

  // Handle Enter key press in chat input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Initialize subscriptions
  useEffect(() => {
    if (orderId) {
      fetchOrderData();
      subscribeToOrderUpdates();
      subscribeToChatMessages();
    }

    // Cleanup subscriptions
    return () => {
      if (orderUnsubscribe.current) {
        orderUnsubscribe.current();
      }
      if (chatUnsubscribe.current) {
        chatUnsubscribe.current();
      }
    };
  }, [orderId]);

  // Loading state
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #E30613',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <div>Loading your order...</div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Order not found state
  if (!order) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div>
          <h2 style={{ color: '#E30613', marginBottom: '20px' }}>Order Not Found</h2>
          <p>We couldn't find an order with ID: <strong>{orderId}</strong></p>
          <p>Please check your order ID and try again.</p>
        </div>
      </div>
    );
  }

  const currentStatusIndex = getCurrentStatusIndex(order.status);

  return (
    <>
      {/* Document title set via useEffect */}
      {typeof document !== 'undefined' && (document.title = `Track Order ${orderId} - Go7 Delivery`)}

      <div style={{
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        background: '#f5f5f5',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <header style={{
          background: 'white',
          padding: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h1 style={{ 
                  margin: '0 0 5px 0', 
                  color: '#E30613', 
                  fontSize: 'clamp(1.5rem, 4vw, 2rem)' 
                }}>
                  Track Your Order
                </h1>
                <p style={{ 
                  margin: 0, 
                  color: '#666', 
                  fontSize: '14px' 
                }}>
                  Order ID: {orderId}
                </p>
              </div>
              
              {/* Connection Status */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: isConnected ? '#4CAF50' : '#f44336',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'currentColor',
                  animation: isConnected ? 'pulse-dot 2s infinite' : 'none'
                }} />
                {isConnected ? 'Live Updates' : 'Offline'}
              </div>
            </div>
          </div>
        </header>

        {/* Order Status Tracker */}
        <div style={{
          background: 'white',
          padding: '30px 20px',
          margin: '20px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ 
              textAlign: 'center', 
              marginBottom: '30px', 
              color: '#333',
              fontSize: 'clamp(1.2rem, 3vw, 1.5rem)'
            }}>
              Order Status
            </h2>
            
            {/* Status Steps */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
              flexWrap: 'wrap',
              gap: '20px'
            }}>
              {/* Progress Line */}
              <div style={{
                position: 'absolute',
                top: '25px',
                left: '12.5%',
                right: '12.5%',
                height: '3px',
                background: '#e0e0e0',
                zIndex: 1
              }}>
                <div style={{
                  height: '100%',
                  background: '#E30613',
                  width: `${(currentStatusIndex / (ORDER_STEPS.length - 1)) * 100}%`,
                  transition: 'width 0.5s ease'
                }} />
              </div>

              {ORDER_STEPS.map((step, index) => (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    minWidth: '120px',
                    position: 'relative',
                    zIndex: 2
                  }}
                >
                  {/* Step Icon */}
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: index <= currentStatusIndex ? '#E30613' : '#e0e0e0',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    marginBottom: '10px',
                    transition: 'all 0.3s ease',
                    transform: index === currentStatusIndex ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: index === currentStatusIndex ? '0 4px 15px rgba(227, 6, 19, 0.4)' : 'none'
                  }}>
                    {step.icon}
                  </div>
                  
                  {/* Step Text */}
                  <div style={{
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: index <= currentStatusIndex ? '#E30613' : '#999',
                    marginBottom: '5px'
                  }}>
                    {step.text}
                  </div>
                  
                  {/* Step Description */}
                  <div style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#666',
                    lineHeight: '1.3'
                  }}>
                    {step.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div style={{
          background: 'white',
          padding: '20px',
          margin: '0 20px 20px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '15px', color: '#333' }}>Order Details</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px'
            }}>
              <div>
                <strong>Customer:</strong> {order.customerName}<br />
                <strong>Phone:</strong> {order.customerPhone}
              </div>
              <div>
                <strong>Rider ID:</strong> {order.riderId}<br />
                <strong>Delivery Fee:</strong> {order.fee}
              </div>
              <div>
                <strong>Items:</strong><br />
                {order.items?.join(', ') || 'Order items'}
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Map */}
        <div style={{
          background: 'white',
          margin: '0 20px 100px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          height: '500px'
        }}>
          <DeliveryMap
            pickup={order.pickup}
            dropoff={order.dropoff}
            fee={order.fee}
            riderId={order.riderId}
          />
        </div>

        {/* Chat Toggle Button */}
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            style={{
              background: '#E30613',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              padding: '15px 20px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(227, 6, 19, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              position: 'relative'
            }}
          >
            💬 Chat
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#ff4444',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Chat Box */}
        {isChatOpen && (
          <div style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '350px',
            maxWidth: 'calc(100vw - 40px)',
            height: '400px',
            background: 'white',
            borderRadius: '15px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000
          }}>
            {/* Chat Header */}
            <div style={{
              background: '#E30613',
              color: 'white',
              padding: '15px',
              borderRadius: '15px 15px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong>Chat with Rider</strong>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  Order #{orderId}
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                ×
              </button>
            </div>

            {/* Chat Messages */}
            <div
              ref={chatMessagesRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '15px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {chatMessages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#666',
                  padding: '20px',
                  fontSize: '14px'
                }}>
                  No messages yet. Start a conversation!
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.messageId}
                    style={{
                      alignSelf: msg.senderType === 'customer' ? 'flex-end' : 'flex-start',
                      maxWidth: '80%'
                    }}
                  >
                    <div style={{
                      background: msg.senderType === 'customer' ? '#E30613' : '#f0f0f0',
                      color: msg.senderType === 'customer' ? 'white' : '#333',
                      padding: '10px 15px',
                      borderRadius: '15px',
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}>
                      {msg.message}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#666',
                      marginTop: '2px',
                      textAlign: msg.senderType === 'customer' ? 'right' : 'left'
                    }}>
                      {msg.senderType === 'customer' ? 'You' : 'Rider'}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <div style={{
              padding: '15px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              gap: '10px'
            }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '20px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                style={{
                  background: newMessage.trim() ? '#E30613' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                📤
              </button>
            </div>
          </div>
        )}

        {/* CSS Animations */}
        <style>{`
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          @media (max-width: 768px) {
            .status-steps {
              flex-direction: column;
              align-items: stretch;
            }
            
            .progress-line {
              display: none;
            }
          }
        `}</style>
      </div>
      
      {/* Toast Notifications */}
      <ToastManager />
    </>
  );
};

export default OrderTrackingPage;