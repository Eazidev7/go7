// Orders state management for GO7 delivery app
// React hook for managing order state

import { useState, useContext, createContext } from 'react';

// Create orders context
const OrdersContext = createContext();

// Mock orders data structure
const mockOrders = [
  {
    id: 'order_001',
    customer: 'John Doe',
    phone: '+2348012345678',
    amount: 5000,
    status: 'pending',
    paymentMethod: 'pod_cash', // pod_cash | pod_transfer | online
    podStatus: 'pending', // pending | collected | verified
    createdAt: new Date(),
    deliveryAddress: 'Abeokuta, Ogun State'
  },
  {
    id: 'order_002', 
    customer: 'Jane Smith',
    phone: '+2348087654321',
    amount: 3500,
    status: 'delivered',
    paymentMethod: 'pod_transfer',
    podStatus: 'collected',
    createdAt: new Date(),
    deliveryAddress: 'Lagos, Nigeria'
  }
];

/**
 * Orders context provider
 */
export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState(mockOrders);

  const updateOrder = (orderId, updates) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, ...updates, updatedAt: new Date() }
          : order
      )
    );
  };

  const addOrder = (orderData) => {
    const newOrder = {
      id: `order_${Date.now()}`,
      ...orderData,
      createdAt: new Date()
    };
    setOrders(prevOrders => [...prevOrders, newOrder]);
    return newOrder;
  };

  const deleteOrder = (orderId) => {
    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
  };

  const getOrdersByStatus = (status) => {
    return orders.filter(order => order.status === status);
  };

  const getOrdersByPaymentMethod = (paymentMethod) => {
    return orders.filter(order => order.paymentMethod === paymentMethod);
  };

  const value = {
    orders,
    updateOrder,
    addOrder,
    deleteOrder,
    getOrdersByStatus,
    getOrdersByPaymentMethod
  };

  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  );
}

/**
 * Hook to use orders context
 * @returns {Object} Orders state and methods
 */
export function useOrders() {
  const context = useContext(OrdersContext);
  
  if (!context) {
    console.warn('useOrders must be used within OrdersProvider, returning mock data');
    // Return mock implementation if not wrapped in provider
    return {
      orders: mockOrders,
      updateOrder: (orderId, updates) => {
        console.log('Mock updateOrder:', orderId, updates);
      },
      addOrder: (orderData) => {
        console.log('Mock addOrder:', orderData);
        return { id: `mock_${Date.now()}`, ...orderData };
      },
      deleteOrder: (orderId) => {
        console.log('Mock deleteOrder:', orderId);
      },
      getOrdersByStatus: (status) => {
        return mockOrders.filter(order => order.status === status);
      },
      getOrdersByPaymentMethod: (paymentMethod) => {
        return mockOrders.filter(order => order.paymentMethod === paymentMethod);
      }
    };
  }
  
  return context;
}

// Export default for convenience
export default {
  OrdersProvider,
  useOrders
};