/**
 * ETA calculation utilities
 * Calculates estimated arrival time based on distance and vehicle type
 */

interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate the Haversine distance between two coordinates in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLon = toRadians(coord2.lng - coord1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate ETA based on current location and destination
 */
export function calcETA(
  from: Coordinates,
  to: Coordinates,
  isExpress: boolean = false,
  vehicleType: 'motorcycle' | 'car' | 'bicycle' = 'motorcycle'
): string {
  const distance = calculateDistance(from, to);
  
  // Base speeds in km/h for different vehicle types in Abeokuta traffic
  const baseSpeeds = {
    motorcycle: 25, // Motorcycles are faster in traffic
    car: 20,        // Cars slower due to traffic
    bicycle: 12     // Bicycles slowest but consistent
  };
  
  let speed = baseSpeeds[vehicleType];
  
  // Express delivery gets 30% speed boost (priority routing, less stops)
  if (isExpress) {
    speed *= 1.3;
  }
  
  // Traffic adjustment based on time of day
  const hour = new Date().getHours();
  let trafficMultiplier = 1.0;
  
  // Rush hours (7-9 AM, 5-7 PM) - slower traffic
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    trafficMultiplier = 0.7;
  }
  // Late night (10 PM - 6 AM) - faster traffic
  else if (hour >= 22 || hour <= 6) {
    trafficMultiplier = 1.3;
  }
  // Lunch time (12-2 PM) - moderate traffic
  else if (hour >= 12 && hour <= 14) {
    trafficMultiplier = 0.85;
  }
  
  speed *= trafficMultiplier;
  
  // Calculate time in hours
  const timeHours = distance / speed;
  
  // Convert to minutes
  const timeMinutes = Math.round(timeHours * 60);
  
  // Format the result
  if (timeMinutes < 1) {
    return 'Arriving now';
  } else if (timeMinutes < 60) {
    return `${timeMinutes} min`;
  } else {
    const hours = Math.floor(timeMinutes / 60);
    const minutes = timeMinutes % 60;
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Calculate more detailed ETA information
 */
export function calcDetailedETA(
  from: Coordinates,
  to: Coordinates,
  isExpress: boolean = false,
  vehicleType: 'motorcycle' | 'car' | 'bicycle' = 'motorcycle'
) {
  const distance = calculateDistance(from, to);
  const eta = calcETA(from, to, isExpress, vehicleType);
  
  // Estimate arrival time
  const now = new Date();
  const etaMinutes = parseETAMinutes(eta);
  const arrivalTime = new Date(now.getTime() + etaMinutes * 60000);
  
  return {
    distance: `${distance.toFixed(1)} km`,
    eta,
    arrivalTime: arrivalTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    confidence: getConfidenceLevel(distance, etaMinutes)
  };
}

/**
 * Parse ETA string to get minutes
 */
function parseETAMinutes(eta: string): number {
  if (eta === 'Arriving now') return 0;
  
  // Extract numbers from eta string
  const hourMatch = eta.match(/(\d+)h/);
  const minuteMatch = eta.match(/(\d+)\s*min?/);
  
  const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
  
  return hours * 60 + minutes;
}

/**
 * Get confidence level for ETA accuracy
 */
function getConfidenceLevel(distance: number, etaMinutes: number): 'high' | 'medium' | 'low' {
  // Short distances with quick ETAs are more predictable
  if (distance < 2 && etaMinutes < 15) return 'high';
  
  // Medium distances
  if (distance < 5 && etaMinutes < 30) return 'medium';
  
  // Long distances or long times are less predictable
  return 'low';
}

/**
 * Get speed estimate based on recent movement
 */
export function estimateCurrentSpeed(
  locations: Array<{ lat: number; lng: number; timestamp: Date }>,
  windowMinutes: number = 5
): number | null {
  if (locations.length < 2) return null;
  
  // Filter locations within the time window
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60000);
  
  const recentLocations = locations
    .filter(loc => loc.timestamp >= windowStart)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  if (recentLocations.length < 2) return null;
  
  // Calculate total distance and time
  let totalDistance = 0;
  for (let i = 1; i < recentLocations.length; i++) {
    totalDistance += calculateDistance(
      recentLocations[i - 1],
      recentLocations[i]
    );
  }
  
  const totalTimeHours = (
    recentLocations[recentLocations.length - 1].timestamp.getTime() - 
    recentLocations[0].timestamp.getTime()
  ) / (1000 * 60 * 60);
  
  if (totalTimeHours === 0) return null;
  
  return totalDistance / totalTimeHours; // km/h
}

/**
 * Predict arrival based on current speed trend
 */
export function predictArrival(
  from: Coordinates,
  to: Coordinates,
  recentLocations: Array<{ lat: number; lng: number; timestamp: Date }>,
  isExpress: boolean = false
): string {
  const currentSpeed = estimateCurrentSpeed(recentLocations);
  
  if (currentSpeed && currentSpeed > 0) {
    // Use actual current speed if available
    const distance = calculateDistance(from, to);
    const timeHours = distance / currentSpeed;
    const timeMinutes = Math.round(timeHours * 60);
    
    if (timeMinutes < 1) return 'Arriving now';
    if (timeMinutes < 60) return `${timeMinutes} min`;
    
    const hours = Math.floor(timeMinutes / 60);
    const minutes = timeMinutes % 60;
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }
  
  // Fallback to standard calculation
  return calcETA(from, to, isExpress);
}
