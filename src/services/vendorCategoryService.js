/**
 * Vendor Category Service
 * Manages vendor-specific categories in vendors/{vendorId}/categories
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
  orderBy,
  where,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Fetch all categories for a vendor
 * @param {string} vendorId 
 * @returns {Promise<Array>}
 */
export const fetchVendorCategories = async (vendorId) => {
  try {
    const categoriesRef = collection(db, 'vendors', vendorId, 'categories');
    const q = query(categoriesRef, orderBy('priority', 'asc'));
    const snapshot = await getDocs(q);
    
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Fetched ${categories.length} categories for vendor ${vendorId}`);
    return categories;
  } catch (error) {
    console.error('❌ Error fetching vendor categories:', error);
    throw error;
  }
};

/**
 * Get a single category
 * @param {string} vendorId 
 * @param {string} categoryId 
 * @returns {Promise<Object>}
 */
export const fetchCategory = async (vendorId, categoryId) => {
  try {
    const categoryRef = doc(db, 'vendors', vendorId, 'categories', categoryId);
    const categorySnap = await getDoc(categoryRef);
    
    if (!categorySnap.exists()) {
      throw new Error('Category not found');
    }
    
    return {
      id: categorySnap.id,
      ...categorySnap.data()
    };
  } catch (error) {
    console.error('❌ Error fetching category:', error);
    throw error;
  }
};

/**
 * Create a new category
 * @param {string} vendorId 
 * @param {Object} categoryData - { name, slug?, iconUrl?, priority? }
 * @returns {Promise<Object>}
 */
export const createCategory = async (vendorId, categoryData) => {
  try {
    const categoriesRef = collection(db, 'vendors', vendorId, 'categories');
    
    // Get current max priority
    const existingCategories = await fetchVendorCategories(vendorId);
    const maxPriority = existingCategories.length > 0 
      ? Math.max(...existingCategories.map(c => c.priority || 0)) 
      : 0;
    
    const newCategory = {
      name: categoryData.name,
      slug: categoryData.slug || categoryData.name.toLowerCase().replace(/\s+/g, '-'),
      priority: categoryData.priority ?? (maxPriority + 1),
      iconUrl: categoryData.iconUrl || null,
      vendorId: vendorId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(categoriesRef, newCategory);
    
    console.log('✅ Created category:', docRef.id);
    return {
      id: docRef.id,
      ...newCategory
    };
  } catch (error) {
    console.error('❌ Error creating category:', error);
    throw error;
  }
};

/**
 * Update a category
 * @param {string} vendorId 
 * @param {string} categoryId 
 * @param {Object} updates 
 * @returns {Promise<void>}
 */
export const updateCategory = async (vendorId, categoryId, updates) => {
  try {
    const categoryRef = doc(db, 'vendors', vendorId, 'categories', categoryId);
    
    await updateDoc(categoryRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    // If category name changed, update all products with this category
    if (updates.name) {
      await updateProductsCategoryName(vendorId, categoryId, updates.name);
    }
    
    console.log('✅ Updated category:', categoryId);
  } catch (error) {
    console.error('❌ Error updating category:', error);
    throw error;
  }
};

/**
 * Delete a category
 * @param {string} vendorId 
 * @param {string} categoryId 
 * @param {string} reassignToCategoryId - Optional category ID to reassign products to
 * @returns {Promise<void>}
 */
export const deleteCategory = async (vendorId, categoryId, reassignToCategoryId = null) => {
  try {
    // Check if category has products
    const productsWithCategory = await getProductsByCategory(vendorId, categoryId);
    
    if (productsWithCategory.length > 0) {
      if (reassignToCategoryId) {
        // Reassign products to new category
        const newCategory = await fetchCategory(vendorId, reassignToCategoryId);
        await reassignProducts(vendorId, categoryId, reassignToCategoryId, newCategory.name);
      } else {
        // Move to "Uncategorized"
        await moveProductsToUncategorized(vendorId, categoryId);
      }
    }
    
    // Delete the category
    const categoryRef = doc(db, 'vendors', vendorId, 'categories', categoryId);
    await deleteDoc(categoryRef);
    
    console.log('✅ Deleted category:', categoryId);
  } catch (error) {
    console.error('❌ Error deleting category:', error);
    throw error;
  }
};

/**
 * Reorder categories (update priority)
 * @param {string} vendorId 
 * @param {Array} categoryIds - Array of category IDs in new order
 * @returns {Promise<void>}
 */
export const reorderCategories = async (vendorId, categoryIds) => {
  try {
    const batch = writeBatch(db);
    
    categoryIds.forEach((categoryId, index) => {
      const categoryRef = doc(db, 'vendors', vendorId, 'categories', categoryId);
      batch.update(categoryRef, {
        priority: index + 1,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log('✅ Reordered categories');
  } catch (error) {
    console.error('❌ Error reordering categories:', error);
    throw error;
  }
};

/**
 * Get products by category
 * @param {string} vendorId 
 * @param {string} categoryId 
 * @returns {Promise<Array>}
 */
const getProductsByCategory = async (vendorId, categoryId) => {
  try {
    const productsRef = collection(db, 'vendors', vendorId, 'products');
    const q = query(productsRef, where('categoryId', '==', categoryId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ Error fetching products by category:', error);
    return [];
  }
};

/**
 * Update categoryName for all products when category name changes
 * @param {string} vendorId 
 * @param {string} categoryId 
 * @param {string} newName 
 */
const updateProductsCategoryName = async (vendorId, categoryId, newName) => {
  try {
    const products = await getProductsByCategory(vendorId, categoryId);
    
    if (products.length === 0) return;
    
    const batch = writeBatch(db);
    
    products.forEach(product => {
      const productRef = doc(db, 'vendors', vendorId, 'products', product.id);
      batch.update(productRef, {
        categoryName: newName,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log(`✅ Updated categoryName for ${products.length} products`);
  } catch (error) {
    console.error('❌ Error updating products categoryName:', error);
  }
};

/**
 * Reassign products to a new category
 * @param {string} vendorId 
 * @param {string} oldCategoryId 
 * @param {string} newCategoryId 
 * @param {string} newCategoryName 
 */
const reassignProducts = async (vendorId, oldCategoryId, newCategoryId, newCategoryName) => {
  try {
    const products = await getProductsByCategory(vendorId, oldCategoryId);
    
    if (products.length === 0) return;
    
    const batch = writeBatch(db);
    
    products.forEach(product => {
      const productRef = doc(db, 'vendors', vendorId, 'products', product.id);
      batch.update(productRef, {
        categoryId: newCategoryId,
        categoryName: newCategoryName,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log(`✅ Reassigned ${products.length} products to new category`);
  } catch (error) {
    console.error('❌ Error reassigning products:', error);
    throw error;
  }
};

/**
 * Move products to Uncategorized
 * @param {string} vendorId 
 * @param {string} categoryId 
 */
const moveProductsToUncategorized = async (vendorId, categoryId) => {
  try {
    const products = await getProductsByCategory(vendorId, categoryId);
    
    if (products.length === 0) return;
    
    const batch = writeBatch(db);
    
    products.forEach(product => {
      const productRef = doc(db, 'vendors', vendorId, 'products', product.id);
      batch.update(productRef, {
        categoryId: null,
        categoryName: 'Uncategorized',
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log(`✅ Moved ${products.length} products to Uncategorized`);
  } catch (error) {
    console.error('❌ Error moving products to Uncategorized:', error);
    throw error;
  }
};

/**
 * Create default "Uncategorized" category for a vendor
 * @param {string} vendorId 
 * @returns {Promise<Object>}
 */
export const createUncategorizedCategory = async (vendorId) => {
  try {
    return await createCategory(vendorId, {
      name: 'Uncategorized',
      slug: 'uncategorized',
      priority: 999,
      iconUrl: null
    });
  } catch (error) {
    console.error('❌ Error creating Uncategorized category:', error);
    throw error;
  }
};

export default {
  fetchVendorCategories,
  fetchCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  createUncategorizedCategory
};
