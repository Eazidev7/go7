/**
 * Firestore Rider Service
 * 
 * This service handles all Firestore operations for riders.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Unsubscribe,
  onSnapshot,
  serverTimestamp,
  GeoPoint,
  DocumentSnapshot,
  Query,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Rider, RiderStatus, Location } from '../models/firestore';

const RIDERS_COLLECTION = 'riders';

/**
 * Create or update a rider in Firestore
 * @param riderData - The rider data
 * @returns The created/updated rider
 */
export const createOrUpdateRider = async (riderData: Partial<Rider>): Promise<Rider> => {
  try {
    // Ensure rider has an ID
    const riderId = riderData.id || `RIDER-${Date.now()}`;
    
    // Create the rider object
    const rider: Rider = {
      id: riderId,
      name: riderData.name || 'Unknown Rider',
      phone: riderData.phone || '',
      email: riderData.email,
      status: riderData.status || RiderStatus.OFFLINE,
      currentLocation: riderData.currentLocation || {
        address: '',
        lat: 0,
        lng: 0
      },
      lastUpdated: serverTimestamp() as unknown as Date
    };
    
    // Create or update the rider document
    const riderRef = doc(db, RIDERS_COLLECTION, riderId);
    await setDoc(riderRef, rider, { merge: true });
    
    // Fetch and return the created/updated rider
    const riderDoc = await getDoc(riderRef);
    return { ...riderDoc.data(), id: riderDoc.id } as Rider;
  } catch (error) {
    console.error('Error creating/updating rider:', error);
    throw error;
  }
};

/**
 * Get a rider by ID
 * @param riderId - The rider ID
 * @returns The rider or null if not found
 */
export const getRiderById = async (riderId: string): Promise<Rider | null> => {
  try {
    const riderRef = doc(db, RIDERS_COLLECTION, riderId);
    const riderDoc = await getDoc(riderRef);
    
    if (!riderDoc.exists()) {
      return null;
    }
    
    return { ...riderDoc.data(), id: riderDoc.id } as Rider;
  } catch (error) {
    console.error('Error getting rider:', error);
    throw error;
  }
};

/**
 * Get all riders
 * @param filters - Optional query filters
 * @returns Array of riders
 */
export const getRiders = async (filters?: { [key: string]: any }): Promise<Rider[]> => {
  try {
    let ridersQuery: Query = collection(db, RIDERS_COLLECTION);
    
    // Apply filters if provided
    if (filters) {
      Object.entries(filters).forEach(([field, value]) => {
        ridersQuery = query(ridersQuery, where(field, '==', value));
      });
    }
    
    // Order by name
    ridersQuery = query(ridersQuery, orderBy('name'));
    
    const ridersSnapshot = await getDocs(ridersQuery);
    const riders: Rider[] = [];
    
    ridersSnapshot.forEach((doc) => {
      riders.push({ ...doc.data(), id: doc.id } as Rider);
    });
    
    return riders;
  } catch (error) {
    console.error('Error getting riders:', error);
    throw error;
  }
};

/**
 * Update rider status
 * @param riderId - The rider ID
 * @param status - The new status
 * @returns The updated rider
 */
export const updateRiderStatus = async (
  riderId: string, 
  status: RiderStatus
): Promise<Rider> => {
  try {
    const riderRef = doc(db, RIDERS_COLLECTION, riderId);
    
    await updateDoc(riderRef, {
      status,
      lastUpdated: serverTimestamp()
    });
    
    // Fetch and return the updated rider
    const riderDoc = await getDoc(riderRef);
    return { ...riderDoc.data(), id: riderDoc.id } as Rider;
  } catch (error) {
    console.error('Error updating rider status:', error);
    throw error;
  }
};

/**
 * Update rider location
 * @param riderId - The rider ID
 * @param location - The new location
 * @returns The updated rider
 */
export const updateRiderLocation = async (
  riderId: string, 
  location: Location
): Promise<Rider> => {
  try {
    const riderRef = doc(db, RIDERS_COLLECTION, riderId);
    
    await updateDoc(riderRef, {
      currentLocation: location,
      lastUpdated: serverTimestamp()
    });
    
    // Fetch and return the updated rider
    const riderDoc = await getDoc(riderRef);
    return { ...riderDoc.data(), id: riderDoc.id } as Rider;
  } catch (error) {
    console.error('Error updating rider location:', error);
    throw error;
  }
};

/**
 * Find available riders
 * @param maxResults - Maximum number of results to return
 * @returns Array of available riders
 */
export const findAvailableRiders = async (maxResults: number = 10): Promise<Rider[]> => {
  try {
    const ridersQuery = query(
      collection(db, RIDERS_COLLECTION),
      where('status', '==', RiderStatus.AVAILABLE),
      orderBy('lastUpdated', 'desc'),
      limit(maxResults)
    );
    
    const ridersSnapshot = await getDocs(ridersQuery);
    const riders: Rider[] = [];
    
    ridersSnapshot.forEach((doc) => {
      riders.push({ ...doc.data(), id: doc.id } as Rider);
    });
    
    return riders;
  } catch (error) {
    console.error('Error finding available riders:', error);
    throw error;
  }
};

/**
 * Subscribe to rider updates
 * @param riderId - The rider ID
 * @param callback - The callback function to receive updates
 * @returns An unsubscribe function
 */
export const subscribeToRider = (
  riderId: string, 
  callback: (rider: Rider | null) => void
): Unsubscribe => {
  const riderRef = doc(db, RIDERS_COLLECTION, riderId);
  
  return onSnapshot(
    riderRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        const rider = { ...docSnapshot.data(), id: docSnapshot.id } as Rider;
        callback(rider);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`Error subscribing to rider ${riderId}:`, error);
      callback(null);
    }
  );
};
