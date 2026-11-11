/**
 * 🔍 VENDOR VERIFICATION FILTER SERVICE
 * Ensures only phone-verified vendors appear in customer searches and receive orders
 */

import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  getDoc 
} from 'firebase/firestore';

/**
 * Get only verified vendors for customer display
 * @param {Object} filters - Search filters
 * @returns {Promise<Array>} Array of verified vendors
 */
export const getVerifiedVendors = async (filters = {}) => {
  try {
    const vendorsRef = collection(db, 'vendors');
    
    // Base query: ONLY verified vendors who can receive orders
    let vendorQuery = query(
      vendorsRef,
      where('phoneVerified', '==', true),
      where('canReceiveOrders', '==', true),
      where('accountStatus', '==', 'active'),
      where('mustVerifyPhone', '==', true) // Ensure they went through verification process
    );

    // Add additional filters
    if (filters.category) {
      vendorQuery = query(vendorQuery, where('categories', 'array-contains', filters.category.toLowerCase()));
    }

    if (filters.location) {
      // Add location-based filtering if needed
      // This would require geohash or similar spatial indexing
    }

    // Add ordering
    if (filters.sortBy === 'rating') {
      vendorQuery = query(vendorQuery, orderBy('rating', 'desc'));
    } else if (filters.sortBy === 'distance') {
      // Would need geospatial sorting
      vendorQuery = query(vendorQuery, orderBy('createdAt', 'desc'));
    } else {
      vendorQuery = query(vendorQuery, orderBy('lastSeen', 'desc')); // Most recently active first
    }

    // Apply limit
    if (filters.limit) {
      vendorQuery = query(vendorQuery, limit(filters.limit));
    }

    const snapshot = await getDocs(vendorQuery);
    
    const vendors = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      vendors.push({
        id: doc.id,
        vendorId: doc.id,
        ...data,
        // Ensure these fields are present for UI
        canReceiveOrders: data.canReceiveOrders || false,
        phoneVerified: data.phoneVerified || false,
        rating: data.rating || 4.5,
        deliveryTime: data.deliveryTime || '30-45 mins'
      });
    });

    console.log(`✅ Found ${vendors.length} verified vendors`);
    return vendors;

  } catch (error) {
    console.error('❌ Error fetching verified vendors:', error);
    return [];
  }
};

/**
 * Check if vendor can receive orders (verified and active)
 * @param {string} vendorId - Vendor ID to check
 * @returns {Promise<boolean>} Whether vendor can receive orders
 */
export const canVendorReceiveOrders = async (vendorId) => {
  try {
    const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
    
    if (!vendorDoc.exists()) {
      console.log('❌ Vendor not found:', vendorId);
      return false;
    }

    const vendor = vendorDoc.data();
    
    const canReceive = (
      vendor.phoneVerified === true &&
      vendor.canReceiveOrders === true &&
      vendor.accountStatus === 'active' &&
      vendor.mustVerifyPhone === true && // Must have gone through verification
      vendor.isActive !== false && // Account must be active
      vendor.isOnline !== false // Allow if undefined (backward compatibility)
    );

    console.log(`🔍 Vendor ${vendorId} can receive orders:`, canReceive);
    return canReceive;

  } catch (error) {
    console.error('❌ Error checking vendor order capability:', error);
    return false;
  }
};

/**
 * Get vendor verification status for dashboard
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<Object>} Verification status details
 */
export const getVendorVerificationStatus = async (vendorId) => {
  try {
    const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
    
    if (!vendorDoc.exists()) {
      return {
        exists: false,
        phoneVerified: false,
        canReceiveOrders: false,
        accountStatus: 'not_found'
      };
    }

    const vendor = vendorDoc.data();
    
    return {
      exists: true,
      phoneVerified: vendor.phoneVerified || false,
      canReceiveOrders: vendor.canReceiveOrders || false,
      accountStatus: vendor.accountStatus || 'pending_phone_verification',
      phoneVerificationRequired: vendor.phoneVerificationRequired || false,
      phone: vendor.phone,
      name: vendor.name || vendor.businessName,
      email: vendor.email
    };

  } catch (error) {
    console.error('❌ Error getting vendor verification status:', error);
    return {
      exists: false,
      phoneVerified: false,
      canReceiveOrders: false,
      accountStatus: 'error'
    };
  }
};

/**
 * Firestore security rule helper - gets vendor verification fields
 * Used in Firestore rules to check if vendor can create/modify orders
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<Object>} Verification fields for security rules
 */
export const getVendorSecurityFields = async (vendorId) => {
  try {
    const vendor = await getDoc(doc(db, 'vendors', vendorId));
    
    if (!vendor.exists()) {
      return { canReceiveOrders: false, phoneVerified: false };
    }

    const data = vendor.data();
    return {
      canReceiveOrders: data.canReceiveOrders || false,
      phoneVerified: data.phoneVerified || false,
      accountStatus: data.accountStatus || 'pending'
    };
    
  } catch (error) {
    console.error('❌ Error getting vendor security fields:', error);
    return { canReceiveOrders: false, phoneVerified: false };
  }
};

export default {
  getVerifiedVendors,
  canVendorReceiveOrders,
  getVendorVerificationStatus,
  getVendorSecurityFields
};