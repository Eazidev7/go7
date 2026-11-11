// Mock riders data for auto-assignment simulation
export const ridersMock = [
  {
    id: 'rider_001',
    name: 'Adebayo Ogun',
    area: 'Kuto',
    status: 'available',
    lat: 7.1425,
    lng: 3.3719,
    rating: 4.8,
    completedTrips: 156
  },
  {
    id: 'rider_002',
    name: 'Fatima Alade',
    area: 'Panseke',
    status: 'available',
    lat: 7.1575,
    lng: 3.3487,
    rating: 4.9,
    completedTrips: 203
  },
  {
    id: 'rider_003',
    name: 'Tunde Kehinde',
    area: 'Adigbe',
    status: 'busy',
    lat: 7.1675,
    lng: 3.3825,
    rating: 4.7,
    completedTrips: 98
  },
  {
    id: 'rider_004',
    name: 'Blessing Ogbonna',
    area: 'Ijaye',
    status: 'available',
    lat: 7.1375,
    lng: 3.3719,
    rating: 4.9,
    completedTrips: 234
  },
  {
    id: 'rider_005',
    name: 'Ahmed Musa',
    area: 'Camp',
    status: 'available',
    lat: 7.1495,
    lng: 3.3545,
    rating: 4.6,
    completedTrips: 167
  }
];

/**
 * Find the nearest available rider for a given pickup location
 * @param {string} pickupArea - The pickup area name
 * @param {Object} pickupCoords - {lat, lng} coordinates of pickup
 * @returns {Object|null} Assigned rider or null if none available
 */
export function assignNearestRider(pickupArea, pickupCoords = null) {
  // First, try to find an available rider in the same area
  const localRider = ridersMock.find(
    rider => rider.area === pickupArea && rider.status === 'available'
  );
  
  if (localRider) {
    return {
      rider: localRider,
      eta: Math.floor(Math.random() * 10) + 8, // 8-18 minutes
      message: `Rider ${localRider.name} assigned · ETA ${Math.floor(Math.random() * 10) + 8} mins`
    };
  }
  
  // If no local rider, find any available rider
  const availableRiders = ridersMock.filter(rider => rider.status === 'available');
  
  if (availableRiders.length === 0) {
    return {
      rider: null,
      eta: null,
      message: `No rider available in ${pickupArea}. Please try again in a few minutes.`
    };
  }
  
  // Calculate distance to nearest available rider
  let nearestRider = availableRiders[0];
  let shortestDistance = Infinity;
  
  if (pickupCoords) {
    availableRiders.forEach(rider => {
      // Simple distance calculation (can be improved with Haversine formula)
      const distance = Math.sqrt(
        Math.pow(rider.lat - pickupCoords.lat, 2) + 
        Math.pow(rider.lng - pickupCoords.lng, 2)
      );
      
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestRider = rider;
      }
    });
  }
  
  const eta = Math.floor(Math.random() * 15) + 12; // 12-27 minutes for non-local riders
  
  return {
    rider: nearestRider,
    eta,
    message: `Rider ${nearestRider.name} assigned from ${nearestRider.area} · ETA ${eta} mins`
  };
}

/**
 * Simulate rider assignment with realistic delay
 * @param {string} pickupArea
 * @param {Object} pickupCoords
 * @returns {Promise<Object>}
 */
export async function simulateRiderAssignment(pickupArea, pickupCoords) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return assignNearestRider(pickupArea, pickupCoords);
}
