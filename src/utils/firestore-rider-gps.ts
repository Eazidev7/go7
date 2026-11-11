// Firestore Database Structure for Real-time Rider GPS Tracking
// This file shows the expected document structure in Firestore

/*
Collection: riders
Document ID: {riderId} (e.g., "AKEEM01", "MUSA22", "KEMI45")

Document Structure:
{
  "lat": 7.1475,          // Latitude (number)
  "lng": 3.3619,          // Longitude (number)  
  "status": "en_route",   // Status: "accepted", "picked_up", "en_route", "delivered"
  "timestamp": firebase.firestore.FieldValue.serverTimestamp(),
  "riderId": "AKEEM01",   // Optional: rider identifier
  "orderId": "ORD-123",   // Optional: associated order
  "speed": 25,            // Optional: current speed in km/h
  "bearing": 180          // Optional: direction in degrees
}

Example documents:

// Rider just started (accepted order)
riders/AKEEM01 {
  "lat": 7.1475,
  "lng": 3.3619,
  "status": "accepted",
  "timestamp": [server timestamp],
  "riderId": "AKEEM01"
}

// Rider picked up order
riders/AKEEM01 {
  "lat": 7.1478,
  "lng": 3.3625,
  "status": "picked_up",
  "timestamp": [server timestamp],
  "riderId": "AKEEM01"
}

// Rider en route to delivery
riders/AKEEM01 {
  "lat": 7.1500,
  "lng": 3.3660,
  "status": "en_route",
  "timestamp": [server timestamp],
  "riderId": "AKEEM01"
}

// Rider delivered order
riders/AKEEM01 {
  "lat": 7.1530,
  "lng": 3.3700,
  "status": "delivered",
  "timestamp": [server timestamp],
  "riderId": "AKEEM01"
}
*/

import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Utility function to update rider GPS position (for testing/admin use)
export const updateRiderGPS = async (
  riderId: string, 
  lat: number, 
  lng: number, 
  status: 'accepted' | 'picked_up' | 'en_route' | 'delivered'
) => {
  try {
    const riderDocRef = doc(db, 'riders', riderId);
    
    await setDoc(riderDocRef, {
      lat,
      lng,
      status,
      timestamp: serverTimestamp(),
      riderId
    }, { merge: true });
    
    console.log(`✅ Updated rider ${riderId} GPS: [${lng}, ${lat}], Status: ${status}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating rider GPS:', error);
    return false;
  }
};

// Simulate rider movement for testing (don't use in production)
export const simulateRiderJourney = async (riderId: string) => {
  console.log(`🚀 Starting GPS simulation for rider: ${riderId}`);
  
  // Journey waypoints from pickup to dropoff
  const waypoints = [
    { lat: 7.1475, lng: 3.3619, status: 'accepted' as const },
    { lat: 7.1478, lng: 3.3625, status: 'picked_up' as const },
    { lat: 7.1482, lng: 3.3635, status: 'en_route' as const },
    { lat: 7.1485, lng: 3.3645, status: 'en_route' as const },
    { lat: 7.1500, lng: 3.3660, status: 'en_route' as const },
    { lat: 7.1510, lng: 3.3675, status: 'en_route' as const },
    { lat: 7.1520, lng: 3.3685, status: 'en_route' as const },
    { lat: 7.1525, lng: 3.3695, status: 'en_route' as const },
    { lat: 7.1530, lng: 3.3700, status: 'delivered' as const }
  ];
  
  // Update GPS every 3 seconds
  for (let i = 0; i < waypoints.length; i++) {
    const waypoint = waypoints[i];
    
    await updateRiderGPS(riderId, waypoint.lat, waypoint.lng, waypoint.status);
    
    if (i < waypoints.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    }
  }
  
  console.log(`🎯 GPS simulation completed for rider: ${riderId}`);
};

// Example usage in browser console:
// import { simulateRiderJourney } from './utils/firestore-rider-gps';
// simulateRiderJourney('AKEEM01');