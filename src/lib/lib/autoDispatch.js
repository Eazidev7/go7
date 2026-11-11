/**
 * Auto-Dispatch Integration
 * Connects the rider system with the existing order management system
 */

import { 
  getAvailableRiders, 
  createAssignment, 
  autoDispatchToNextRider 
} from './riderSystem.js';

/**
 * Enhanced auto-dispatch function that integrates with rider system
 * @param {Object} order - Order object from the existing system
 * @returns {Object|null} Assignment result or null if no riders available
 */
export async function dispatchOrderToRider(order) {
  try {
    console.log(`Starting auto-dispatch for order ${order.id}`);
    
    // Extract pickup coordinates from order
    // TODO: Ensure orders have lat/lng coordinates
    const pickupLat = order.pickup?.lat || order.pickup?.coordinates?.lat;
    const pickupLng = order.pickup?.lng || order.pickup?.coordinates?.lng;
    
    if (!pickupLat || !pickupLng) {
      console.error(`Order ${order.id} missing pickup coordinates`);
      return null;
    }
    
    // Get available riders within 10km radius
    const availableRiders = getAvailableRiders(pickupLat, pickupLng, 10);
    
    if (availableRiders.length === 0) {
      console.log(`No available riders found for order ${order.id}`);
      // TODO: Add to dispatch queue or notify operations
      return null;
    }
    
    // Calculate estimated payout for rider
    const estimatedPayout = calculateRiderPayout(order);
    
    // Prepare order details for rider
    const orderDetails = {
      pickup: {
        address: order.pickup?.address || 'Pickup location',
        lat: pickupLat,
        lng: pickupLng
      },
      dropoff: {
        address: order.dropoff?.address || 'Dropoff location',
        lat: order.dropoff?.lat || order.dropoff?.coordinates?.lat,
        lng: order.dropoff?.lng || order.dropoff?.coordinates?.lng
      },
      estimatedPayout,
      priority: order.deliveryPriority || 'standard',
      customerName: order.customer?.name || 'Customer',
      items: order.items || order.packageDetails || 'Package delivery',
      distance: order.routeKm || 0,
      orderValue: order.total || 0
    };
    
    // Try to assign to the closest rider first
    const closestRider = availableRiders[0];
    const assignment = createAssignment(
      order.id,
      closestRider.id,
      orderDetails,
      10 // 10 second timeout
    );
    
    console.log(`Order ${order.id} assigned to rider ${closestRider.id} (${closestRider.distanceToPickup.toFixed(2)}km away)`);
    
    return {
      success: true,
      assignment,
      rider: closestRider,
      availableRidersCount: availableRiders.length
    };
    
  } catch (error) {
    console.error('Auto-dispatch error:', error);
    return null;
  }
}

/**
 * Calculate rider payout based on order details
 * @param {Object} order - Order object
 * @returns {number} Estimated payout amount
 */
function calculateRiderPayout(order) {
  // Base payout calculation
  let basePayout = 1000; // Base ₦1000
  
  // Distance-based calculation
  const distance = order.routeKm || 5; // Default 5km if not specified
  const distancePayout = distance * 100; // ₦100 per km
  
  // Priority multiplier
  const priorityMultiplier = {
    'immediate': 1.5,
    'express': 1.3,
    'standard': 1.0
  }[order.deliveryPriority] || 1.0;
  
  // Time-based multiplier (rush hours, late night, etc.)
  const hour = new Date().getHours();
  let timeMultiplier = 1.0;
  
  if (hour >= 22 || hour <= 6) {
    timeMultiplier = 1.4; // Late night premium
  } else if (hour >= 11 && hour <= 14 || hour >= 18 && hour <= 21) {
    timeMultiplier = 1.2; // Rush hour premium
  }
  
  // Calculate final payout
  const totalPayout = (basePayout + distancePayout) * priorityMultiplier * timeMultiplier;
  
  return Math.round(totalPayout);
}

/**
 * Handle assignment timeout - automatically assign to next rider
 * @param {string} orderId - Order ID
 * @param {Object} orderDetails - Order details
 * @param {Array} excludeRiderIds - Rider IDs to exclude (who already declined)
 */
export function handleAssignmentTimeout(orderId, orderDetails, excludeRiderIds = []) {
  console.log(`Assignment timeout for order ${orderId}, finding next rider...`);
  
  // Get available riders excluding those who already declined
  const availableRiders = getAvailableRiders(
    orderDetails.pickup.lat,
    orderDetails.pickup.lng,
    15 // Expand radius to 15km
  ).filter(rider => !excludeRiderIds.includes(rider.id));
  
  if (availableRiders.length === 0) {
    console.log(`No more available riders for order ${orderId}`);
    // TODO: Escalate to operations team
    return null;
  }
  
  // Assign to next available rider
  const nextRider = availableRiders[0];
  const assignment = createAssignment(orderId, nextRider.id, orderDetails, 15); // Longer timeout for subsequent attempts
  
  console.log(`Order ${orderId} reassigned to rider ${nextRider.id}`);
  return assignment;
}

/**
 * Integration hook for existing order system
 * Call this when a new order needs to be dispatched
 * @param {Object} order - Order object from existing system
 */
export function integrateWithOrderSystem(order) {
  // Check if order is ready for dispatch
  if (order.status !== 'confirmed' && order.status !== 'ready_for_pickup') {
    console.log(`Order ${order.id} not ready for dispatch (status: ${order.status})`);
    return;
  }
  
  // Check if order already has a rider assigned
  if (order.assignedTo || order.riderId) {
    console.log(`Order ${order.id} already has rider assigned: ${order.assignedTo || order.riderId}`);
    return;
  }
  
  // Dispatch to rider
  dispatchOrderToRider(order);
}

/**
 * Batch dispatch multiple orders
 * @param {Array} orders - Array of orders to dispatch
 */
export async function batchDispatchOrders(orders) {
  const results = [];
  
  for (const order of orders) {
    const result = await dispatchOrderToRider(order);
    results.push({
      orderId: order.id,
      success: result !== null,
      result
    });
    
    // Small delay between assignments to prevent race conditions
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

/**
 * Get dispatch statistics
 * @returns {Object} Dispatch metrics
 */
export function getDispatchStats() {
  // TODO: Implement proper metrics collection
  return {
    totalOrdersDispatched: 0,
    successfulAssignments: 0,
    timeoutRate: 0,
    averageAssignmentTime: 0,
    ridersOnline: 0,
    ridersOnTrip: 0
  };
}

/**
 * Manual dispatcher interface for operations team
 * @param {string} orderId - Order ID
 * @param {string} riderId - Specific rider ID to assign to
 * @param {Object} orderDetails - Order details
 */
export function manualAssignOrder(orderId, riderId, orderDetails) {
  try {
    const assignment = createAssignment(orderId, riderId, orderDetails, 30); // Longer timeout for manual assignments
    
    console.log(`Manual assignment created: Order ${orderId} -> Rider ${riderId}`);
    return assignment;
    
  } catch (error) {
    console.error('Manual assignment failed:', error);
    throw error;
  }
}

/**
 * Cancel order assignment
 * @param {string} orderId - Order ID
 */
export function cancelOrderAssignment(orderId) {
  // TODO: Implement assignment cancellation
  console.log(`Cancelling assignment for order ${orderId}`);
  
  // Remove from pending assignments
  // Update rider status if needed
  // Notify relevant parties
}

/**
 * Update order status when rider accepts assignment
 * This function should be called from the rider system when an assignment is accepted
 * @param {string} orderId - Order ID
 * @param {string} riderId - Rider ID
 */
export function onAssignmentAccepted(orderId, riderId) {
  console.log(`Assignment accepted: Order ${orderId} by Rider ${riderId}`);
  
  // TODO: Integrate with existing order management system
  // updateOrderStatus(orderId, 'assigned', { riderId });
  
  // TODO: Send notifications
  // notifyCustomer(orderId, 'rider_assigned', { riderId });
  // notifyOperations(orderId, 'assignment_accepted', { riderId });
  
  // TODO: Start tracking
  // trackingSystem.startOrderTracking(orderId, riderId);
}

/**
 * Handle assignment declined
 * @param {string} orderId - Order ID
 * @param {string} riderId - Rider ID who declined
 * @param {string} reason - Decline reason
 */
export function onAssignmentDeclined(orderId, riderId, reason) {
  console.log(`Assignment declined: Order ${orderId} by Rider ${riderId}. Reason: ${reason}`);
  
  // TODO: Add rider to exclude list for this order
  // TODO: Automatically find next rider
  // TODO: Track decline reasons for analytics
}

// TODO: Production integration checklist
/**
 * 1. Order System Integration:
 *    - Connect with existing order management
 *    - Ensure order objects have required coordinates
 *    - Update order status when assigned
 * 
 * 2. Notification System:
 *    - Customer notifications when rider assigned
 *    - Operations alerts for assignment failures
 *    - Rider mobile push notifications
 * 
 * 3. Tracking Integration:
 *    - Start real-time tracking when assignment accepted
 *    - Update ETA calculations
 *    - GPS breadcrumb collection
 * 
 * 4. Analytics & Monitoring:
 *    - Assignment success rates
 *    - Average assignment time
 *    - Rider decline patterns
 *    - Geographic performance metrics
 * 
 * 5. Fallback Mechanisms:
 *    - Queue orders when no riders available
 *    - Escalation to operations team
 *    - Alternative fulfillment options
 */
