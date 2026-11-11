/**
 * 🏪 GO7 V2 PRODUCT SERVICE
 * 
 * Handles all CRUD operations for V2 products
 * Path: /vendors/{vendorId}/products/{productId}
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { uploadVendorImagePreferHostinger } from './hostingerImageUpload';
import { toJsDate } from '../utils/firestoreDate';

export const MEASUREMENT_TYPES = {
  UNIT: 'unit',        // Food items (1 plate, 2 bottles)
  PORTION: 'portion',  // Food portions (small, medium, large)
  BUNDLE: 'bundle',    // Local market (per tuber, per bunch)
  WEIGHT: 'weight'     // Weight-based (per kg, per derica)
};

export const CATEGORIES = {
  FOOD: 'food',
  PHARMACY: 'pharmacy',
  LOCAL_MARKET: 'local_market',
  GROCERY: 'grocery',
  OTHER: 'other'
};

/**
 * V2 Product Structure
 */
export interface V2Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string | null;
  category: string;
  categoryName?: string;
  measurementType: 'unit' | 'portion' | 'bundle' | 'weight';
  minQty: number;
  maxQty: number;
  addons: V2Addon[];
  isAvailable: boolean;
  vendorId: string;
  // Combo Rush Fields
  isCombo?: boolean;
  comboItems?: ComboItem[];
  originalPrice?: number;
  comboPrice?: number;
  savings?: number;
  timeLimit?: number; // in minutes
  maxQuantity?: number;
  soldCount?: number;
  isFlashDeal?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComboItem {
  productId?: string;
  name: string;
  quantity: number;
  price?: number;
}

export interface V2Combo {
  id: string;
  name: string;
  description: string;
  vendorId: string;
  vendorName: string;
  vendorLogo: string;
  image: string;
  items: ComboItem[];
  originalPrice: number;
  comboPrice: number;
  savings: number;
  rating?: number;
  timeLeft: number; // in minutes
  soldCount: number;
  maxQuantity: number;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface V2Addon {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  image?: File; // For file upload handling
  imagePreview?: string; // For preview URL before upload
  isAvailable?: boolean;
}

/**
 * Get all products for a vendor (with addons from subcollection)
 */
export const getVendorProducts = async (vendorId: string): Promise<V2Product[]> => {
  try {
    const productsRef = collection(db, 'vendors', vendorId, 'products');
    let snapshot;
    try {
      const q = query(productsRef, orderBy('createdAt', 'desc'));
      snapshot = await getDocs(q);
    } catch (orderErr) {
      // Remounted/migrated docs may have string/map dates that break orderBy.
      console.warn('getVendorProducts orderBy failed, falling back to unsorted fetch:', orderErr);
      snapshot = await getDocs(productsRef);
    }

    // Load vendor-level master addons once, then merge per product
    const vendorLevelAddons = await getVendorLevelAddons(vendorId);

    // Load products with their addons from subcollection ∪ vendor master
    const productsWithAddons = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const productData = {
          id: doc.id,
          ...doc.data(),
          createdAt: toJsDate(doc.data().createdAt),
          updatedAt: toJsDate(doc.data().updatedAt)
        } as V2Product;
        
        try {
          const addons = await resolveProductAddons(vendorId, doc.id, vendorLevelAddons);
          const embedded = Array.isArray(productData.addons) ? productData.addons : [];
          productData.addons = addons.length > 0 ? addons : embedded;
        } catch (addonError) {
          console.warn(`Failed to load addons for product ${doc.id}:`, addonError);
          productData.addons = productData.addons || [];
        }
        
        return productData;
      })
    );

    productsWithAddons.sort(
      (a, b) => toJsDate(b.createdAt).getTime() - toJsDate(a.createdAt).getTime()
    );
    
    return productsWithAddons.filter((product) => {
      const data = product as V2Product & { isActive?: boolean; isAvailable?: boolean; available?: boolean; price?: number; basePrice?: number };
      // Accept either V2 basePrice or legacy price
      if (data.basePrice == null && typeof data.price === 'number') {
        (data as V2Product).basePrice = data.price;
      }
      return (
        data.isActive !== false &&
        data.isAvailable !== false &&
        data.available !== false
      );
    });
  } catch (error) {
    console.error('Error fetching vendor products:', error);
    throw error;
  }
};

/**
 * Get a single product (with addons from subcollection)
 */
export const getProduct = async (vendorId: string, productId: string): Promise<V2Product | null> => {
  try {
    const productRef = doc(db, 'vendors', vendorId, 'products', productId);
    const snapshot = await getDoc(productRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const productData = {
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: toJsDate(snapshot.data().createdAt),
      updatedAt: toJsDate(snapshot.data().updatedAt)
    } as V2Product;
    
    // Load addons from product subcollection ∪ vendor-level master
    try {
      const addons = await resolveProductAddons(vendorId, productId);
      const embedded = Array.isArray(productData.addons) ? productData.addons : [];
      productData.addons = addons.length > 0 ? addons : embedded;
    } catch (addonError) {
      console.warn(`Failed to load addons for product ${productId}:`, addonError);
      productData.addons = productData.addons || [];
    }
    
    return productData;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

/**
 * Create a new combo deal
 */
export const createCombo = async (vendorId: string, comboData: Omit<V2Combo, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const combosRef = collection(db, 'vendors', vendorId, 'combos');
    const docRef = await addDoc(combosRef, {
      ...comboData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Combo created successfully:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating combo:', error);
    throw error;
  }
};

/**
 * Get all combo deals for a vendor
 */
export const getVendorCombos = async (vendorId: string): Promise<V2Combo[]> => {
  try {
    console.log('🔍 Fetching combos from: vendors/' + vendorId + '/combos');
    const combosRef = collection(db, 'vendors', vendorId, 'combos');
    
    // First try without filters to see if any combos exist
    const allSnapshot = await getDocs(combosRef);
    console.log(`📊 Total combos (no filters): ${allSnapshot.size}`);
    
    if (allSnapshot.size > 0) {
      allSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`Combo "${data.name}": isActive=${data.isActive}, createdAt=${data.createdAt ? 'exists' : 'missing'}`);
      });
    }
    
    // Now try with filters
    const q = query(combosRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    console.log(`📦 Filtered combos (isActive=true): ${snapshot.size}`);
    
    if (snapshot.empty && allSnapshot.size > 0) {
      console.warn('⚠️ Combos exist but are filtered out!');
      console.warn('💡 Check: 1) isActive field, 2) createdAt field exists');
      // Return all combos anyway so they show up
      return allSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: toJsDate(doc.data().createdAt),
        updatedAt: toJsDate(doc.data().updatedAt)
      })) as V2Combo[];
    }
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: toJsDate(doc.data().createdAt),
      updatedAt: toJsDate(doc.data().updatedAt)
    })) as V2Combo[];
  } catch (error) {
    console.error('❌ Error fetching vendor combos:', error);
    throw error;
  }
};

/**
 * Update combo deal
 */
export const updateCombo = async (vendorId: string, comboId: string, updates: Partial<V2Combo>): Promise<void> => {
  try {
    const comboRef = doc(db, 'vendors', vendorId, 'combos', comboId);
    await updateDoc(comboRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Combo updated successfully');
  } catch (error) {
    console.error('❌ Error updating combo:', error);
    throw error;
  }
};

/**
 * Delete combo deal
 */
export const deleteCombo = async (vendorId: string, comboId: string): Promise<void> => {
  try {
    const comboRef = doc(db, 'vendors', vendorId, 'combos', comboId);
    await updateDoc(comboRef, {
      isActive: false,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Combo deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting combo:', error);
    throw error;
  }
};

/**
 * Get active flash combo deals across all vendors
 */
export const getFlashCombos = async (limit = 10): Promise<V2Combo[]> => {
  try {
    // This would need to be implemented with a cloud function for better performance
    // For now, we'll return an empty array as this requires cross-vendor queries
    console.log('Flash combos query - requires cloud function implementation');
    return [];
  } catch (error) {
    console.error('❌ Error fetching flash combos:', error);
    throw error;
  }
};

/**
 * Create a new product
 */
export const createProduct = async (
  vendorId: string, 
  productData: Omit<V2Product, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const productsRef = collection(db, 'vendors', vendorId, 'products');
    
    const newProduct = {
      ...productData,
      vendorId,
      // Set ALL availability flags to true for maximum compatibility
      isAvailable: productData.isAvailable !== undefined ? productData.isAvailable : true,
      active: productData.isAvailable !== undefined ? productData.isAvailable : true,
      isActive: productData.isAvailable !== undefined ? productData.isAvailable : true,
      available: productData.isAvailable !== undefined ? productData.isAvailable : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    console.log('✅ Creating product at path:', `vendors/${vendorId}/products`);
    console.log('✅ Product data:', newProduct);
    
    const docRef = await addDoc(productsRef, newProduct);
    console.log('✅ Product created with ID:', docRef.id);

    // Link existing vendor-level addons onto the new product so customer menu sees them
    try {
      const vendorAddons = await getVendorLevelAddons(vendorId);
      if (vendorAddons.length > 0) {
        await saveAddonsToSubcollection(vendorId, docRef.id, vendorAddons);
      }
    } catch (linkError) {
      console.warn('Product saved but linking vendor addons failed:', linkError);
    }

    // Best-effort vendor stats — product save must succeed even if this fails
    try {
      await updateDoc(doc(db, 'vendors', vendorId), {
        isActive: true,
        active: true,
        totalProducts: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (vendorUpdateError) {
      console.warn('Product saved but vendor stats update failed:', vendorUpdateError);
    }

    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating product:', error);
    throw error;
  }
};

/**
 * Update a product
 */
export const updateProduct = async (
  vendorId: string, 
  productId: string, 
  updates: Partial<Omit<V2Product, 'id' | 'vendorId' | 'createdAt'>>
): Promise<void> => {
  try {
    const productRef = doc(db, 'vendors', vendorId, 'products', productId);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(productRef, updateData);
    console.log('✅ Product updated:', productId);
  } catch (error) {
    console.error('❌ Error updating product:', error);
    throw error;
  }
};

/**
 * Delete a product
 */
export const deleteProduct = async (vendorId: string, productId: string): Promise<void> => {
  try {
    const productRef = doc(db, 'vendors', vendorId, 'products', productId);
    await deleteDoc(productRef);
    console.log('✅ Product deleted:', productId);
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    throw error;
  }
};

/**
 * Upload product image via Hostinger (Firebase Storage bypass)
 */
export const uploadProductImage = async (
  vendorId: string, 
  productId: string, 
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    if (onProgress) onProgress(10);
    const downloadURL = await uploadVendorImagePreferHostinger(
      imageFile,
      `vendors/${vendorId}/products/${productId}/image.jpg`
    );
    if (onProgress) onProgress(100);
    console.log('✅ Product image uploaded:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading product image:', error);
    throw error;
  }
};

/**
 * Upload addon image via Hostinger (Firebase Storage bypass)
 */
export const uploadAddonImage = async (
  vendorId: string, 
  addonId: string, 
  imageFile: File
): Promise<string> => {
  try {
    const downloadURL = await uploadVendorImagePreferHostinger(
      imageFile,
      `vendors/${vendorId}/addons/${addonId}/image.jpg`
    );
    console.log('✅ Addon image uploaded:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading addon image:', error);
    throw error;
  }
};

/**
 * Delete product image from storage
 */
export const deleteProductImage = async (vendorId: string, productId: string): Promise<void> => {
  try {
    const imageRef = ref(storage, `vendors/${vendorId}/products/${productId}/image.jpg`);
    await deleteObject(imageRef);
    console.log('✅ Product image deleted');
  } catch (error) {
    console.log('ℹ️ Product image not found or already deleted');
  }
};

/**
 * Setup real-time listener for vendor products
 */
export const setupProductsListener = (
  vendorId: string,
  callback: (products: V2Product[], error?: Error) => void
): (() => void) => {
  try {
    const productsRef = collection(db, 'vendors', vendorId, 'products');
    const q = query(productsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: toJsDate(doc.data().createdAt),
          updatedAt: toJsDate(doc.data().updatedAt)
        })) as V2Product[];
        
        callback(products);
      },
      (error) => {
        console.error('❌ Products listener error:', error);
        callback([], error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up products listener:', error);
    callback([], error as Error);
    return () => {};
  }
};

/**
 * Get products by category
 */
export const getProductsByCategory = async (
  vendorId: string, 
  category: string
): Promise<V2Product[]> => {
  try {
    const productsRef = collection(db, 'vendors', vendorId, 'products');
    const q = query(
      productsRef, 
      where('category', '==', category),
      where('isAvailable', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: toJsDate(doc.data().createdAt),
      updatedAt: toJsDate(doc.data().updatedAt)
    })) as V2Product[];
  } catch (error) {
    console.error('Error fetching products by category:', error);
    throw error;
  }
};

/**
 * Toggle product availability
 */
export const toggleProductAvailability = async (
  vendorId: string, 
  productId: string, 
  isAvailable: boolean
): Promise<void> => {
  try {
    await updateProduct(vendorId, productId, { isAvailable });
    console.log(`✅ Product availability updated: ${isAvailable ? 'Available' : 'Unavailable'}`);
  } catch (error) {
    console.error('❌ Error updating product availability:', error);
    throw error;
  }
};

/**
 * Batch update multiple products
 */
export const batchUpdateProducts = async (
  vendorId: string,
  updates: Array<{ productId: string; updates: Partial<V2Product> }>
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    updates.forEach(({ productId, updates: productUpdates }) => {
      const productRef = doc(db, 'vendors', vendorId, 'products', productId);
      batch.update(productRef, {
        ...productUpdates,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log(`✅ Batch updated ${updates.length} products`);
  } catch (error) {
    console.error('❌ Error batch updating products:', error);
    throw error;
  }
};

/**
 * Search products by name
 */
export const searchProducts = async (
  vendorId: string, 
  searchTerm: string
): Promise<V2Product[]> => {
  try {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation - consider using Algolia for advanced search
    const products = await getVendorProducts(vendorId);
    
    const searchTermLower = searchTerm.toLowerCase();
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTermLower) ||
      product.description.toLowerCase().includes(searchTermLower) ||
      product.category.toLowerCase().includes(searchTermLower)
    );
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
};

/**
 * ==============================
 * ADDON SUBCOLLECTION FUNCTIONS
 * ==============================
 */

function normalizeAddonDoc(docId: string, data: Record<string, unknown>): V2Addon & {
  available?: boolean;
  description?: string;
} {
  const name = String(
    data.name || data.addonName || data.title || ''
  ).trim();
  const priceRaw = data.price ?? data.addonPrice ?? 0;
  const price = typeof priceRaw === 'number' ? priceRaw : Number(priceRaw) || 0;
  const imageUrl =
    (data.imageUrl as string | null | undefined) ||
    (data.addonImageUrl as string | null | undefined) ||
    (data.image as string | null | undefined) ||
    null;
  const available =
    data.available !== false &&
    data.isAvailable !== false &&
    data.isActive !== false &&
    data.active !== false;

  // Spread first, then override canonical fields so aliases cannot clobber display name/price
  return {
    ...data,
    id: String(data.addonId || data.id || docId),
    name,
    price,
    imageUrl,
    isAvailable: available,
    available,
    description: String(data.description || ''),
  } as V2Addon & { available?: boolean; description?: string };
}

function isAddonVisible(addon: { available?: boolean; isAvailable?: boolean }): boolean {
  return addon.available !== false && addon.isAvailable !== false;
}

/**
 * Vendor-level master addons: /vendors/{vendorId}/addons
 * (Vendor Add-ons tab writes here; customer UI must also see these.)
 */
export const getVendorLevelAddons = async (vendorId: string): Promise<V2Addon[]> => {
  try {
    const addonsRef = collection(db, 'vendors', vendorId, 'addons');
    const snapshot = await getDocs(addonsRef);
    return snapshot.docs
      .map((d) => normalizeAddonDoc(d.id, d.data() as Record<string, unknown>))
      .filter(isAddonVisible)
      .filter((a) => a.name);
  } catch (error) {
    console.warn('⚠️ Failed to load vendor-level addons:', error);
    return [];
  }
};

/**
 * Product addons = product subcollection ∪ vendor-level master (deduped by id).
 * Fixes: addons created in vendor dashboard only at vendors/{id}/addons never
 * appeared on the customer menu when product subcollection was empty/stale.
 */
export const resolveProductAddons = async (
  vendorId: string,
  productId: string,
  vendorLevelAddons?: V2Addon[]
): Promise<V2Addon[]> => {
  const [productAddons, masterAddons] = await Promise.all([
    getAddonsFromSubcollection(vendorId, productId),
    vendorLevelAddons
      ? Promise.resolve(vendorLevelAddons)
      : getVendorLevelAddons(vendorId),
  ]);

  const byId = new Map<string, V2Addon>();
  for (const addon of masterAddons) {
    if (addon?.id && isAddonVisible(addon)) byId.set(addon.id, addon);
  }
  // Product-level wins on conflict (more specific)
  for (const addon of productAddons) {
    if (addon?.id && isAddonVisible(addon)) byId.set(addon.id, addon);
  }
  return Array.from(byId.values()).filter((a) => a.name);
};

function buildCanonicalAddonWrite(addon: V2Addon) {
  const name = String(addon.name || '').trim();
  const price = Number(addon.price) || 0;
  const imageUrl = addon.imageUrl || null;
  return {
    id: addon.id,
    addonId: addon.id,
    name,
    title: name,
    addonName: name,
    price,
    addonPrice: price,
    imageUrl,
    addonImageUrl: imageUrl,
    available: addon.isAvailable !== false,
    isAvailable: addon.isAvailable !== false,
    isActive: true,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Save addon to subcollection: /vendors/{vendorId}/products/{productId}/addons/{addonId}
 */
export const saveAddonToSubcollection = async (
  vendorId: string,
  productId: string,
  addon: V2Addon
): Promise<void> => {
  try {
    const addonRef = doc(db, 'vendors', vendorId, 'products', productId, 'addons', addon.id);
    await setDoc(addonRef, buildCanonicalAddonWrite(addon), { merge: true });
    console.log('✅ Addon saved to subcollection:', addon.id);
  } catch (error) {
    console.error('❌ Error saving addon to subcollection:', error);
    throw error;
  }
};

/**
 * Save multiple addons to subcollection
 */
export const saveAddonsToSubcollection = async (
  vendorId: string,
  productId: string,
  addons: V2Addon[]
): Promise<void> => {
  try {
    if (!addons.length) return;
    const batch = writeBatch(db);

    addons.forEach((addon) => {
      const addonRef = doc(db, 'vendors', vendorId, 'products', productId, 'addons', addon.id);
      batch.set(addonRef, buildCanonicalAddonWrite(addon), { merge: true });
    });

    await batch.commit();
    console.log('✅ All addons saved to subcollection:', addons.length);
  } catch (error) {
    console.error('❌ Error saving addons to subcollection:', error);
    throw error;
  }
};

/**
 * Get addons from product subcollection (normalized canonical fields)
 */
export const getAddonsFromSubcollection = async (
  vendorId: string,
  productId: string
): Promise<V2Addon[]> => {
  try {
    const addonsRef = collection(db, 'vendors', vendorId, 'products', productId, 'addons');
    const snapshot = await getDocs(addonsRef);

    return snapshot.docs
      .map((d) => normalizeAddonDoc(d.id, d.data() as Record<string, unknown>))
      .filter((a) => a.name);
  } catch (error) {
    console.error('❌ Error getting addons from subcollection:', error);
    return [];
  }
};

/**
 * Delete addon from subcollection
 */
export const deleteAddonFromSubcollection = async (
  vendorId: string,
  productId: string,
  addonId: string
): Promise<void> => {
  try {
    const addonRef = doc(db, 'vendors', vendorId, 'products', productId, 'addons', addonId);
    await deleteDoc(addonRef);
    console.log('✅ Addon deleted from subcollection:', addonId);
  } catch (error) {
    console.error('❌ Error deleting addon from subcollection:', error);
    throw error;
  }
};

export default {
  getVendorProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  uploadAddonImage,
  deleteProductImage,
  setupProductsListener,
  getProductsByCategory,
  toggleProductAvailability,
  batchUpdateProducts,
  searchProducts,
  // Addon subcollection functions
  saveAddonToSubcollection,
  saveAddonsToSubcollection,
  getAddonsFromSubcollection,
  getVendorLevelAddons,
  resolveProductAddons,
  deleteAddonFromSubcollection,
  MEASUREMENT_TYPES,
  CATEGORIES
};