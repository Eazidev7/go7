// Go7 Rider Location Demo Data
// For testing live tracking with simulated rider movement

export const demoRiderLocations = {
  // Lagos coordinates for demo rider movement
  rider_123: [
    { lat: 6.5244, lng: 3.3792, timestamp: Date.now() }, // Start position (Victoria Island)
    { lat: 6.5254, lng: 3.3802, timestamp: Date.now() + 7000 },
    { lat: 6.5264, lng: 3.3812, timestamp: Date.now() + 14000 },
    { lat: 6.5274, lng: 3.3822, timestamp: Date.now() + 21000 },
    { lat: 6.5284, lng: 3.3832, timestamp: Date.now() + 28000 },
    { lat: 6.5294, lng: 3.3842, timestamp: Date.now() + 35000 },
    { lat: 6.5304, lng: 3.3852, timestamp: Date.now() + 42000 },
    { lat: 6.5314, lng: 3.3862, timestamp: Date.now() + 49000 },
    { lat: 6.5324, lng: 3.3872, timestamp: Date.now() + 56000 },
    { lat: 6.5334, lng: 3.3882, timestamp: Date.now() + 63000 },
    { lat: 6.5344, lng: 3.3892, timestamp: Date.now() + 70000 } // End position (Lekki)
  ],
  rider_456: [
    { lat: 6.5300, lng: 3.3800, timestamp: Date.now() },
    { lat: 6.5310, lng: 3.3810, timestamp: Date.now() + 7000 },
    { lat: 6.5320, lng: 3.3820, timestamp: Date.now() + 14000 },
    { lat: 6.5330, lng: 3.3830, timestamp: Date.now() + 21000 }
  ]
};

export const updateRiderLocationInFirestore = async (riderId, location) => {
  try {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../firebase/config');
    
    await updateDoc(doc(db, 'riders', riderId), {
      currentLocation: {
        lat: location.lat,
        lng: location.lng,
        accuracy: 10,
        timestamp: serverTimestamp(),
        heading: calculateHeading(location.previous, location.current) || 0
      },
      lastSeen: serverTimestamp(),
      isOnline: true
    });
    
    console.log(`🏍️ Updated rider ${riderId} location:`, location);
  } catch (error) {
    console.error('❌ Error updating rider location:', error);
  }
};

export const simulateRiderMovement = async (riderId) => {
  const locations = demoRiderLocations[riderId];
  if (!locations) {
    console.warn(`⚠️ No demo locations for rider: ${riderId}`);
    return;
  }
  
  console.log(`🎬 Starting location simulation for rider: ${riderId}`);
  
  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    const previous = i > 0 ? locations[i - 1] : null;
    
    await updateRiderLocationInFirestore(riderId, {
      ...location,
      previous,
      current: location
    });
    
    // Wait 7 seconds before next update (as specified)
    if (i < locations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 7000));
    }
  }
  
  console.log(`✅ Completed location simulation for rider: ${riderId}`);
};

// Calculate heading/bearing between two points
function calculateHeading(from, to) {
  if (!from || !to) return null;
  
  const deltaLng = to.lng - from.lng;
  const deltaLat = to.lat - from.lat;
  
  const heading = Math.atan2(deltaLng, deltaLat) * (180 / Math.PI);
  return (heading + 360) % 360; // Normalize to 0-360
}

// Create demo rider data for testing
export const createDemoRider = async (riderId = 'rider_123') => {
  try {
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../firebase/config');
    
    const riderData = {
      id: riderId,
      displayName: 'Demo Rider',
      phone: '+234-800-123-4567',
      email: 'demo@go7.ng',
      photoURL: null,
      rating: 4.8,
      totalDeliveries: 150,
      vehicleType: 'motorcycle',
      vehiclePlateNumber: 'ABC-123-XY',
      isOnline: true,
      isAvailable: true,
      currentLocation: {
        lat: 6.5244,
        lng: 3.3792,
        accuracy: 10,
        timestamp: serverTimestamp(),
        heading: 0
      },
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'riders', riderId), riderData);
    console.log(`✅ Created demo rider: ${riderId}`);
    
    return riderData;
  } catch (error) {
    console.error('❌ Error creating demo rider:', error);
    throw error;
  }
};

// Start auto-simulation for testing
export const startRiderSimulation = (riderId = 'rider_123', interval = 7000) => {
  const locations = demoRiderLocations[riderId];
  if (!locations) {
    console.warn(`⚠️ No demo locations for rider: ${riderId}`);
    return null;
  }
  
  let currentIndex = 0;
  
  const intervalId = setInterval(async () => {
    if (currentIndex >= locations.length) {
      clearInterval(intervalId);
      console.log(`🏁 Simulation completed for rider: ${riderId}`);
      return;
    }
    
    const location = locations[currentIndex];
    const previous = currentIndex > 0 ? locations[currentIndex - 1] : null;
    
    await updateRiderLocationInFirestore(riderId, {
      ...location,
      previous,
      current: location
    });
    
    currentIndex++;
  }, interval);
  
  console.log(`🎬 Started auto-simulation for rider: ${riderId} (interval: ${interval}ms)`);
  return intervalId;
};