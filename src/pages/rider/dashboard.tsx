'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import RiderOrderModal from '../../components/modals/RiderOrderModal';
import notificationService from '../../services/NotificationService';

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

const RiderDashboard: React.FC = () => {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'accepted' | 'delivered'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [riderId, setRiderId] = useState<string>('');
  const [riderName, setRiderName] = useState<string>('');
  const [isOnline, setIsOnline] = useState(true);
  
  // Toast notification state
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error', show: boolean}>({
    message: '',
    type: 'success',
    show: false
  });

  // Modal state for incoming orders
  const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, show: true });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

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

    // Subscribe to orders
    subscribeToOrders(storedRiderId);
  }, [router]);

  useEffect(() => {
    // Filter orders based on status
    if (statusFilter === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.status === statusFilter));
    }
  }, [orders, statusFilter]);

  const subscribeToOrders = (riderId: string) => {
    console.log('📱 Subscribing to orders for rider:', riderId);

    // Query for orders assigned to this rider OR new unassigned orders
    const ordersQuery = query(
      collection(db, 'orders'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersList: Order[] = [];
      
      snapshot.forEach((doc) => {
        const orderData = doc.data() as Order;
        
        // Include if it's assigned to this rider OR if it's a new unassigned order
        if (orderData.riderId === riderId || (orderData.status === 'new' && !orderData.riderId)) {
          ordersList.push({
            ...orderData,
            orderId: doc.id
          });
        }
      });

      console.log(`📦 Loaded ${ordersList.length} orders for rider`);
      setOrders(ordersList);
      setIsLoading(false);
    }, (error) => {
      console.error('❌ Error loading orders:', error);
      setIsLoading(false);
    });

    return unsubscribe;
  };

  // Handle incoming order notifications
  const handleIncomingOrder = (order: Order) => {
    console.log('🔔 New order notification:', order);
    setIncomingOrder(order);
    setShowOrderModal(true);
  };

  // Subscribe to notification service for incoming orders
  useEffect(() => {
    if (riderId && isOnline) {
      const unsubscribe = notificationService.subscribeToRiderOrders(riderId, handleIncomingOrder);
      
      return () => {
        unsubscribe();
      };
    }
  }, [riderId, isOnline]);

  const handleAcceptOrder = async (orderId: string) => {
    try {
      // Show loading state
      console.log('🔄 Accepting order:', orderId);
      
      // Use notification service for order acceptance
      const success = await notificationService.acceptOrder(orderId, riderId);
      
      if (success) {
        console.log('✅ Order accepted successfully:', orderId);
        
        // Close modal if it was from an incoming order
        setShowOrderModal(false);
        setIncomingOrder(null);
        
        // Show confirmation toast
        showToast('Order Accepted! 🎉', 'success');
        
        // Navigate to order details for rider management
        router.push(`/rider/order/${orderId}`);
      } else {
        throw new Error('Failed to accept order');
      }
      
    } catch (error) {
      console.error('❌ Error accepting order:', error);
      showToast('Failed to accept order. Please try again.', 'error');
    }
  };

  // Handle rejecting an order from the modal
  const handleRejectOrder = async (orderId: string) => {
    try {
      const success = await notificationService.rejectOrder(orderId, riderId, 'manual_reject');
      
      if (success) {
        setShowOrderModal(false);
        setIncomingOrder(null);
        showToast('Order rejected', 'success');
      } else {
        throw new Error('Failed to reject order');
      }
    } catch (error) {
      console.error('❌ Error rejecting order:', error);
      showToast('Failed to reject order. Please try again.', 'error');
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'delivered',
        deliveredAt: new Date()
      });

      console.log('✅ Order marked as delivered:', orderId);
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      alert('Failed to update order status. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('riderId');
      localStorage.removeItem('riderName');
      localStorage.removeItem('riderPhone');
      router.push('/rider/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleOnlineStatus = () => {
    setIsOnline(!isOnline);
    // TODO: Update rider status in Firestore
  };

  const maskPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    return phone.replace(/(\+\d{3})(\d{3})(\d{3})(\d{4})/, '$1 $2 ••• ••••');
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      new: { bg: '#FEF3C7', color: '#D69E2E', text: '🆕 New' },
      accepted: { bg: '#DBEAFE', color: '#3B82F6', text: '✅ Accepted' },
      picked_up: { bg: '#E0E7FF', color: '#6366F1', text: '📦 Picked Up' },
      en_route: { bg: '#F3E8FF', color: '#8B5CF6', text: '🛵 En Route' },
      delivered: { bg: '#D1FAE5', color: '#059669', text: '🎉 Delivered' }
    };

    const style = styles[status as keyof typeof styles] || styles.new;
    
    return (
      <span style={{
        background: style.bg,
        color: style.color,
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        {style.text}
      </span>
    );
  };

  if (isLoading) {
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
          <p style={{ color: '#6B7280' }}>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#E30613',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              🏍️
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>
                Hello, {riderName}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isOnline ? '#10B981' : '#EF4444'
                }} />
                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={toggleOnlineStatus}
              style={{
                padding: '8px 12px',
                background: isOnline ? '#EF4444' : '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {isOnline ? 'Go Offline' : 'Go Online'}
            </button>
            
            <button
              onClick={handleLogout}
              style={{
                padding: '8px',
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              🚪
            </button>
          </div>
        </div>
      </header>

      {/* Status Filter */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {[
            { key: 'all', label: 'All Orders', count: orders.length },
            { key: 'new', label: 'New', count: orders.filter(o => o.status === 'new').length },
            { key: 'accepted', label: 'Active', count: orders.filter(o => ['accepted', 'picked_up', 'en_route'].includes(o.status)).length },
            { key: 'delivered', label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key as any)}
              style={{
                padding: '12px 16px',
                background: statusFilter === filter.key ? '#E30613' : 'white',
                color: statusFilter === filter.key ? 'white' : '#374151',
                border: '1px solid #E5E7EB',
                borderRadius: '24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {filter.label}
              <span style={{
                background: statusFilter === filter.key ? 'rgba(255,255,255,0.2)' : '#F3F4F6',
                color: statusFilter === filter.key ? 'white' : '#374151',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div style={{ padding: '0 20px 20px' }}>
        {filteredOrders.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <h3 style={{ fontSize: '18px', color: '#374151', marginBottom: '8px' }}>
              No orders found
            </h3>
            <p style={{ color: '#6B7280', fontSize: '14px' }}>
              {statusFilter === 'all' 
                ? 'No orders available at the moment'
                : `No ${statusFilter} orders found`
              }
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredOrders.map((order) => (
              <div
                key={order.orderId}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #E5E7EB',
                  cursor: 'pointer'
                }}
                onClick={() => router.push(`/rider/order/${order.orderId}`)}
              >
                {/* Order Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}>
                  <div>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#1F2937',
                      margin: '0 0 4px 0'
                    }}>
                      {order.orderId}
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: '#6B7280',
                      margin: 0
                    }}>
                      {order.customerName} • {maskPhoneNumber(order.customerPhone)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {getStatusBadge(order.status)}
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#E30613',
                      marginTop: '4px'
                    }}>
                      {order.fee}
                    </div>
                  </div>
                </div>

                {/* Addresses */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '8px'
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
                      <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 2px 0' }}>
                        PICKUP
                      </p>
                      <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                        {order.pickupAddress || `${order.pickup[1]}, ${order.pickup[0]}`}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
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
                      <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 2px 0' }}>
                        DROPOFF
                      </p>
                      <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                        {order.dropoffAddress || `${order.dropoff[1]}, ${order.dropoff[0]}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>
                    ITEMS ({order.items.length})
                  </p>
                  <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                    {order.items.join(', ')}
                  </p>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {order.status === 'new' && !order.riderId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptOrder(order.orderId);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      🚀 Accept Order
                    </button>
                  )}
                  
                  {order.status === 'en_route' && order.riderId === riderId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkDelivered(order.orderId);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: '#E30613',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ✅ Mark as Delivered
                    </button>
                  )}
                  
                  {['accepted', 'picked_up', 'en_route'].includes(order.status) && order.riderId === riderId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/rider/order/${order.orderId}`);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: '#6B7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      📱 Manage Order
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          padding: '16px 24px',
          borderRadius: '8px',
          background: toast.type === 'success' ? '#10B981' : '#EF4444',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          animation: 'slideIn 0.3s ease-out',
          maxWidth: '400px'
        }}>
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Rider Order Modal */}
      <RiderOrderModal
        order={incomingOrder}
        isOpen={showOrderModal}
        onClose={() => {
          setShowOrderModal(false);
          setIncomingOrder(null);
        }}
        riderId={riderId}
      />
    </div>
  );
};

export default RiderDashboard;