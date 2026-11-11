/**
 * Riders Store - In-memory store for rider management
 * Handles rider status, location tracking, and assignment management
 */
import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Riders context
const RidersContext = createContext();

// Action types
const UPDATE_RIDER_STATUS = 'UPDATE_RIDER_STATUS';
const UPDATE_RIDER_LOCATION = 'UPDATE_RIDER_LOCATION';
const SET_RIDER_ASSIGNMENT = 'SET_RIDER_ASSIGNMENT';
const CLEAR_RIDER_ASSIGNMENT = 'CLEAR_RIDER_ASSIGNMENT';
const UPDATE_RIDER_STATS = 'UPDATE_RIDER_STATS';

// Riders reducer
const ridersReducer = (state, action) => {
  switch (action.type) {
    case UPDATE_RIDER_STATUS:
      return {
        ...state,
        riders: {
          ...state.riders,
          [action.payload.riderId]: {
            ...state.riders[action.payload.riderId],
            status: action.payload.status,
            lastStatusChange: new Date().toISOString()
          }
        }
      };
    
    case UPDATE_RIDER_LOCATION:
      return {
        ...state,
        riders: {
          ...state.riders,
          [action.payload.riderId]: {
            ...state.riders[action.payload.riderId],
            location: action.payload.location,
            lastLocationUpdate: new Date().toISOString()
          }
        }
      };
    
    case SET_RIDER_ASSIGNMENT:
      return {
        ...state,
        riders: {
          ...state.riders,
          [action.payload.riderId]: {
            ...state.riders[action.payload.riderId],
            currentAssignment: action.payload.assignment,
            status: 'assigned'
          }
        }
      };
    
    case CLEAR_RIDER_ASSIGNMENT:
      return {
        ...state,
        riders: {
          ...state.riders,
          [action.payload.riderId]: {
            ...state.riders[action.payload.riderId],
            currentAssignment: null,
            status: 'online'
          }
        }
      };
    
    case UPDATE_RIDER_STATS:
      return {
        ...state,
        riders: {
          ...state.riders,
          [action.payload.riderId]: {
            ...state.riders[action.payload.riderId],
            stats: {
              ...state.riders[action.payload.riderId].stats,
              ...action.payload.stats
            }
          }
        }
      };
    
    default:
      return state;
  }
};

// Mock current rider for prototype
const CURRENT_RIDER_ID = 'rider_current_user';

// Initial state
const initialState = {
  riders: {
    [CURRENT_RIDER_ID]: {
      id: CURRENT_RIDER_ID,
      name: 'Samuel Rider',
      phone: '+2348987654321',
      vehicle: 'motorcycle',
      status: 'offline', // offline, online, assigned, on-trip
      location: {
        lat: 6.4281,
        lng: 3.4219,
        accuracy: 10,
        timestamp: new Date().toISOString()
      },
      stats: {
        todayTrips: 8,
        todayEarnings: 12500,
        totalTrips: 156,
        rating: 4.8,
        onlineTime: 0 // in minutes
      },
      currentAssignment: null,
      lastStatusChange: new Date().toISOString(),
      lastLocationUpdate: new Date().toISOString()
    }
  }
};

// Riders provider component
export const RidersProvider = ({ children }) => {
  const [state, dispatch] = useReducer(ridersReducer, initialState);
  
  // Update rider status
  const updateRiderStatus = (riderId, status) => {
    dispatch({ 
      type: UPDATE_RIDER_STATUS, 
      payload: { riderId, status } 
    });
  };
  
  // Update rider location
  const updateRiderLocation = (riderId, location) => {
    dispatch({ 
      type: UPDATE_RIDER_LOCATION, 
      payload: { riderId, location } 
    });
  };
  
  // Set rider assignment
  const setRiderAssignment = (riderId, assignment) => {
    dispatch({ 
      type: SET_RIDER_ASSIGNMENT, 
      payload: { riderId, assignment } 
    });
  };
  
  // Clear rider assignment
  const clearRiderAssignment = (riderId) => {
    dispatch({ 
      type: CLEAR_RIDER_ASSIGNMENT, 
      payload: { riderId } 
    });
  };
  
  // Update rider stats
  const updateRiderStats = (riderId, stats) => {
    dispatch({ 
      type: UPDATE_RIDER_STATS, 
      payload: { riderId, stats } 
    });
  };
  
  // Get current rider
  const getCurrentRider = () => {
    return state.riders[CURRENT_RIDER_ID];
  };
  
  // Get rider by ID
  const getRiderById = (riderId) => {
    return state.riders[riderId];
  };
  
  const value = {
    riders: state.riders,
    currentRider: getCurrentRider(),
    currentRiderId: CURRENT_RIDER_ID,
    updateRiderStatus,
    updateRiderLocation,
    setRiderAssignment,
    clearRiderAssignment,
    updateRiderStats,
    getRiderById
  };
  
  return (
    <RidersContext.Provider value={value}>
      {children}
    </RidersContext.Provider>
  );
};

// Custom hook to use riders context
export const useRiders = () => {
  const context = useContext(RidersContext);
  if (!context) {
    throw new Error('useRiders must be used within a RidersProvider');
  }
  return context;
};
