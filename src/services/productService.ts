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
  serverTimestamp,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { AuditLogService } from './auditLogService';
import { Product } from '../types/marketplace';

export class ProductService {
  /**
   * Creates a new product in the vendor's collection with optional image upload and audit logging.
   * 
   * @param vendorId - The unique identifier of the vendor creating the product
   * @param productData - Product information excluding the auto-generated ID
   * @param actorUid - The UID of the user performing this action (for audit trail)
   * @param imageFile - Optional image file to upload and associate with the product
   * @returns Promise that resolves to the created Product with generated ID
   * @throws Error if product creation, image upload, or audit logging fails
   * 
   * @example
   * ```typescript
   * const newProduct = await ProductService.createProduct(
   *   'vendor123',
   *   { name: 'Widget', price: 29.99, category: 'Electronics' },
   *   'user456',
   *   imageFile
   * );
   * ```
   */
  static async createProduct(
    vendorId: string, 
    productData: Omit<Product, 'id'>, 
    actorUid: string,
    imageFile?: File
  ): Promise<Product> {
    try {
      let imageUrl = '';
      
      // Upload image if provided
      if (imageFile) {
        const imageRef = ref(storage, `products/${vendorId}/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      // Prepare product data
      const newProductData = {
        ...productData,
        imageUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add product to Firestore
      const productsCollection = collection(db, `vendors/${vendorId}/products`);
      const docRef = await addDoc(productsCollection, newProductData);

      // Link all existing vendor add-ons to this new product
      await this.linkVendorAddonsToProduct(vendorId, docRef.id);

      const createdProduct: Product = {
        id: docRef.id,
        ...productData,
        imageUrl
      };

      // Log audit event
      await AuditLogService.logProductCreated(
        actorUid,
        vendorId,
        docRef.id,
        createdProduct
      );

      console.log('Product created successfully:', docRef.id);
      return createdProduct;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Updates an existing product with optional image replacement and audit logging.
   * 
   * @param vendorId - The unique identifier of the vendor who owns the product
   * @param productId - The unique identifier of the product to update
   * @param updates - Partial product data containing fields to update
   * @param actorUid - The UID of the user performing this action (for audit trail)
   * @param imageFile - Optional new image file to replace the existing product image
   * @returns Promise that resolves to the updated Product with all current data
   * @throws Error if product doesn't exist, update fails, or audit logging fails
   * 
   * @example
   * ```typescript
   * const updatedProduct = await ProductService.updateProduct(
   *   'vendor123',
   *   'product456',
   *   { price: 39.99, availability: false },
   *   'user789'
   * );
   * ```
   */
  static async updateProduct(
    vendorId: string,
    productId: string,
    updates: Partial<Product>,
    actorUid: string,
    imageFile?: File
  ): Promise<Product> {
    try {
      const productRef = doc(db, `vendors/${vendorId}/products/${productId}`);
      
      // Get current product data for audit comparison
      const currentDoc = await getDoc(productRef);
      if (!currentDoc.exists()) {
        throw new Error(`Product ${productId} not found`);
      }
      
      const currentProduct = { id: productId, ...currentDoc.data() } as Product;
      
      // Handle image upload if provided
      let imageUrl = currentProduct.imageUrl;
      if (imageFile) {
        // Delete old image if exists
        if (currentProduct.imageUrl) {
          try {
            const url = new URL(currentProduct.imageUrl);
            const pathMatch = url.pathname.match(/o\/(.+)$/);
            if (pathMatch && pathMatch[1]) {
              const imagePath = decodeURIComponent(pathMatch[1]);
              const oldImageRef = ref(storage, imagePath);
              await deleteObject(oldImageRef);
            }
          } catch (error) {
            console.warn('Error deleting old image:', error);
          }
        }

        // Upload new image
        const imageRef = ref(storage, `products/${vendorId}/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      // Prepare update data
      const updateData = {
        ...updates,
        imageUrl,
        updatedAt: serverTimestamp()
      };

      // Update product in Firestore
      await updateDoc(productRef, updateData);

      const updatedProduct: Product = {
        ...currentProduct,
        ...updates,
        imageUrl
      };

      // Log audit event for general update
      await AuditLogService.logProductUpdated(
        actorUid,
        vendorId,
        productId,
        currentProduct,
        updatedProduct
      );

      // Log specific price change if price was updated
      if (updates.price !== undefined && updates.price !== currentProduct.price) {
        await AuditLogService.logProductPriceChanged(
          actorUid,
          vendorId,
          productId,
          currentProduct.title,
          currentProduct.price,
          updates.price
        );
      }

      console.log('Product updated successfully:', productId);
      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Links all existing vendor add-ons to a newly created product.
   * This ensures that products created after add-ons exist will have access to them.
   * 
   * @param vendorId - The unique identifier of the vendor
   * @param productId - The unique identifier of the newly created product
   * @returns Promise that resolves when all add-ons are linked
   */
  static async linkVendorAddonsToProduct(
    vendorId: string,
    productId: string
  ): Promise<void> {
    try {
      // Get all vendor add-ons
      const addonsRef = collection(db, 'vendors', vendorId, 'addons');
      const addonsSnapshot = await getDocs(addonsRef);

      if (addonsSnapshot.empty) {
        console.log(`No add-ons found for vendor ${vendorId}`);
        return;
      }

      // Create a batch to link all add-ons to the product
      const batch = writeBatch(db);
      
      addonsSnapshot.forEach((addonDoc) => {
        const addonData = addonDoc.data();
        const productAddonRef = doc(
          db,
          'vendors',
          vendorId,
          'products',
          productId,
          'addons',
          addonDoc.id
        );
        
        batch.set(productAddonRef, addonData);
      });

      await batch.commit();
      console.log(`✅ Linked ${addonsSnapshot.size} add-ons to product ${productId}`);
    } catch (error) {
      console.error('Error linking vendor add-ons to product:', error);
      // Don't throw - allow product creation to succeed even if addon linking fails
    }
  }

  /**
   * Deletes a product permanently, including its associated image and audit logging.
   * 
   * @param vendorId - The unique identifier of the vendor who owns the product
   * @param productId - The unique identifier of the product to delete
   * @param actorUid - The UID of the user performing this action (for audit trail)
   * @returns Promise that resolves when the product is successfully deleted
   * @throws Error if product doesn't exist, deletion fails, or audit logging fails
   * 
   * @example
   * ```typescript
   * await ProductService.deleteProduct('vendor123', 'product456', 'user789');
   * ```
   */
  static async deleteProduct(
    vendorId: string,
    productId: string,
    actorUid: string
  ): Promise<void> {
    try {
      const productRef = doc(db, `vendors/${vendorId}/products/${productId}`);
      
      // Get current product data for audit
      const currentDoc = await getDoc(productRef);
      if (!currentDoc.exists()) {
        throw new Error(`Product ${productId} not found`);
      }
      
      const currentProduct = { id: productId, ...currentDoc.data() } as Product;

      // Delete image from storage if exists
      if (currentProduct.imageUrl) {
        try {
          const url = new URL(currentProduct.imageUrl);
          const pathMatch = url.pathname.match(/o\/(.+)$/);
          if (pathMatch && pathMatch[1]) {
            const imagePath = decodeURIComponent(pathMatch[1]);
            const imageRef = ref(storage, imagePath);
            await deleteObject(imageRef);
          }
        } catch (error) {
          console.warn('Error deleting product image:', error);
        }
      }

      // Delete product from Firestore
      await deleteDoc(productRef);

      // Log audit event
      await AuditLogService.logProductDeleted(
        actorUid,
        vendorId,
        productId,
        currentProduct
      );

      console.log('Product deleted successfully:', productId);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Deletes multiple products in parallel with individual audit logging for each.
   * 
   * @param vendorId - The unique identifier of the vendor who owns the products
   * @param productIds - Array of product IDs to delete
   * @param actorUid - The UID of the user performing this action (for audit trail)
   * @returns Promise that resolves when all products are successfully deleted
   * @throws Error if any product deletion fails (partial failure possible)
   * 
   * @example
   * ```typescript
   * await ProductService.bulkDeleteProducts(
   *   'vendor123',
   *   ['product1', 'product2', 'product3'],
   *   'user789'
   * );
   * ```
   */
  static async bulkDeleteProducts(
    vendorId: string,
    productIds: string[],
    actorUid: string
  ): Promise<void> {
    try {
      const deletePromises = productIds.map(productId => 
        this.deleteProduct(vendorId, productId, actorUid)
      );

      await Promise.all(deletePromises);
      console.log(`Bulk deleted ${productIds.length} products`);
    } catch (error) {
      console.error('Error bulk deleting products:', error);
      throw error;
    }
  }

  /**
   * Updates a product's availability status with audit logging.
   * 
   * @param vendorId - The unique identifier of the vendor who owns the product
   * @param productId - The unique identifier of the product to update
   * @param isAvailable - New availability status (true = available, false = unavailable)
   * @param actorUid - The UID of the user performing this action (for audit trail)
   * @returns Promise that resolves when availability is successfully updated
   * @throws Error if product doesn't exist, update fails, or audit logging fails
   * 
   * @example
   * ```typescript
   * await ProductService.updateProductAvailability(
   *   'vendor123',
   *   'product456',
   *   false,
   *   'user789'
   * );
   * ```
   */
  static async updateProductAvailability(
    vendorId: string,
    productId: string,
    isAvailable: boolean,
    actorUid: string
  ): Promise<void> {
    try {
      const productRef = doc(db, `vendors/${vendorId}/products/${productId}`);
      
      // Get current product data
      const currentDoc = await getDoc(productRef);
      if (!currentDoc.exists()) {
        throw new Error(`Product ${productId} not found`);
      }
      
      const currentProduct = { id: productId, ...currentDoc.data() } as Product;

      // Update availability
      await updateDoc(productRef, {
        available: isAvailable,
        updatedAt: serverTimestamp()
      });

      const updatedProduct = {
        ...currentProduct,
        available: isAvailable
      };

      // Log audit event
      await AuditLogService.logProductUpdated(
        actorUid,
        vendorId,
        productId,
        currentProduct,
        updatedProduct
      );

      console.log(`Product ${productId} availability updated to ${isAvailable}`);
    } catch (error) {
      console.error('Error updating product availability:', error);
      throw error;
    }
  }

  /**
   * Toggles a product's availability status without audit logging (lightweight version).
   * 
   * @param vendorId - The unique identifier of the vendor who owns the product
   * @param productId - The unique identifier of the product to toggle
   * @param isAvailable - New availability status to set
   * @returns Promise that resolves when availability is successfully toggled
   * @throws Error if product update fails
   * 
   * @example
   * ```typescript
   * await ProductService.toggleAvailability('vendor123', 'product456', true);
   * ```
   */
  static async toggleAvailability(
    vendorId: string,
    productId: string,
    isAvailable: boolean
  ): Promise<void> {
    try {
      const productRef = doc(db, `vendors/${vendorId}/products/${productId}`);
      
      // Update availability
      await updateDoc(productRef, {
        available: isAvailable,
        updatedAt: serverTimestamp()
      });

      console.log(`Product ${productId} availability toggled to ${isAvailable}`);
    } catch (error) {
      console.error('Error toggling product availability:', error);
      throw error;
    }
  }

  /**
   * Updates availability status for multiple products in parallel with audit logging.
   * 
   * @param vendorId - The unique identifier of the vendor who owns the products
   * @param productIds - Array of product IDs to update
   * @param isAvailable - New availability status to apply to all products
   * @param actorUid - The UID of the user performing this action (for audit trail)
   * @returns Promise that resolves when all products are successfully updated
   * @throws Error if any product update fails (partial failure possible)
   * 
   * @example
   * ```typescript
   * await ProductService.bulkUpdateAvailability(
   *   'vendor123',
   *   ['product1', 'product2'],
   *   false,
   *   'user789'
   * );
   * ```
   */
  static async bulkUpdateAvailability(
    vendorId: string,
    productIds: string[],
    isAvailable: boolean,
    actorUid: string
  ): Promise<void> {
    try {
      const updatePromises = productIds.map(productId =>
        this.updateProductAvailability(vendorId, productId, isAvailable, actorUid)
      );

      await Promise.all(updatePromises);
      console.log(`Bulk updated availability for ${productIds.length} products`);
    } catch (error) {
      console.error('Error bulk updating availability:', error);
      throw error;
    }
  }

  /**
   * Update product stock with audit logging
   */
  static async updateProductStock(
    vendorId: string,
    productId: string,
    newStock: number,
    actorUid: string,
    variantName?: string
  ): Promise<void> {
    try {
      const productRef = doc(db, `vendors/${vendorId}/products/${productId}`);
      
      await runTransaction(db, async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) {
          throw new Error(`Product ${productId} not found`);
        }
        
        const currentProduct = { id: productId, ...productDoc.data() } as Product;
        let updateData: any = {};
        let oldStock: number;
        
        if (variantName && currentProduct.hasVariants && currentProduct.variants) {
          // Update variant stock
          const variantIndex = currentProduct.variants.findIndex((v: any) => v.sku === variantName);
          if (variantIndex === -1) {
            throw new Error(`Variant ${variantName} not found`);
          }
          
          oldStock = currentProduct.variants[variantIndex].stock;
          updateData[`variants.${variantIndex}.stock`] = newStock;
        } else {
          // Update main product stock
          oldStock = currentProduct.stock || 0;
          updateData.stock = newStock;
        }
        
        updateData.updatedAt = serverTimestamp();
        transaction.update(productRef, updateData);

        // Log audit event (outside transaction to avoid conflicts)
        setTimeout(async () => {
          try {
            await AuditLogService.logProductUpdated(
              actorUid,
              vendorId,
              productId,
              currentProduct,
              { ...currentProduct, ...updateData }
            );
          } catch (auditError) {
            console.error('Error logging stock update audit:', auditError);
          }
        }, 100);
      });

      console.log(`Stock updated for product ${productId}${variantName ? ` variant ${variantName}` : ''}`);
    } catch (error) {
      console.error('Error updating product stock:', error);
      throw error;
    }
  }

  /**
   * Add or update product variant with audit logging
   */
  static async addProductVariant(
    vendorId: string,
    productId: string,
    variant: any, // Using any since marketplace and models types differ
    actorUid: string
  ): Promise<void> {
    try {
      const productRef = doc(db, `vendors/${vendorId}/products/${productId}`);
      
      const currentDoc = await getDoc(productRef);
      if (!currentDoc.exists()) {
        throw new Error(`Product ${productId} not found`);
      }
      
      const currentProduct = { id: productId, ...currentDoc.data() } as Product;
      const updatedVariants = [...(currentProduct.variants || []), variant];
      
      await updateDoc(productRef, {
        hasVariants: true,
        variants: updatedVariants,
        updatedAt: serverTimestamp()
      });

      const updatedProduct = {
        ...currentProduct,
        hasVariants: true,
        variants: updatedVariants
      };

      // Log audit event
      await AuditLogService.logProductUpdated(
        actorUid,
        vendorId,
        productId,
        currentProduct,
        updatedProduct
      );

      console.log(`Variant ${variant.sku} added to product ${productId}`);
    } catch (error) {
      console.error('Error adding product variant:', error);
      throw error;
    }
  }

  /**
   * Retrieves a single product by its ID from the vendor's collection.
   * 
   * @param vendorId - The unique identifier of the vendor who owns the product
   * @param productId - The unique identifier of the product to retrieve
   * @returns Promise that resolves to the Product if found, or null if not found
   * @throws Error if the query fails due to permissions or network issues
   * 
   * @example
   * ```typescript
   * const product = await ProductService.getProduct('vendor123', 'product456');
   * if (product) {
   *   console.log(product.name);
   * }
   * ```
   */
  static async getProduct(vendorId: string, productId: string): Promise<Product | null> {
    try {
      const productRef = doc(db, `vendors/${vendorId}/products/${productId}`);
      const productDoc = await getDoc(productRef);
      
      if (!productDoc.exists()) {
        return null;
      }
      
      return { id: productId, ...productDoc.data() } as Product;
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  }

  /**
   * List products with optional filtering and query parameters
   */
  static async listProducts(
    vendorId: string, 
    queryOptions?: {
      category?: string;
      isAvailable?: boolean;
      searchTerm?: string;
      limit?: number;
      sortBy?: 'title' | 'price' | 'createdAt';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<Product[]> {
    try {
      const productsCollection = collection(db, `vendors/${vendorId}/products`);
      let products: Product[];

      // If we have specific filters, apply them
      if (queryOptions?.category || queryOptions?.isAvailable !== undefined) {
        const constraints = [];
        
        if (queryOptions.category) {
          constraints.push(where('category', '==', queryOptions.category));
        }
        
        if (queryOptions.isAvailable !== undefined) {
          constraints.push(where('available', '==', queryOptions.isAvailable));
        }

        const q = query(productsCollection, ...constraints);
        const snapshot = await getDocs(q);
        
        products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
      } else {
        // Get all products if no specific filters
        const snapshot = await getDocs(productsCollection);
        products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
      }

      // Apply search filter if provided (client-side since Firestore doesn't support full-text search)
      if (queryOptions?.searchTerm) {
        const searchLower = queryOptions.searchTerm.toLowerCase();
        products = products.filter(product => 
          product.title.toLowerCase().includes(searchLower) ||
          product.desc?.toLowerCase().includes(searchLower)
        );
      }

      // Apply sorting
      if (queryOptions?.sortBy) {
        products.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (queryOptions.sortBy) {
            case 'title':
              aValue = a.title;
              bValue = b.title;
              break;
            case 'price':
              aValue = a.price;
              bValue = b.price;
              break;
            case 'createdAt':
              aValue = a.createdAt;
              bValue = b.createdAt;
              break;
            default:
              aValue = a.title;
              bValue = b.title;
          }
          
          let comparison = 0;
          if (aValue < bValue) comparison = -1;
          if (aValue > bValue) comparison = 1;
          
          return queryOptions.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      // Apply limit
      if (queryOptions?.limit) {
        products = products.slice(0, queryOptions.limit);
      }

      return products;
    } catch (error) {
      console.error('Error listing products:', error);
      throw error;
    }
  }

  /**
   * Retrieves all products belonging to a specific vendor without any filtering.
   * 
   * @param vendorId - The unique identifier of the vendor whose products to retrieve
   * @returns Promise that resolves to an array of all products in the vendor's collection
   * @throws Error if the query fails due to permissions or network issues
   * 
   * @example
   * ```typescript
   * const allProducts = await ProductService.getVendorProducts('vendor123');
   * console.log(`Found ${allProducts.length} products`);
   * ```
   */
  static async getVendorProducts(vendorId: string): Promise<Product[]> {
    try {
      const productsCollection = collection(db, `vendors/${vendorId}/products`);
      const snapshot = await getDocs(productsCollection);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
    } catch (error) {
      console.error('Error getting vendor products:', error);
      throw error;
    }
  }

  /**
   * Retrieves products that belong to a specific category within a vendor's collection.
   * 
   * @param vendorId - The unique identifier of the vendor whose products to filter
   * @param category - The category name to filter products by
   * @returns Promise that resolves to an array of products in the specified category
   * @throws Error if the query fails due to permissions or network issues
   * 
   * @example
   * ```typescript
   * const electronics = await ProductService.getProductsByCategory('vendor123', 'Electronics');
   * ```
   */
  static async getProductsByCategory(vendorId: string, category: string): Promise<Product[]> {
    try {
      const productsCollection = collection(db, `vendors/${vendorId}/products`);
      const q = query(productsCollection, where('category', '==', category));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
    } catch (error) {
      console.error('Error getting products by category:', error);
      throw error;
    }
  }

  /**
   * Searches for products within a vendor's collection by name or description using client-side filtering.
   * 
   * @param vendorId - The unique identifier of the vendor whose products to search
   * @param searchTerm - The text to search for in product names and descriptions (case-insensitive)
   * @returns Promise that resolves to an array of products matching the search term
   * @throws Error if the search fails due to permissions or network issues
   * 
   * @example
   * ```typescript
   * const results = await ProductService.searchProducts('vendor123', 'phone case');
   * ```
   */
  static async searchProducts(vendorId: string, searchTerm: string): Promise<Product[]> {
    try {
      const products = await this.getVendorProducts(vendorId);
      const searchLower = searchTerm.toLowerCase();
      
      return products.filter(product => 
        product.title.toLowerCase().includes(searchLower) ||
        product.desc?.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Checks if a category name is currently being used by any products in the vendor's collection.
   * 
   * @param vendorId - The unique identifier of the vendor whose products to check
   * @param categoryName - The category name to search for
   * @returns Promise that resolves to true if the category is in use, false otherwise
   * @throws Error if the query fails due to permissions or network issues
   * 
   * @example
   * ```typescript
   * const inUse = await ProductService.isCategoryInUse('vendor123', 'Electronics');
   * if (!inUse) {
   *   // Safe to delete this category
   * }
   * ```
   */
  static async isCategoryInUse(vendorId: string, categoryName: string): Promise<boolean> {
    try {
      const productsCollection = collection(db, `vendors/${vendorId}/products`);
      const q = query(productsCollection, where('category', '==', categoryName));
      const snapshot = await getDocs(q);
      
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking category usage:', error);
      return true; // Assume in use to be safe
    }
  }

  /**
   * Uploads multiple image files to Firebase Storage for a vendor's products.
   * 
   * @param vendorId - The unique identifier of the vendor uploading the images
   * @param files - Array of image files to upload
   * @returns Promise that resolves to an array of download URLs for the uploaded images
   * @throws Error if any upload fails (partial uploads may occur)
   * 
   * @example
   * ```typescript
   * const imageUrls = await ProductService.uploadImages(
   *   'vendor123',
   *   [imageFile1, imageFile2]
   * );
   * ```
   */
  static async uploadImages(
    vendorId: string,
    files: File[]
  ): Promise<string[]> {
    try {
      const uploadPromises = files.map(async (file) => {
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const filename = `${timestamp}_${file.name}`;
        const imageRef = ref(storage, `products/${vendorId}/${filename}`);
        
        // Upload file
        const uploadResult = await uploadBytes(imageRef, file);
        
        // Get download URL
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        return downloadURL;
      });

      const downloadURLs = await Promise.all(uploadPromises);
      
      console.log(`Successfully uploaded ${files.length} images for vendor ${vendorId}`);
      return downloadURLs;
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  }

  /**
   * Deletes multiple images from Firebase Storage using their download URLs.
   * Useful for cleanup when products are deleted or images are replaced.
   * 
   * @param imageUrls - Array of Firebase Storage download URLs to delete
   * @returns Promise that resolves when all deletions are attempted (individual failures are logged)
   * @throws Error only for critical failures; individual image deletion errors are logged but don't fail the entire operation
   * 
   * @example
   * ```typescript
   * await ProductService.deleteImages([
   *   'https://firebasestorage.googleapis.com/v0/b/...',
   *   'https://firebasestorage.googleapis.com/v0/b/...'
   * ]);
   * ```
   */
  static async deleteImages(imageUrls: string[]): Promise<void> {
    try {
      const deletePromises = imageUrls.map(async (imageUrl) => {
        try {
          const url = new URL(imageUrl);
          const pathMatch = url.pathname.match(/o\/(.+)$/);
          if (pathMatch && pathMatch[1]) {
            const imagePath = decodeURIComponent(pathMatch[1]);
            const imageRef = ref(storage, imagePath);
            await deleteObject(imageRef);
          }
        } catch (error) {
          console.warn(`Error deleting image ${imageUrl}:`, error);
        }
      });

      await Promise.all(deletePromises);
      console.log(`Successfully deleted ${imageUrls.length} images`);
    } catch (error) {
      console.error('Error deleting images:', error);
      throw error;
    }
  }
}
