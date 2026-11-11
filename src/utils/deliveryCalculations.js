// Delivery calculation utilities
export const DELIVERY_CONFIG = {
  BASE_FEE: 200, // ₦200 base delivery fee
  PER_KM_RATE: 50, // ₦50 per kilometer
  MAX_DELIVERY_RADIUS: 35, // km — aligned with Abeokuta metro service area
  FREE_DELIVERY_THRESHOLD: 5000, // Free delivery for orders ₦5000+
  AVERAGE_SPEED: 30, // 30 km/h average delivery speed
  PREPARATION_TIME: 15 // 15 minutes food preparation time
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate delivery fee based on distance and order value
 * @param {number} distance - Distance in kilometers
 * @param {number} orderValue - Total order value in naira
 * @returns {object} Delivery calculation details
 */
export function calculateDeliveryFee(distance, orderValue = 0) {
  // Check if distance exceeds maximum delivery radius
  if (distance > DELIVERY_CONFIG.MAX_DELIVERY_RADIUS) {
    return {
      isDeliverable: false,
      fee: 0,
      distance: distance,
      reason: `Sorry, we don't deliver beyond ${DELIVERY_CONFIG.MAX_DELIVERY_RADIUS}km radius`
    };
  }

  // Calculate base delivery fee
  let deliveryFee = DELIVERY_CONFIG.BASE_FEE + (distance * DELIVERY_CONFIG.PER_KM_RATE);
  
  // Apply free delivery for orders above threshold
  const isFreeDelivery = orderValue >= DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD;
  if (isFreeDelivery) {
    deliveryFee = 0;
  }

  return {
    isDeliverable: true,
    fee: Math.round(deliveryFee),
    distance: distance,
    originalFee: Math.round(DELIVERY_CONFIG.BASE_FEE + (distance * DELIVERY_CONFIG.PER_KM_RATE)),
    isFreeDelivery: isFreeDelivery,
    freeDeliveryThreshold: DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD
  };
}

/**
 * Calculate estimated delivery time
 * @param {number} distance - Distance in kilometers
 * @returns {object} ETA details
 */
export function calculateDeliveryETA(distance) {
  // Travel time in minutes
  const travelTime = Math.round((distance / DELIVERY_CONFIG.AVERAGE_SPEED) * 60);
  
  // Total time including preparation
  const totalTime = DELIVERY_CONFIG.PREPARATION_TIME + travelTime;
  
  // Calculate delivery time
  const now = new Date();
  const deliveryTime = new Date(now.getTime() + totalTime * 60000);
  
  return {
    preparationTime: DELIVERY_CONFIG.PREPARATION_TIME,
    travelTime: travelTime,
    totalTime: totalTime,
    estimatedDelivery: deliveryTime,
    formattedETA: formatETA(totalTime)
  };
}

/**
 * Format ETA into readable string
 * @param {number} minutes - Total minutes
 * @returns {string} Formatted ETA
 */
function formatETA(minutes) {
  if (minutes < 60) {
    return `${minutes} mins`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }
}

/**
 * Check if vendor delivers to customer location
 * @param {object} vendor - Vendor object with coordinates
 * @param {object} customerLocation - Customer coordinates
 * @returns {object} Delivery availability details
 */
export function checkDeliveryAvailability(vendor, customerLocation) {
  if (!vendor.coordinates || !customerLocation) {
    return {
      isAvailable: false,
      reason: 'Location data missing'
    };
  }

  const distance = calculateDistance(
    vendor.coordinates.lat,
    vendor.coordinates.lng,
    customerLocation.lat,
    customerLocation.lng
  );

  const deliveryInfo = calculateDeliveryFee(distance);
  const etaInfo = calculateDeliveryETA(distance);

  return {
    isAvailable: deliveryInfo.isDeliverable,
    distance: distance,
    deliveryFee: deliveryInfo,
    eta: etaInfo,
    reason: deliveryInfo.reason || null
  };
}

/**
 * Filter vendors by delivery radius
 * @param {array} vendors - Array of vendor objects
 * @param {object} customerLocation - Customer coordinates
 * @returns {array} Filtered vendors with delivery info
 */
export function filterVendorsByRadius(vendors, customerLocation) {
  if (!customerLocation) return vendors;

  return vendors
    .map(vendor => {
      const deliveryInfo = checkDeliveryAvailability(vendor, customerLocation);
      return {
        ...vendor,
        deliveryInfo
      };
    })
    .filter(vendor => vendor.deliveryInfo.isAvailable)
    .sort((a, b) => a.deliveryInfo.distance - b.deliveryInfo.distance); // Sort by distance
}