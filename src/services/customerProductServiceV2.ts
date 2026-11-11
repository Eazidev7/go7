/**
 * 🛍️ CUSTOMER PRODUCT SERVICE V2
 * 
 * Handles customer-facing product operations using V2 data structure
 * Path: /vendors/{vendorId}/products/{productId}
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { V2Product, V2Addon, getAddonsFromSubcollection } from '../services/productServiceV2';
import {
  isVendorPubliclyVisible,
  isProductCustomerVisible,
  toVendorListingInfo,
  vendorMatchesCategory,
} from '../utils/vendorVisibility';
import { resolveVendorImage } from '../utils/vendorImage';
import { toJsDate } from '../utils/firestoreDate';

export interface VendorInfo {
  id: string;
  name: string;
  profileImage: string | null;
  image?: string | null;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  isOnline: boolean;
  categories: string[];
  featured?: boolean;
  trending?: boolean;
  trendingOrder?: number;
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface CustomerProduct extends V2Product {
  vendor: VendorInfo;
}

function vendorCreatedAtMs(vendorData: Record<string, unknown>): number {
  const createdAt = vendorData.createdAt as { toMillis?: () => number; seconds?: number } | undefined;
  return createdAt?.toMillis?.() || createdAt?.seconds || 0;
}

/** Admin-approved live vendors rank above legacy seeded marketplace entries. */
function vendorDiscoveryPriority(vendorData: Record<string, unknown>): number {
  let score = 0;
  if (vendorData.status === 'approved' || vendorData.approved === true) score += 100;
  if (vendorData.isLive === true) score += 50;
  if (vendorData.canReceiveOrders === true) score += 25;
  if (vendorData.registrationComplete === true) score += 10;
  return score;
}

/** Reuse one vendors query across Home sections (90s TTL). Cuts reads without long stale online status. */
const VENDOR_LIST_TTL_MS = 90 * 1000;
let vendorDocsCache: {
  at: number;
  docs: Array<{ id: string; data: () => Record<string, unknown> }>;
} | null = null;

async function getAllVendorDocs() {
  const now = Date.now();
  if (vendorDocsCache && now - vendorDocsCache.at < VENDOR_LIST_TTL_MS) {
    return vendorDocsCache.docs;
  }
  const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
  vendorDocsCache = {
    at: now,
    docs: vendorsSnapshot.docs as Array<{ id: string; data: () => Record<string, unknown> }>,
  };
  return vendorDocsCache.docs;
}

/** Call after admin vendor publish if you need instant refresh (optional). */
export function clearVendorListCache() {
  vendorDocsCache = null;
}

function toTrendingVendorInfo(vendorDoc: { id: string; data: () => Record<string, unknown> }): VendorInfo {
  const listing = toVendorListingInfo(vendorDoc);
  // Always resolve from all logo fields — empty profileImage must not hide businessLogo.
  const image = resolveVendorImage(listing);
  return {
    id: listing.id,
    name: listing.name,
    profileImage: image,
    image,
    rating: listing.rating,
    deliveryTime: listing.deliveryTime,
    deliveryFee: listing.deliveryFee,
    isOnline: listing.isOnline,
    categories: listing.categories,
    featured: listing.featured === true,
    trending: listing.trending === true,
    trendingOrder: typeof listing.trendingOrder === 'number' ? listing.trendingOrder : undefined,
    location: listing.location,
  };
}

async function vendorHasActiveProducts(vendorId: string): Promise<boolean> {
  // Cap reads — one visible product is enough to mark a vendor discoverable.
  const productsQuery = query(
    collection(db, 'vendors', vendorId, 'products'),
    limit(3)
  );
  const productsSnapshot = await getDocs(productsQuery);
  return productsSnapshot.docs.some((docSnap) => isProductCustomerVisible(docSnap.data()));
}

async function isVendorDiscoverable(vendorDoc: { id: string; data: () => Record<string, unknown> }): Promise<boolean> {
  const vendorData = { ...vendorDoc.data(), id: vendorDoc.id };
  // Hard allowlist only — no legacy/product bypass (hides unapproved image-less shops).
  if (!isVendorPubliclyVisible(vendorData, vendorDoc.id)) {
    return false;
  }

  return vendorHasActiveProducts(vendorDoc.id);
}

/** Discover many vendors in parallel instead of awaiting one-by-one on mobile. */
async function pickDiscoverableVendors(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
  limitCount: number,
  categoryValue?: string | null
): Promise<VendorInfo[]> {
  const OVERSCAN = Math.max(limitCount * 4, 24);
  const ranked = [...docs].sort((a, b) => {
    const priorityDiff = vendorDiscoveryPriority(b.data()) - vendorDiscoveryPriority(a.data());
    if (priorityDiff !== 0) return priorityDiff;
    return 0;
  });
  const withImage: typeof docs = [];
  const withoutImage: typeof docs = [];

  for (const vendorDoc of ranked) {
    const listing = toVendorListingInfo(vendorDoc);
    if (categoryValue && !vendorMatchesCategory(listing, categoryValue)) continue;

    // Home carousels hide image-less vendors — check logo-ready ones first (faster + correct).
    if (resolveVendorImage(listing)) withImage.push(vendorDoc);
    else withoutImage.push(vendorDoc);
  }

  const candidates = [...withImage, ...withoutImage].slice(0, OVERSCAN);

  const checked = await Promise.all(
    candidates.map(async (vendorDoc) => {
      const visible = await isVendorDiscoverable(vendorDoc);
      return visible ? toTrendingVendorInfo(vendorDoc) : null;
    })
  );

  return checked.filter((v): v is VendorInfo => Boolean(v)).slice(0, limitCount);
}

function sortTrendingCandidates(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>
) {
  return [...docs].sort((a, b) => {
    const aData = a.data();
    const bData = b.data();
    const aFeatured = aData.featured === true || aData.trending === true;
    const bFeatured = bData.featured === true || bData.trending === true;

    if (aFeatured !== bFeatured) {
      return aFeatured ? -1 : 1;
    }

    const aPriority = vendorDiscoveryPriority(aData);
    const bPriority = vendorDiscoveryPriority(bData);
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    if (aFeatured && bFeatured) {
      const aOrder = typeof aData.trendingOrder === 'number' ? aData.trendingOrder : 9999;
      const bOrder = typeof bData.trendingOrder === 'number' ? bData.trendingOrder : 9999;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
    }

    const aRating = typeof aData.rating === 'number' ? aData.rating : 0;
    const bRating = typeof bData.rating === 'number' ? bData.rating : 0;
    if (aRating !== bRating) {
      return bRating - aRating;
    }

    return vendorCreatedAtMs(bData) - vendorCreatedAtMs(aData);
  });
}

/**
 * Get trending vendors — admin-flagged first (featured/trending + trendingOrder), then other live vendors.
 */
export const getTrendingVendors = async (
  limitCount: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ vendors: VendorInfo[], lastDoc: DocumentSnapshot | null }> => {
  try {
    const sortedDocs = sortTrendingCandidates(await getAllVendorDocs());
    const vendors = await pickDiscoverableVendors(sortedDocs, limitCount);

    const allDocs = await getAllVendorDocs();
    const lastDocument = allDocs.length > 0 ? allDocs[allDocs.length - 1] : null;

    return { vendors, lastDoc: lastDocument as DocumentSnapshot | null };
  } catch (error) {
    console.error('Error fetching trending vendors:', error);
    throw error;
  }
};

/**
 * Get live vendors for explore / category sections (must have active menu items).
 */
export const getExploreVendors = async (
  categoryValue: string | null = null,
  limitCount: number = 50
): Promise<VendorInfo[]> => {
  try {
    const normalizedCategory =
      !categoryValue || categoryValue === 'All' ? null : categoryValue.toLowerCase();

    const categoryMap: Record<string, string> = {
      restaurants: 'restaurant',
      pharmacies: 'pharmacy',
      groceries: 'groceries',
      bakeries: 'restaurant',
      drinks: 'shops',
    };

    const mappedCategory = normalizedCategory
      ? categoryMap[normalizedCategory] || normalizedCategory
      : null;

    const vendors = mappedCategory
      ? await getVendorsByCategory(mappedCategory, limitCount)
      : await pickDiscoverableVendors(sortTrendingCandidates(await getAllVendorDocs()), limitCount);
    const categoryLabels: Record<string, string> = {
      food: 'Restaurants',
      restaurant: 'Restaurants',
      restaurants: 'Restaurants',
      pharmacy: 'Pharmacies',
      pharmacies: 'Pharmacies',
      grocery: 'Groceries',
      groceries: 'Groceries',
      supermarket: 'Groceries',
      market: 'Groceries',
      bakery: 'Bakeries',
      bakeries: 'Bakeries',
      drink: 'Drinks',
      drinks: 'Drinks',
    };
    return vendors.map(vendor => ({
      ...vendor,
      categories: [...new Set(vendor.categories.map(category => {
        const value = category.trim();
        return categoryLabels[value.toLowerCase()] || value;
      }))],
    }));
  } catch (error) {
    console.error('Error fetching explore vendors:', error);
    throw error;
  }
};

/**
 * Get live vendors for a homepage category section (pharmacy, groceries, etc.).
 */
export const getVendorsByCategory = async (
  categoryValue: string,
  limitCount: number = 8
): Promise<VendorInfo[]> => {
  try {
    const sortedDocs = sortTrendingCandidates(await getAllVendorDocs());
    return pickDiscoverableVendors(sortedDocs, limitCount, categoryValue);
  } catch (error) {
    console.error('Error fetching vendors by category:', error);
    throw error;
  }
};

/**
 * Get vendor details with product count
 */
export const getVendorWithProducts = async (vendorId: string): Promise<VendorInfo | null> => {
  try {
    const vendorRef = doc(db, 'vendors', vendorId);
    const vendorSnapshot = await getDoc(vendorRef);

    if (!vendorSnapshot.exists()) {
      return null;
    }

    const vendorData = vendorSnapshot.data();
    const listing = toVendorListingInfo({ id: vendorSnapshot.id, data: () => vendorData });
    const image = resolveVendorImage(listing);

    return {
      id: vendorSnapshot.id,
      name: listing.name || 'Unknown Vendor',
      profileImage: image,
      image,
      rating: listing.rating || 4.5,
      deliveryTime: listing.deliveryTime || '30-45 mins',
      deliveryFee: listing.deliveryFee || 200,
      isOnline: listing.isOnline !== false,
      categories: listing.categories || ['food'],
      location: {
        address: listing.location?.address || 'Location not set',
        coordinates: listing.location?.coordinates || { latitude: 0, longitude: 0 }
      }
    };
  } catch (error) {
    console.error('Error fetching vendor:', error);
    throw error;
  }
};

/**
 * Get all products for a vendor (customer view)
 */
export const getVendorProductsForCustomer = async (
  vendorId: string,
  category?: string,
  limitCount: number = 50
): Promise<V2Product[]> => {
  try {
    const productsRef = collection(db, 'vendors', vendorId, 'products');
    
    let productsQuery = query(
      productsRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    // Filter by category if provided
    if (category && category !== 'all') {
      productsQuery = query(
        productsRef,
        where('category', '==', category),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    const snapshot = await getDocs(productsQuery);
    
    // Load products with their addons from subcollection
    const productsWithAddons = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const productData = {
          id: doc.id,
          ...doc.data(),
          createdAt: toJsDate(doc.data().createdAt),
          updatedAt: toJsDate(doc.data().updatedAt)
        } as V2Product;
        
        // Load addons from subcollection
        try {
          const addons = await getAddonsFromSubcollection(vendorId, doc.id);
          productData.addons = addons.length > 0 ? addons : (productData.addons || []);
        } catch (addonError) {
          console.warn(`Failed to load addons for product ${doc.id}:`, addonError);
          productData.addons = productData.addons || [];
        }
        
        return productData;
      })
    );
    
    return productsWithAddons;
  } catch (error) {
    console.error('Error fetching vendor products for customer:', error);
    throw error;
  }
};

/**
 * Get a single product with vendor info (for product detail page)
 */
export const getProductWithVendor = async (
  vendorId: string, 
  productId: string
): Promise<CustomerProduct | null> => {
  try {
    // Get product
    const productRef = doc(db, 'vendors', vendorId, 'products', productId);
    const productSnapshot = await getDoc(productRef);

    if (!productSnapshot.exists()) {
      return null;
    }

    // Get vendor info
    const vendor = await getVendorWithProducts(vendorId);
    
    if (!vendor) {
      return null;
    }

    const productData = productSnapshot.data();

    return {
      id: productSnapshot.id,
      ...productData,
      createdAt: toJsDate(productData.createdAt),
      updatedAt: toJsDate(productData.updatedAt),
      vendor
    } as CustomerProduct;
  } catch (error) {
    console.error('Error fetching product with vendor:', error);
    throw error;
  }
};

/**
 * Search products across all vendors
 */
export const searchProductsGlobally = async (
  searchTerm: string,
  category?: string,
  limitCount: number = 50
): Promise<CustomerProduct[]> => {
  try {
    // Note: This is a simplified implementation
    // For production, consider using Algolia or ElasticSearch for better search
    
    const vendors = await getTrendingVendors(100); // Get more vendors for search
    const results: CustomerProduct[] = [];

    for (const vendor of vendors.vendors) {
      try {
        const products = await getVendorProductsForCustomer(vendor.id, category, 20);
        
        // Filter by search term
        const searchTermLower = searchTerm.toLowerCase();
        const matchingProducts = products.filter(product =>
          product.name.toLowerCase().includes(searchTermLower) ||
          product.description.toLowerCase().includes(searchTermLower) ||
          product.category.toLowerCase().includes(searchTermLower)
        );

        // Add vendor info to each product
        const productsWithVendor = matchingProducts.map(product => ({
          ...product,
          vendor
        }));

        results.push(...productsWithVendor);
      } catch (error) {
        console.error(`Error searching products for vendor ${vendor.id}:`, error);
        // Continue with other vendors
      }
    }

    // Sort by relevance (name matches first, then description)
    const searchTermLower = searchTerm.toLowerCase();
    results.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().includes(searchTermLower);
      const bNameMatch = b.name.toLowerCase().includes(searchTermLower);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      return 0;
    });

    return results.slice(0, limitCount);
  } catch (error) {
    console.error('Error searching products globally:', error);
    throw error;
  }
};

/**
 * Get popular products across all vendors
 */
export const getPopularProducts = async (
  limitCount: number = 20
): Promise<CustomerProduct[]> => {
  try {
    const vendors = await getTrendingVendors(50);
    const popularProducts: CustomerProduct[] = [];

    for (const vendor of vendors.vendors) {
      try {
        const products = await getVendorProductsForCustomer(vendor.id, undefined, 5);
        
        // Add vendor info and take first few products
        const productsWithVendor = products.slice(0, 3).map(product => ({
          ...product,
          vendor
        }));

        popularProducts.push(...productsWithVendor);
      } catch (error) {
        console.error(`Error fetching products for vendor ${vendor.id}:`, error);
      }
    }

    // Shuffle and limit
    const shuffled = popularProducts.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching popular products:', error);
    throw error;
  }
};

/**
 * Get products by category across all vendors
 */
export const getProductsByCategory = async (
  category: string,
  limitCount: number = 50
): Promise<CustomerProduct[]> => {
  try {
    const vendors = await getTrendingVendors(100);
    const categoryProducts: CustomerProduct[] = [];

    for (const vendor of vendors.vendors) {
      try {
        // Only get vendors that serve this category
        if (vendor.categories.includes(category) || category === 'all') {
          const products = await getVendorProductsForCustomer(vendor.id, category, 10);
          
          const productsWithVendor = products.map(product => ({
            ...product,
            vendor
          }));

          categoryProducts.push(...productsWithVendor);
        }
      } catch (error) {
        console.error(`Error fetching ${category} products for vendor ${vendor.id}:`, error);
      }
    }

    // Sort by creation date (newest first)
    categoryProducts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return categoryProducts.slice(0, limitCount);
  } catch (error) {
    console.error(`Error fetching products by category ${category}:`, error);
    throw error;
  }
};

/**
 * Check if vendor has V2 products
 */
export const vendorHasV2Products = async (vendorId: string): Promise<boolean> => {
  try {
    const productsRef = collection(db, 'vendors', vendorId, 'products');
    const q = query(productsRef, limit(1));
    const snapshot = await getDocs(q);
    
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking V2 products:', error);
    return false;
  }
};

export default {
  getTrendingVendors,
  getExploreVendors,
  getVendorsByCategory,
  getVendorWithProducts,
  getVendorProductsForCustomer,
  getProductWithVendor,
  searchProductsGlobally,
  getPopularProducts,
  getProductsByCategory,
  vendorHasV2Products
};