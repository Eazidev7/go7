// GO7 VENDOR GEO-RADIUS MATCHING MODULE
// -------------------------------------
// Automatically detects vendors within radius of pickup location in Abeokuta
// Integrates with Firebase Firestore for real-time vendor data

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";

// Configuration
const MAX_VENDOR_RADIUS_KM = 10; // Maximum distance to search for vendors
const TOP_VENDORS_LIMIT = 3; // Number of top vendors to return

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - First coordinate {lat, lng}
 * @param {Object} coord2 - Second coordinate {lat, lng}
 * @returns {number} Distance in kilometers
 */
function haversineDistance(coord1, coord2) {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(coord1.lat * Math.PI / 180) *
    Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find nearby vendors within radius of pickup location
 * @param {Object} pickupCoords - Pickup coordinates {lat, lng}
 * @param {number} maxRadius - Maximum search radius in km (default: 10km)
 * @returns {Promise<Object>} Result object with vendors array and metadata
 */
export async function findNearbyVendors(pickupCoords, maxRadius = MAX_VENDOR_RADIUS_KM) {
  console.log('🔍 Finding nearby vendors for pickup:', {
    lat: pickupCoords.lat,
    lng: pickupCoords.lng,
    maxRadius: `${maxRadius}km`
  });

  try {
    // Validate Firebase connection
    if (!db) {
      console.warn('⚠️ Firebase not initialized - vendor matching unavailable');
      return {
        success: false,
        vendors: [],
        message: "Database connection unavailable",
        error: "FIREBASE_NOT_INITIALIZED"
      };
    }

    // Query vendors collection
    const vendorRef = collection(db, "vendors");
    
    // Optional: Add status filter to only get active vendors
    const vendorQuery = query(vendorRef, where("status", "==", "active"));
    
    const querySnapshot = await getDocs(vendorQuery);

    console.log(`📦 Retrieved ${querySnapshot.size} vendors from database`);

    const vendors = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Validate vendor has coordinates
      if (data.latitude && data.longitude) {
        const distance = haversineDistance(
          pickupCoords,
          { lat: data.latitude, lng: data.longitude }
        );

        // Only include vendors within radius
        if (distance <= maxRadius) {
          vendors.push({
            id: doc.id,
            name: data.name || 'Unnamed Vendor',
            latitude: data.latitude,
            longitude: data.longitude,
            distance: distance,
            distanceFormatted: `${distance.toFixed(2)} km`,
            category: data.category || 'General',
            phone: data.phone || null,
            status: data.status || 'active',
            rating: data.rating || 0,
            address: data.address || null,
            // Include any additional vendor data
            ...data
          });
        }
      } else {
        console.warn(`⚠️ Vendor ${doc.id} missing coordinates - skipped`);
      }
    });

    // Check if any vendors found
    if (vendors.length === 0) {
      console.warn(`❌ No vendors found within ${maxRadius}km of pickup area`);
      return {
        success: false,
        vendors: [],
        message: `No vendors nearby within ${maxRadius}km`,
        searchRadius: maxRadius,
        pickupCoords: pickupCoords
      };
    }

    // Sort vendors by distance (closest first)
    const sortedVendors = vendors.sort((a, b) => a.distance - b.distance);

    // Get top vendors
    const topVendors = sortedVendors.slice(0, TOP_VENDORS_LIMIT);

    console.log(`✅ Found ${vendors.length} vendors, returning top ${topVendors.length}:`, 
      topVendors.map(v => `${v.name} (${v.distanceFormatted})`)
    );

    return {
      success: true,
      vendors: topVendors,
      allVendors: sortedVendors, // Include all vendors for reference
      totalVendorsFound: vendors.length,
      message: `${vendors.length} vendor${vendors.length !== 1 ? 's' : ''} found near pickup area`,
      searchRadius: maxRadius,
      pickupCoords: pickupCoords,
      closestVendor: topVendors[0]
    };

  } catch (error) {
    console.error('❌ Error finding nearby vendors:', error);
    return {
      success: false,
      vendors: [],
      message: "Vendor query failed",
      error: error.message,
      errorCode: error.code || 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Find vendors by category within radius
 * @param {Object} pickupCoords - Pickup coordinates {lat, lng}
 * @param {string} category - Vendor category (e.g., "Restaurant", "Market", "Pharmacy")
 * @param {number} maxRadius - Maximum search radius in km
 * @returns {Promise<Object>} Result object with filtered vendors
 */
export async function findVendorsByCategory(pickupCoords, category, maxRadius = MAX_VENDOR_RADIUS_KM) {
  console.log(`🔍 Finding ${category} vendors near pickup`);

  const result = await findNearbyVendors(pickupCoords, maxRadius);
  
  if (!result.success) {
    return result;
  }

  // Filter by category
  const categoryVendors = result.allVendors.filter(
    v => v.category && v.category.toLowerCase() === category.toLowerCase()
  );

  if (categoryVendors.length === 0) {
    return {
      success: false,
      vendors: [],
      message: `No ${category} vendors found nearby`,
      category: category
    };
  }

  return {
    success: true,
    vendors: categoryVendors.slice(0, TOP_VENDORS_LIMIT),
    allVendors: categoryVendors,
    totalVendorsFound: categoryVendors.length,
    message: `${categoryVendors.length} ${category} vendor${categoryVendors.length !== 1 ? 's' : ''} found`,
    category: category
  };
}

/**
 * Get vendor details by ID
 * @param {string} vendorId - Vendor document ID
 * @returns {Promise<Object>} Vendor details or error
 */
export async function getVendorById(vendorId) {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const vendorDoc = await getDocs(collection(db, "vendors"));
    const vendor = vendorDoc.docs.find(doc => doc.id === vendorId);

    if (!vendor) {
      return {
        success: false,
        message: 'Vendor not found',
        vendorId: vendorId
      };
    }

    return {
      success: true,
      vendor: {
        id: vendor.id,
        ...vendor.data()
      }
    };

  } catch (error) {
    console.error('Error fetching vendor:', error);
    return {
      success: false,
      message: 'Failed to fetch vendor details',
      error: error.message
    };
  }
}

// Export configuration for external use
export const VENDOR_MATCHING_CONFIG = {
  MAX_VENDOR_RADIUS_KM,
  TOP_VENDORS_LIMIT
};
