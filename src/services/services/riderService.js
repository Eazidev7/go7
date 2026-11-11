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
  limit 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RiderStatus } from '../models/firestore';

const RIDERS_COLLECTION = 'riders';

/**
 * Create or update a rider in Firestore
 * @param {Object} riderData - The rider data
 * @returns {Promise<Object>} The created/updated rider
 */
export const createOrUpdateRider = async (riderData) => {
  try {
    // Ensure rider has an ID
    const riderId = riderData.id || `RIDER-${Date.now()}`;
    
    // Create the rider object
    const rider = {
      id: riderId,
      name: riderData.name || 'Unknown Rider',
      phone: riderData.phone || '',
      status: riderData.status || RiderStatus.OFFLINE,
      lat: riderData.lat || 0,
      lng: riderData.lng || 0,
      updatedAt: Date.now()
    };
    
    // Save to Firestore
    const riderRef = doc(db, RIDERS_COLLECTION, riderId);
    await setDoc(riderRef, rider);
    
    return rider;
  } catch (error) {
    console.error('Error creating/updating rider in Firestore:', error);
    throw error;
  }
};

/**
 * Get a rider by ID from Firestore
 * @param {string} id - The rider ID
 * @returns {Promise<Object|null>} The rider or null if not found
 */
export const getRiderById = async (id) => {
  try {
    const riderRef = doc(db, RIDERS_COLLECTION, id);
    const riderSnap = await getDoc(riderRef);
    
    if (!riderSnap.exists()) {
      return null;
    }
    
    return riderSnap.data();
  } catch (error) {
    console.error('Error getting rider from Firestore:', error);
    throw error;
  }
};

/**
 * Update a rider's location
 * @param {string} id - The rider ID
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object|null>} The updated rider or null if not found
 */
export const updateRiderLocation = async (id, lat, lng) => {
  try {
    const riderRef = doc(db, RIDERS_COLLECTION, id);
    const riderSnap = await getDoc(riderRef);
    
    if (!riderSnap.exists()) {
      return null;
    }
    
    const updateData = {
      lat,
      lng,
      updatedAt: Date.now()
    };
    
    await updateDoc(riderRef, updateData);
    
    return {
      ...riderSnap.data(),
      ...updateData
    };
  } catch (error) {
    console.error('Error updating rider location in Firestore:', error);
    throw error;
  }
};

/**
 * Update a rider's status
 * @param {string} id - The rider ID
 * @param {string} status - The new status
 * @returns {Promise<Object|null>} The updated rider or null if not found
 */
export const updateRiderStatus = async (id, status) => {
  try {
    const riderRef = doc(db, RIDERS_COLLECTION, id);
    const riderSnap = await getDoc(riderRef);
    
    if (!riderSnap.exists()) {
      return null;
    }
    
    const updateData = {
      status,
      updatedAt: Date.now()
    };
    
    await updateDoc(riderRef, updateData);
    
    return {
      ...riderSnap.data(),
      ...updateData
    };
  } catch (error) {
    console.error('Error updating rider status in Firestore:', error);
    throw error;
  }
};

/**
 * Get all available riders
 * @returns {Promise<Array>} Array of available riders
 */
export const getAvailableRiders = async () => {
  try {
    const ridersCollection = collection(db, RIDERS_COLLECTION);
    const q = query(
      ridersCollection, 
      where('status', '==', RiderStatus.AVAILABLE),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const riders = [];
    querySnapshot.forEach((doc) => {
      riders.push(doc.data());
    });
    
    return riders;
  } catch (error) {
    console.error('Error getting available riders from Firestore:', error);
    throw error;
  }
};

/**
 * Get all riders
 * @returns {Promise<Array>} Array of all riders
 */
export const getAllRiders = async () => {
  try {
    const ridersCollection = collection(db, RIDERS_COLLECTION);
    const querySnapshot = await getDocs(ridersCollection);
    
    const riders = [];
    querySnapshot.forEach((doc) => {
      riders.push(doc.data());
    });
    
    return riders;
  } catch (error) {
    console.error('Error getting all riders from Firestore:', error);
    throw error;
  }
};
