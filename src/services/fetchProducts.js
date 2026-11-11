// 🔥 GO7 PRODUCT FETCHING SERVICE - V2 CANONICAL
// Centralized product fetching for Explore, Trending, ForYou
// Uses ONLY vendors/{vendorId}/products (NO legacy menu)

import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * FIRESTORE INDEX REQUIREMENTS:
 * 
 * For optimal performance, create these composite indexes:
 * 
 * 1. products_v2 Collection:
 *    - Fields: active ASC, popularityScore DESC, createdAt DESC
 *    - Query scope: Collection
 * 
 * 2. vendors/{vendorId}/products Subcollection:
 *    - Fields: active ASC, popularityScore DESC
 *    - Query scope: Collection group
 * 
 * 3. vendors/{vendorId}/products/{productId}/addons Subcollection:
 *    - Fields: isActive ASC, createdAt DESC
 *    - Query scope: Collection group
 * 
 * To create indexes, run queries in Firebase Console or use these links
 * that Firebase will provide in error messages.
 */

// Measurement type constants
export const MEASURE_TYPES = {
  PER_UNIT: 'per_unit',
  PER_TUBER: 'per_tuber',
  PER_BUNCH: 'per_bunch',
  PER_PACK: 'per_pack',
  KG: 'kg',
  PORTION: 'portion',
  BAG: 'bag'
};

export const MEASURE_LABELS = {
  per_unit: 'unit',
  per_tuber: 'tuber',
  per_bunch: 'bunch',
  per_pack: 'pack',
  kg: 'kg',
  portion: 'portion',
  bag: 'bag'
};

/**
 * Format quantity with appropriate measurement label
 * @param {number} qty - Quantity
 * @param {string} measureType - Measurement type
 * @returns {string} Formatted quantity string
 */
export const formatQuantity = (qty, measureType) => {
  const label = MEASURE_LABELS[measureType] || measureType;
  
  // For tubers, bunches, packs - use plural forms
  if (['per_tuber', 'per_bunch', 'per_pack', 'bag'].includes(measureType)) {
    const pluralLabel = qty === 1 ? label : `${label}s`;
    return `${qty} ${pluralLabel}`;
  }
  
  // For kg - allow decimals
  if (measureType === 'kg') {
    return `${qty}kg`;
  }
  
  // For unit, portion - simple format
  return `${qty} ${label}${qty > 1 ? 's' : ''}`;
};

/**
 * Fetch all active products for Explore page
 * Fetches from vendors/{vendorId}/products for ALL vendors
 * 
 * @param {string} category - Category filter ('all' or specific category)
 * @param {number} limitCount - Maximum number of products to return
 * @returns {Promise<Array>} Array of products with vendor info
 */
export const fetchExploreProducts = async (category = 'all', limitCount = 20) => {
  try {
    console.log('🔍 Fetching Explore products from V2 structure');
    
    // Get all vendors
    const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
    
    if (vendorsSnapshot.empty) {
      console.log('⚠️ No vendors found');
      return [];
    }

    let allProducts = [];
    
    // Fetch products from each vendor's subcollection
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorData = { id: vendorDoc.id, ...vendorDoc.data() };
      
      try {
        // V2 PATH ONLY: vendors/{vendorId}/products
        const productsRef = collection(db, 'vendors', vendorData.id, 'products');
        let productsQuery = query(productsRef);
        
        // Add category filter if specified
        if (category !== 'all') {
          productsQuery = query(
            productsRef,
            where('category', '==', category)
          );
        }
        
        const productsSnapshot = await getDocs(productsQuery);
        
        // Transform products with vendor info and measurement support
        const vendorProducts = productsSnapshot.docs
          .filter(doc => {
            const data = doc.data();
            // Support both 'active' and 'isActive' fields
            return data.active !== false && data.isActive !== false;
          })
          .map(productDoc => {
            const productData = productDoc.data();
            const measureType = productData.measureType || productData.measurement || MEASURE_TYPES.PER_UNIT;
            
            return {
              id: productDoc.id,
              productId: productDoc.id,
              name: productData.name || 'Unnamed Product',
              description: productData.description || '',
              price: productData.price || 0,
              imageUrl: productData.imageUrl || '/placeholder-product.png',
              category: productData.category || 'food',
              measureType: measureType,
              measureLabel: MEASURE_LABELS[measureType] || measureType,
              rating: productData.rating || 4.5,
              popularityScore: productData.popularityScore || 0,
              
              // Vendor information
              vendorId: vendorData.id,
              vendorName: vendorData.businessName || vendorData.name || vendorData.email?.split('@')[0] || 'Unknown Vendor',
              
              // Vendor object for ProductModal
              vendor: {
                id: vendorData.id,
                name: vendorData.businessName || vendorData.name || vendorData.email?.split('@')[0] || 'Unknown Vendor',
                rating: vendorData.rating || 4.8,
                deliveryTime: vendorData.deliveryTime || '25-35 mins',
                profileImage: vendorData.profileImage || vendorData.businessLogo,
                isOnline: vendorData.isOnline !== false
              }
            };
          });
        
        allProducts = [...allProducts, ...vendorProducts];
        
      } catch (vendorError) {
        console.warn(`⚠️ Error fetching products for vendor ${vendorData.id}:`, vendorError);
      }
    }
    
    // Sort by popularity and limit results
    allProducts.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    
    console.log(`✅ Explore: Loaded ${allProducts.length} products`);
    
    return allProducts.slice(0, limitCount);
    
  } catch (error) {
    console.error('❌ Error fetching explore products:', error);
    throw error;
  }
};

/**
 * Fetch trending products (top by popularity score)
 * 
 * @param {number} limitCount - Number of trending products (default: 8)
 * @returns {Promise<Array>} Top trending products
 */
export const fetchTrendingProducts = async (limitCount = 8) => {
  try {
    console.log('📈 Fetching Trending products');
    
    // Get all products and sort by popularityScore
    const allProducts = await fetchExploreProducts('all', 50);
    
    // Return top products by popularity
    const trending = allProducts
      .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
      .slice(0, limitCount);
    
    console.log(`✅ Trending: Loaded ${trending.length} products`);
    
    return trending;
    
  } catch (error) {
    console.error('❌ Error fetching trending products:', error);
    throw error;
  }
};

/**
 * Fetch For You products (personalized/local popular products)
 * Currently returns products sorted by rating and recency
 * 
 * @param {number} limitCount - Number of products (default: 8)
 * @returns {Promise<Array>} For You products
 */
export const fetchForYouProducts = async (limitCount = 8) => {
  try {
    console.log('💝 Fetching For You products');
    
    // Get all products
    const allProducts = await fetchExploreProducts('all', 50);
    
    // Sort by rating and recency (you can customize this logic)
    const forYou = allProducts
      .sort((a, b) => {
        // Primary: rating
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        // Secondary: popularity
        return (b.popularityScore || 0) - (a.popularityScore || 0);
      })
      .slice(0, limitCount);
    
    console.log(`✅ For You: Loaded ${forYou.length} products`);
    
    return forYou;
    
  } catch (error) {
    console.error('❌ Error fetching for you products:', error);
    throw error;
  }
};

/**
 * Fetch product addons with image support
 * Fetches from vendors/{vendorId}/products/{productId}/addons
 * 
 * @param {string} vendorId - Vendor ID
 * @param {string} productId - Product ID
 * @returns {Promise<Array>} Array of addons with measurement support
 */
export const fetchProductAddons = async (vendorId, productId) => {
  try {
    console.log(`🧩 Fetching addons for product ${productId}`);
    
    // V2 PATH: vendors/{vendorId}/products/{productId}/addons
    const addonsRef = collection(db, 'vendors', vendorId, 'products', productId, 'addons');
    const addonsQuery = query(
      addonsRef,
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    
    const addonsSnapshot = await getDocs(addonsQuery);
    
    const addons = addonsSnapshot.docs.map(doc => {
      const addonData = doc.data();
      const measureType = addonData.measureType || MEASURE_TYPES.PER_UNIT;
      
      return {
        id: doc.id,
        name: addonData.name || 'Unnamed Addon',
        price: addonData.price || 0,
        imageUrl: addonData.imageUrl || null, // Support addon images
        description: addonData.description || '',
        category: addonData.category || '',
        measureType: measureType,
        measureLabel: MEASURE_LABELS[measureType] || measureType,
        minQty: addonData.minQty || 1,
        maxQty: addonData.maxQty || 10,
        isActive: addonData.isActive !== false
      };
    });
    
    console.log(`✅ Loaded ${addons.length} addons for product ${productId}`);
    
    return addons;
    
  } catch (error) {
    console.error(`❌ Error fetching addons for product ${productId}:`, error);
    return []; // Return empty array instead of throwing
  }
};

export default {
  fetchExploreProducts,
  fetchTrendingProducts,
  fetchForYouProducts,
  fetchProductAddons,
  formatQuantity,
  MEASURE_TYPES,
  MEASURE_LABELS
};
