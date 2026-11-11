import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../firebase/config';

/**
 * Firestore helper functions for vendor operations
 * Uses the new addon system with vendors/{vendorId}/addons path structure
 */

export class FirestoreVendorHelpers {
  
  /**
   * Get unified Firestore reference for vendor addons
   * @param {string} vendorId - The vendor ID
   * @returns {CollectionReference} Firestore collection reference
   */
  static getAddonsRef(vendorId) {
    return collection(db, `vendors/${vendorId}/addons`);
  }

  /**
   * Set up real-time listener for vendor addons
   * @param {string} vendorId - The vendor ID
   * @param {Function} callback - Callback function to handle updates
   * @returns {Function} Unsubscribe function
   */
  static setupAddonsListener(vendorId, callback) {
    try {
      const addonsRef = this.getAddonsRef(vendorId);
      const q = query(addonsRef, orderBy('createdAt', 'desc'));
      
      return onSnapshot(q, (snapshot) => {
        const addons = [];
        snapshot.forEach((doc) => {
          addons.push({
            id: doc.id,
            ...doc.data()
          });
        });
        callback(addons);
      }, (error) => {
        console.error('❌ Error in addon listener:', error);
        callback([]);
      });
    } catch (error) {
      console.error('❌ Error setting up addon listener:', error);
      return () => {}; // Return no-op unsubscribe function
    }
  }

  /**
   * Get all addons for a vendor
   * @param {string} vendorId - The vendor ID
   * @returns {Promise<Array>} Array of addon objects
   */
  static async getVendorAddons(vendorId) {
    try {
      console.log('🍽️ Fetching addons for vendor:', vendorId);
      
      const addonsRef = this.getAddonsRef(vendorId);
      const q = query(addonsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const addons = [];
      snapshot.forEach((doc) => {
        addons.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('✅ Addons fetched:', addons.length);
      return addons;
    } catch (error) {
      console.error('❌ Error fetching vendor addons:', error);
      throw new Error('Failed to fetch addons');
    }
  }

  /**
   * Get addons by category for a vendor
   * @param {string} vendorId - The vendor ID
   * @param {string} category - The addon category
   * @returns {Promise<Array>} Array of addon objects
   */
  static async getAddonsByCategory(vendorId, category) {
    try {
      console.log('🏷️ Fetching addons by category:', category, 'for vendor:', vendorId);
      
      const addonsRef = this.getAddonsRef(vendorId);
      const q = query(
        addonsRef, 
        where('category', '==', category),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const addons = [];
      snapshot.forEach((doc) => {
        addons.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('✅ Category addons fetched:', addons.length);
      return addons;
    } catch (error) {
      console.error('❌ Error fetching addons by category:', error);
      throw new Error('Failed to fetch addons by category');
    }
  }

  /**
   * Get single addon by ID
   * @param {string} vendorId - The vendor ID
   * @param {string} addonId - The addon ID
   * @returns {Promise<Object|null>} Addon object or null
   */
  static async getAddonById(vendorId, addonId) {
    try {
      console.log('🔍 Fetching addon:', addonId, 'for vendor:', vendorId);
      
      const docRef = doc(db, `vendors/${vendorId}/addons`, addonId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const addon = {
          id: docSnap.id,
          ...docSnap.data()
        };
        console.log('✅ Addon found:', addon.name);
        return addon;
      } else {
        console.log('❌ Addon not found');
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching addon:', error);
      throw new Error('Failed to fetch addon');
    }
  }

  /**
   * Create new addon using the new schema
   * @param {string} vendorId - The vendor ID
   * @param {Object} addonData - The addon data object
   * @param {File} imageFile - Optional image file to upload
   * @returns {Promise<Object>} Created addon object
   */
  static async createAddon(vendorId, addonData, imageFile = null) {
    try {
      console.log('➕ Creating addon for vendor:', vendorId);
      
      const addonId = `addon_${Date.now()}`;
      let imageUrl = null;

      // Handle image upload if provided
      if (imageFile) {
        imageUrl = await this.uploadAddonImage(vendorId, addonId, imageFile);
      }

      // Prepare addon data with new schema
      const docData = {
        name: addonData.name,
        price: parseFloat(addonData.price),
        category: addonData.category,
        measurementType: addonData.measurementType || 'unit',
        minQty: parseInt(addonData.minQty) || 1,
        maxQty: parseInt(addonData.maxQty) || 10,
        step: parseFloat(addonData.step) || 1,
        customLabel: addonData.customLabel || null,
        description: addonData.description || '',
        active: addonData.active !== undefined ? addonData.active : true,
        imageUrl,
        vendorId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = doc(db, `vendors/${vendorId}/addons`, addonId);
      await setDoc(docRef, docData);
      
      console.log('✅ Addon created successfully');
      return {
        id: addonId,
        ...docData
      };
    } catch (error) {
      console.error('❌ Error creating addon:', error);
      throw error;
    }
  }

  /**
   * Update existing addon
   * @param {string} vendorId - The vendor ID
   * @param {string} addonId - The addon ID
   * @param {Object} addonData - Updated addon data
   * @param {File} imageFile - Optional new image file
   * @returns {Promise<Object>} Updated addon object
   */
  static async updateAddon(vendorId, addonId, addonData, imageFile = null) {
    try {
      console.log('📝 Updating addon:', addonId, 'for vendor:', vendorId);
      
      const docRef = doc(db, `vendors/${vendorId}/addons`, addonId);
      let imageUrl = addonData.imageUrl;

      // Handle new image upload if provided
      if (imageFile) {
        imageUrl = await this.uploadAddonImage(vendorId, addonId, imageFile);
      }

      // Prepare update data with new schema
      const updateData = {
        name: addonData.name,
        price: parseFloat(addonData.price),
        category: addonData.category,
        measurementType: addonData.measurementType || 'unit',
        minQty: parseInt(addonData.minQty) || 1,
        maxQty: parseInt(addonData.maxQty) || 10,
        step: parseFloat(addonData.step) || 1,
        customLabel: addonData.customLabel || null,
        description: addonData.description || '',
        active: addonData.active,
        imageUrl,
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, updateData);
      
      console.log('✅ Addon updated successfully');
      return {
        id: addonId,
        ...updateData
      };
    } catch (error) {
      console.error('❌ Error updating addon:', error);
      throw error;
    }
  }

  /**
   * Delete addon
   * @param {string} vendorId - The vendor ID
   * @param {string} addonId - The addon ID
   * @returns {Promise<void>}
   */
  static async deleteAddon(vendorId, addonId) {
    try {
      console.log('🗑️ Deleting addon:', addonId, 'for vendor:', vendorId);
      
      // Get addon data first to check for image
      const addon = await this.getAddonById(vendorId, addonId);
      
      // Delete image if exists
      if (addon?.imageUrl) {
        await this.deleteAddonImage(vendorId, addonId);
      }

      // Delete addon document
      const docRef = doc(db, `vendors/${vendorId}/addons`, addonId);
      await deleteDoc(docRef);
      
      console.log('✅ Addon deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting addon:', error);
      throw error;
    }
  }

  /**
   * Toggle addon active status
   * @param {string} vendorId - The vendor ID
   * @param {string} addonId - The addon ID
   * @param {boolean} active - New active status
   * @returns {Promise<void>}
   */
  static async toggleAddonActive(vendorId, addonId, active) {
    try {
      console.log('🔄 Toggling addon active status:', addonId, 'to:', active);
      
      const docRef = doc(db, `vendors/${vendorId}/addons`, addonId);
      await updateDoc(docRef, {
        active,
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Addon status updated');
    } catch (error) {
      console.error('❌ Error updating addon status:', error);
      throw error;
    }
  }

  /**
   * Upload addon image to Firebase Storage
   * @param {string} vendorId - The vendor ID
   * @param {string} addonId - The addon ID
   * @param {File} imageFile - The image file to upload
   * @returns {Promise<string>} Download URL of uploaded image
   */
  static async uploadAddonImage(vendorId, addonId, imageFile) {
    try {
      console.log('📸 Uploading image for addon (Hostinger):', addonId);
      const { uploadImageToHostinger } = await import('../services/hostingerImageUpload');
      const downloadURL = await uploadImageToHostinger(
        imageFile,
        `vendors/${vendorId}/addons/${addonId}/image.jpg`
      );
      console.log('✅ Image uploaded successfully');
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Delete addon image from Firebase Storage
   * @param {string} vendorId - The vendor ID
   * @param {string} addonId - The addon ID
   * @returns {Promise<void>}
   */
  static async deleteAddonImage(vendorId, addonId) {
    try {
      console.log('🗑️ Deleting image for addon:', addonId);
      
      const imageRef = ref(storage, `vendors/${vendorId}/addons/${addonId}/image.jpg`);
      await deleteObject(imageRef);
      
      console.log('✅ Image deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting image:', error);
      // Don't throw error for image deletion failure
    }
  }

  /**
   * Validate addon data according to new schema
   * @param {Object} addonData - Addon data to validate
   * @returns {Object} Validation result with valid flag and errors array
   */
  static validateAddonData(addonData) {
    const errors = [];

    // Required fields
    if (!addonData.name?.trim()) {
      errors.push('Addon name is required');
    }

    if (!addonData.price || addonData.price <= 0) {
      errors.push('Valid price is required');
    }

    if (!addonData.category) {
      errors.push('Category is required');
    }

    // Measurement type validation
    const validMeasurementTypes = ['unit', 'tuber', 'pack', 'spoon', 'piece', 'kg', 'custom'];
    if (addonData.measurementType && !validMeasurementTypes.includes(addonData.measurementType)) {
      errors.push('Invalid measurement type');
    }

    if (addonData.measurementType === 'custom' && !addonData.customLabel?.trim()) {
      errors.push('Custom label is required for custom measurement type');
    }

    // Quantity validation
    if (addonData.minQty && addonData.minQty < 1) {
      errors.push('Minimum quantity must be at least 1');
    }

    if (addonData.maxQty && addonData.minQty && addonData.maxQty < addonData.minQty) {
      errors.push('Maximum quantity must be greater than minimum quantity');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get addon statistics for vendor dashboard
   * @param {string} vendorId - The vendor ID
   * @returns {Promise<Object>} Statistics object
   */
  static async getAddonStats(vendorId) {
    try {
      const addons = await this.getVendorAddons(vendorId);
      
      const stats = {
        total: addons.length,
        active: addons.filter(addon => addon.active).length,
        inactive: addons.filter(addon => !addon.active).length,
        byCategory: {}
      };

      // Group by category
      addons.forEach(addon => {
        const category = addon.category || 'other';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('❌ Error getting addon stats:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byCategory: {}
      };
    }
  }
}

export default FirestoreVendorHelpers;