// 🔥 GO7 PRODUCT SERVICE V3 - VENDOR-ONLY SCHEMA
// Single source of truth: vendors/{vendorId}/products/{productId}
// Products fetched vendor-by-vendor (NO collectionGroup)

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
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Create a new product with complete vendor metadata
 * WRITES TO: vendors/{vendorId}/products/{productId} ONLY
 */
export const createProduct = async (vendorId, productData) => {
  try {
    // Fetch vendor info first
    const vendorRef = doc(db, 'vendors', vendorId);
    const vendorSnap = await getDoc(vendorRef);
    
    if (!vendorSnap.exists()) {
      throw new Error('Vendor not found');
    }
    
    const vendorInfo = vendorSnap.data();
    
    // Extract vendor fields
    const vendorName = vendorInfo.businessName || vendorInfo.name || vendorInfo.email?.split('@')[0] || 'Unknown Vendor';
    const vendorLogo = vendorInfo.businessLogo || vendorInfo.profileImage || vendorInfo.logo || vendorInfo.imageUrl || '/placeholder-vendor.png';
    const vendorAddress = vendorInfo.address || vendorInfo.location?.address || 'Address not set';
    const vendorRating = vendorInfo.rating || 4.5;
    const vendorDeliveryFee = vendorInfo.deliveryFee || 300;
    const vendorDeliveryTime = vendorInfo.deliveryTime || '20-30 min';
    
    console.log('📦 Creating product with vendor info:', {
      vendorName,
      vendorAddress,
      vendorDeliveryFee,
      vendorRating
    });
    
    // Build complete product object
    const completeProduct = {
      // Product fields
      productName: productData.name,
      name: productData.name,
      title: productData.name,
      price: productData.price || 0,
      category: productData.category || 'food',
      description: productData.description || '',
      imageURL: productData.imageUrl || '/placeholder-product.png',
      imageUrl: productData.imageUrl || '/placeholder-product.png',
      
      // Measurement fields
      measurementType: productData.measurementType || 'unit',
      minQty: productData.minQty || 1,
      maxQty: productData.maxQty || 100,
      
      // Vendor metadata (embedded)
      vendorId: vendorId,
      vendorName: vendorName,
      vendorLogo: vendorLogo,
      vendorAddress: vendorAddress,
      vendorRating: vendorRating,
      vendorDeliveryFee: vendorDeliveryFee,
      vendorDeliveryTime: vendorDeliveryTime,
      
      // Addons
      addons: productData.addons || [],
      
      // Status fields
      active: true,
      isActive: true,
      available: true,
      
      // Timestamp
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      popularityScore: 0
    };
    
    // ✅ SINGLE WRITE: Only to vendor's products subcollection
    const vendorProductRef = doc(collection(db, 'vendors', vendorId, 'products'));
    await setDoc(vendorProductRef, completeProduct);
    
    console.log('✅ Product created at: vendors/' + vendorId + '/products/' + vendorProductRef.id);
    return vendorProductRef.id;
    
  } catch (error) {
    console.error('❌ Error creating product:', error);
    throw error;
  }
};

/**
 * Update an existing product
 * UPDATES: vendors/{vendorId}/products/{productId} ONLY
 */
export const updateProduct = async (vendorId, productId, updates) => {
  try {
    const productRef = doc(db, 'vendors', vendorId, 'products', productId);
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists()) {
      throw new Error('Product not found');
    }
    
    // If vendor metadata refresh requested
    if (updates.refreshVendorData) {
      const vendorRef = doc(db, 'vendors', vendorId);
      const vendorSnap = await getDoc(vendorRef);
      
      if (vendorSnap.exists()) {
        const vendorInfo = vendorSnap.data();
        updates.vendorName = vendorInfo.businessName || vendorInfo.name || vendorInfo.email?.split('@')[0];
        updates.vendorLogo = vendorInfo.businessLogo || vendorInfo.logo || vendorInfo.logoUrl || '/placeholder-vendor.png';
        updates.vendorAddress = vendorInfo.address || vendorInfo.location?.address || 'Address not set';
        updates.vendorDeliveryFee = vendorInfo.deliveryFee || 300;
        updates.vendorDeliveryTime = vendorInfo.deliveryTime || '20-30 min';
      }
    }
    
    updates.updatedAt = serverTimestamp();
    
    // ✅ SINGLE UPDATE: Only vendor's products subcollection
    await updateDoc(productRef, updates);
    
    console.log('✅ Product updated at: vendors/' + vendorId + '/products/' + productId);
    
  } catch (error) {
    console.error('❌ Error updating product:', error);
    throw error;
  }
};

/**
 * Delete a product
 * DELETES FROM: vendors/{vendorId}/products/{productId} ONLY
 */
export const deleteProduct = async (vendorId, productId) => {
  try {
    const productRef = doc(db, 'vendors', vendorId, 'products', productId);
    await deleteDoc(productRef);
    
    console.log('✅ Product deleted from: vendors/' + vendorId + '/products/' + productId);
    
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    throw error;
  }
};

/**
 * Fetch products - queries vendor by vendor (NO collectionGroup)
 * READS FROM: vendors/{vendorId}/products
 */
export const fetchProducts = async (options = {}) => {
  try {
    if (options.vendorId) {
      // Query specific vendor's products
      const productsRef = collection(db, 'vendors', options.vendorId, 'products');
      let constraints = [where('active', '==', true)];
      
      if (options.category && options.category !== 'all') {
        constraints.push(where('category', '==', options.category));
      }
      
      if (options.limit) {
        constraints.push(limit(options.limit));
      }
      
      constraints.push(orderBy('createdAt', 'desc'));
      const q = query(productsRef, ...constraints);
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        productId: doc.id,
        ...doc.data()
      }));
    } else {
      // Query ALL vendors, then get products from each
      const vendorsRef = collection(db, 'vendors');
      const vendorsSnapshot = await getDocs(vendorsRef);
      
      const allProducts = [];
      
      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorId = vendorDoc.id;
        const vendorData = vendorDoc.data();
        
        const productsRef = collection(db, 'vendors', vendorId, 'products');
        let constraints = [where('active', '==', true)];
        
        if (options.category && options.category !== 'all') {
          constraints.push(where('category', '==', options.category));
        }
        
        const q = query(productsRef, ...constraints);
        const productsSnapshot = await getDocs(q);
        
        productsSnapshot.docs.forEach(doc => {
          const productData = doc.data();
          allProducts.push({
            id: doc.id,
            productId: doc.id,
            ...productData,
            vendorId: vendorId,
            vendorName: vendorData.businessName || vendorData.name || 'Unknown Vendor',
            vendorLogo: vendorData.businessLogo || vendorData.logo || '/placeholder-vendor.png',
            vendorAddress: vendorData.address || 'Address not set',
            vendorRating: vendorData.rating || 4.5,
            vendorDeliveryFee: vendorData.deliveryFee || 300,
            vendorDeliveryTime: vendorData.deliveryTime || '20-30 min'
          });
        });
      }
      
      // Sort by creation date
      allProducts.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      // Apply limit if specified
      if (options.limit) {
        return allProducts.slice(0, options.limit);
      }
      
      return allProducts;
    }
    
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    throw error;
  }
};

/**
 * Get a single product by vendorId and productId
 */
export const getProduct = async (vendorId, productId) => {
  try {
    const productRef = doc(db, 'vendors', vendorId, 'products', productId);
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists()) {
      throw new Error('Product not found');
    }
    
    return {
      id: productSnap.id,
      productId: productSnap.id,
      ...productSnap.data()
    };
    
  } catch (error) {
    console.error('❌ Error getting product:', error);
    throw error;
  }
};

/**
 * Sync addons to product.addons array (optional field)
 */
export const syncProductAddons = async (vendorId, productId) => {
  try {
    const addonsRef = collection(db, 'vendors', vendorId, 'addons');
    const addonsQuery = query(addonsRef, where('isActive', '==', true));
    const addonsSnap = await getDocs(addonsQuery);
    
    const addons = addonsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    await updateProduct(vendorId, productId, { addons });
    
    console.log(`✅ Synced ${addons.length} addons to product ${productId}`);
    
  } catch (error) {
    console.error('❌ Error syncing addons:', error);
    throw error;
  }
};

/**
 * Refresh vendor metadata for all products (when vendor updates profile)
 */
export const refreshVendorProducts = async (vendorId) => {
  try {
    const vendorRef = doc(db, 'vendors', vendorId);
    const vendorSnap = await getDoc(vendorRef);
    
    if (!vendorSnap.exists()) {
      throw new Error('Vendor not found');
    }
    
    const vendorInfo = vendorSnap.data();
    const productsRef = collection(db, 'vendors', vendorId, 'products');
    const snapshot = await getDocs(productsRef);
    
    const updates = {
      vendorName: vendorInfo.businessName || vendorInfo.name || vendorInfo.email?.split('@')[0],
      vendorLogo: vendorInfo.businessLogo || vendorInfo.logo || vendorInfo.logoUrl || '/placeholder-vendor.png',
      vendorAddress: vendorInfo.address || vendorInfo.location?.address || 'Address not set',
      vendorRating: vendorInfo.rating || 4.5,
      vendorDeliveryFee: vendorInfo.deliveryFee || 300,
      vendorDeliveryTime: vendorInfo.deliveryTime || '20-30 min',
      updatedAt: serverTimestamp()
    };
    
    const updatePromises = snapshot.docs.map(productDoc => 
      updateDoc(doc(db, 'vendors', vendorId, 'products', productDoc.id), updates)
    );
    
    await Promise.all(updatePromises);
    
    console.log(`✅ Refreshed ${snapshot.docs.length} products for vendor ${vendorId}`);
    
  } catch (error) {
    console.error('❌ Error refreshing vendor products:', error);
    throw error;
  }
};

// ProductService class export for compatibility
export class ProductService {
  static async getByVendor(vendorId) {
    return getProductsByVendor(vendorId);
  }
  
  static async create(vendorId, productData) {
    return createProduct(vendorId, productData);
  }
  
  static async update(vendorId, productId, updates) {
    return updateProduct(vendorId, productId, updates);
  }
  
  static async delete(vendorId, productId) {
    return deleteProduct(vendorId, productId);
  }
  
  static async search(searchTerm, vendorId = null) {
    return searchProducts(searchTerm, vendorId);
  }
}

// Also export as default for convenience
export default ProductService;
