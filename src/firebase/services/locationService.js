/**
 * GO7 Location Service
 * 
 * Handles saving and retrieving user locations from Firestore
 * Connected to users/{uid}.address and users/{uid}.location
 */

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config';

/**
 * @typedef {Object} LocationCoordinates
 * @property {number} lat
 * @property {number} lng
 */

/**
 * @typedef {Object} UserLocation
 * @property {string} address
 * @property {string} [name]
 * @property {'home'|'work'|'other'} [type]
 * @property {string} [instructions]
 * @property {LocationCoordinates} location
 */

/**
 * Save user's selected location to Firestore
 * Updates users/{uid}.address and users/{uid}.location
 */
export const saveUserLocation = async (
  uid, 
  address, 
  coordinates,
  locationName,
  locationType,
  instructions
) => {
  try {
    const userRef = doc(db, 'users', uid);
    
    await updateDoc(userRef, {
      address,
      location: coordinates,
      locationName: locationName || address,
      locationType: locationType || 'other',
      locationInstructions: instructions || '',
      updatedAt: new Date()
    });
    
    console.log('✅ User location saved to Firestore');
  } catch (error) {
    console.error('❌ Error saving user location:', error);
    throw error;
  }
};

/**
 * Get user's saved location from Firestore
 */
export const getUserLocation = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      
      if (data.address && data.location) {
        return {
          address: data.address,
          name: data.locationName || data.address,
          type: data.locationType || 'other',
          instructions: data.locationInstructions || '',
          location: data.location
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting user location:', error);
    throw error;
  }
};

/**
 * Save multiple saved addresses to user profile
 */
export const saveUserAddresses = async (uid, addresses) => {
  try {
    const userRef = doc(db, 'users', uid);
    
    await updateDoc(userRef, {
      savedAddresses: addresses,
      updatedAt: new Date()
    });
    
    console.log('✅ User addresses saved to Firestore');
  } catch (error) {
    console.error('❌ Error saving user addresses:', error);
    throw error;
  }
};

/**
 * Get user's saved addresses from Firestore
 */
export const getUserAddresses = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return data.savedAddresses || [];
    }
    
    return [];
  } catch (error) {
    console.error('❌ Error getting user addresses:', error);
    throw error;
  }
};

export default {
  saveUserLocation,
  getUserLocation,
  saveUserAddresses,
  getUserAddresses
};
