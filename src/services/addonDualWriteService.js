// 🔥 GO7 ADDON DUAL-WRITE SERVICE
// Saves addons to BOTH locations:
// 1. vendors/{vendorId}/products/{productId}/addons/{addonId}
// 2. products/{productId}/addons/{addonId}

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
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Create addon in both vendor and global product collections
 * @param {string} vendorId - Vendor ID
 * @param {string} productId - Product ID
 * @param {Object} addonData - Addon details
 * @returns {Promise<string>} - Addon ID
 */
export const createAddon = async (vendorId, productId, addonData) => {
  try {
    console.log('🍕 Creating addon for product:', productId);
    
    const batch = writeBatch(db);
    
    // Generate addon ID
    const addonId = doc(collection(db, 'temp')).id;
    
    const completeAddon = {
      name: addonData.name,
      price: addonData.price || 0,
      category: addonData.category || 'extra',
      description: addonData.description || '',
      imageUrl: addonData.imageUrl || '',
      isActive: true,
      vendorId: vendorId,
      productId: productId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // 1. Write to vendor's product addons
    const vendorAddonRef = doc(db, 'vendors', vendorId, 'products', productId, 'addons', addonId);
    batch.set(vendorAddonRef, completeAddon);
    
    // 2. Write to global product addons
    const globalAddonRef = doc(db, 'products', productId, 'addons', addonId);
    batch.set(globalAddonRef, completeAddon);
    
    await batch.commit();
    
    console.log('✅ Addon created in both locations:', addonId);
    
    // Also update product.addons[] array for backward compatibility
    await syncAddonsToProductArray(productId);
    
    return addonId;
    
  } catch (error) {
    console.error('❌ Error creating addon:', error);
    throw error;
  }
};

/**
 * Update addon in both locations
 * @param {string} vendorId - Vendor ID
 * @param {string} productId - Product ID
 * @param {string} addonId - Addon ID
 * @param {Object} updates - Fields to update
 */
export const updateAddon = async (vendorId, productId, addonId, updates) => {
  try {
    console.log('📝 Updating addon:', addonId);
    
    const batch = writeBatch(db);
    
    const addonUpdates = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    // 1. Update vendor's product addon
    const vendorAddonRef = doc(db, 'vendors', vendorId, 'products', productId, 'addons', addonId);
    batch.update(vendorAddonRef, addonUpdates);
    
    // 2. Update global product addon
    const globalAddonRef = doc(db, 'products', productId, 'addons', addonId);
    batch.update(globalAddonRef, addonUpdates);
    
    await batch.commit();
    
    console.log('✅ Addon updated in both locations');
    
    // Sync to product.addons[] array
    await syncAddonsToProductArray(productId);
    
  } catch (error) {
    console.error('❌ Error updating addon:', error);
    throw error;
  }
};

/**
 * Delete addon from both locations
 * @param {string} vendorId - Vendor ID
 * @param {string} productId - Product ID
 * @param {string} addonId - Addon ID
 */
export const deleteAddon = async (vendorId, productId, addonId) => {
  try {
    console.log('🗑️ Deleting addon:', addonId);
    
    const batch = writeBatch(db);
    
    // 1. Delete from vendor's product addons
    const vendorAddonRef = doc(db, 'vendors', vendorId, 'products', productId, 'addons', addonId);
    batch.delete(vendorAddonRef);
    
    // 2. Delete from global product addons
    const globalAddonRef = doc(db, 'products', productId, 'addons', addonId);
    batch.delete(globalAddonRef);
    
    await batch.commit();
    
    console.log('✅ Addon deleted from both locations');
    
    // Sync to product.addons[] array
    await syncAddonsToProductArray(productId);
    
  } catch (error) {
    console.error('❌ Error deleting addon:', error);
    throw error;
  }
};

/**
 * Fetch addons from global products collection
 * @param {string} productId - Product ID
 * @returns {Promise<Array>} - Array of addons
 */
export const fetchAddons = async (productId) => {
  try {
    console.log('📦 Fetching addons for product:', productId);
    
    const addonsRef = collection(db, 'products', productId, 'addons');
    const q = query(addonsRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    
    const addons = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('✅ Fetched', addons.length, 'addons');
    return addons;
    
  } catch (error) {
    console.error('❌ Error fetching addons:', error);
    return [];
  }
};

/**
 * Sync addons from subcollection to product.addons[] array
 * This maintains backward compatibility with existing code
 * @param {string} productId - Product ID
 */
export const syncAddonsToProductArray = async (productId) => {
  try {
    // Fetch all addons from global products collection
    const addonsRef = collection(db, 'products', productId, 'addons');
    const q = query(addonsRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    
    const addons = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Update product document with addons array
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      addons: addons,
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Synced ${addons.length} addons to product.addons[] array`);
    
  } catch (error) {
    console.error('❌ Error syncing addons to array:', error);
    // Don't throw - this is just for compatibility
  }
};

/**
 * Migrate vendor addons to product addons
 * Call this when products are created/updated to link their addons
 * @param {string} vendorId - Vendor ID
 * @param {string} productId - Product ID
 */
export const migrateVendorAddonsToProduct = async (vendorId, productId) => {
  try {
    console.log('🔄 Migrating vendor addons to product:', productId);
    
    // Fetch vendor's general addons
    const vendorAddonsRef = collection(db, 'vendors', vendorId, 'addons');
    const q = query(vendorAddonsRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    let count = 0;
    
    snapshot.docs.forEach(addonDoc => {
      const addon = addonDoc.data();
      
      // Write to both locations
      const vendorProductAddonRef = doc(db, 'vendors', vendorId, 'products', productId, 'addons', addonDoc.id);
      const globalProductAddonRef = doc(db, 'products', productId, 'addons', addonDoc.id);
      
      const addonData = {
        ...addon,
        productId: productId,
        vendorId: vendorId,
        updatedAt: serverTimestamp()
      };
      
      batch.set(vendorProductAddonRef, addonData);
      batch.set(globalProductAddonRef, addonData);
      count++;
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`✅ Migrated ${count} addons to product ${productId}`);
      
      // Sync to product.addons[] array
      await syncAddonsToProductArray(productId);
    }
    
  } catch (error) {
    console.error('❌ Error migrating addons:', error);
    throw error;
  }
};

export default {
  createAddon,
  updateAddon,
  deleteAddon,
  fetchAddons,
  syncAddonsToProductArray,
  migrateVendorAddonsToProduct
};
