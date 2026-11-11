// Haversine formula to calculate distance between two coordinates
export const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  
  // Convert degrees to radians
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  // Distance in kilometers
  const distance = R * c;
  
  // Round to 2 decimal places
  return Math.round(distance * 100) / 100;
};

// Helper function to calculate distance from coordinate objects
export const calculateDistance = (pickup, dropoff) => {
  if (!pickup || !dropoff) return 0;
  
  return haversineKm(
    pickup.lat || pickup.latitude,
    pickup.lng || pickup.longitude,
    dropoff.lat || dropoff.latitude,
    dropoff.lng || dropoff.longitude
  );
};

// Export the getDistanceKm function needed by hooks
export const getDistanceKm = (origin, destination) => {
  if (!origin || !destination) return 0;
  
  return haversineKm(
    origin.lat || origin.latitude,
    origin.lng || origin.longitude,
    destination.lat || destination.latitude,
    destination.lng || destination.longitude
  );
};
