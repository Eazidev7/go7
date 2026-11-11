// src/utils/distanceCalculator.js
/**
 * Utility functions for calculating distances between coordinates
 */

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * This calculates the "as-the-crow-flies" distance, not accounting for roads
 * 
 * @param {Object} coord1 - First coordinate {lat, lng}
 * @param {Object} coord2 - Second coordinate {lat, lng}
 * @returns {number} Distance in kilometers, rounded to 1 decimal place
 */
export function calculateHaversineDistance(coord1, coord2) {
  // Validate inputs
  if (!coord1 || !coord2 || 
      typeof coord1.lat !== 'number' || typeof coord1.lng !== 'number' ||
      typeof coord2.lat !== 'number' || typeof coord2.lng !== 'number') {
    console.error('Invalid coordinates provided to calculateHaversineDistance');
    return 0;
  }

  // Earth's radius in kilometers
  const R = 6371;
  
  // Convert latitude and longitude from degrees to radians
  const lat1Rad = toRadians(coord1.lat);
  const lng1Rad = toRadians(coord1.lng);
  const lat2Rad = toRadians(coord2.lat);
  const lng2Rad = toRadians(coord2.lng);
  
  // Differences in coordinates
  const dLat = lat2Rad - lat1Rad;
  const dLng = lng2Rad - lng1Rad;
  
  // Haversine formula
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Distance in kilometers
  const distance = R * c;
  
  // Round to 1 decimal place
  return Math.round(distance * 10) / 10;
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate travel time based on distance and average speed
 * 
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} speedKmh - Average speed in km/h (default: 25 km/h for urban travel)
 * @returns {number} Estimated travel time in minutes
 */
export function estimateTravelTime(distanceKm, speedKmh = 25) {
  if (!distanceKm || distanceKm <= 0) {
    return 0;
  }
  
  // Calculate time in hours
  const timeHours = distanceKm / speedKmh;
  
  // Convert to minutes and round up
  return Math.ceil(timeHours * 60);
}