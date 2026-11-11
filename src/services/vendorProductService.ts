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
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { uploadImageToHostinger } from './hostingerImageUpload';

// ====================================================================
// 🛍️ VENDOR PRODUCT SERVICE - Complete product & addon management
// ====================================================================

export interface ProductData {
  id?: string;
  name: string;
  description: string;
  price: number;  // MUST be number, not string
  currency: string;
  measurementType: 'portion' | 'tuber' | 'unit' | 'pack' | 'kg' | 'g' | 'L' | 'ml';
  minQty: number;
  maxQty: number;
  available: boolean;
  imageUrl?: string;
  category?: string;
  vendorId?: string;
  addonCount?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AddonData {
  id?: string;
  name: string;
  price: number;  // MUST be number, not string
  imageUrl?: string;
  available: boolean;
  qtyLimit: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export class VendorProductService {
  
  // ====================================================================
  // 📦 PRODUCT CRUD OPERATIONS
  // ====================================================================

  /**
   * Create a new product with image upload and price validation
   * Automatically mirrors to /products collection via Cloud Function
   */
  static async createProduct(
    vendorId: string,
    productData: Omit<ProductData, 'id' | 'createdAt' | 'updatedAt' | 'vendorId'>,
    imageFile?: File
  ): Promise<ProductData> {
    try {
      let imageUrl = '';

      // Validate price is numeric
      const price = this.validateNumericPrice(productData.price);

      // Upload image if provided
      if (imageFile) {
        imageUrl = await this.uploadProductImage(vendorId, imageFile);
      }

      // Prepare product data with validated price
      const newProductData: Omit<ProductData, 'id'> = {
        ...productData,
        price,
        imageUrl,
        available: productData.available ?? true,
        currency: productData.currency || 'NGN',
        measurementType: productData.measurementType || 'portion',
        minQty: productData.minQty || 1,
        maxQty: productData.maxQty || 100,
        addonCount: 0,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };

      // Add to vendor's products subcollection
      const productsRef = collection(db, `vendors/${vendorId}/products`);
      const docRef = await addDoc(productsRef, newProductData);

      console.log(`✅ Product created: ${docRef.id}`);

      return {
        id: docRef.id,
        ...newProductData,
        vendorId,
        price // Ensure numeric price is returned
      } as ProductData;

    } catch (error) {
      console.error('❌ Error creating product:', error);
      throw new Error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update existing product with optional image replacement
   */
  static async updateProduct(
    vendorId: string,
    productId: string,
    updates: Partial<ProductData>,
    newImageFile?: File
  ): Promise<void> {
    try {
      const productRef = doc(db, `vendors/${vendorId}/products/${productId}`);
      
      let updateData: any = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      // Validate price if provided
      if (updates.price !== undefined) {
        updateData.price = this.validateNumericPrice(updates.price);
      }

      // Handle image update
      if (newImageFile) {
        // Delete old image if exists
        const productDoc = await getDoc(productRef);
        if (productDoc.exists()) {
          const oldImageUrl = productDoc.data().imageUrl;
          if (oldImageUrl) {
            await this.deleteProductImage(oldImageUrl).catch(console.error);
          }
        }

        // Upload new image
        updateData.imageUrl = await this.uploadProductImage(vendorId, newImageFile);
      }

      await updateDoc(productRef, updateData);
      console.log(`✅ Product updated: ${productId}`);

    } catch (error) {
      console.error('❌ Error updating product:', error);
      throw new Error(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete product and its image
   */
  static async deleteProduct(vendorId: string, productId: string): Promise<void> {
    try {
      const productRef = doc(db, `vendors/${vendorId}/products/${productId}`);
      
      // Get product to delete image
      const productDoc = await getDoc(productRef);
      if (productDoc.exists()) {
        const imageUrl = productDoc.data().imageUrl;
        if (imageUrl) {
          await this.deleteProductImage(imageUrl).catch(console.error);
        }

        // Delete all addons first
        const addonsRef = collection(db, `vendors/${vendorId}/products/${productId}/addons`);
        const addonsSnapshot = await getDocs(addonsRef);
        
        for (const addonDoc of addonsSnapshot.docs) {
          await this.deleteAddon(vendorId, productId, addonDoc.id);
        }
      }

      // Delete product document
      await deleteDoc(productRef);
      console.log(`✅ Product deleted: ${productId}`);

    } catch (error) {
      console.error('❌ Error deleting product:', error);
      throw new Error(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get single product by ID
   */
  static async getProduct(vendorId: string, productId: string): Promise<ProductData | null> {
    try {
      const productRef = doc(db, `vendors/${vendorId}/products/${productId}`);
      const productDoc = await getDoc(productRef);

      if (!productDoc.exists()) {
        return null;
      }

      const data = productDoc.data();
      return {
        id: productDoc.id,
        ...data,
        // Ensure price is numeric with fallback
        price: this.validateNumericPrice(data.price, 0)
      } as ProductData;

    } catch (error) {
      console.error('❌ Error getting product:', error);
      return null;
    }
  }

  /**
   * Get all products for a vendor
   */
  static async getVendorProducts(vendorId: string): Promise<ProductData[]> {
    try {
      const productsRef = collection(db, `vendors/${vendorId}/products`);
      const q = query(productsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        price: this.validateNumericPrice(doc.data().price, 0)
      })) as ProductData[];

    } catch (error) {
      console.error('❌ Error getting vendor products:', error);
      return [];
    }
  }

  /**
   * Real-time listener for vendor products
   */
  static subscribeToVendorProducts(
    vendorId: string,
    onUpdate: (products: ProductData[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const productsRef = collection(db, `vendors/${vendorId}/products`);
    const q = query(productsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          price: this.validateNumericPrice(doc.data().price, 0)
        })) as ProductData[];
        onUpdate(products);
      },
      (error) => {
        console.error('❌ Error in products listener:', error);
        onError?.(error);
      }
    );
  }

  // ====================================================================
  // 🎨 ADDON CRUD OPERATIONS
  // ====================================================================

  /**
   * Create addon with image upload
   */
  static async createAddon(
    vendorId: string,
    productId: string,
    addonData: Omit<AddonData, 'id' | 'createdAt' | 'updatedAt'>,
    imageFile?: File
  ): Promise<AddonData> {
    try {
      let imageUrl = '';

      // Validate price
      const price = this.validateNumericPrice(addonData.price);

      // Upload image if provided
      if (imageFile) {
        imageUrl = await this.uploadAddonImage(vendorId, productId, imageFile);
      }

      const newAddonData: Omit<AddonData, 'id'> = {
        ...addonData,
        price,
        imageUrl,
        available: addonData.available ?? true,
        qtyLimit: addonData.qtyLimit || 10,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };

      const addonsRef = collection(db, `vendors/${vendorId}/products/${productId}/addons`);
      const docRef = await addDoc(addonsRef, newAddonData);

      console.log(`✅ Addon created: ${docRef.id}`);

      return {
        id: docRef.id,
        ...newAddonData,
        price
      } as AddonData;

    } catch (error) {
      console.error('❌ Error creating addon:', error);
      throw new Error(`Failed to create addon: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update addon with optional image replacement
   */
  static async updateAddon(
    vendorId: string,
    productId: string,
    addonId: string,
    updates: Partial<AddonData>,
    newImageFile?: File
  ): Promise<void> {
    try {
      const addonRef = doc(db, `vendors/${vendorId}/products/${productId}/addons/${addonId}`);
      
      let updateData: any = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      // Validate price if provided
      if (updates.price !== undefined) {
        updateData.price = this.validateNumericPrice(updates.price);
      }

      // Handle image update
      if (newImageFile) {
        const addonDoc = await getDoc(addonRef);
        if (addonDoc.exists()) {
          const oldImageUrl = addonDoc.data().imageUrl;
          if (oldImageUrl) {
            await this.deleteAddonImage(oldImageUrl).catch(console.error);
          }
        }

        updateData.imageUrl = await this.uploadAddonImage(vendorId, productId, newImageFile);
      }

      await updateDoc(addonRef, updateData);
      console.log(`✅ Addon updated: ${addonId}`);

    } catch (error) {
      console.error('❌ Error updating addon:', error);
      throw new Error(`Failed to update addon: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete addon and its image
   */
  static async deleteAddon(vendorId: string, productId: string, addonId: string): Promise<void> {
    try {
      const addonRef = doc(db, `vendors/${vendorId}/products/${productId}/addons/${addonId}`);
      
      // Get addon to delete image
      const addonDoc = await getDoc(addonRef);
      if (addonDoc.exists()) {
        const imageUrl = addonDoc.data().imageUrl;
        if (imageUrl) {
          await this.deleteAddonImage(imageUrl).catch(console.error);
        }
      }

      await deleteDoc(addonRef);
      console.log(`✅ Addon deleted: ${addonId}`);

    } catch (error) {
      console.error('❌ Error deleting addon:', error);
      throw new Error(`Failed to delete addon: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all addons for a product
   */
  static async getProductAddons(vendorId: string, productId: string): Promise<AddonData[]> {
    try {
      const addonsRef = collection(db, `vendors/${vendorId}/products/${productId}/addons`);
      const q = query(addonsRef, where('available', '==', true));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        price: this.validateNumericPrice(doc.data().price, 0)
      })) as AddonData[];

    } catch (error) {
      console.error('❌ Error getting product addons:', error);
      return [];
    }
  }

  /**
   * Real-time listener for product addons
   */
  static subscribeToProductAddons(
    vendorId: string,
    productId: string,
    onUpdate: (addons: AddonData[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const addonsRef = collection(db, `vendors/${vendorId}/products/${productId}/addons`);
    const q = query(addonsRef, where('available', '==', true));

    return onSnapshot(
      q,
      (snapshot) => {
        const addons = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          price: this.validateNumericPrice(doc.data().price, 0)
        })) as AddonData[];
        onUpdate(addons);
      },
      (error) => {
        console.error('❌ Error in addons listener:', error);
        onError?.(error);
      }
    );
  }

  // ====================================================================
  // 🌍 GLOBAL PRODUCT QUERIES (from /products collection)
  // ====================================================================

  /**
   * Get trending products from global /products collection
   */
  static async getTrendingProducts(limitCount: number = 20): Promise<ProductData[]> {
    try {
      const productsRef = collection(db, 'products');
      const q = query(
        productsRef,
        where('available', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        price: this.validateNumericPrice(doc.data().price, 0)
      })) as ProductData[];

    } catch (error) {
      console.error('❌ Error getting trending products:', error);
      return [];
    }
  }

  /**
   * Get products by category from global collection
   */
  static async getProductsByCategory(category: string, limitCount: number = 20): Promise<ProductData[]> {
    try {
      const productsRef = collection(db, 'products');
      const q = query(
        productsRef,
        where('category', '==', category),
        where('available', '==', true),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        price: this.validateNumericPrice(doc.data().price, 0)
      })) as ProductData[];

    } catch (error) {
      console.error('❌ Error getting products by category:', error);
      return [];
    }
  }

  // ====================================================================
  // 📸 IMAGE UPLOAD HELPERS
  // ====================================================================

  /**
   * Upload product image to Hostinger (Firebase Storage bypass)
   */
  private static async uploadProductImage(vendorId: string, imageFile: File): Promise<string> {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const downloadUrl = await uploadImageToHostinger(
        imageFile,
        `vendors/${vendorId}/products/${fileName}`
      );
      console.log(`✅ Product image uploaded: ${fileName}`);
      return downloadUrl;
    } catch (error) {
      console.error('❌ Error uploading product image:', error);
      throw new Error('Failed to upload product image');
    }
  }

  /**
   * Upload addon image to Hostinger (Firebase Storage bypass)
   */
  private static async uploadAddonImage(vendorId: string, productId: string, imageFile: File): Promise<string> {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const downloadUrl = await uploadImageToHostinger(
        imageFile,
        `vendors/${vendorId}/products/${productId}/addons/${fileName}`
      );
      console.log(`✅ Addon image uploaded: ${fileName}`);
      return downloadUrl;
    } catch (error) {
      console.error('❌ Error uploading addon image:', error);
      throw new Error('Failed to upload addon image');
    }
  }

  /**
   * Delete product image — Hostinger has no delete API; skip Storage delete
   */
  private static async deleteProductImage(imageUrl: string): Promise<void> {
    console.log('Product image retained on Hostinger (no delete API):', imageUrl);
  }

  /**
   * Delete addon image — Hostinger has no delete API; skip Storage delete
   */
  private static async deleteAddonImage(imageUrl: string): Promise<void> {
    console.log('Addon image retained on Hostinger (no delete API):', imageUrl);
  }

  // ====================================================================
  // 💰 PRICE VALIDATION HELPERS
  // ====================================================================

  /**
   * Validate and ensure price is numeric
   * Converts strings to numbers and provides fallback
   */
  private static validateNumericPrice(price: any, fallback: number = 0): number {
    if (typeof price === 'number' && !isNaN(price)) {
      return price;
    }
    
    if (typeof price === 'string') {
      const parsed = parseFloat(price);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    console.warn(`⚠️ Invalid price value: ${price}, using fallback: ${fallback}`);
    return fallback;
  }

  /**
   * Format price for display with currency
   */
  static formatPrice(price: number, currency: string = 'NGN'): string {
    const validPrice = this.validateNumericPrice(price, 0);
    
    if (currency === 'NGN') {
      return `₦${validPrice.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    
    return `${currency} ${validPrice.toFixed(2)}`;
  }

  /**
   * Calculate total price with addons
   */
  static calculateTotalPrice(basePrice: number, addons: { price: number; quantity: number }[]): number {
    const validBasePrice = this.validateNumericPrice(basePrice, 0);
    
    const addonsTotal = addons.reduce((sum, addon) => {
      const addonPrice = this.validateNumericPrice(addon.price, 0);
      const quantity = addon.quantity || 1;
      return sum + (addonPrice * quantity);
    }, 0);

    return validBasePrice + addonsTotal;
  }
}
