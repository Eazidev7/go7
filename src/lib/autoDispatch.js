// Auto-dispatch system for Go7 deliveries
// Simple implementation for demonstration

import { getAllRiders, getRider, updateRiderStatus } from './riderSystem';

// Track dispatch stats
let dispatchStats = {
  totalDispatches: 0,
  successfulDispatches: 0,
  failedDispatches: 0,
  activeOrders: []
};

// Calculate distance between two coordinates in kilometers
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find the nearest available rider
function findNearestRider(pickup, maxDistance = 10) {
  const availableRiders = getAllRiders().filter(rider => 
    rider.status === 'online' && rider.location
  );
  
  if (!availableRiders.length) return null;
  
  const ridersWithDistance = availableRiders.map(rider => {
    const distance = calculateDistance(
      rider.location.lat,
      rider.location.lng,
      pickup.lat,
      pickup.lng
    );
    
    return {
      ...rider,
      distanceToPickup: distance
    };
  });
  
  // Filter by max distance and sort by distance
  const nearbyRiders = ridersWithDistance
    .filter(rider => rider.distanceToPickup <= maxDistance)
    .sort((a, b) => a.distanceToPickup - b.distanceToPickup);
  
  return nearbyRiders[0] || null;
}

// Dispatch an order to the nearest rider
export async function dispatchOrderToRider(order, options = {}) {
  const { maxDistance = 10, timeoutSeconds = 30 } = options;
  
  dispatchStats.totalDispatches++;
  
  const nearestRider = findNearestRider(order.pickup, maxDistance);
  
  if (!nearestRider) {
    dispatchStats.failedDispatches++;
    return null;
  }
  
  // Mark the rider as busy
  updateRiderStatus(nearestRider.id, 'busy');
  
  // Track the dispatch
  const dispatchedOrder = {
    orderId: order.id,
    riderId: nearestRider.id,
    status: 'dispatched',
    dispatchedAt: new Date().toISOString(),
    timeout: setTimeout(() => {
      // If no response, mark as timeout and rider goes back online
      const currentOrder = dispatchStats.activeOrders.find(o => o.orderId === order.id);
      if (currentOrder && currentOrder.status === 'dispatched') {
        currentOrder.status = 'timeout';
        updateRiderStatus(nearestRider.id, 'online');
      }
    }, timeoutSeconds * 1000)
  };
  
  dispatchStats.activeOrders.push(dispatchedOrder);
  dispatchStats.successfulDispatches++;
  
  return { 
    success: true,
    rider: nearestRider
  };
}

// Manually assign an order to a specific rider
export function manualAssignOrder(orderId, riderId, orderDetails) {
  const rider = getRider(riderId);
  
  if (!rider) {
    throw new Error(`Rider with ID ${riderId} not found`);
  }
  
  if (rider.status !== 'online') {
    throw new Error(`Rider ${rider.name} is not online (current status: ${rider.status})`);
  }
  
  // Mark rider as on-trip
  updateRiderStatus(riderId, 'on-trip');
  
  // Add to active orders
  dispatchStats.activeOrders.push({
    orderId,
    riderId,
    status: 'assigned',
    assignedAt: new Date().toISOString(),
    orderDetails
  });
  
  dispatchStats.totalDispatches++;
  dispatchStats.successfulDispatches++;
  
  return true;
}

// Handle rider acceptance of an order
export function acceptOrder(orderId, riderId) {
  const orderIndex = dispatchStats.activeOrders.findIndex(o => o.orderId === orderId);
  
  if (orderIndex === -1) {
    throw new Error(`Order with ID ${orderId} not found`);
  }
  
  const order = dispatchStats.activeOrders[orderIndex];
  
  if (order.riderId !== riderId) {
    throw new Error(`Order ${orderId} is not assigned to rider ${riderId}`);
  }
  
  // Clear timeout if it exists
  if (order.timeout) {
    clearTimeout(order.timeout);
  }
  
  // Update order status
  order.status = 'accepted';
  order.acceptedAt = new Date().toISOString();
  
  // Mark rider as on-trip
  updateRiderStatus(riderId, 'on-trip');
  
  return true;
}

// Handle rider declining an order
export function declineOrder(orderId, riderId, reason = '') {
  const orderIndex = dispatchStats.activeOrders.findIndex(o => o.orderId === orderId);
  
  if (orderIndex === -1) {
    throw new Error(`Order with ID ${orderId} not found`);
  }
  
  const order = dispatchStats.activeOrders[orderIndex];
  
  if (order.riderId !== riderId) {
    throw new Error(`Order ${orderId} is not assigned to rider ${riderId}`);
  }
  
  // Clear timeout if it exists
  if (order.timeout) {
    clearTimeout(order.timeout);
  }
  
  // Update order status
  order.status = 'declined';
  order.declinedAt = new Date().toISOString();
  order.declineReason = reason;
  
  // Mark rider as back online
  updateRiderStatus(riderId, 'online');
  
  return true;
}

// Complete an order
export function completeOrder(orderId, riderId) {
  const orderIndex = dispatchStats.activeOrders.findIndex(o => o.orderId === orderId);
  
  if (orderIndex === -1) {
    throw new Error(`Order with ID ${orderId} not found`);
  }
  
  const order = dispatchStats.activeOrders[orderIndex];
  
  if (order.riderId !== riderId) {
    throw new Error(`Order ${orderId} is not assigned to rider ${riderId}`);
  }
  
  // Update order status
  order.status = 'completed';
  order.completedAt = new Date().toISOString();
  
  // Mark rider as back online
  updateRiderStatus(riderId, 'online');
  
  return true;
}

// Get dispatch stats
export function getDispatchStats() {
  return {
    ...dispatchStats,
    activeOrders: [...dispatchStats.activeOrders]
  };
}

// Reset dispatch stats
export function resetDispatchStats() {
  // Clear any pending timeouts
  dispatchStats.activeOrders.forEach(order => {
    if (order.timeout) {
      clearTimeout(order.timeout);
    }
  });
  
  dispatchStats = {
    totalDispatches: 0,
    successfulDispatches: 0,
    failedDispatches: 0,
    activeOrders: []
  };
  
  return true;
}