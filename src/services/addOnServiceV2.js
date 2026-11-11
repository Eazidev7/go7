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
  increment,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  uploadAddonImage, 
  updateAddonImage, 
  deleteAddonWithImages, 
  generateAddonId, 
  validateImageFile 
} from './uploadAddonImage';

class AddOnService {
  constructor() {
    this.collection = 'addons';
  }

  // Fetch add-ons for a specific vendor (using subcollection structure)
  async getVendorAddOns(vendorId) {
    try {
      console.log('🍽️ Fetching add-ons for vendor:', vendorId);
      
      const addonsRef = collection(db, 'vendors', vendorId, 'addons');
      const q = query(addonsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const addons = [];
      snapshot.forEach((doc) => {
        addons.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('✅ Add-ons fetched:', addons.length);
      return addons;
    } catch (error) {
      console.error('❌ Error fetching vendor add-ons:', error);
      throw new Error('Failed to fetch add-ons');
    }
  }

  // Fetch add-ons by category for a specific vendor
  async getVendorAddOnsByCategory(vendorId, category) {
    try {
      console.log('🏷️ Fetching add-ons for vendor:', vendorId, 'category:', category);
      
      const addonsRef = collection(db, 'vendors', vendorId, 'addons');
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
      
      console.log('✅ Category add-ons fetched:', addons.length);
      return addons;
    } catch (error) {
      console.error('❌ Error fetching vendor add-ons by category:', error);
      throw new Error('Failed to fetch add-ons by category');
    }
  }

  // Get single add-on by ID
  async getAddOnById(vendorId, addonId) {
    try {
      console.log('🔍 Fetching add-on:', addonId, 'for vendor:', vendorId);
      
      const docRef = doc(db, 'vendors', vendorId, 'addons', addonId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const addon = {
          id: docSnap.id,
          ...docSnap.data()
        };
        console.log('✅ Add-on found:', addon.name);
        return addon;
      } else {
        console.log('❌ Add-on not found');
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching add-on:', error);
      throw new Error('Failed to fetch add-on');
    }
  }

  // Create new add-on with automatic thumbnail generation
  async createAddOn(vendorId, addonData, imageFile = null, onProgress = null) {
    try {
      console.log('➕ Creating add-on for vendor:', vendorId);
      
      if (!vendorId) {
        throw new Error('Vendor ID is required to create add-ons');
      }

      // Validate image file if provided
      if (imageFile) {
        const validation = validateImageFile(imageFile);
        if (!validation.valid) {
          throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Generate unique addon ID
      const addonId = generateAddonId();

      if (imageFile) {
        console.log('📸 Creating add-on with image upload...');
        
        // Use the new upload system with thumbnail generation
        const uploadResult = await uploadAddonImage({
          vendorId,
          addonId,
          file: imageFile,
          addonData: {
            ...addonData,
            vendorId
          },
          onProgress
        });

        console.log('✅ Add-on created with images:', uploadResult);
        return {
          success: true,
          id: addonId,
          data: uploadResult.addonData,
          imageUrl: uploadResult.imageUrl,
          thumbUrl: uploadResult.thumbUrl
        };
      } else {
        console.log('📝 Creating add-on without image...');
        
        // Create addon without image
        const docData = {
          ...addonData,
          vendorId,
          imageUrl: null,
          thumbUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const docRef = doc(db, 'vendors', vendorId, 'addons', addonId);
        await setDoc(docRef, docData);
        
        console.log('✅ Add-on created without image');
        return {
          success: true,
          id: addonId,
          data: docData
        };
      }
    } catch (error) {
      console.error('❌ Error creating add-on:', error);
      throw error;
    }
  }

  // Update existing add-on with optional image replacement
  async updateAddOn(vendorId, addonId, addonData, imageFile = null, onProgress = null) {
    try {
      console.log('📝 Updating add-on:', addonId, 'for vendor:', vendorId);
      
      if (!vendorId || !addonId) {
        throw new Error('Vendor ID and Add-on ID are required to update add-ons');
      }

      const docRef = doc(db, 'vendors', vendorId, 'addons', addonId);

      if (imageFile) {
        console.log('📸 Updating add-on with new image...');
        
        // Validate new image file
        const validation = validateImageFile(imageFile);
        if (!validation.valid) {
          throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
        }

        // Update with new image using the upload system
        const uploadResult = await updateAddonImage({
          vendorId,
          addonId,
          file: imageFile,
          onProgress
        });

        // Update other addon data
        const updatedData = {
          ...addonData,
          imageUrl: uploadResult.imageUrl,
          thumbUrl: uploadResult.thumbUrl,
          updatedAt: new Date()
        };

        await updateDoc(docRef, updatedData);

        console.log('✅ Add-on updated with new image');
        return {
          success: true,
          data: updatedData,
          imageUrl: uploadResult.imageUrl,
          thumbUrl: uploadResult.thumbUrl
        };
      } else {
        console.log('📝 Updating add-on without changing image...');
        
        // Update without changing image
        const updatedData = {
          ...addonData,
          updatedAt: new Date()
        };

        await updateDoc(docRef, updatedData);
        
        console.log('✅ Add-on updated');
        return {
          success: true,
          data: updatedData
        };
      }
    } catch (error) {
      console.error('❌ Error updating add-on:', error);
      throw error;
    }
  }

  // Delete add-on and its images (handled by Cloud Function)
  async deleteAddOn(vendorId, addonId) {
    try {
      console.log('🗑️ Deleting add-on:', addonId, 'for vendor:', vendorId);
      
      if (!vendorId || !addonId) {
        throw new Error('Vendor ID and Add-on ID are required to delete add-ons');
      }

      // Use the new deletion system that triggers Cloud Function cleanup
      await deleteAddonWithImages(vendorId, addonId);
      
      console.log('✅ Add-on deleted');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting add-on:', error);
      throw error;
    }
  }

  // Upload addon image using the new system
  async uploadImage(vendorId, addonId, imageFile, onProgress = null) {
    try {
      console.log('📤 Uploading image for add-on:', addonId);
      
      const validation = validateImageFile(imageFile);
      if (!validation.valid) {
        throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
      }

      const result = await uploadAddonImage({
        vendorId,
        addonId,
        file: imageFile,
        onProgress
      });

      console.log('✅ Image uploaded successfully');
      return result;
    } catch (error) {
      console.error('❌ Error uploading addon image:', error);
      throw error;
    }
  }

  // Listen to add-ons changes for a vendor
  listenToVendorAddOns(vendorId, callback) {
    try {
      console.log('👂 Setting up real-time listener for vendor add-ons:', vendorId);
      
      const addonsRef = collection(db, 'vendors', vendorId, 'addons');
      const q = query(addonsRef, orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const addons = [];
        snapshot.forEach((doc) => {
          addons.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        console.log('🔄 Add-ons updated:', addons.length);
        callback(addons);
      }, (error) => {
        console.error('❌ Error in add-ons listener:', error);
        callback(null, error);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up add-ons listener:', error);
      throw error;
    }
  }

  // Generate addon ID
  generateAddonId() {
    return generateAddonId();
  }

  // Validate addon data
  validateAddonData(addonData) {
    const errors = [];
    
    if (!addonData.name || addonData.name.trim().length === 0) {
      errors.push('Add-on name is required');
    }
    
    if (!addonData.price || addonData.price <= 0) {
      errors.push('Add-on price must be greater than 0');
    }
    
    if (!addonData.category || addonData.category.trim().length === 0) {
      errors.push('Add-on category is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get addon categories for a vendor
  async getAddonCategories(vendorId) {
    try {
      console.log('🏷️ Fetching addon categories for vendor:', vendorId);
      
      const addons = await this.getVendorAddOns(vendorId);
      const categories = [...new Set(addons.map(addon => addon.category).filter(Boolean))];
      
      console.log('✅ Categories found:', categories);
      return categories;
    } catch (error) {
      console.error('❌ Error fetching addon categories:', error);
      throw error;
    }
  }

  // Search addons by name
  async searchAddons(vendorId, searchTerm) {
    try {
      console.log('🔍 Searching addons for:', searchTerm);
      
      const addons = await this.getVendorAddOns(vendorId);
      const filteredAddons = addons.filter(addon => 
        addon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (addon.description && addon.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (addon.category && addon.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      console.log('✅ Search results:', filteredAddons.length);
      return filteredAddons;
    } catch (error) {
      console.error('❌ Error searching addons:', error);
      throw error;
    }
  }

  // Get available addons (in stock)
  async getAvailableAddons(vendorId) {
    try {
      console.log('📦 Fetching available addons for vendor:', vendorId);
      
      const addonsRef = collection(db, 'vendors', vendorId, 'addons');
      const q = query(
        addonsRef, 
        where('inStock', '==', true),
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
      
      console.log('✅ Available addons:', addons.length);
      return addons;
    } catch (error) {
      console.error('❌ Error fetching available addons:', error);
      throw error;
    }
  }

  // Toggle addon availability
  async toggleAddonAvailability(vendorId, addonId, inStock) {
    try {
      console.log('🔄 Toggling addon availability:', addonId, 'to:', inStock);
      
      const docRef = doc(db, 'vendors', vendorId, 'addons', addonId);
      await updateDoc(docRef, {
        inStock: inStock,
        updatedAt: new Date()
      });
      
      console.log('✅ Addon availability updated');
      return { success: true };
    } catch (error) {
      console.error('❌ Error toggling addon availability:', error);
      throw error;
    }
  }
}

// Create singleton instance
const addOnService = new AddOnService();

// Export legacy functions for backward compatibility
export const createAddOn = (vendorId, addonData, imageFile, onProgress) => 
  addOnService.createAddOn(vendorId, addonData, imageFile, onProgress);

export const updateAddOn = (vendorId, addonId, addonData, imageFile, onProgress) => 
  addOnService.updateAddOn(vendorId, addonId, addonData, imageFile, onProgress);

export const deleteAddOn = (vendorId, addonId) => 
  addOnService.deleteAddOn(vendorId, addonId);

export const getAddOns = (vendorId) => 
  addOnService.getVendorAddOns(vendorId);

export const getAddOnsByCategory = (vendorId, category) => 
  addOnService.getVendorAddOnsByCategory(vendorId, category);

export const getAddOnById = (vendorId, addonId) => 
  addOnService.getAddOnById(vendorId, addonId);

export const uploadAddonImageV2 = (vendorId, addonId, imageFile, onProgress) => 
  addOnService.uploadImage(vendorId, addonId, imageFile, onProgress);

// Export service instance
export default addOnService;