import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { VendorCategory } from '../types/models';
import { ProductService } from './productService';
import { toJsDate } from '../../utils/firestoreDate';

export class CategoryService {
  /**
   * Get all categories for a vendor
   */
  static async getVendorCategories(vendorId: string): Promise<VendorCategory[]> {
    try {
      const categoriesCollection = collection(db, `vendors/${vendorId}/categories`);
      const q = query(categoriesCollection, orderBy('sortOrder', 'asc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as VendorCategory[];
    } catch (error) {
      console.error('Error getting vendor categories:', error);
      throw error;
    }
  }

  /**
   * Get a single category by ID
   */
  static async getCategory(vendorId: string, categoryId: string): Promise<VendorCategory | null> {
    try {
      const categoryRef = doc(db, `vendors/${vendorId}/categories/${categoryId}`);
      const categoryDoc = await getDoc(categoryRef);
      
      if (!categoryDoc.exists()) {
        return null;
      }
      
      const data = categoryDoc.data();
      return {
        id: categoryId,
        ...data,
        createdAt: toJsDate(data.createdAt),
        updatedAt: toJsDate(data.updatedAt)
      } as VendorCategory;
    } catch (error) {
      console.error('Error getting category:', error);
      throw error;
    }
  }

  /**
   * Create a new category
   */
  static async createCategory(
    vendorId: string,
    categoryData: Omit<VendorCategory, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<VendorCategory> {
    try {
      // Generate slug from name if not provided
      const slug = categoryData.slug || this.generateSlug(categoryData.name);
      
      // Check if slug already exists
      const existingCategory = await this.getCategoryBySlug(vendorId, slug);
      if (existingCategory) {
        throw new Error(`Category with slug "${slug}" already exists`);
      }

      const categoriesCollection = collection(db, `vendors/${vendorId}/categories`);
      const docRef = await addDoc(categoriesCollection, {
        ...categoryData,
        slug,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const createdCategory: VendorCategory = {
        id: docRef.id,
        ...categoryData,
        slug,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Category created successfully:', docRef.id);
      return createdCategory;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  /**
   * Update an existing category
   */
  static async updateCategory(
    vendorId: string,
    categoryId: string,
    updates: Partial<Omit<VendorCategory, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<VendorCategory> {
    try {
      const categoryRef = doc(db, `vendors/${vendorId}/categories/${categoryId}`);
      
      // Get current category data
      const currentDoc = await getDoc(categoryRef);
      if (!currentDoc.exists()) {
        throw new Error(`Category ${categoryId} not found`);
      }
      
      const currentCategory = { id: categoryId, ...currentDoc.data() } as VendorCategory;
      
      // If updating name and no slug provided, generate new slug
      if (updates.name && !updates.slug) {
        updates.slug = this.generateSlug(updates.name);
      }
      
      // Check if new slug conflicts with existing categories
      if (updates.slug && updates.slug !== currentCategory.slug) {
        const existingCategory = await this.getCategoryBySlug(vendorId, updates.slug);
        if (existingCategory && existingCategory.id !== categoryId) {
          throw new Error(`Category with slug "${updates.slug}" already exists`);
        }
      }

      // Update category in Firestore
      await updateDoc(categoryRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      const updatedCategory: VendorCategory = {
        ...currentCategory,
        ...updates,
        updatedAt: new Date()
      };

      console.log('Category updated successfully:', categoryId);
      return updatedCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  /**
   * Delete a category
   */
  static async deleteCategory(vendorId: string, categoryId: string): Promise<void> {
    try {
      // Check if category has products
      const productCount = await this.getCategoryProductCount(vendorId, categoryId);
      if (productCount > 0) {
        throw new Error(`Cannot delete category: ${productCount} products are using this category`);
      }

      const categoryRef = doc(db, `vendors/${vendorId}/categories/${categoryId}`);
      await deleteDoc(categoryRef);

      console.log('Category deleted successfully:', categoryId);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  /**
   * Reassign products from one category to another, then delete the old category
   */
  static async deleteWithReassign(
    vendorId: string,
    categoryId: string,
    newCategoryId: string
  ): Promise<void> {
    try {
      // Get all products in the old category
      const products = await ProductService.getProductsByCategory(vendorId, categoryId);
      
      // Update each product to use the new category
      const updatePromises = products.map(product =>
        ProductService.updateProduct(vendorId, product.id, { category: newCategoryId }, 'system')
      );
      
      await Promise.all(updatePromises);
      
      // Now delete the category
      await this.deleteCategory(vendorId, categoryId);
      
      console.log(`Category ${categoryId} deleted and ${products.length} products reassigned to ${newCategoryId}`);
    } catch (error) {
      console.error('Error deleting category with reassignment:', error);
      throw error;
    }
  }

  /**
   * Get category by slug
   */
  static async getCategoryBySlug(vendorId: string, slug: string): Promise<VendorCategory | null> {
    try {
      const categoriesCollection = collection(db, `vendors/${vendorId}/categories`);
      const q = query(categoriesCollection, where('slug', '==', slug));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: toJsDate(data.createdAt),
        updatedAt: toJsDate(data.updatedAt)
      } as VendorCategory;
    } catch (error) {
      console.error('Error getting category by slug:', error);
      throw error;
    }
  }

  /**
   * Get product count for a category
   */
  static async getCategoryProductCount(vendorId: string, categoryId: string): Promise<number> {
    try {
      // Get category details first to get the name
      const category = await this.getCategory(vendorId, categoryId);
      if (!category) {
        return 0;
      }

      // Use the category name to check products
      const isInUse = await ProductService.isCategoryInUse(vendorId, category.name);
      
      if (isInUse) {
        // If we need exact count, we need to query products
        const products = await ProductService.getProductsByCategory(vendorId, category.name);
        return products.length;
      }
      
      return 0;
    } catch (error) {
      console.error('Error getting category product count:', error);
      return 0;
    }
  }

  /**
   * Get categories with product counts
   */
  static async getCategoriesWithProductCount(vendorId: string): Promise<Array<VendorCategory & { productCount: number }>> {
    try {
      const categories = await this.getVendorCategories(vendorId);
      
      const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const productCount = await this.getCategoryProductCount(vendorId, category.id);
          return { ...category, productCount };
        })
      );
      
      return categoriesWithCount;
    } catch (error) {
      console.error('Error getting categories with product count:', error);
      throw error;
    }
  }

  /**
   * Update category sort orders
   */
  static async updateSortOrder(
    vendorId: string,
    categoryUpdates: Array<{ id: string; sortOrder: number }>
  ): Promise<void> {
    try {
      const updatePromises = categoryUpdates.map(({ id, sortOrder }) => {
        const categoryRef = doc(db, `vendors/${vendorId}/categories/${id}`);
        return updateDoc(categoryRef, {
          sortOrder,
          updatedAt: serverTimestamp()
        });
      });

      await Promise.all(updatePromises);
      console.log('Category sort orders updated successfully');
    } catch (error) {
      console.error('Error updating category sort orders:', error);
      throw error;
    }
  }

  /**
   * Generate a URL-friendly slug from a category name
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
}