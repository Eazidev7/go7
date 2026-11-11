'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { doc, getDoc, updateDoc, onSnapshot, collection, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface Order {
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickup: [number, number];
  dropoff: [number, number];
  fee: string;
  items: string[];
  status: 'new' | 'accepted' | 'picked_up' | 'en_route' | 'delivered';
  estimatedDeliveryTime?: string;
  timestamp: any;
  riderId?: string;
}

interface ChatMessage {
  messageId: string;
  senderId: string;
  senderType: 'customer' | 'rider' | 'support';
  message: string;
  timestamp: any;
  isRead: boolean;
}

interface GPSTracking {
  enabled: boolean;
  intervalId: number | null;
  lastPosition: GeolocationPosition | null;
}

const RiderOrderPage: React.FC = () => {
  const router = useRouter();
  const { orderId } = router.query;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [riderId, setRiderId] = useState<string>('');
  const [riderName, setRiderName] = useState<string>('');
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  
  // GPS tracking state
  const [gpsTracking, setGpsTracking] = useState<GPSTracking>({
    enabled: false,
    intervalId: null,
    lastPosition: null
  });
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  useEffect(() => {
    // Check authentication
    const storedRiderId = localStorage.getItem('riderId');
    const storedRiderName = localStorage.getItem('riderName');
    
    if (!storedRiderId) {
      router.push('/rider/login');
      return;
    }

    setRiderId(storedRiderId);
    setRiderName(storedRiderName || 'Rider');

    if (orderId && typeof orderId === 'string') {
      loadOrderData(orderId);
      subscribeToOrderUpdates(orderId);
      subscribeToChatMessages(orderId);
    }

    // Check location permission
    checkLocationPermission();

    // Cleanup GPS tracking on unmount
    return () => {
      if (gpsTracking.intervalId) {
        clearInterval(gpsTracking.intervalId);
      }
    };
  }, [orderId, router]);

  const loadOrderData = async (orderId: string) => {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        const orderData = orderDoc.data() as Order;
        setOrder({ ...orderData, orderId });
      } else {
        alert('Order not found');
        router.push('/rider/dashboard');
      }
    } catch (error) {
      console.error('Error loading order:', error);
    }
  };

  const subscribeToOrderUpdates = (orderId: string) => {
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (doc) => {
      if (doc.exists()) {
        const orderData = doc.data() as Order;
        setOrder({ ...orderData, orderId });
      }
    });

    return unsubscribe;
  };

  const subscribeToChatMessages = (orderId: string) => {
    const chatRef = collection(db, 'chats', orderId, 'messages');
    const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      const messages: ChatMessage[] = [];
      let unreadMessages = 0;
      
      snapshot.forEach((doc) => {
        const messageData = doc.data() as ChatMessage;
        messages.push({ ...messageData, messageId: doc.id });
        
        // Count unread messages from customer/support
        if (!messageData.isRead && messageData.senderType !== 'rider') {
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
    });

    return unsubscribe;
  };

  const checkLocationPermission = async () => {
    if ('geolocation' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(permission.state);
        
        permission.addEventListener('change', () => {
          setLocationPermission(permission.state);
        });
      } catch (error) {
        console.log('Permission query not supported');
      }
    }
  };

  const startGPSTracking = async () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    try {
      // Get initial position
      const position = await getCurrentPosition();
      console.log('📍 Initial GPS position:', position.coords);
      
      // Update rider location in Firestore
      await updateRiderLocation(position);
      
      // Start periodic updates every 3 seconds
      const intervalId = setInterval(async () => {
        try {
          const newPosition = await getCurrentPosition();
          await updateRiderLocation(newPosition);
          setGpsTracking(prev => ({ ...prev, lastPosition: newPosition }));
        } catch (error) {
          console.error('GPS update error:', error);
        }
      }, 3000);

      setGpsTracking({
        enabled: true,
        intervalId: intervalId as unknown as number, // Cast to number to satisfy TypeScript
        lastPosition: position
      });

      console.log('✅ GPS tracking started');
    } catch (error) {
      console.error('Failed to start GPS tracking:', error);
      alert('Failed to access location. Please enable location services.');
    }
  };

  const stopGPSTracking = () => {
    if (gpsTracking.intervalId) {
      clearInterval(gpsTracking.intervalId);
    }
    
    setGpsTracking({
      enabled: false,
      intervalId: null,
      lastPosition: null
    });

    console.log('🛑 GPS tracking stopped');
  };

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
    });
  };

  const updateRiderLocation = async (position: GeolocationPosition) => {
    if (!riderId || !orderId) return;

    try {
      const riderLocationData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: serverTimestamp(),
        riderId: riderId,
        currentOrderId: orderId,
        status: order?.status || 'unknown'
      };

      await updateDoc(doc(db, 'riders', riderId), riderLocationData);
      console.log('📍 Location updated:', riderLocationData);
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const updateOrderStatus = async (newStatus: Order['status']) => {
    if (!order || !riderId) return;

    try {
      const updateData: any = {
        status: newStatus,
        [`${newStatus}At`]: serverTimestamp()
      };

      // Start GPS tracking when order is accepted
      if (newStatus === 'accepted' && !gpsTracking.enabled) {
        await startGPSTracking();
      }

      // Stop GPS tracking when delivered
      if (newStatus === 'delivered' && gpsTracking.enabled) {
        stopGPSTracking();
      }

      await updateDoc(doc(db, 'orders', order.orderId), updateData);
      console.log(`✅ Order status updated to: ${newStatus}`);
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !orderId) return;

    try {
      const messageData = {
        senderId: riderId,
        senderType: 'rider' as const,
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
        isRead: false
      };

      const chatRef = collection(db, 'chats', orderId as string, 'messages');
      await addDoc(chatRef, messageData);
      
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      new: '#F59E0B',
      accepted: '#3B82F6',
      picked_up: '#6366F1',
      en_route: '#8B5CF6',
      delivered: '#10B981'
    };
    return colors[status as keyof typeof colors] || '#6B7280';
  };

  const getNextStatusAction = () => {
    if (!order) return null;

    const statusFlow = {
      accepted: { next: 'picked_up', label: '📦 Mark as Picked Up', color: '#6366F1' },
      picked_up: { next: 'en_route', label: '🛵 Start Delivery', color: '#8B5CF6' },
      en_route: { next: 'delivered', label: '🎉 Mark as Delivered', color: '#10B981' }
    };

    return statusFlow[order.status as keyof typeof statusFlow] || null;
  };

  if (isLoading || !order) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F9FAFB'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #E5E7EB',
            borderTop: '4px solid #E30613',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6B7280' }}>Loading order...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', paddingBottom: '80px' }}>
      {/* Header */}
      <header style={{
        background: 'white',
        padding: '16px 20px',
        borderBottom: '1px solid #E5E7EB',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <button
              onClick={() => router.push('/rider/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                marginRight: '12px'
              }}
            >
              ←
            </button>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1F2937' }}>
              {order.orderId}
            </span>
          </div>
          
          <div style={{
            padding: '8px 16px',
            background: getStatusColor(order.status),
            color: 'white',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {order.status.replace('_', ' ').toUpperCase()}
          </div>
        </div>
      </header>

      {/* GPS Status */}
      {['accepted', 'picked_up', 'en_route'].includes(order.status) && (
        <div style={{
          background: gpsTracking.enabled ? '#D1FAE5' : '#FEE2E2',
          padding: '12px 20px',
          borderBottom: '1px solid #E5E7EB'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: gpsTracking.enabled ? '#10B981' : '#EF4444'
              }} />
              <span style={{ 
                fontSize: '14px', 
                color: gpsTracking.enabled ? '#059669' : '#DC2626',
                fontWeight: '500'
              }}>
                {gpsTracking.enabled ? '📍 GPS Tracking Active' : '❌ GPS Tracking Offline'}
              </span>
            </div>
            
            {!gpsTracking.enabled && (
              <button
                onClick={startGPSTracking}
                style={{
                  padding: '6px 12px',
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Enable GPS
              </button>
            )}
          </div>
        </div>
      )}

      {/* Order Details */}
      <div style={{ padding: '20px' }}>
        {/* Customer Info */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1F2937', marginBottom: '12px' }}>
            Customer Information
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#E30613',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              👤
            </div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', margin: 0 }}>
                {order.customerName}
              </p>
              <a 
                href={`tel:${order.customerPhone}`}
                style={{ 
                  fontSize: '14px', 
                  color: '#E30613', 
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                📞 {order.customerPhone}
              </a>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>
              Delivery Details
            </h3>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#E30613' }}>
              {order.fee}
            </div>
          </div>

          {/* Pickup */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              marginTop: '6px',
              flexShrink: 0
            }} />
            <div>
              <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>
                PICKUP LOCATION
              </p>
              <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                {order.pickupAddress || `${order.pickup[1]}, ${order.pickup[0]}`}
              </p>
            </div>
          </div>

          {/* Dropoff */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#E30613',
              marginTop: '6px',
              flexShrink: 0
            }} />
            <div>
              <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>
                DELIVERY LOCATION
              </p>
              <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                {order.dropoffAddress || `${order.dropoff[1]}, ${order.dropoff[0]}`}
              </p>
            </div>
          </div>

          {/* Items */}
          <div>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>
              ITEMS ({order.items.length})
            </p>
            <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
              {order.items.join(', ')}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {getNextStatusAction() && (
          <button
            onClick={() => updateOrderStatus(getNextStatusAction()!.next as Order['status'])}
            style={{
              width: '100%',
              padding: '16px',
              background: getNextStatusAction()!.color,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: '16px'
            }}
          >
            {getNextStatusAction()!.label}
          </button>
        )}
      </div>

      {/* Chat Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '56px',
          height: '56px',
          background: '#E30613',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}
      >
        💬
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '20px',
            height: '20px',
            background: '#FF4444',
            color: 'white',
            borderRadius: '50%',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Chat Modal */}
      {isChatOpen && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          width: '350px',
          maxWidth: 'calc(100vw - 40px)',
          height: '400px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000
        }}>
          {/* Chat Header */}
          <div style={{
            background: '#E30613',
            color: 'white',
            padding: '16px',
            borderRadius: '12px 12px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <strong>Chat with Customer</strong>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                {order.customerName}
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer'
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
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            {chatMessages.map((message) => (
              <div
                key={message.messageId}
                style={{
                  alignSelf: message.senderType === 'rider' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}
              >
                <div style={{
                  background: message.senderType === 'rider' ? '#E30613' : '#F3F4F6',
                  color: message.senderType === 'rider' ? 'white' : '#374151',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  fontSize: '14px'
                }}>
                  {message.message}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#9CA3AF',
                  marginTop: '2px',
                  textAlign: message.senderType === 'rider' ? 'right' : 'left'
                }}>
                  {message.senderType === 'customer' ? 'Customer' : 
                   message.senderType === 'support' ? 'Support' : 'You'}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                style={{
                  padding: '10px 16px',
                  background: newMessage.trim() ? '#E30613' : '#9CA3AF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: newMessage.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RiderOrderPage;