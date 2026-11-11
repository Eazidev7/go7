import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  subscribeToOrder, 
  createOrder as createOrderService,
  updateOrderStatus,
  getUserOrders,
  ORDER_STATUS,
  ORDER_STATUS_LABELS
} from '../services/orderService';

const OrderContext = createContext();

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};

export const OrderProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Current order tracking
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Real-time subscription
  const [unsubscribeOrder, setUnsubscribeOrder] = useState(null);

  // Subscribe to current order updates
  useEffect(() => {
    if (currentOrder?.firebaseId) {
      const unsubscribe = subscribeToOrder(currentOrder.firebaseId, (orderData) => {
        if (orderData) {
          setCurrentOrder(prev => ({
            ...prev,
            ...orderData
          }));
        }
      });
      
      setUnsubscribeOrder(() => unsubscribe);
      
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [currentOrder?.firebaseId]);

  // Load user order history
  useEffect(() => {
    if (user?.uid) {
      loadOrderHistory();
    }
  }, [user]);

  const loadOrderHistory = async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      const orders = await getUserOrders(user.uid);
      setOrderHistory(orders);
      
      // Set current order if there's an active one
      const activeOrder = orders.find(order => 
        [ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PICKED_UP, ORDER_STATUS.ON_THE_WAY]
        .includes(order.status)
      );
      
      if (activeOrder && !currentOrder) {
        setCurrentOrder(activeOrder);
      }
      
    } catch (err) {
      console.error('Error loading order history:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createOrder = async (orderData) => {
    if (!user?.uid) {
      throw new Error('User must be logged in to create order');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Add user information to order data
      const enrichedOrderData = {
        ...orderData,
        userId: user.uid,
        customer: {
          name: user.displayName || orderData.customer?.name || 'Customer',
          phone: orderData.customer?.phone || '',
          email: user.email || orderData.customer?.email || ''
        }
      };

      const result = await createOrderService(enrichedOrderData);
      
      // Fetch the created order and set as current
      const orderRef = await subscribeToOrder(result.firebaseId, (orderData) => {
        if (orderData) {
          setCurrentOrder({
            firebaseId: result.firebaseId,
            ...orderData
          });
        }
      });

      // Refresh order history
      await loadOrderHistory();
      
      return result;
      
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const trackOrder = (firebaseId) => {
    // Find order in history
    const order = orderHistory.find(o => o.firebaseId === firebaseId);
    if (order) {
      setCurrentOrder(order);
    }
  };

  const clearCurrentOrder = () => {
    if (unsubscribeOrder) {
      unsubscribeOrder();
      setUnsubscribeOrder(null);
    }
    setCurrentOrder(null);
  };

  const getOrderStatus = (status) => {
    return ORDER_STATUS_LABELS[status] || status;
  };

  const isOrderActive = (order) => {
    return [
      ORDER_STATUS.PENDING,
      ORDER_STATUS.ACCEPTED,
      ORDER_STATUS.PICKED_UP,
      ORDER_STATUS.ON_THE_WAY
    ].includes(order?.status);
  };

  const isOrderCompleted = (order) => {
    return [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(order?.status);
  };

  const getOrderProgress = (status) => {
    const progressMap = {
      [ORDER_STATUS.PENDING]: 0,
      [ORDER_STATUS.ACCEPTED]: 25,
      [ORDER_STATUS.PICKED_UP]: 50,
      [ORDER_STATUS.ON_THE_WAY]: 75,
      [ORDER_STATUS.DELIVERED]: 100,
      [ORDER_STATUS.CANCELLED]: 0
    };
    return progressMap[status] || 0;
  };

  const getEstimatedDeliveryTime = (order) => {
    if (!order?.estimatedDeliveryTime) return null;
    
    // Convert Firestore timestamp to Date if needed
    let deliveryTime = order.estimatedDeliveryTime;
    if (deliveryTime?.toDate) {
      deliveryTime = deliveryTime.toDate();
    } else if (typeof deliveryTime === 'string') {
      deliveryTime = new Date(deliveryTime);
    }
    
    return deliveryTime;
  };

  const getTimeRemaining = (order) => {
    const estimatedTime = getEstimatedDeliveryTime(order);
    if (!estimatedTime) return null;
    
    const now = new Date();
    const timeDiff = estimatedTime - now;
    
    if (timeDiff <= 0) return 'Delivered';
    
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else {
      return `${remainingMinutes}m`;
    }
  };

  const hasActiveOrder = () => {
    return currentOrder && isOrderActive(currentOrder);
  };

  const getCurrentOrderId = () => {
    return currentOrder?.orderId || currentOrder?.firebaseId;
  };

  const refreshOrder = async () => {
    if (currentOrder?.firebaseId) {
      // Trigger a refresh by resubscribing
      clearCurrentOrder();
      setTimeout(() => {
        trackOrder(currentOrder.firebaseId);
      }, 100);
    }
  };

  const value = {
    // State
    currentOrder,
    orderHistory,
    isLoading,
    error,
    
    // Order management
    createOrder,
    trackOrder,
    clearCurrentOrder,
    loadOrderHistory,
    refreshOrder,
    
    // Order status helpers
    getOrderStatus,
    isOrderActive,
    isOrderCompleted,
    getOrderProgress,
    getEstimatedDeliveryTime,
    getTimeRemaining,
    hasActiveOrder,
    getCurrentOrderId,
    
    // Constants
    ORDER_STATUS,
    ORDER_STATUS_LABELS
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};

export default OrderContext;