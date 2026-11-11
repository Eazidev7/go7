/**
 * Firestore Collections and References with Type Safety
 * Utility functions for working with typed Firestore collections
 */
import { 
  collection, 
  doc, 
  CollectionReference, 
  DocumentReference,
  getFirestore 
} from 'firebase/firestore';
import { 
  Product, 
  VendorCategory, 
  productConverter, 
  vendorCategoryConverter 
} from '../types/models';

/**
 * Get a typed reference to the products collection for a specific vendor
 * Path: vendors/{vendorId}/products
 */
export const getProductsCollection = (vendorId: string): CollectionReference<Product> => {
  const db = getFirestore();
  return collection(db, 'vendors', vendorId, 'products').withConverter(productConverter);
};

/**
 * Get a typed reference to a specific product document
 * Path: vendors/{vendorId}/products/{productId}
 */
export const getProductDocument = (vendorId: string, productId: string): DocumentReference<Product> => {
  const db = getFirestore();
  return doc(db, 'vendors', vendorId, 'products', productId).withConverter(productConverter);
};

/**
 * Get a typed reference to the categories collection for a specific vendor
 * Path: vendors/{vendorId}/categories
 */
export const getCategoriesCollection = (vendorId: string): CollectionReference<VendorCategory> => {
  const db = getFirestore();
  return collection(db, 'vendors', vendorId, 'categories').withConverter(vendorCategoryConverter);
};

/**
 * Get a typed reference to a specific category document
 * Path: vendors/{vendorId}/categories/{categoryId}
 */
export const getCategoryDocument = (vendorId: string, categoryId: string): DocumentReference<VendorCategory> => {
  const db = getFirestore();
  return doc(db, 'vendors', vendorId, 'categories', categoryId).withConverter(vendorCategoryConverter);
};

/**
 * Example usage functions demonstrating type safety
 */

/**
 * Example: Create a new product for a vendor
 */
export const createProduct = async (vendorId: string, productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const productsRef = getProductsCollection(vendorId);
  const newProduct: Omit<Product, 'id'> = {
    ...productData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const docRef = await addDoc(productsRef, newProduct);
  return docRef.id;
};

/**
 * Example: Get all products for a vendor with type safety
 */
export const getVendorProducts = async (vendorId: string): Promise<Product[]> => {
  const productsRef = getProductsCollection(vendorId);
  const snapshot = await getDocs(productsRef);
  
  return snapshot.docs.map(doc => doc.data()); // Already typed as Product[]
};

/**
 * Example: Update a product
 */
export const updateProduct = async (
  vendorId: string, 
  productId: string, 
  updates: Partial<Product>
): Promise<void> => {
  const productRef = getProductDocument(vendorId, productId);
  await updateDoc(productRef, {
    ...updates,
    updatedAt: new Date()
  });
};

/**
 * Example: Create a new category for a vendor
 */
export const createCategory = async (
  vendorId: string, 
  categoryData: Omit<VendorCategory, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const categoriesRef = getCategoriesCollection(vendorId);
  const newCategory: Omit<VendorCategory, 'id'> = {
    ...categoryData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const docRef = await addDoc(categoriesRef, newCategory);
  return docRef.id;
};

/**
 * Example: Get all categories for a vendor, ordered by sortOrder
 */
export const getVendorCategories = async (vendorId: string): Promise<VendorCategory[]> => {
  const categoriesRef = getCategoriesCollection(vendorId);
  const snapshot = await getDocs(query(categoriesRef, orderBy('sortOrder')));
  
  return snapshot.docs.map(doc => doc.data()); // Already typed as VendorCategory[]
};

// Import statements for the above functions (add these at the top if using)
import { addDoc, getDocs, updateDoc, query, orderBy } from 'firebase/firestore';

/**
 * Firestore Security Rules Considerations
 * 
 * The following security rules should be implemented in Firestore:
 * 
 * ```javascript
 * // Products collection rules
 * match /vendors/{vendorId}/products/{productId} {
 *   allow read: if true; // Public read access for browsing
 *   allow write: if request.auth != null && 
 *                   request.auth.uid == resource.data.ownerId ||
 *                   request.auth.token.role == 'admin';
 *   
 *   // Validate required fields on creation
 *   allow create: if validateProductData(request.resource.data);
 *   
 *   // Validate updates don't change critical fields
 *   allow update: if validateProductUpdate(request.resource.data, resource.data);
 * }
 * 
 * // Categories collection rules  
 * match /vendors/{vendorId}/categories/{categoryId} {
 *   allow read: if true; // Public read access
 *   allow write: if request.auth != null && 
 *                   request.auth.uid == resource.data.ownerId ||
 *                   request.auth.token.role == 'admin';
 * }
 * 
 * function validateProductData(data) {
 *   return data.keys().hasAll(['title', 'price', 'categoryId', 'available', 'stock']) &&
 *          data.title is string &&
 *          data.price is number &&
 *          data.price >= 0 &&
 *          data.stock is number &&
 *          data.stock >= 0 &&
 *          data.available is bool;
 * }
 * ```
 */