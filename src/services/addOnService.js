/**
 * 🎯 GO7 ADD-ON SERVICE - 3-LEVEL HIERARCHY
 * 
 * Comprehensive 3-level add-on system:
 * 1. Vendor-level add-ons (available to all products)
 * 2. Category-level add-ons (available to products in that category)
 * 3. Product-level add-ons (specific to individual products)
 * 
 * Firestore Structure:
 * - vendors/{vendorId}/addons/{addonId}
 * - vendors/{vendorId}/categories/{categoryId}/addons/{addonId}
 * - vendors/{vendorId}/products/{productId}/addons/{addonId}
 */

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
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { 
  ref, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { uploadImageToHostinger } from './hostingerImageUpload';
import { db, storage } from '../config/firebase';

class AddOnService {
  constructor() {
    this.collection = 'addons';
  }

  /** Firestore batches max 500 ops — keep headroom */
  static BATCH_LIMIT = 400;

  /**
   * Commit many set/update/delete ops in chunked writeBatches.
   * @param {Array<{ type: 'set'|'update'|'delete', ref: import('firebase/firestore').DocumentReference, data?: object, merge?: boolean }>} ops
   */
  async commitChunked(ops) {
    if (!ops?.length) return;
    const limit = AddOnService.BATCH_LIMIT;
    for (let i = 0; i < ops.length; i += limit) {
      const chunk = ops.slice(i, i + limit);
      const batch = writeBatch(db);
      for (const op of chunk) {
        if (op.type === 'delete') {
          batch.delete(op.ref);
        } else if (op.type === 'update') {
          batch.update(op.ref, op.data);
        } else if (op.merge) {
          batch.set(op.ref, op.data, { merge: true });
        } else {
          batch.set(op.ref, op.data);
        }
      }
      await batch.commit();
    }
  }

  /** Fan-out vendor addon to all products without per-product getDoc (was hanging save). */
  async linkAddonToAllProducts(vendorId, addonId, addonDoc, { merge = false } = {}) {
    const productsSnapshot = await getDocs(collection(db, 'vendors', vendorId, 'products'));
    const productCount = productsSnapshot.docs.length;
    if (productCount === 0) {
      console.log('ℹ️ No products to link addon to');
      return 0;
    }

    const ops = productsSnapshot.docs.map((productDoc) => ({
      type: 'set',
      ref: doc(db, 'vendors', vendorId, 'products', productDoc.id, 'addons', addonId),
      data: addonDoc,
      merge,
    }));

    console.log(`🔄 Linking addon ${addonId} to ${productCount} products (${Math.ceil(productCount / AddOnService.BATCH_LIMIT)} batch(es))...`);
    await this.commitChunked(ops);
    console.log(`✅ Addon linked/updated on ${productCount} products`);
    return productCount;
  }

  // Fetch add-ons for a specific vendor (using subcollection structure)
  async getVendorAddOns(vendorId) {
    try {
      console.log('🍽️ Fetching add-ons for vendor:', vendorId);
      
      // Try lowercase 'addons' first
      let addonsRef = collection(db, 'vendors', vendorId, 'addons');
      let snapshot = await getDocs(addonsRef);
      
      // If empty, try uppercase 'addOns' (legacy naming)
      if (snapshot.empty) {
        console.log('⚠️ No addons found, trying addOns (uppercase O)...');
        addonsRef = collection(db, 'vendors', vendorId, 'addOns');
        snapshot = await getDocs(addonsRef);
      }
      
      const addons = [];
      snapshot.forEach((doc) => {
        addons.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('✅ Add-ons fetched:', addons.length);
      console.log('📦 Addon IDs:', addons.map(a => a.id));
      return addons;
    } catch (error) {
      console.error('❌ Error fetching vendor add-ons:', error);
      console.error('Full error:', error.message);
      return []; // Return empty array instead of throwing to prevent crashes
    }
  }

  // Create a new add-on with image upload + DUAL-WRITE to products
  async createAddOn(vendorId, addOnData, imageFile) {
    try {
      console.log('➕ Creating add-on:', addOnData.title);
      
      // Validate required fields
      if (!addOnData.title || !addOnData.price || !imageFile) {
        throw new Error('Missing required fields');
      }

      // Generate addon ID first
      const addonsRef = collection(db, 'vendors', vendorId, 'addons');
      const addonDocRef = doc(addonsRef);
      const addonId = addonDocRef.id;

      // Upload image to Firebase Storage
      const imageUrl = await this.uploadAddonImage(vendorId, addonId, imageFile);

      // Prepare addon document with FULL FIELDS
      const addonDoc = {
        id: addonId,
        name: addOnData.title,
        title: addOnData.title,
        price: addOnData.price,
        imageUrl: imageUrl,
        description: addOnData.description || '',
        available: addOnData.available !== false,
        minQty: addOnData.measurement?.min || 1,
        maxQty: addOnData.measurement?.max || 10,
        addonCategory: addOnData.addonCategory,
        measurement: addOnData.measurement,
        isActive: true,
        vendorId: vendorId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // 1. Save to vendor's addons collection (master) — return path after this is durable
      await setDoc(addonDocRef, addonDoc);
      console.log('✅ Saved to vendors/' + vendorId + '/addons/' + addonId);
      
      // 2. Fan-out to products (chunked; no per-product reads)
      const linked = await this.linkAddonToAllProducts(vendorId, addonId, addonDoc, { merge: false });
      
      return {
        id: addonId,
        success: true,
        message: linked
          ? 'Add-on created and linked to all products'
          : 'Add-on created (will attach when products are added)'
      };
    } catch (error) {
      console.error('❌ Error creating add-on:', error);
      throw new Error(error.message || 'Failed to create add-on');
    }
  }

  // Update an existing add-on + DUAL-WRITE to products
  // options.productId: when editing a product-only addon that has no vendor-level doc
  async updateAddOn(vendorId, addOnId, addOnData, imageFile = null, options = {}) {
    try {
      console.log('📝 Updating add-on:', addOnId);
      console.log('📸 Image file provided:', imageFile ? 'YES' : 'NO');

      const productIdHint = options.productId || null;
      const addonRef = doc(db, 'vendors', vendorId, 'addons', addOnId);
      let addonSnap = await getDoc(addonRef);
      let writeVendorLevel = true;

      // Product-only addons (listed from products/.../addons) may not exist at vendor level
      if (!addonSnap.exists() && productIdHint) {
        const productAddonRef = doc(db, 'vendors', vendorId, 'products', productIdHint, 'addons', addOnId);
        addonSnap = await getDoc(productAddonRef);
        if (!addonSnap.exists()) {
          throw new Error('Add-on not found');
        }
        writeVendorLevel = false;
        console.warn('⚠️ Addon only on product — updating product copy and promoting to vendor level');
      } else if (!addonSnap.exists()) {
        console.warn('⚠️ Add-on not found at:', addonRef.path);
        throw new Error('Add-on not found');
      }

      const currentData = addonSnap.data() || {};
      let imageUrl = currentData.imageUrl || currentData.addonImageUrl || '';

      if (imageFile) {
        console.log('🖼️ Uploading new image...');
        if (imageUrl) {
          try {
            await this.deleteAddonImage(imageUrl);
          } catch (error) {
            console.warn('⚠️ Could not delete old image:', error.message);
          }
        }
        imageUrl = await this.uploadAddonImage(vendorId, addOnId, imageFile);
        console.log('✅ New image uploaded');
      }

      const measurement =
        addOnData.measurement && typeof addOnData.measurement === 'object'
          ? addOnData.measurement
          : { type: 'unit', min: 1, step: 1 };

      const updateData = {
        name: addOnData.title,
        title: addOnData.title,
        price: Number(addOnData.price),
        imageUrl: imageUrl || '',
        description: addOnData.description || '',
        available: addOnData.available !== false,
        minQty: measurement.min || 1,
        maxQty: measurement.max || 10,
        addonCategory: addOnData.addonCategory || currentData.addonCategory || 'food',
        measurement,
        updatedAt: serverTimestamp(),
        vendorId,
      };

      // 1. Persist master (vendor-level) — promote product-only addons upward
      await setDoc(addonRef, { ...currentData, ...updateData, id: addOnId }, { merge: true });
      console.log('✅ Saved vendors/' + vendorId + '/addons/' + addOnId);

      // 2. Fan-out with merge (no per-product getDoc — that caused endless save spinner)
      await this.linkAddonToAllProducts(vendorId, addOnId, updateData, { merge: true });

      // If we started from a single product copy, ensure that product is covered (fan-out does all)
      if (!writeVendorLevel && productIdHint) {
        console.log('✅ Product-only addon promoted + synced');
      }

      return {
        success: true,
        message: 'Add-on updated'
      };
    } catch (error) {
      console.error('❌ Error updating add-on:', error);
      throw new Error(error.message || 'Failed to update add-on');
    }
  }

  // Delete an add-on completely + REMOVE from all products
  // options.productId: when deleting a product-only addon (no vendor-level doc)
  // Product copies are deleted FIRST so the UI reload cannot resurrect them.
  async deleteAddOn(vendorId, addOnId, options = {}) {
    try {
      console.log('🗑️ Deleting add-on:', addOnId, options.productId ? `(product ${options.productId})` : '');

      const productIdHint = options.productId || null;
      const addonRef = doc(db, 'vendors', vendorId, 'addons', addOnId);
      let addonDoc = await getDoc(addonRef);
      let imageUrl = '';

      if (addonDoc.exists()) {
        const addonData = addonDoc.data() || {};
        imageUrl = addonData.imageUrl || addonData.addonImageUrl || '';
      } else if (productIdHint) {
        const productAddonRef = doc(
          db,
          'vendors',
          vendorId,
          'products',
          productIdHint,
          'addons',
          addOnId
        );
        const productAddonSnap = await getDoc(productAddonRef);
        if (productAddonSnap.exists()) {
          const addonData = productAddonSnap.data() || {};
          imageUrl = addonData.imageUrl || addonData.addonImageUrl || '';
        }
      }

      if (imageUrl) {
        try {
          await this.deleteAddonImage(imageUrl);
          console.log('✅ Image deleted from storage');
        } catch (error) {
          console.warn('⚠️ Could not delete image:', error.message);
        }
      }

      // 1. Remove product copies first (prevents list reload from re-adding them)
      const productsSnapshot = await getDocs(collection(db, 'vendors', vendorId, 'products'));
      if (productsSnapshot.docs.length > 0) {
        const ops = productsSnapshot.docs.map((productDoc) => ({
          type: 'delete',
          ref: doc(db, 'vendors', vendorId, 'products', productDoc.id, 'addons', addOnId),
        }));
        await this.commitChunked(ops);
        console.log(`✅ Addon remove attempted on ${productsSnapshot.docs.length} products`);
      } else if (productIdHint) {
        await deleteDoc(
          doc(db, 'vendors', vendorId, 'products', productIdHint, 'addons', addOnId)
        );
      }

      // 2. Delete vendor master if present (missing doc is OK for product-only addons)
      addonDoc = await getDoc(addonRef);
      if (addonDoc.exists()) {
        await deleteDoc(addonRef);
        console.log('✅ Deleted from vendors/' + vendorId + '/addons/' + addOnId);
      } else {
        console.log('ℹ️ No vendor-level addon doc (product-only delete)');
      }

      return {
        success: true,
        message: 'Add-on deleted from all locations'
      };
    } catch (error) {
      console.error('❌ Error deleting add-on:', error);
      throw new Error(error.message || 'Failed to delete add-on');
    }
  }

  // Toggle add-on active status
  async toggleAddOnStatus(addOnId, active) {
    try {
      console.log(`🔄 ${active ? 'Activating' : 'Deactivating'} add-on:`, addOnId);
      
      const addOnRef = doc(db, this.collection, addOnId);
      await updateDoc(addOnRef, {
        active,
        updatedAt: new Date()
      });
      
      console.log('✅ Add-on status updated successfully');
    } catch (error) {
      console.error('❌ Error updating add-on status:', error);
      throw error;
    }
  }

  // Get add-ons by category
  async getAddOnsByCategory(vendorId, category) {
    try {
      console.log('🏷️ Fetching add-ons by category:', category);
      
      const q = query(
        collection(db, this.collection),
        where('vendorId', '==', vendorId),
        where('category', '==', category),
        where('active', '==', true),
        orderBy('name')
      );
      
      const querySnapshot = await getDocs(q);
      const addOns = [];
      
      querySnapshot.forEach((doc) => {
        addOns.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return addOns;
    } catch (error) {
      console.error('❌ Error fetching add-ons by category:', error);
      throw error;
    }
  }

  // Listen to real-time add-on updates for a vendor
  subscribeToVendorAddOns(vendorId, callback) {
    try {
      console.log('🔄 Subscribing to add-on updates for vendor:', vendorId);
      
      const q = query(
        collection(db, this.collection),
        where('vendorId', '==', vendorId),
        orderBy('category'),
        orderBy('name')
      );
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const addOns = [];
        querySnapshot.forEach((doc) => {
          addOns.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        console.log('🔄 Add-ons updated:', addOns.length);
        callback(addOns);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error subscribing to add-on updates:', error);
      throw error;
    }
  }

  // Get popular add-ons across all vendors
  async getPopularAddOns(limit = 10) {
    try {
      console.log('🔥 Fetching popular add-ons');
      
      const q = query(
        collection(db, this.collection),
        where('active', '==', true),
        orderBy('orderCount', 'desc'),
        // limit(limit) // Uncomment when Firestore composite index is set up
      );
      
      const querySnapshot = await getDocs(q);
      const addOns = [];
      
      querySnapshot.forEach((doc) => {
        addOns.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return addOns.slice(0, limit);
    } catch (error) {
      console.error('❌ Error fetching popular add-ons:', error);
      throw error;
    }
  }

  // Increment order count when add-on is ordered
  async incrementOrderCount(addOnId) {
    try {
      console.log('📈 Incrementing order count for add-on:', addOnId);
      
      const addOnRef = doc(db, this.collection, addOnId);
      // Use Firebase increment for atomic operations
      await updateDoc(addOnRef, {
        orderCount: increment(1),
        lastOrdered: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ Order count incremented');
    } catch (error) {
      console.error('❌ Error incrementing order count:', error);
      throw error;
    }
  }

  // Batch update multiple add-ons
  async batchUpdateAddOns(updates) {
    try {
      console.log('🔄 Batch updating add-ons:', updates.length);
      
      const batch = db.batch();
      
      updates.forEach(({ id, data }) => {
        const addOnRef = doc(db, this.collection, id);
        batch.update(addOnRef, {
          ...data,
          updatedAt: new Date()
        });
      });
      
      await batch.commit();
      console.log('✅ Batch update completed');
    } catch (error) {
      console.error('❌ Error in batch update:', error);
      throw error;
    }
  }

  // Upload addon image via Hostinger (Firebase Storage bypass)
  async uploadAddonImage(vendorId, addonId, imageFile) {
    try {
      console.log('📸 Uploading addon image (Hostinger)...');
      
      if (!imageFile) {
        throw new Error('No image file provided');
      }

      if (imageFile.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB');
      }

      if (!imageFile.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      const fileExtension = imageFile.name.split('.').pop() || 'jpg';
      const downloadURL = await uploadImageToHostinger(
        imageFile,
        `vendors/${vendorId}/addons/${addonId}/image.${fileExtension}`
      );
      
      console.log('✅ Image uploaded successfully:', downloadURL);
      return downloadURL;
      
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      throw new Error(error.message || 'Failed to upload image');
    }
  }

  // Legacy Storage delete skipped for Hostinger URLs
  async deleteAddonImage(imageUrl) {
    if (!imageUrl) return;
    if (imageUrl.includes('/uploads/')) {
      console.log('Hostinger image retained (no delete API):', imageUrl);
      return;
    }
    try {
      const url = new URL(imageUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      if (pathMatch && pathMatch[1]) {
        const storagePath = decodeURIComponent(pathMatch[1]);
        const imageRef = ref(storage, storagePath);
        await deleteObject(imageRef);
        console.log('✅ Legacy Storage image deleted');
      }
    } catch (error) {
      console.error('⚠️ Error deleting image:', error);
    }
  }

  // Get addons by category for a vendor
  async getAddonsByCategory(vendorId, category) {
    try {
      console.log('📋 Fetching addons by category:', category);
      
      const addonsRef = collection(db, 'vendors', vendorId, 'addons');
      const q = query(
        addonsRef, 
        where('addonCategory', '==', category),
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
      
      console.log('✅ Fetched addons by category:', addons.length);
      return addons;
      
    } catch (error) {
      console.error('❌ Error fetching addons by category:', error);
      throw new Error('Failed to fetch add-ons by category');
    }
  }

  // ============================================================================
  // 🎯 3-LEVEL HIERARCHY ADD-ONS (New System)
  // ============================================================================

  /**
   * Get category-level add-ons
   * Path: vendors/{vendorId}/categories/{categoryId}/addons
   */
  async getCategoryAddons(vendorId, categoryId, availableOnly = true) {
    try {
      console.log(`📁 Fetching category add-ons for category: ${categoryId}`);
      
      const addonsRef = collection(db, 'vendors', vendorId, 'categories', categoryId, 'addons');
      let q = query(addonsRef, orderBy('createdAt', 'desc'));
      
      if (availableOnly) {
        q = query(addonsRef, where('available', '==', true), orderBy('createdAt', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      const addons = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'category',
        sourceId: categoryId,
        displaySource: 'From category'
      }));
      
      console.log(`✅ Loaded ${addons.length} category add-ons`);
      return addons;
    } catch (error) {
      console.error('❌ Error fetching category add-ons:', error);
      return [];
    }
  }

  /**
   * Get product-level add-ons
   * Path: vendors/{vendorId}/products/{productId}/addons
   */
  async getProductAddons(vendorId, productId, availableOnly = true) {
    try {
      console.log(`🍔 Fetching product add-ons for product: ${productId}`);
      
      const addonsRef = collection(db, 'vendors', vendorId, 'products', productId, 'addons');
      let q = query(addonsRef, orderBy('createdAt', 'desc'));
      
      if (availableOnly) {
        q = query(addonsRef, where('available', '==', true), orderBy('createdAt', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      const addons = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'product',
        sourceId: productId,
        displaySource: 'Custom for this product'
      }));
      
      console.log(`✅ Loaded ${addons.length} product add-ons`);
      return addons;
    } catch (error) {
      console.error('❌ Error fetching product add-ons:', error);
      return [];
    }
  }

  /**
   * Get merged add-ons for a product (3-level hierarchy)
   * Priority: Product > Category > Vendor
   * Deduplicates by addon ID (product-level wins)
   */
  async getMergedAddons(vendorId, productId, categoryId = null) {
    try {
      console.log('🔍 Fetching merged add-ons (3-level hierarchy)');
      
      // Fetch all 3 levels in parallel
      const [vendorAddons, categoryAddons, productAddons] = await Promise.all([
        this.getVendorAddOns(vendorId).catch(() => []),
        categoryId ? this.getCategoryAddons(vendorId, categoryId, true) : Promise.resolve([]),
        this.getProductAddons(vendorId, productId, true)
      ]);

      // Map vendor addons to standard format
      const formattedVendorAddons = vendorAddons
        .filter(a => a.isActive !== false)
        .map(a => ({
          id: a.id,
          name: a.name || a.title,
          description: a.description || '',
          price: a.price || 0,
          imageUrl: a.imageUrl,
          available: a.isActive !== false,
          qtyLimitMin: a.minQty || 0,
          qtyLimitMax: a.maxQty || null,
          source: 'vendor',
          sourceId: vendorId,
          displaySource: 'Vendor extras'
        }));
      
      // Create deduplication map (product > category > vendor)
      const addonMap = new Map();
      
      // Add vendor-level (lowest priority)
      formattedVendorAddons.forEach(addon => {
        addonMap.set(addon.id, addon);
      });
      
      // Add category-level (medium priority)
      categoryAddons.forEach(addon => {
        addonMap.set(addon.id, addon);
      });
      
      // Add product-level (highest priority)
      productAddons.forEach(addon => {
        addonMap.set(addon.id, addon);
      });
      
      const result = {
        vendor: formattedVendorAddons,
        category: categoryAddons,
        product: productAddons,
        all: Array.from(addonMap.values()),
        total: addonMap.size
      };
      
      console.log(`✅ Merged ${result.total} unique add-ons (${productAddons.length} product, ${categoryAddons.length} category, ${formattedVendorAddons.length} vendor)`);
      
      return result;
    } catch (error) {
      console.error('❌ Error fetching merged add-ons:', error);
      return { vendor: [], category: [], product: [], all: [], total: 0 };
    }
  }

  /**
   * Create category-level add-on
   */
  async createCategoryAddon(vendorId, categoryId, addonData, imageFile = null) {
    try {
      console.log('➕ Creating category add-on:', addonData.name);
      
      const addonsRef = collection(db, 'vendors', vendorId, 'categories', categoryId, 'addons');
      const addonDocRef = doc(addonsRef);
      const addonId = addonDocRef.id;

      let imageUrl = null;
      if (imageFile) {
        imageUrl = await this.uploadAddonImage(vendorId, addonId, imageFile);
      }

      const newAddon = {
        name: addonData.name,
        description: addonData.description || '',
        price: parseFloat(addonData.price) || 0,
        imageUrl: imageUrl,
        available: addonData.available !== false,
        qtyLimitMin: parseInt(addonData.qtyLimitMin) || 0,
        qtyLimitMax: addonData.qtyLimitMax ? parseInt(addonData.qtyLimitMax) : null,
        source: 'category',
        sourceId: categoryId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(addonDocRef, newAddon);
      console.log('✅ Category add-on created:', addonId);
      
      return { id: addonId, success: true };
    } catch (error) {
      console.error('❌ Error creating category add-on:', error);
      throw error;
    }
  }

  /**
   * Create product-level add-on
   */
  async createProductAddon(vendorId, productId, addonData, imageFile = null) {
    try {
      console.log('➕ Creating product add-on:', addonData.name);
      
      const addonsRef = collection(db, 'vendors', vendorId, 'products', productId, 'addons');
      const addonDocRef = doc(addonsRef);
      const addonId = addonDocRef.id;

      let imageUrl = null;
      if (imageFile) {
        imageUrl = await this.uploadAddonImage(vendorId, addonId, imageFile);
      }

      const newAddon = {
        name: addonData.name,
        description: addonData.description || '',
        price: parseFloat(addonData.price) || 0,
        imageUrl: imageUrl,
        available: addonData.available !== false,
        qtyLimitMin: parseInt(addonData.qtyLimitMin) || 0,
        qtyLimitMax: addonData.qtyLimitMax ? parseInt(addonData.qtyLimitMax) : null,
        source: 'product',
        sourceId: productId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(addonDocRef, newAddon);
      console.log('✅ Product add-on created:', addonId);
      
      return { id: addonId, success: true };
    } catch (error) {
      console.error('❌ Error creating product add-on:', error);
      throw error;
    }
  }

  /**
   * Update category-level add-on
   */
  async updateCategoryAddon(vendorId, categoryId, addonId, updates, imageFile = null) {
    try {
      const addonRef = doc(db, 'vendors', vendorId, 'categories', categoryId, 'addons', addonId);
      
      let imageUrl = updates.imageUrl;
      if (imageFile) {
        imageUrl = await this.uploadAddonImage(vendorId, addonId, imageFile);
      }

      const updateData = {
        ...updates,
        imageUrl,
        updatedAt: serverTimestamp()
      };

      if (updates.price !== undefined) updateData.price = parseFloat(updates.price);
      if (updates.qtyLimitMin !== undefined) updateData.qtyLimitMin = parseInt(updates.qtyLimitMin);
      if (updates.qtyLimitMax !== undefined) {
        updateData.qtyLimitMax = updates.qtyLimitMax ? parseInt(updates.qtyLimitMax) : null;
      }

      await updateDoc(addonRef, updateData);
      console.log('✅ Category add-on updated:', addonId);
    } catch (error) {
      console.error('❌ Error updating category add-on:', error);
      throw error;
    }
  }

  /**
   * Update product-level add-on
   */
  async updateProductAddon(vendorId, productId, addonId, updates, imageFile = null) {
    try {
      const addonRef = doc(db, 'vendors', vendorId, 'products', productId, 'addons', addonId);
      
      let imageUrl = updates.imageUrl;
      if (imageFile) {
        imageUrl = await this.uploadAddonImage(vendorId, addonId, imageFile);
      }

      const updateData = {
        ...updates,
        imageUrl,
        updatedAt: serverTimestamp()
      };

      if (updates.price !== undefined) updateData.price = parseFloat(updates.price);
      if (updates.qtyLimitMin !== undefined) updateData.qtyLimitMin = parseInt(updates.qtyLimitMin);
      if (updates.qtyLimitMax !== undefined) {
        updateData.qtyLimitMax = updates.qtyLimitMax ? parseInt(updates.qtyLimitMax) : null;
      }

      await updateDoc(addonRef, updateData);
      console.log('✅ Product add-on updated:', addonId);
    } catch (error) {
      console.error('❌ Error updating product add-on:', error);
      throw error;
    }
  }

  /**
   * Delete category-level add-on
   */
  async deleteCategoryAddon(vendorId, categoryId, addonId) {
    try {
      const addonRef = doc(db, 'vendors', vendorId, 'categories', categoryId, 'addons', addonId);
      await deleteDoc(addonRef);
      console.log('✅ Category add-on deleted:', addonId);
    } catch (error) {
      console.error('❌ Error deleting category add-on:', error);
      throw error;
    }
  }

  /**
   * Delete product-level add-on
   */
  async deleteProductAddon(vendorId, productId, addonId) {
    try {
      const addonRef = doc(db, 'vendors', vendorId, 'products', productId, 'addons', addonId);
      await deleteDoc(addonRef);
      console.log('✅ Product add-on deleted:', addonId);
    } catch (error) {
      console.error('❌ Error deleting product add-on:', error);
      throw error;
    }
  }
}

// Export singleton instance
const addOnService = new AddOnService();
export default addOnService;

// Export class for testing
export { AddOnService };