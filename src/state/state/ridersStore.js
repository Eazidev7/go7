import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
const Ctx = createContext(null);

export function RidersProvider({ children }) {
  const [rider, setRiderState] = useState(() => {
    // Load rider from localStorage on init
    try {
      const stored = localStorage.getItem('go7-rider-data');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Enhanced setRider with localStorage persistence
  const setRider = (riderData) => {
    setRiderState(riderData);
    if (riderData) {
      localStorage.setItem('go7-rider-data', JSON.stringify(riderData));
    } else {
      localStorage.removeItem('go7-rider-data');
    }
  };

  // Helper functions
  const setStatus = (status) => {
    if (rider) {
      const updatedRider = { ...rider, status };
      setRider(updatedRider);
    }
  };

  const setCoords = (coords) => {
    if (rider) {
      const updatedRider = { ...rider, coords };
      setRider(updatedRider);
    }
  };

  const clearRider = () => setRider(null);

  const isOnline = () => {
    return rider?.status === 'online' || rider?.status === 'available';
  };

  const value = useMemo(() => ({ 
    rider, 
    setRider, 
    setStatus,
    setCoords,
    clearRider,
    isOnline: isOnline(),
    riderId: rider?.id,
    riderName: rider?.name || 'Unknown Rider',
    riderZone: rider?.zone || 'unassigned',
  }), [rider]);

  return React.createElement(Ctx.Provider, { value }, children);
}
export const useRider = () => useContext(Ctx);

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
// Custom hook to use riders context
export const useRiders = () => {
  const context = useContext(RidersContext);
  if (!context) {
    throw new Error('useRiders must be used within a RidersProvider');
  }
  return context;
};

// Export both stores
export const useRidersStore = useRider; // Main store for single rider page
