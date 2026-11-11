// Simple rider system management library
// This is a simplified version for testing

let riders = {};

// Initialize a new rider
export function initializeRider(id, data) {
  riders[id] = {
    id,
    name: data?.name || 'Unnamed Rider',
    phone: data?.phone || 'Unknown',
    status: 'offline',
    vehicle: data?.vehicle || 'motorcycle',
    location: data?.location || null,
    onlineAt: null,
    lastLocationUpdate: null
  };
  return riders[id];
}

// Update rider status
export function updateRiderStatus(id, status) {
  if (!riders[id]) return null;
  
  riders[id].status = status;
  if (status === 'online') {
    riders[id].onlineAt = new Date().toISOString();
  }
  return riders[id];
}

// Update rider location
export function updateRiderLocation(id, location) {
  if (!riders[id]) return null;
  
  riders[id].location = {
    ...location,
    timestamp: new Date().toISOString()
  };
  riders[id].lastLocationUpdate = new Date().toISOString();
  return riders[id];
}

// Get all riders
export function getAllRiders() {
  return Object.values(riders);
}

// Get rider by ID
export function getRider(id) {
  return riders[id] || null;
}

// Clear all riders data
export function clearAllRiders() {
  riders = {};
  return true;
}

// Create a context provider for React components
import { createContext, useContext, useState, useEffect } from 'react';

// Create the riders context
const RidersContext = createContext();

// Rider Provider component
export function RidersProvider({ children }) {
  const [ridersList, setRidersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    setRidersList(getAllRiders());
    setLoading(false);
  }, []);

  // Refresh riders data
  const refreshRiders = () => {
    setRidersList(getAllRiders());
  };

  // Add or initialize a rider
  const addRider = (id, data) => {
    const rider = initializeRider(id, data);
    refreshRiders();
    return rider;
  };

  // Update rider status
  const setRiderStatus = (id, status) => {
    const updated = updateRiderStatus(id, status);
    refreshRiders();
    return updated;
  };

  // Update rider location
  const setRiderLocation = (id, location) => {
    const updated = updateRiderLocation(id, location);
    refreshRiders();
    return updated;
  };

  // Reset all riders
  const resetRiders = () => {
    clearAllRiders();
    refreshRiders();
  };

  return (
    <RidersContext.Provider value={{
      riders: ridersList,
      loading,
      addRider,
      setRiderStatus,
      setRiderLocation,
      refreshRiders,
      resetRiders
    }}>
      {children}
    </RidersContext.Provider>
  );
}

// Hook for using riders context
export function useRiders() {
  const context = useContext(RidersContext);
  if (!context) {
    throw new Error('useRiders must be used within a RidersProvider');
  }
  return context;
}