// 🔥 GO7 FIRESTORE V2 - REUSABLE PRODUCT FETCHING FUNCTIONS
// Use these functions throughout the app for consistent data access

import { 
  collection, 
  getDocs, 
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Fetch ALL products from ALL vendors
 * Path: vendors/{vendorId}/products/{productId}
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Array of products with vendorId embedded
 */
export async function fetchAllProducts(options = {}) {
  try {
    console.log('🔥 FIRESTORE V2: Fetching all products from vendors...');
    console.log('📋 Options:', options);
    
    // Get all vendors
    const vendorsSnap = await getDocs(collection(db, 'vendors'));
    console.log(`📊 Found ${vendorsSnap.size} vendors in total`);
    
    let products = [];

    // Fetch products from each vendor
    for (const vendorDoc of vendorsSnap.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      
      // Extract vendor name from various possible fields
      const vendorName = vendorData.businessName || vendorData.name || vendorData.storeName || vendorData.email?.split('@')[0] || 'Vendor';
      console.log(`🏪 Checking vendor: ${vendorName} (ID: ${vendorId})`);
      console.log(`   📋 Vendor fields:`, Object.keys(vendorData).join(', '));
      
      // Query vendor's products
      const prodRef = collection(db, 'vendors', vendorId, 'products');
      let q = prodRef;
      
      // Apply filters
      if (options.category && options.category !== 'all') {
        q = query(prodRef, where('category', '==', options.category));
      }
      
      if (options.available !== undefined) {
        // Check both 'available' and 'isAvailable' fields
        q = query(prodRef, where('isAvailable', '==', options.available));
      }
      
      const prodSnap = await getDocs(q);
      console.log(`  ├─ Found ${prodSnap.size} products`);

      prodSnap.forEach(p => {
        const productData = p.data();
        
        // Map field variations to standard V2 fields
        const standardProduct = {
          id: p.id,
          productId: p.id,
          vendorId: vendorId,
          
          // Standard V2 fields with fallbacks for dashboard variations
          name: productData.name || productData.productName || 'Unnamed Product',
          description: productData.description || productData.desc || productData.details || '',
          price: productData.price || productData.basePrice || 0,
          imageUrl: productData.imageUrl || productData.image || productData.photo || '',
          available: productData.available !== undefined ? productData.available : 
                    (productData.isAvailable !== undefined ? productData.isAvailable : true),
          category: productData.category || 'Main',
          
          // Measurement fields
          measurementType: productData.measurementType || productData.unitType,
          minQty: productData.minQty || 1,
          maxQty: productData.maxQty || 100,
          
          // Embed vendor info for easy access
          vendorName: vendorData.businessName || vendorData.name || vendorData.storeName || vendorData.email?.split('@')[0] || 'Vendor',
          vendorLogo: vendorData.businessLogo || vendorData.profileImage || vendorData.logo || vendorData.imageUrl || '/placeholder-vendor.png',
          vendorRating: vendorData.rating || 4.5,
          vendorDeliveryTime: vendorData.deliveryTime || '20-30 min',
          vendorDeliveryFee: vendorData.deliveryFee || 300,
          vendorAddress: vendorData.address || 'Address not set',
          
          // Include all original data AFTER mapped fields so it doesn't override
          ...productData,
          // Re-apply critical mapped fields to ensure they override raw data
          price: productData.price || productData.basePrice || 0,
          available: productData.available !== undefined ? productData.available : 
                    (productData.isAvailable !== undefined ? productData.isAvailable : true)
        };
        
        console.log(`  │  ├─ ${standardProduct.name} (₦${standardProduct.price}, ${standardProduct.available ? 'available' : 'unavailable'})`);
        products.push(standardProduct);
      });
    }

    // Sort by creation date (newest first)
    products.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.updatedAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || b.updatedAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    console.log(`✅ TOTAL LOADED: ${products.length} products from ${vendorsSnap.size} vendors`);
    
    if (products.length === 0) {
      console.warn('⚠️ NO PRODUCTS FOUND! Make sure products exist at: vendors/{vendorId}/products/');
    }
    
    return products;
    
  } catch (error) {
    console.error('❌ Error fetching all products:', error);
    throw error;
  }
}

/**
 * Fetch products for a specific vendor
 * Path: vendors/{vendorId}/products
 * @param {string} vendorId - Vendor's ID
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Array of products
 */
export async function fetchVendorProducts(vendorId, options = {}) {
  try {
    console.log(`📦 Fetching products for vendor: ${vendorId}`);
    
    const prodRef = collection(db, 'vendors', vendorId, 'products');
    let q = prodRef;
    
    // Apply filters
    const constraints = [];
    
    if (options.category && options.category !== 'all') {
      constraints.push(where('category', '==', options.category));
    }
    
    if (options.available !== undefined) {
      constraints.push(where('available', '==', options.available));
    }
    
    if (options.orderBy) {
      constraints.push(orderBy(options.orderBy, options.orderDirection || 'desc'));
    }
    
    if (options.limit) {
      constraints.push(limit(options.limit));
    }
    
    if (constraints.length > 0) {
      q = query(prodRef, ...constraints);
    }
    
    // Get vendor details for embedding
    const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
    const vendorData = vendorDoc.data();
    
    const prodSnap = await getDocs(q);
    const products = prodSnap.docs.map(docSnap => {
      const productData = docSnap.data();
      return {
        id: docSnap.id,
        productId: docSnap.id,
        vendorId: vendorId,
        
        // Standard V2 fields with fallbacks
        name: productData.name || productData.productName || 'Unnamed Product',
        description: productData.description || productData.desc || productData.details || '',
        price: productData.price || productData.basePrice || 0,
        imageUrl: productData.imageUrl || productData.image || productData.photo || '',
        available: productData.available !== undefined ? productData.available : 
                  (productData.isAvailable !== undefined ? productData.isAvailable : true),
        category: productData.category || 'Main',
        
        // Measurement fields
        measurementType: productData.measurementType || productData.unitType,
        minQty: productData.minQty || 1,
        maxQty: productData.maxQty || 100,
        
        // Embed vendor info
        vendorName: vendorData?.businessName || vendorData?.name || vendorData?.storeName || 'Vendor',
        vendorLogo: vendorData?.businessLogo || vendorData?.profileImage || '',
        vendorRating: vendorData?.rating || 4.5,
        vendorDeliveryTime: vendorData?.deliveryTime || '20-30 min',
        vendorDeliveryFee: vendorData?.deliveryFee || 300,
        
        // Include all original data
        ...productData,
        // Re-apply mapped fields to ensure they override
        price: productData.price || productData.basePrice || 0,
        available: productData.available !== undefined ? productData.available : 
                  (productData.isAvailable !== undefined ? productData.isAvailable : true)
      };
    });

    console.log(`✅ Loaded ${products.length} products for vendor ${vendorId}`);
    return products;
    
  } catch (error) {
    console.error(`❌ Error fetching vendor products:`, error);
    throw error;
  }
}

/**
 * Fetch category-level addons
 * Path: vendors/{vendorId}/categories/{categoryId}/addons
 * @param {string} vendorId - Vendor's ID
 * @param {string} categoryId - Category's ID
 * @returns {Promise<Array>} Array of category addons
 */
export async function fetchCategoryAddons(vendorId, categoryId) {
  try {
    if (!categoryId) return [];
    
    console.log(`📁 Fetching category addons for category: ${categoryId}`);
    
    const addonsRef = collection(db, 'vendors', vendorId, 'categories', categoryId, 'addons');
    const snap = await getDocs(addonsRef);
    
    const addons = snap.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unnamed Addon',
          price: data.price || 0,
          imageUrl: data.imageUrl || '',
          available: data.available !== undefined ? data.available : true,
          minQty: data.minQty || 0,
          maxQty: data.maxQty || 10,
          source: 'category',
          ...data
        };
      })
      .filter(addon => addon.available);

    console.log(`✅ Loaded ${addons.length} category addons`);
    return addons;
    
  } catch (error) {
    console.error(`❌ Error fetching category addons:`, error);
    return [];
  }
}

/**
 * Fetch product-level addons
 * Path: vendors/{vendorId}/products/{productId}/addons
 * @param {string} vendorId - Vendor's ID
 * @param {string} productId - Product's ID
 * @returns {Promise<Array>} Array of product addons
 */
export async function fetchProductAddons(vendorId, productId) {
  try {
    console.log(`🍔 Fetching product addons for product: ${productId}`);
    
    const addonsRef = collection(db, 'vendors', vendorId, 'products', productId, 'addons');
    const snap = await getDocs(addonsRef);
    
    const addons = snap.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || data.addonName || 'Unnamed Addon',
          price: data.price || data.addonPrice || 0,
          imageUrl: data.imageUrl || data.addonImageUrl || data.image || '',
          available: data.available !== undefined ? data.available : 
                    (data.isAvailable !== undefined ? data.isAvailable : true),
          minQty: data.minQty || 0,
          maxQty: data.maxQty || 10,
          source: 'product',
          ...data
        };
      })
      .filter(addon => addon.available);

    console.log(`✅ Loaded ${addons.length} product addons`);
    return addons;
    
  } catch (error) {
    console.error(`❌ Error fetching product addons:`, error);
    return [];
  }
}

/**
 * Fetch ALL addons (category + product) for a product
 * Merges category and product addons based on inheritAddons setting
 * @param {string} vendorId - Vendor's ID
 * @param {string} productId - Product's ID
 * @param {string} categoryId - Category's ID
 * @param {string} inheritAddons - "all" | "product-only"
 * @returns {Promise<Array>} Merged array of addons
 */
export async function fetchAddons(vendorId, productId, categoryId = null, inheritAddons = 'product-only') {
  try {
    console.log(`🔍 Fetching addons - Product: ${productId}, Category: ${categoryId}, Inherit: ${inheritAddons}`);
    
    // Always fetch product addons
    const productAddons = await fetchProductAddons(vendorId, productId);
    
    // Fetch category addons only if inheritAddons === "all"
    let categoryAddons = [];
    if (inheritAddons === 'all' && categoryId) {
      categoryAddons = await fetchCategoryAddons(vendorId, categoryId);
    }
    
    // Merge: category addons first, then product addons
    const mergedAddons = [...categoryAddons, ...productAddons];
    
    console.log(`✅ Total addons: ${mergedAddons.length} (${categoryAddons.length} category + ${productAddons.length} product)`);
    return mergedAddons;
    
  } catch (error) {
    console.error(`❌ Error fetching merged addons:`, error);
    return [];
  }
}

/**
 * Fetch vendor details
 * Path: vendors/{vendorId}
 * @param {string} vendorId - Vendor's ID
 * @returns {Promise<Object>} Vendor data
 */
export async function fetchVendorDetails(vendorId) {
  try {
    console.log(`🏪 Fetching vendor details: ${vendorId}`);
    
    const vendorRef = doc(db, 'vendors', vendorId);
    const vendorSnap = await getDoc(vendorRef);
    
    if (!vendorSnap.exists()) {
      throw new Error('Vendor not found');
    }

    const vendorData = {
      id: vendorSnap.id,
      ...vendorSnap.data()
    };

    console.log(`✅ Loaded vendor: ${vendorData.businessName || vendorData.name}`);
    return vendorData;
    
  } catch (error) {
    console.error(`❌ Error fetching vendor details:`, error);
    throw error;
  }
}

/**
 * Real-time listener for all products
 * @param {Function} callback - Callback function to receive products
 * @param {Object} options - Filter options
 * @returns {Function} Unsubscribe function
 */
export function subscribeToAllProducts(callback, options = {}) {
  console.log('🔄 Setting up real-time listener for all products...');
  
  // Note: This is complex with nested collections, so we'll poll instead
  // For real-time updates, consider using Cloud Functions to sync to a flat collection
  
  const fetchAndNotify = async () => {
    const products = await fetchAllProducts(options);
    callback(products);
  };
  
  fetchAndNotify();
  
  // Poll every 30 seconds for updates
  const interval = setInterval(fetchAndNotify, 30000);
  
  return () => clearInterval(interval);
}

/**
 * Real-time listener for vendor products
 * @param {string} vendorId - Vendor's ID
 * @param {Function} callback - Callback function to receive products
 * @param {Object} options - Filter options
 * @returns {Function} Unsubscribe function
 */
export async function subscribeToVendorProducts(vendorId, callback, options = {}) {
  console.log(`🔄 Setting up real-time listener for vendor ${vendorId} products...`);
  
  // First, fetch vendor details for embedding
  const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
  const vendorData = vendorDoc.data();
  
  const prodRef = collection(db, 'vendors', vendorId, 'products');
  let q = prodRef;
  
  const constraints = [];
  
  // Apply filters
  if (options.category && options.category !== 'all') {
    constraints.push(where('category', '==', options.category));
  }
  
  if (options.available !== undefined) {
    // Check isAvailable field (dashboard V2 uses this)
    constraints.push(where('isAvailable', '==', options.available));
  }
  
  if (constraints.length > 0) {
    q = query(prodRef, ...constraints);
  }
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(docSnap => {
      const productData = docSnap.data();
      
      const mappedPrice = productData.price || productData.basePrice || 0;
      
      // Map fields just like fetchAllProducts does
      const product = {
        id: docSnap.id,
        productId: docSnap.id,
        vendorId: vendorId,
        
        // Standard V2 fields with fallbacks
        name: productData.name || productData.productName || 'Unnamed Product',
        description: productData.description || productData.desc || productData.details || '',
        price: mappedPrice,
        imageUrl: productData.imageUrl || productData.image || productData.photo || '',
        available: productData.available !== undefined ? productData.available : 
                  (productData.isAvailable !== undefined ? productData.isAvailable : true),
        category: productData.category || 'Main',
        
        // Measurement fields
        measurementType: productData.measurementType || productData.unitType,
        minQty: productData.minQty || 1,
        maxQty: productData.maxQty || 100,
        
        // Embed vendor info
        vendorName: vendorData?.businessName || vendorData?.name || vendorData?.storeName || 'Vendor',
        vendorLogo: vendorData?.businessLogo || vendorData?.profileImage || '',
        vendorRating: vendorData?.rating || 4.5,
        vendorDeliveryTime: vendorData?.deliveryTime || '20-30 min',
        vendorDeliveryFee: vendorData?.deliveryFee || 300,
        
        // Include all original data
        ...productData,
        // FORCE override mapped fields (these must come last!)
        price: mappedPrice,
        available: productData.available !== undefined ? productData.available : 
                  (productData.isAvailable !== undefined ? productData.isAvailable : true)
      };
      
      console.log(`📦 Product mapped:`, {
        name: product.name,
        price: product.price,
        basePrice: product.basePrice,
        rawPrice: productData.price,
        rawBasePrice: productData.basePrice
      });
      
      return product;
    });
    
    console.log(`✅ Real-time update: ${products.length} products for vendor ${vendorId}`);
    callback(products);
  }, (error) => {
    console.error('❌ Real-time listener error:', error);
    callback([]); // Return empty array on error
  });
  
  return unsubscribe;
}

/**
 * Get trending products (by rating or order count)
 * @param {number} limitCount - Number of products to return
 * @returns {Promise<Array>} Array of trending products
 */
export async function fetchTrendingProducts(limitCount = 10) {
  try {
    console.log('🔥 Fetching trending products...');
    
    const allProducts = await fetchAllProducts({ available: true });
    
    // Sort by rating and order count
    const trending = allProducts
      .filter(p => p.available)
      .sort((a, b) => {
        const aScore = (a.rating || 0) * 10 + (a.orderCount || 0);
        const bScore = (b.rating || 0) * 10 + (b.orderCount || 0);
        return bScore - aScore;
      })
      .slice(0, limitCount);

    console.log(`✅ Loaded ${trending.length} trending products`);
    return trending;
    
  } catch (error) {
    console.error('❌ Error fetching trending products:', error);
    return [];
  }
}

/**
 * Get recommended products (random or category-based)
 * @param {string} category - Optional category filter
 * @param {number} limitCount - Number of products to return
 * @returns {Promise<Array>} Array of recommended products
 */
export async function fetchRecommendedProducts(category = null, limitCount = 10) {
  try {
    console.log('💡 Fetching recommended products...');
    
    const options = { available: true };
    if (category) {
      options.category = category;
    }
    
    const allProducts = await fetchAllProducts(options);
    
    // Shuffle and limit
    const shuffled = allProducts
      .filter(p => p.available)
      .sort(() => Math.random() - 0.5)
      .slice(0, limitCount);

    console.log(`✅ Loaded ${shuffled.length} recommended products`);
    return shuffled;
    
  } catch (error) {
    console.error('❌ Error fetching recommended products:', error);
    return [];
  }
}

/**
 * Get products by category for a specific vendor
 * @param {string} vendorId 
 * @param {string} categoryId 
 * @returns {Promise<Array>}
 */
export async function getProductsByCategory(vendorId, categoryId) {
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
}
