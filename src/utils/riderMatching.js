// GO7 SMART RIDER AUTO-DISPATCH SYSTEM
// -------------------------------------
// Automatically assigns nearest available rider within 5km of pickup location
// Integrates seamlessly with vendor matching system

import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { seedRiderTrackingForOrder } from "./publishRiderLocation";

/** Keep bookings + orders in sync (same doc id = booking code). */
async function syncBookingAndOrder(orderId, patch) {
  if (!orderId || !db) return;
  const payload = { ...patch, updatedAt: serverTimestamp() };
  const tasks = [setDoc(doc(db, "bookings", orderId), payload, { merge: true })];
  try {
    tasks.push(setDoc(doc(db, "orders", orderId), payload, { merge: true }));
  } catch (_) {
    /* orders mirror may require auth — bookings is source of truth for tracking */
  }
  const results = await Promise.allSettled(tasks);
  const bookingOk = results[0]?.status === "fulfilled";
  if (!bookingOk) {
    const err = results[0]?.reason;
    throw err || new Error("Failed to sync booking");
  }
}

function normalizePickupCoords(pickupCoords) {
  if (!pickupCoords) return null;
  const lat = pickupCoords.lat ?? pickupCoords.latitude;
  const lng = pickupCoords.lng ?? pickupCoords.longitude;
  if (lat == null || lng == null) return null;
  return { lat: Number(lat), lng: Number(lng) };
}

const BIKE_ALIASES = new Set(["bike", "motorcycle", "scooter", "rider", "motorbike", "motor"]);

function matchesVehiclePref(vehicleType, vehiclePref) {
  if (!vehiclePref) return true;
  const type = String(vehicleType || "bike").toLowerCase();
  const pref = String(vehiclePref).toLowerCase();
  if (type === pref) return true;
  if (pref === "bike" && BIKE_ALIASES.has(type)) return true;
  return false;
}

// Configuration
const MAX_RIDER_RADIUS_KM = 5; // Maximum distance to search for riders
const ACTIVE_WINDOW_MINUTES = 10; // Rider must be active within last 10 minutes

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
 * Calculate minutes elapsed since timestamp
 * @param {number} timestamp - Firestore timestamp in milliseconds
 * @returns {number} Minutes elapsed
 */
function minutesAgo(timestamp) {
  if (!timestamp) return Infinity;
  const diff = Date.now() - timestamp;
  return diff / 60000;
}

/**
 * Find nearest available rider within radius of pickup location
 * @param {Object} pickupCoords - Pickup coordinates {lat, lng}
 * @param {string} vehiclePref - Preferred vehicle type: "bike", "bicycle", "foot"
 * @returns {Promise<Object>} Result with rider details or error
 */
function collectNearbyRiders(querySnapshot, pickupCoords, { vehiclePref = null, maxActiveMinutes = ACTIVE_WINDOW_MINUTES } = {}) {
  const availableRiders = [];

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const isAvailable =
      data.status === "available" ||
      data.available === true ||
      (data.status === "online" && data.isAvailable !== false);
    if (!isAvailable) return;

    const lat = data.latitude ?? data.lat ?? data.currentLocation?.lat;
    const lng = data.longitude ?? data.lng ?? data.currentLocation?.lng;
    if (lat == null || lng == null) return;

    if (!matchesVehiclePref(data.vehicleType, vehiclePref)) return;

    const lastActiveTime = data.lastActive?.toMillis ? data.lastActive.toMillis() : data.lastActive;
    const minutesSinceActive = minutesAgo(lastActiveTime);
    if (maxActiveMinutes < Infinity && minutesSinceActive > maxActiveMinutes) return;

    const distance = haversineDistance(pickupCoords, { lat, lng });
    if (distance > MAX_RIDER_RADIUS_KM) return;

    availableRiders.push({
      id: docSnap.id,
      name: data.name || "Unnamed Rider",
      phone: data.phone || null,
      latitude: lat,
      longitude: lng,
      vehicleType: data.vehicleType || "bike",
      status: data.status,
      distance,
      distanceFormatted: `${distance.toFixed(2)} km`,
      lastActive: lastActiveTime,
      rating: data.rating || 0,
      completedDeliveries: data.completedDeliveries || 0,
      ...data,
    });
  });

  return availableRiders.sort((a, b) => a.distance - b.distance);
}

export async function findNearestRider(pickupCoords, vehiclePref = "bike") {
  const coords = normalizePickupCoords(pickupCoords);
  if (!coords) {
    return {
      success: false,
      rider: null,
      message: "Invalid pickup coordinates",
      error: "INVALID_PICKUP_COORDS",
    };
  }

  console.log("🚴 Finding nearest rider for pickup:", {
    lat: coords.lat,
    lng: coords.lng,
    vehicleType: vehiclePref,
    maxRadius: `${MAX_RIDER_RADIUS_KM}km`,
  });

  try {
    if (!db) {
      return {
        success: false,
        rider: null,
        message: "Database connection unavailable",
        error: "FIREBASE_NOT_INITIALIZED",
      };
    }

    const querySnapshot = await getDocs(collection(db, "riders"));
    console.log(`📦 Retrieved ${querySnapshot.size} riders from database`);

    let availableRiders = collectNearbyRiders(querySnapshot, coords, {
      vehiclePref,
      maxActiveMinutes: ACTIVE_WINDOW_MINUTES,
    });

    if (availableRiders.length === 0) {
      availableRiders = collectNearbyRiders(querySnapshot, coords, {
        vehiclePref: null,
        maxActiveMinutes: ACTIVE_WINDOW_MINUTES,
      });
    }

    if (availableRiders.length === 0) {
      availableRiders = collectNearbyRiders(querySnapshot, coords, {
        vehiclePref: null,
        maxActiveMinutes: Infinity,
      });
    }

    // Check if any riders found
    if (availableRiders.length === 0) {
      console.warn(`❌ No available riders found within ${MAX_RIDER_RADIUS_KM}km of pickup`);
      return {
        success: false,
        rider: null,
        message: `No rider available nearby within ${MAX_RIDER_RADIUS_KM}km`,
        searchRadius: MAX_RIDER_RADIUS_KM,
        pickupCoords: pickupCoords,
        totalRidersChecked: querySnapshot.size
      };
    }

    const sortedRiders = availableRiders;
    const chosenRider = sortedRiders[0];

    console.log(`✅ Found ${availableRiders.length} available riders, selecting closest:`, {
      name: chosenRider.name,
      distance: chosenRider.distanceFormatted,
      vehicleType: chosenRider.vehicleType
    });

    // Lock the rider by marking as busy
    try {
      await updateDoc(doc(db, "riders", chosenRider.id), {
        status: "busy",
        currentOrder: "assigning",
        lastAssigned: serverTimestamp()
      });

      console.log(`🔒 Locked rider ${chosenRider.name} (${chosenRider.id})`);

      return {
        success: true,
        rider: chosenRider,
        allRiders: sortedRiders, // Include all available riders for reference
        totalRidersFound: availableRiders.length,
        message: `Rider ${chosenRider.name} assigned successfully`
      };

    } catch (lockError) {
      console.error('❌ Error locking rider:', lockError);
      return {
        success: false,
        rider: null,
        message: "Failed to lock rider",
        error: lockError.message
      };
    }

  } catch (error) {
    console.error('❌ Error finding nearest rider:', error);
    return {
      success: false,
      rider: null,
      message: "Rider query failed",
      error: error.message,
      errorCode: error.code || 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Assign rider to an existing order
 * @param {string} orderId - Order document ID
 * @param {Object} pickupCoords - Pickup coordinates {lat, lng}
 * @param {string} vehiclePref - Preferred vehicle type
 * @returns {Promise<Object>} Assignment result
 */
export async function assignRiderToOrder(orderId, pickupCoords, vehiclePref = "bike") {
  console.log(`🎯 Assigning rider to order ${orderId}`);

  try {
    const coords = normalizePickupCoords(pickupCoords);
    if (!coords) {
      return { success: false, message: "Invalid pickup coordinates", orderStatus: "searching_rider" };
    }

    await syncBookingAndOrder(orderId, {
      status: "searching_rider",
      dispatchStatus: "searching",
      lastRiderSearchTime: serverTimestamp(),
    });

    const riderResult = await findNearestRider(coords, vehiclePref);

    if (!riderResult.success || !riderResult.rider) {
      console.warn("❌ No rider available for assignment");

      await syncBookingAndOrder(orderId, {
        status: "searching_rider",
        dispatchStatus: "searching",
        riderSearchAttempts: 1,
        lastRiderSearchTime: serverTimestamp(),
        noRiderReason: riderResult.message,
      });

      return {
        success: false,
        message: riderResult.message,
        orderStatus: "searching_rider",
      };
    }

    const rider = riderResult.rider;

    await syncBookingAndOrder(orderId, {
      riderId: rider.id,
      riderName: rider.name,
      riderPhone: rider.phone,
      riderVehicle: rider.vehicleType,
      riderDistance: rider.distance,
      assignedRider: {
        id: rider.id,
        name: rider.name,
        phone: rider.phone,
        vehicleType: rider.vehicleType,
      },
      status: "assigned",
      dispatchStatus: "assigned",
      assignedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "riders", rider.id), {
      currentOrder: orderId,
      status: "busy",
    });

    await seedRiderTrackingForOrder({
      riderId: rider.id,
      orderId,
      riderName: rider.name,
      riderPhone: rider.phone,
      status: 'assigned',
    });

    console.log(`✅ Successfully assigned ${riderResult.rider.name} to order ${orderId}`);

    return {
      success: true,
      rider: riderResult.rider,
      orderId: orderId,
      message: `${riderResult.rider.name} assigned successfully`,
      orderStatus: "Assigned"
    };

  } catch (error) {
    console.error('❌ Error assigning rider to order:', error);
    return {
      success: false,
      message: "Failed to assign rider",
      error: error.message
    };
  }
}

/**
 * Release rider back to available pool (call after delivery completion)
 * @param {string} riderId - Rider document ID
 * @returns {Promise<Object>} Release result
 */
export async function releaseRider(riderId) {
  console.log(`🔓 Releasing rider ${riderId} back to available pool`);

  try {
    await updateDoc(doc(db, "riders", riderId), {
      status: "available",
      currentOrder: null,
      lastCompleted: serverTimestamp(),
      lastActive: serverTimestamp()
    });

    console.log(`✅ Rider ${riderId} released and available for new orders`);

    return {
      success: true,
      message: "Rider released successfully"
    };

  } catch (error) {
    console.error('❌ Error releasing rider:', error);
    return {
      success: false,
      message: "Failed to release rider",
      error: error.message
    };
  }
}

/**
 * Get all available riders (for admin dashboard)
 * @returns {Promise<Object>} List of available riders
 */
export async function getAvailableRiders() {
  try {
    const riderRef = collection(db, "riders");
    const querySnapshot = await getDocs(riderRef);
    
    const riders = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === "available") {
        riders.push({ id: doc.id, ...data });
      }
    });

    return {
      success: true,
      riders: riders,
      totalAvailable: riders.length
    };

  } catch (error) {
    console.error('Error fetching available riders:', error);
    return {
      success: false,
      riders: [],
      error: error.message
    };
  }
}

// Export configuration for external use
export const RIDER_MATCHING_CONFIG = {
  MAX_RIDER_RADIUS_KM,
  ACTIVE_WINDOW_MINUTES
};
