// Rider-specific utilities for Go7 delivery app
import { db } from '../lib/firebase';
import { doc, setDoc, collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

// TypeScript interfaces
interface Rider {
  riderId: string;
  name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'busy';
  vehicle: 'motorcycle' | 'bicycle' | 'car';
  rating: number;
  completedOrders: number;
  currentOrderId?: string;
  profileImage?: string;
}

interface RiderGPS {
  lat: number;
  lng: number;
  status: string;
  timestamp: any;
  riderId: string;
  currentOrderId?: string;
  speed?: number;
  heading?: number;
}

// Create a new rider profile
export const createRiderProfile = async (riderData: Omit<Rider, 'completedOrders' | 'rating'>): Promise<boolean> => {
  try {
    const riderDocRef = doc(db, 'riders', riderData.riderId);
    
    await setDoc(riderDocRef, {
      ...riderData,
      completedOrders: 0,
      rating: 5.0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Rider profile created: ${riderData.name} (${riderData.riderId})`);
    return true;
  } catch (error) {
    console.error('❌ Error creating rider profile:', error);
    return false;
  }
};

// Update rider GPS location
export const updateRiderGPS = async (riderId: string, gpsData: Omit<RiderGPS, 'riderId'>): Promise<boolean> => {
  try {
    const riderDocRef = doc(db, 'riders', riderId);
    
    await setDoc(riderDocRef, {
      ...gpsData,
      riderId,
      timestamp: serverTimestamp()
    }, { merge: true });
    
    console.log(`📍 GPS updated for rider ${riderId}: [${gpsData.lat.toFixed(6)}, ${gpsData.lng.toFixed(6)}]`);
    return true;
  } catch (error) {
    console.error('❌ Error updating rider GPS:', error);
    return false;
  }
};

// Update rider status
export const updateRiderStatus = async (riderId: string, status: Rider['status'], currentOrderId?: string): Promise<boolean> => {
  try {
    const riderDocRef = doc(db, 'riders', riderId);
    
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };
    
    if (currentOrderId) {
      updateData.currentOrderId = currentOrderId;
    }
    
    await setDoc(riderDocRef, updateData, { merge: true });
    
    console.log(`✅ Rider ${riderId} status updated to: ${status}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating rider status:', error);
    return false;
  }
};

// Get available riders (active and not busy)
export const getAvailableRiders = async (): Promise<Rider[]> => {
  try {
    const ridersRef = collection(db, 'riders');
    const q = query(ridersRef, where('status', '==', 'active'));
    
    const querySnapshot = await getDocs(q);
    const riders: Rider[] = [];
    
    querySnapshot.forEach((doc) => {
      riders.push({ riderId: doc.id, ...doc.data() } as Rider);
    });
    
    console.log(`📋 Found ${riders.length} available riders`);
    return riders;
  } catch (error) {
    console.error('❌ Error fetching available riders:', error);
    return [];
  }
};

// Send notification to rider (placeholder for push notifications)
export const sendRiderNotification = async (riderId: string, title: string, message: string): Promise<boolean> => {
  try {
    const notificationData = {
      riderId,
      title,
      message,
      timestamp: serverTimestamp(),
      isRead: false,
      type: 'order_update'
    };
    
    const notificationsRef = collection(db, 'rider_notifications');
    await addDoc(notificationsRef, notificationData);
    
    console.log(`🔔 Notification sent to rider ${riderId}: ${title}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending rider notification:', error);
    return false;
  }
};

// Track rider performance
export const updateRiderPerformance = async (riderId: string, orderCompleted: boolean, rating?: number): Promise<boolean> => {
  try {
    const riderDocRef = doc(db, 'riders', riderId);
    
    if (orderCompleted) {
      // This would typically use Firestore transactions for atomic updates
      const updateData: any = {
        completedOrders: serverTimestamp(), // Use server increment in real implementation
        updatedAt: serverTimestamp()
      };
      
      if (rating) {
        updateData.lastRating = rating;
        // In real implementation, calculate average rating
      }
      
      await setDoc(riderDocRef, updateData, { merge: true });
      
      console.log(`📊 Performance updated for rider ${riderId}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error updating rider performance:', error);
    return false;
  }
};

// Simulate GPS journey for testing
export const simulateRiderJourney = async (
  riderId: string, 
  startCoords: [number, number], 
  endCoords: [number, number], 
  orderId: string,
  durationMinutes: number = 15
): Promise<void> => {
  const steps = 20; // Number of GPS updates
  const interval = (durationMinutes * 60 * 1000) / steps; // Interval in milliseconds
  
  console.log(`🛵 Starting GPS simulation for rider ${riderId}: ${durationMinutes} minutes journey`);
  
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    
    // Interpolate coordinates
    const lat = startCoords[1] + (endCoords[1] - startCoords[1]) * progress;
    const lng = startCoords[0] + (endCoords[0] - startCoords[0]) * progress;
    
    // Add some randomness to make it more realistic
    const randomLat = lat + (Math.random() - 0.5) * 0.001;
    const randomLng = lng + (Math.random() - 0.5) * 0.001;
    
    const gpsData: Omit<RiderGPS, 'riderId'> = {
      lat: randomLat,
      lng: randomLng,
      status: i === 0 ? 'accepted' : i === steps ? 'delivered' : 'en_route',
      timestamp: serverTimestamp(),
      currentOrderId: orderId,
      speed: Math.random() * 40 + 10, // Random speed between 10-50 km/h
      heading: Math.random() * 360 // Random heading
    };
    
    await updateRiderGPS(riderId, gpsData);
    
    if (i < steps) {
      console.log(`📍 GPS Step ${i + 1}/${steps + 1}: [${randomLat.toFixed(6)}, ${randomLng.toFixed(6)}]`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  console.log(`✅ GPS simulation completed for rider ${riderId}`);
};

// Get rider statistics
export const getRiderStats = async (riderId: string): Promise<any> => {
  try {
    // In a real implementation, this would query orders and calculate stats
    const stats = {
      totalOrders: 0,
      completedOrders: 0,
      averageRating: 5.0,
      totalEarnings: '₦0',
      thisWeekOrders: 0,
      onTimeDeliveries: 0,
      responseTime: '2 minutes'
    };
    
    console.log(`📊 Stats retrieved for rider ${riderId}`);
    return stats;
  } catch (error) {
    console.error('❌ Error fetching rider stats:', error);
    return null;
  }
};

// Emergency alert system
export const sendEmergencyAlert = async (riderId: string, location: [number, number], message: string): Promise<boolean> => {
  try {
    const alertData = {
      riderId,
      location,
      message,
      timestamp: serverTimestamp(),
      status: 'active',
      type: 'emergency'
    };
    
    const alertsRef = collection(db, 'emergency_alerts');
    await addDoc(alertsRef, alertData);
    
    // In real implementation, this would trigger immediate notifications to support team
    console.log(`🚨 Emergency alert sent for rider ${riderId}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending emergency alert:', error);
    return false;
  }
};

// Geofencing check (check if rider is near pickup/dropoff)
export const checkGeofence = (
  riderCoords: [number, number], 
  targetCoords: [number, number], 
  radiusMeters: number = 100
): boolean => {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
  const R = 6371000; // Earth's radius in meters
  const lat1 = toRadians(riderCoords[1]);
  const lat2 = toRadians(targetCoords[1]);
  const deltaLat = toRadians(targetCoords[1] - riderCoords[1]);
  const deltaLng = toRadians(targetCoords[0] - riderCoords[0]);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance <= radiusMeters;
};

// Calculate estimated delivery time based on distance and traffic
export const calculateETA = (
  startCoords: [number, number], 
  endCoords: [number, number], 
  vehicleType: 'motorcycle' | 'bicycle' | 'car' = 'motorcycle'
): string => {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
  const R = 6371; // Earth's radius in kilometers
  const lat1 = toRadians(startCoords[1]);
  const lat2 = toRadians(endCoords[1]);
  const deltaLat = toRadians(endCoords[1] - startCoords[1]);
  const deltaLng = toRadians(endCoords[0] - startCoords[0]);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  // Average speeds by vehicle type (km/h)
  const speeds = {
    motorcycle: 35,
    bicycle: 15,
    car: 25
  };
  
  const speed = speeds[vehicleType];
  const timeHours = distance / speed;
  const timeMinutes = Math.ceil(timeHours * 60);
  
  if (timeMinutes < 60) {
    return `${timeMinutes} minutes`;
  } else {
    const hours = Math.floor(timeMinutes / 60);
    const minutes = timeMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
};

export default {
  createRiderProfile,
  updateRiderGPS,
  updateRiderStatus,
  getAvailableRiders,
  sendRiderNotification,
  updateRiderPerformance,
  simulateRiderJourney,
  getRiderStats,
  sendEmergencyAlert,
  checkGeofence,
  calculateETA
};