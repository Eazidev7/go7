// 🔥 GO7 ADDON MANAGEMENT SERVICE
// Handles vendor addons with automatic product sync

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query, 
  where,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Create a new addon and sync it to all vendor products
 * @param {string} vendorId - Vendor's Firestore ID
 * @param {Object} addonData - Addon details
 */
export const createAddon = async (vendorId, addonData) => {
  try {
    // Create addon in vendor's addons collection
    const addonRef = doc(collection(db, 'vendors', vendorId, 'addons'));
    
    const completeAddon = {
      name: addonData.name,
      price: addonData.price,
      description: addonData.description || '',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(addonRef, completeAddon);
    
    // Sync to all products
    await syncAddonsToProducts(vendorId);
    
    console.log('✅ Addon created and synced:', addonRef.id);
    return addonRef.id;
    
  } catch (error) {
    console.error('❌ Error creating addon:', error);
    throw error;
  }
};

/**
 * Update an existing addon and sync changes to products
 * @param {string} vendorId - Vendor ID
 * @param {string} addonId - Addon ID
 * @param {Object} updates - Fields to update
 */
export const updateAddon = async (vendorId, addonId, updates) => {
  try {
    const addonRef = doc(db, 'vendors', vendorId, 'addons', addonId);
    
    updates.updatedAt = serverTimestamp();
    await updateDoc(addonRef, updates);
    
    // Sync to all products
    await syncAddonsToProducts(vendorId);
    
    console.log('✅ Addon updated and synced:', addonId);
    
  } catch (error) {
    console.error('❌ Error updating addon:', error);
    throw error;
  }
};

/**
 * Delete an addon and remove from all products
 * @param {string} vendorId - Vendor ID
 * @param {string} addonId - Addon ID
 */
export const deleteAddon = async (vendorId, addonId) => {
  try {
    const addonRef = doc(db, 'vendors', vendorId, 'addons', addonId);
    await deleteDoc(addonRef);
    
    // Sync to all products (will remove deleted addon)
    await syncAddonsToProducts(vendorId);
    
    console.log('✅ Addon deleted and synced:', addonId);
    
  } catch (error) {
    console.error('❌ Error deleting addon:', error);
    throw error;
  }
};

/**
 * Sync all active addons to all vendor products
 * @param {string} vendorId - Vendor ID
 */
export const syncAddonsToProducts = async (vendorId) => {
  try {
    // Fetch all active addons
    const addonsRef = collection(db, 'vendors', vendorId, 'addons');
    const addonsQuery = query(addonsRef, where('isActive', '==', true));
    const addonsSnap = await getDocs(addonsQuery);
    
    const addons = addonsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Fetch all products for this vendor
    const productsRef = collection(db, 'products');
    const productsQuery = query(productsRef, where('vendorId', '==', vendorId));
    const productsSnap = await getDocs(productsQuery);
    
    if (productsSnap.empty) {
      console.log('No products found for vendor:', vendorId);
      return;
    }
    
    // Batch update all products
    const batch = writeBatch(db);
    
    productsSnap.docs.forEach(productDoc => {
      const productRef = doc(db, 'products', productDoc.id);
      
      batch.update(productRef, { 
        addons: addons,
        timestamp: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    
    console.log(`✅ Synced ${addons.length} addons to ${productsSnap.docs.length} products`);
    
  } catch (error) {
    console.error('❌ Error syncing addons to products:', error);
    throw error;
  }
};

/**
 * Get all addons for a vendor
 * @param {string} vendorId - Vendor ID
 * @param {boolean} activeOnly - Return only active addons
 */
export const getVendorAddons = async (vendorId, activeOnly = false) => {
  try {
    const addonsRef = collection(db, 'vendors', vendorId, 'addons');
    let q = addonsRef;
    
    if (activeOnly) {
      q = query(addonsRef, where('isActive', '==', true));
    }
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
  } catch (error) {
    console.error('❌ Error fetching addons:', error);
    throw error;
  }
};
