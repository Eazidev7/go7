import React, { createContext, useContext, useReducer } from 'react';

// Orders context
const OrdersContext = createContext();

// Action types
const ADD_ORDER = 'ADD_ORDER';
const UPDATE_ORDER = 'UPDATE_ORDER';

// Orders reducer
const ordersReducer = (state, action) => {
  switch (action.type) {
    case ADD_ORDER:
      return {
        ...state,
        orders: [...state.orders, { ...action.payload, id: Date.now().toString() }]
      };
    
    case UPDATE_ORDER:
      return {
        ...state,
        orders: state.orders.map(order => 
          order.id === action.payload.id 
            ? { ...order, ...action.payload.updates }
            : order
        )
      };
    
    default:
      return state;
  }
};

// Initial state with sample orders for testing dispatch SLA timers
const now = new Date();
const initialState = {
  orders: [
    // At risk pickup order (15 minutes ago, approaching 20 min limit)
    {
      id: 'test-001',
      status: 'pickup_in_progress',
      pickupStartedAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      pickedUpAt: null,
      deliveredAt: null,
      deliveryPriority: 'standard',
      pickup: { address: '123 Victoria Island, Lagos' },
      dropoff: { address: '456 Ikoyi, Lagos' },
      createdAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
      payment: { method: 'online' },
      reconciliation: { status: 'pending', collectedBy: null, collectedAt: null, proofUrl: null },
      receiptIssued: false
    },
    // Breached pickup order (25 minutes ago, over 20 min limit)
    {
      id: 'test-002',
      status: 'pickup_in_progress',
      pickupStartedAt: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
      pickedUpAt: null,
      deliveredAt: null,
      deliveryPriority: 'express',
      pickup: { address: '789 Lekki Phase 1, Lagos' },
      dropoff: { address: '321 Ajah, Lagos' },
      createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      payment: { method: 'pod_cash' },
      reconciliation: { status: 'pending', collectedBy: null, collectedAt: null, proofUrl: null },
      receiptIssued: false
    },
    // At risk delivery order (100 minutes in delivery, approaching 120 min express limit)
    {
      id: 'test-003',
      status: 'in_transit',
      pickupStartedAt: new Date(now.getTime() - 110 * 60 * 1000).toISOString(),
      pickedUpAt: new Date(now.getTime() - 100 * 60 * 1000).toISOString(),
      deliveredAt: null,
      deliveryPriority: 'express',
      pickup: { address: '555 Surulere, Lagos' },
      dropoff: { address: '777 Yaba, Lagos' },
      createdAt: new Date(now.getTime() - 120 * 60 * 1000).toISOString(),
      payment: { method: 'pod_transfer' },
      reconciliation: { status: 'pending', collectedBy: null, collectedAt: null, proofUrl: null },
      receiptIssued: false
    },
    // Breached delivery order (130 minutes in delivery, over 120 min express limit)
    {
      id: 'test-004',
      status: 'in_transit',
      pickupStartedAt: new Date(now.getTime() - 140 * 60 * 1000).toISOString(),
      pickedUpAt: new Date(now.getTime() - 130 * 60 * 1000).toISOString(),
      deliveredAt: null,
      deliveryPriority: 'express',
      pickup: { address: '999 Ikeja, Lagos' },
      dropoff: { address: '111 Maryland, Lagos' },
      createdAt: new Date(now.getTime() - 150 * 60 * 1000).toISOString(),
      payment: { method: 'online' },
      reconciliation: { status: 'pending', collectedBy: null, collectedAt: null, proofUrl: null },
      receiptIssued: false
    },
    // Normal order (5 minutes in pickup)
    {
      id: 'test-005',
      status: 'pickup_in_progress',
      pickupStartedAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
      pickedUpAt: null,
      deliveredAt: null,
      deliveryPriority: 'standard',
      pickup: { address: '222 Gbagada, Lagos' },
      dropoff: { address: '333 Ketu, Lagos' },
      createdAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      payment: { method: 'pod_cash' },
      reconciliation: { status: 'pending', collectedBy: null, collectedAt: null, proofUrl: null },
      receiptIssued: false
    },
    // Test order assigned to rider for PoD testing
    {
      id: 'test-006',
      status: 'assigned',
      riderId: 'rider_current_user',
      customerName: 'Alice Johnson',
      customerPhone: '+2348123456789',
      totalAmount: 3500,
      pickupStartedAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      deliveryPriority: 'standard',
      pickup: { 
        address: '456 Test Street, Ikeja, Lagos',
        lat: 6.4281,
        lng: 3.4219
      },
      dropoff: { 
        address: '789 Demo Avenue, Victoria Island, Lagos',
        lat: 6.4474,
        lng: 3.4653
      },
      customer: {
        name: 'Alice Johnson',
        phone: '+2348123456789'
      },
      createdAt: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
      payment: { method: 'pod_cash' },
      reconciliation: { status: 'pending', collectedBy: null, collectedAt: null, proofUrl: null },
      receiptIssued: false
    }
  ]
};

// Orders provider component
export const OrdersProvider = ({ children }) => {
  const [state, dispatch] = useReducer(ordersReducer, initialState);
  
  const addOrder = (orderData) => {
    const order = {
      ...orderData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      payment: {
        method: orderData.paymentMethod || 'pod_cash'
      },
      reconciliation: {
        status: 'pending', // pending | collected | verified
        collectedBy: null,
        collectedAt: null,
        proofUrl: null
      },
      receiptIssued: false
    };
    dispatch({ type: ADD_ORDER, payload: order });
    return order;
  };
  
  const updateOrder = (id, updates) => {
    dispatch({ type: UPDATE_ORDER, payload: { id, updates } });
  };
  
  const getOrder = (id) => {
    return state.orders.find(order => order.id === id);
  };
  
  const value = {
    orders: state.orders,
    addOrder,
    updateOrder,
    getOrder
  };
  
  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  );
};

// Custom hook to use orders context
export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
};
