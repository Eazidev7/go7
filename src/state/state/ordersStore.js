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

// Initial state
const initialState = {
  orders: []
};

// Orders provider component
export const OrdersProvider = ({ children }) => {
  const [state, dispatch] = useReducer(ordersReducer, initialState);
  
  const addOrder = (order) => {
    dispatch({ type: ADD_ORDER, payload: order });
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
