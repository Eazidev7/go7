/**
 * Auto-Dispatch React Hook
 * Provides auto-dispatch functionality to React components
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  createOrder,
  subscribeToOrder,
  subscribeToAssignments,
  subscribeToAvailableRiders,
  subscribeToOrdersByStatus,
  subscribeToRiderOrders,
  handleRiderResponse,
  updateRiderStatus,
  ZONES,
  ORDER_STATUS,
  RIDER_STATUS
} from '../services/autoDispatch.js';

/**
 * Hook for order creation with auto-dispatch
 */
export function useCreateOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = useCallback(async (orderData) => {
    setLoading(true);
    setError(null);
    
    try {
      const order = await createOrder(orderData);
      return order;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

/**
 * Hook for real-time order tracking
 */
export function useOrderTracking(orderId) {
  const [order, setOrder] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    // Subscribe to order updates
    const unsubscribeOrder = subscribeToOrder(orderId, (orderData) => {
      setOrder(orderData);
      setLoading(false);
    });

    // Subscribe to assignment updates
    const unsubscribeAssignments = subscribeToAssignments(orderId, setAssignments);

    return () => {
      unsubscribeOrder();
      unsubscribeAssignments();
    };
  }, [orderId]);

  return { order, assignments, loading };
}

/**
 * Hook for rider functionality
 */
export function useRider(riderId) {
  const [status, setStatus] = useState(RIDER_STATUS.OFFLINE);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Subscribe to rider's assigned orders
  useEffect(() => {
    if (!riderId) return;

    const unsubscribe = subscribeToRiderOrders(riderId, setAssignedOrders);
    return unsubscribe;
  }, [riderId]);

  // Update rider status
  const updateStatus = useCallback(async (newStatus, location = null) => {
    setLoading(true);
    try {
      await updateRiderStatus(riderId, newStatus, location);
      setStatus(newStatus);
    } catch (error) {
      console.error('Error updating rider status:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [riderId]);

  // Handle assignment response
  const respondToAssignment = useCallback(async (orderId, response) => {
    setLoading(true);
    try {
      await handleRiderResponse(orderId, response);
      return true;
    } catch (error) {
      console.error('Error responding to assignment:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    status,
    assignedOrders,
    loading,
    updateStatus,
    respondToAssignment
  };
}

/**
 * Hook for operations dashboard
 */
export function useOperations() {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [assigningOrders, setAssigningOrders] = useState([]);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [availableRiders, setAvailableRiders] = useState({});

  useEffect(() => {
    // Subscribe to orders by status
    const unsubscribePending = subscribeToOrdersByStatus(ORDER_STATUS.PENDING, setPendingOrders);
    const unsubscribeAssigning = subscribeToOrdersByStatus(ORDER_STATUS.ASSIGNING, setAssigningOrders);
    const unsubscribeAssigned = subscribeToOrdersByStatus(ORDER_STATUS.ASSIGNED, setAssignedOrders);

    // Subscribe to available riders by zone
    const riderUnsubscribes = Object.values(ZONES).map(zone => 
      subscribeToAvailableRiders(zone, (riders) => {
        setAvailableRiders(prev => ({ ...prev, [zone]: riders }));
      })
    );

    return () => {
      unsubscribePending();
      unsubscribeAssigning();
      unsubscribeAssigned();
      riderUnsubscribes.forEach(unsub => unsub());
    };
  }, []);

  return {
    pendingOrders,
    assigningOrders,
    assignedOrders,
    availableRiders
  };
}

/**
 * Hook for zone-based rider availability
 */
export function useZoneRiders(zone) {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!zone) return;

    const unsubscribe = subscribeToAvailableRiders(zone, (riderData) => {
      setRiders(riderData);
      setLoading(false);
    });

    return unsubscribe;
  }, [zone]);

  return { riders, loading };
}

/**
 * Helper function to format assignment history
 */
export function formatAssignmentHistory(history) {
  if (!history || !Array.isArray(history)) return [];
  
  return history.map(entry => ({
    ...entry,
    timestamp: entry.at?.toDate?.() || new Date(entry.at),
    statusText: getAssignmentStatusText(entry.result)
  }));
}

/**
 * Get human-readable status text
 */
function getAssignmentStatusText(result) {
  switch (result) {
    case 'assigned': return 'Assigned to rider';
    case 'accepted': return 'Accepted by rider';
    case 'rejected': return 'Rejected by rider';
    case 'timeout': return 'Assignment expired';
    case 'manual_assigned': return 'Manually assigned';
    default: return result;
  }
}

/**
 * Export constants for use in components
 */
export { ZONES, ORDER_STATUS, RIDER_STATUS };
