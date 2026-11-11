/**
 * Rider Management System
 * Handles rider status, location tracking, and order assignments
 */

// In-memory storage for riders (TODO: Replace with database)
let riderStorage = new Map();

/**
 * Rider structure
 * @typedef {Object} Rider
 * @property {string} id - Unique rider ID
 * @property {string} name - Rider's name
 * @property {string} phone - Rider's phone number
 * @property {string} status - 'offline', 'online', 'on-trip', 'busy'
 * @property {Object} location - Current location {lat, lng, accuracy, timestamp}
 * @property {Object} stats - Rider statistics
 * @property {string} vehicle - Vehicle type
 * @property {Date} lastSeen - Last activity timestamp
 * @property {string} currentOrderId - Current assigned order ID if any
 */

/**
 * Assignment structure
 * @typedef {Object} Assignment
 * @property {string} id - Unique assignment ID
 * @property {string} orderId - Order ID
 * @property {string} riderId - Assigned rider ID
 * @property {string} status - 'pending', 'accepted', 'declined', 'expired'
 * @property {Date} createdAt - When assignment was created
 * @property {Date} expiresAt - When assignment expires
 * @property {number} timeoutSeconds - Timeout duration
 * @property {Object} orderDetails - Order information for rider
 */

// Active assignments awaiting rider response
let pendingAssignments = new Map();

/**
 * Initialize a rider profile
 * @param {string} riderId - Rider ID
 * @param {Object} riderData - Rider information
 */
export function initializeRider(riderId, riderData) {
  const rider = {
    id: riderId,
    name: riderData.name || `Rider ${riderId}`,
    phone: riderData.phone || '',
    status: 'offline',
    location: null,
    stats: {
      totalTrips: 0,
      completedTrips: 0,
      rating: 5.0,
      earnings: 0
    },
    vehicle: riderData.vehicle || 'motorcycle',
    lastSeen: new Date(),
    currentOrderId: null,
    ...riderData
  };
  
  riderStorage.set(riderId, rider);
  return rider;
}

/**
 * Update rider status (online/offline/on-trip/busy)
 * @param {string} riderId - Rider ID
 * @param {string} status - New status
 * @returns {Object} Updated rider
 */
export function updateRiderStatus(riderId, status) {
  const rider = riderStorage.get(riderId);
  if (!rider) {
    throw new Error(`Rider ${riderId} not found`);
  }
  
  rider.status = status;
  rider.lastSeen = new Date();
  
  // Clear current order if going offline
  if (status === 'offline') {
    rider.currentOrderId = null;
  }
  
  riderStorage.set(riderId, rider);
  
  console.log(`Rider ${riderId} status updated to: ${status}`);
  
  // TODO: Notify dispatch system
  // dispatchSystem.onRiderStatusChange(riderId, status);
  
  return rider;
}

/**
 * Update rider location
 * @param {string} riderId - Rider ID
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} accuracy - GPS accuracy in meters
 */
export function updateRiderLocation(riderId, lat, lng, accuracy = null) {
  const rider = riderStorage.get(riderId);
  if (!rider) {
    throw new Error(`Rider ${riderId} not found`);
  }
  
  rider.location = {
    lat,
    lng,
    accuracy,
    timestamp: new Date()
  };
  rider.lastSeen = new Date();
  
  riderStorage.set(riderId, rider);
  
  // TODO: Send to real-time tracking system
  // trackingSystem.updateRiderLocation(riderId, lat, lng);
  
  return rider.location;
}

/**
 * Get available riders for order assignment
 * @param {number} pickupLat - Pickup latitude
 * @param {number} pickupLng - Pickup longitude
 * @param {number} maxDistance - Maximum distance in km
 * @returns {Array} Available riders sorted by distance
 */
export function getAvailableRiders(pickupLat, pickupLng, maxDistance = 10) {
  const availableRiders = [];
  
  for (const [riderId, rider] of riderStorage) {
    // Check if rider is available
    if (rider.status !== 'online' || !rider.location) {
      continue;
    }
    
    // Check if rider has pending assignment
    if (hasPendingAssignment(riderId)) {
      continue;
    }
    
    // Calculate distance to pickup
    const distance = calculateDistance(
      pickupLat, pickupLng,
      rider.location.lat, rider.location.lng
    );
    
    if (distance <= maxDistance) {
      availableRiders.push({
        ...rider,
        distanceToPickup: distance
      });
    }
  }
  
  // Sort by distance (closest first)
  return availableRiders.sort((a, b) => a.distanceToPickup - b.distanceToPickup);
}

/**
 * Create order assignment for a rider
 * @param {string} orderId - Order ID
 * @param {string} riderId - Rider ID
 * @param {Object} orderDetails - Order information
 * @param {number} timeoutSeconds - Assignment timeout (default 10s)
 * @returns {Assignment} Created assignment
 */
export function createAssignment(orderId, riderId, orderDetails, timeoutSeconds = 10) {
  const assignmentId = `assign_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  const assignment = {
    id: assignmentId,
    orderId,
    riderId,
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + timeoutSeconds * 1000),
    timeoutSeconds,
    orderDetails: {
      pickup: orderDetails.pickup,
      dropoff: orderDetails.dropoff,
      estimatedPayout: orderDetails.estimatedPayout || 0,
      priority: orderDetails.priority || 'standard',
      customerName: orderDetails.customerName || 'Customer',
      items: orderDetails.items || 'Package delivery'
    }
  };
  
  pendingAssignments.set(assignmentId, assignment);
  
  console.log(`Assignment created: ${assignmentId} for rider ${riderId}`);
  
  // Set up automatic expiration
  setTimeout(() => {
    expireAssignment(assignmentId);
  }, timeoutSeconds * 1000);
  
  // TODO: Send real-time notification to rider
  // notificationService.sendToRider(riderId, 'new_assignment', assignment);
  
  return assignment;
}

/**
 * Rider accepts an assignment
 * @param {string} assignmentId - Assignment ID
 * @param {string} riderId - Rider ID
 * @returns {Object} Result of acceptance
 */
export function acceptAssignment(assignmentId, riderId) {
  const assignment = pendingAssignments.get(assignmentId);
  
  if (!assignment) {
    throw new Error('Assignment not found or expired');
  }
  
  if (assignment.riderId !== riderId) {
    throw new Error('Assignment not for this rider');
  }
  
  if (assignment.status !== 'pending') {
    throw new Error('Assignment already processed');
  }
  
  if (new Date() > assignment.expiresAt) {
    throw new Error('Assignment expired');
  }
  
  // Update assignment status
  assignment.status = 'accepted';
  assignment.acceptedAt = new Date();
  
  // Update rider status
  const rider = updateRiderStatus(riderId, 'on-trip');
  rider.currentOrderId = assignment.orderId;
  riderStorage.set(riderId, rider);
  
  // Remove from pending assignments
  pendingAssignments.delete(assignmentId);
  
  console.log(`Assignment ${assignmentId} accepted by rider ${riderId}`);
  
  // TODO: Update order status in orders system
  // ordersSystem.assignOrder(assignment.orderId, riderId);
  
  // TODO: Notify dispatch system
  // dispatchSystem.onAssignmentAccepted(assignment);
  
  return {
    success: true,
    assignment,
    rider,
    message: 'Assignment accepted successfully'
  };
}

/**
 * Rider declines an assignment
 * @param {string} assignmentId - Assignment ID
 * @param {string} riderId - Rider ID
 * @param {string} reason - Decline reason (optional)
 * @returns {Object} Result of decline
 */
export function declineAssignment(assignmentId, riderId, reason = null) {
  const assignment = pendingAssignments.get(assignmentId);
  
  if (!assignment) {
    throw new Error('Assignment not found or expired');
  }
  
  if (assignment.riderId !== riderId) {
    throw new Error('Assignment not for this rider');
  }
  
  if (assignment.status !== 'pending') {
    throw new Error('Assignment already processed');
  }
  
  // Update assignment status
  assignment.status = 'declined';
  assignment.declinedAt = new Date();
  assignment.declineReason = reason;
  
  // Remove from pending assignments
  pendingAssignments.delete(assignmentId);
  
  console.log(`Assignment ${assignmentId} declined by rider ${riderId}. Reason: ${reason}`);
  
  // TODO: Auto-dispatch to next available rider
  // autoDispatchToNextRider(assignment.orderId, assignment.orderDetails);
  
  return {
    success: true,
    assignment,
    message: 'Assignment declined'
  };
}

/**
 * Expire an assignment (timeout)
 * @param {string} assignmentId - Assignment ID
 */
function expireAssignment(assignmentId) {
  const assignment = pendingAssignments.get(assignmentId);
  
  if (!assignment || assignment.status !== 'pending') {
    return; // Already processed or doesn't exist
  }
  
  assignment.status = 'expired';
  assignment.expiredAt = new Date();
  
  pendingAssignments.delete(assignmentId);
  
  console.log(`Assignment ${assignmentId} expired for rider ${assignment.riderId}`);
  
  // TODO: Auto-dispatch to next available rider
  // autoDispatchToNextRider(assignment.orderId, assignment.orderDetails);
}

/**
 * Get pending assignment for a rider
 * @param {string} riderId - Rider ID
 * @returns {Assignment|null} Pending assignment or null
 */
export function getPendingAssignment(riderId) {
  for (const [assignmentId, assignment] of pendingAssignments) {
    if (assignment.riderId === riderId && assignment.status === 'pending') {
      return assignment;
    }
  }
  return null;
}

/**
 * Check if rider has pending assignment
 * @param {string} riderId - Rider ID
 * @returns {boolean} True if rider has pending assignment
 */
export function hasPendingAssignment(riderId) {
  return getPendingAssignment(riderId) !== null;
}

/**
 * Get rider information
 * @param {string} riderId - Rider ID
 * @returns {Object|null} Rider data or null
 */
export function getRider(riderId) {
  return riderStorage.get(riderId) || null;
}

/**
 * Get all riders with their status
 * @returns {Array} Array of all riders
 */
export function getAllRiders() {
  return Array.from(riderStorage.values());
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - First point latitude
 * @param {number} lng1 - First point longitude
 * @param {number} lat2 - Second point latitude
 * @param {number} lng2 - Second point longitude
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Auto-dispatch order to next available rider
 * TODO: Integrate with existing auto-dispatch function
 * @param {string} orderId - Order ID
 * @param {Object} orderDetails - Order details
 */
export function autoDispatchToNextRider(orderId, orderDetails) {
  // Get available riders near pickup location
  const availableRiders = getAvailableRiders(
    orderDetails.pickup.lat,
    orderDetails.pickup.lng,
    10 // 10km radius
  );
  
  if (availableRiders.length === 0) {
    console.log(`No available riders for order ${orderId}`);
    // TODO: Add to dispatch queue or notify operations
    return null;
  }
  
  // Assign to closest available rider
  const nextRider = availableRiders[0];
  const assignment = createAssignment(orderId, nextRider.id, orderDetails);
  
  console.log(`Auto-dispatched order ${orderId} to rider ${nextRider.id}`);
  return assignment;
}

/**
 * Clear all rider data (for testing/demo purposes)
 */
export function clearAllRiders() {
  riderStorage.clear();
  pendingAssignments.clear();
}

// TODO: Production implementation checklist
/**
 * 1. Database Integration:
 *    - Replace in-memory storage with database
 *    - Add proper indexing for location queries
 *    - Implement data persistence
 * 
 * 2. Real-time Communication:
 *    - WebSocket integration for live updates
 *    - Push notifications for mobile riders
 *    - Real-time location tracking
 * 
 * 3. Geolocation Services:
 *    - GPS accuracy validation
 *    - Location history tracking
 *    - Geofencing for service areas
 * 
 * 4. Assignment Logic:
 *    - Advanced routing algorithms
 *    - Rider preference scoring
 *    - Load balancing
 * 
 * 5. Security & Privacy:
 *    - Location data encryption
 *    - Authentication & authorization
 *    - Data retention policies
 */
