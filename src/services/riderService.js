/**
 * Firestore Rider Service
 * 
 * This service handles all Firestore operations for riders.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { publishRiderLocation, seedRiderTrackingForOrder } from '../utils/publishRiderLocation';
import { RiderStatus } from '../models/firestore';
import {
  isActiveJob,
  isStaleJob,
  isTerminalJob,
} from '../utils/riderJobUtils';

const RIDERS_COLLECTION = 'riders';
let locationLoopCleanup = null;

/**
 * Create or update a rider in Firestore
 * @param {Object} riderData - The rider data
 * @returns {Promise<Object>} The created/updated rider
 */
export const createOrUpdateRider = async (riderData) => {
  try {
    // Ensure rider has an ID
    const riderId = riderData.id || `RIDER-${Date.now()}`;
    
    // Create the rider object
    const rider = {
      id: riderId,
      name: riderData.name || 'Unknown Rider',
      phone: riderData.phone || '',
      status: riderData.status || RiderStatus.OFFLINE,
      lat: riderData.lat || 0,
      lng: riderData.lng || 0,
      updatedAt: Date.now()
    };
    
    // Save to Firestore
    const riderRef = doc(db, RIDERS_COLLECTION, riderId);
    await setDoc(riderRef, rider);
    
    return rider;
  } catch (error) {
    console.error('Error creating/updating rider in Firestore:', error);
    throw error;
  }
};

/**
 * Get a rider by ID from Firestore
 * @param {string} id - The rider ID
 * @returns {Promise<Object|null>} The rider or null if not found
 */
export const getRiderById = async (id) => {
  try {
    const riderRef = doc(db, RIDERS_COLLECTION, id);
    const riderSnap = await getDoc(riderRef);
    
    if (!riderSnap.exists()) {
      return null;
    }
    
    return riderSnap.data();
  } catch (error) {
    console.error('Error getting rider from Firestore:', error);
    throw error;
  }
};

/**
 * Update a rider's location
 * @param {string} id - The rider ID
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object|null>} The updated rider or null if not found
 */
export const updateRiderLocation = async (id, lat, lng, orderId = null) => {
  try {
    await publishRiderLocation({
      riderId: id,
      orderId,
      location: { latitude: lat, longitude: lng },
      status: 'delivering',
    });
    const riderRef = doc(db, RIDERS_COLLECTION, id);
    const riderSnap = await getDoc(riderRef);
    if (!riderSnap.exists()) return null;
    return { ...riderSnap.data(), lat, lng, updatedAt: Date.now() };
  } catch (error) {
    console.error('Error updating rider location in Firestore:', error);
    throw error;
  }
};

/**
 * Update a rider's status
 * @param {string} id - The rider ID
 * @param {string} status - The new status
 * @returns {Promise<Object|null>} The updated rider or null if not found
 */
export const updateRiderStatus = async (id, status) => {
  try {
    const riderRef = doc(db, RIDERS_COLLECTION, id);
    const riderSnap = await getDoc(riderRef);
    
    if (!riderSnap.exists()) {
      return null;
    }
    
    const updateData = {
      status,
      updatedAt: Date.now()
    };
    
    await updateDoc(riderRef, updateData);
    
    return {
      ...riderSnap.data(),
      ...updateData
    };
  } catch (error) {
    console.error('Error updating rider status in Firestore:', error);
    throw error;
  }
};

/**
 * Get all available riders
 * @returns {Promise<Array>} Array of available riders
 */
export const getAvailableRiders = async () => {
  try {
    const ridersCollection = collection(db, RIDERS_COLLECTION);
    const q = query(
      ridersCollection, 
      where('status', '==', RiderStatus.AVAILABLE)
    );
    
    const querySnapshot = await getDocs(q);
    
    const riders = [];
    querySnapshot.docs.forEach((doc) => {
      riders.push(doc.data());
    });
    
    return riders.sort((a, b) => {
      const ta = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
      const tb = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
      return tb - ta;
    });
  } catch (error) {
    console.error('Error getting available riders from Firestore:', error);
    throw error;
  }
};

/**
 * Get all riders
 * @returns {Promise<Array>} Array of all riders
 */
export const getAllRiders = async () => {
  try {
    const ridersCollection = collection(db, RIDERS_COLLECTION);
    const querySnapshot = await getDocs(ridersCollection);
    
    const riders = [];
    querySnapshot.forEach((doc) => {
      riders.push(doc.data());
    });
    
    return riders;
  } catch (error) {
    console.error('Error getting all riders from Firestore:', error);
    throw error;
  }
};

/**
 * Get available jobs for riders
 * @returns {Promise<Array>} Array of pending orders
 */
export const getAvailableJobs = async () => {
  try {
    const jobs = [];
    const seen = new Set();

    const addFromSnapshot = (snap) => {
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.riderId) return;
        const status = String(data.status || data.orderStatus || '').toLowerCase();
        const openStatuses = new Set([
          'pending',
          'searching_rider',
          'pending_dispatch',
          'confirmed',
          'paid',
          'accepted',
        ]);
        if (!openStatuses.has(status)) return;
        if (seen.has(docSnap.id)) return;
        seen.add(docSnap.id);
        jobs.push({ id: docSnap.id, ...data });
      });
    };

    const collections = ['bookings', 'orders'];
    const statuses = ['searching_rider', 'pending', 'pending_dispatch'];

    for (const colName of collections) {
      for (const status of statuses) {
        try {
          const q = query(
            collection(db, colName),
            where('status', '==', status),
            limit(15)
          );
          const snap = await getDocs(q);
          addFromSnapshot(snap);
        } catch (err) {
          console.warn(`getAvailableJobs: ${colName}/${status} query failed`, err?.message);
        }
      }
    }

    // Fuel & CNG orders (different field shape — normalize into the generic job card format)
    try {
      const fuelQ = query(
        collection(db, 'fuelOrders'),
        where('status', '==', 'pending'),
        limit(15)
      );
      const fuelSnap = await getDocs(fuelQ);
      fuelSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.riderId) return;
        if (seen.has(docSnap.id)) return;
        seen.add(docSnap.id);

        const unit = data.fuelType === 'cng' ? 'KG' : 'Litres';
        jobs.push({
          id: docSnap.id,
          ...data,
          orderType: 'fuel',
          pickupAddress: data.stationAddress || data.stationLocation?.address,
          pickupLocation: data.stationLocation,
          deliveryAddress: data.deliveryLocation?.address,
          dropoffAddress: data.deliveryLocation?.address,
          dropoffLocation: data.deliveryLocation,
          customerAddress: data.deliveryLocation?.address,
          customerPhone: data.customerPhone,
          items: [{ name: `${(data.fuelType || 'fuel').toUpperCase()} - ${data.volume || 0} ${unit}`, quantity: 1 }],
          deliveryFee: data.totalDeliveryFee,
          fare: data.totalDeliveryFee,
        });
      });
    } catch (err) {
      console.warn('getAvailableJobs: fuelOrders query failed', err?.message);
    }

    return jobs.sort((a, b) => (b.createdAt?.toMillis?.() || b.updatedAt || 0) - (a.createdAt?.toMillis?.() || a.updatedAt || 0));
  } catch (error) {
    console.error('Error getting available jobs:', error);
    return [];
  }
};

/**
 * Remove stale or finished assignments stuck on a rider profile.
 */
export const clearRiderStaleJobs = async (riderId) => {
  if (!riderId) return { cleared: 0 };

  const now = Date.now();
  let cleared = 0;
  const collections = ['orders', 'bookings'];

  for (const colName of collections) {
    const q = query(collection(db, colName), where('riderId', '==', riderId), limit(50));
    const snap = await getDocs(q);

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const job = { id: docSnap.id, ...data };

      if (isTerminalJob(job)) {
        cleared += 1;
        continue;
      }

      if (isActiveJob(job) && isStaleJob(job)) {
        await updateDoc(doc(db, colName, docSnap.id), {
          status: 'pending',
          orderStatus: 'pending',
          dispatchStatus: 'pending',
          riderId: null,
          riderName: null,
          rider: null,
          staleClearedAt: now,
          updatedAt: now,
        });
        cleared += 1;
      }
    }
  }

  await updateDoc(doc(db, RIDERS_COLLECTION, riderId), {
    currentJobId: null,
    currentOrderId: null,
    updatedAt: now,
  }).catch(() => {});

  return { cleared };
};

/**
 * Set rider online/offline status
 * @param {string} riderId - The rider ID
 * @param {boolean} isOnline - Online status
 * @returns {Promise<void>}
 */
export const setRiderOnline = async (riderId, isOnline) => {
  try {
    const riderRef = doc(db, RIDERS_COLLECTION, riderId);
    const riderSnap = await getDoc(riderRef);
    const existing = riderSnap.exists() ? riderSnap.data() : {};
    const lat = existing.latitude ?? existing.lat ?? existing.currentLocation?.lat;
    const lng = existing.longitude ?? existing.lng ?? existing.currentLocation?.lng;

    await updateDoc(riderRef, {
      status: isOnline ? 'available' : 'offline',
      isAvailable: isOnline,
      ...(lat != null && { latitude: lat, longitude: lng }),
      lastActive: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Error updating rider status:', error);
    throw error;
  }
};

/**
 * Accept a job
 * @param {string} riderId - The rider ID
 * @param {string} orderId - The order ID
 * @returns {Promise<void>}
 */
export const acceptJob = async (riderId, orderId) => {
  try {
    const riderRef = doc(db, 'riders', riderId);
    const riderSnap = await getDoc(riderRef);
    const riderData = riderSnap.exists() ? riderSnap.data() : {};
    const now = Date.now();

    await updateDoc(riderRef, {
      status: 'delivering',
      isAvailable: false,
      currentJobId: orderId,
      updatedAt: now
    });

    const assignmentPayload = {
      status: 'assigned',
      dispatchStatus: 'assigned',
      orderStatus: 'assigned',
      riderId,
      riderName: riderData.name || 'Rider',
      riderPhone: riderData.phone || '',
      rider: {
        id: riderId,
        name: riderData.name || 'Rider',
        phone: riderData.phone || '',
        code: `R-${String(riderId).substring(0, 6).toUpperCase()}`,
      },
      acceptedAt: now,
      updatedAt: now,
      'timeline.accepted': now,
    };

    const bookingRef = doc(db, 'bookings', orderId);
    const bookingSnap = await getDoc(bookingRef);
    if (bookingSnap.exists()) {
      await updateDoc(bookingRef, assignmentPayload);
      await setDoc(doc(db, 'orders', orderId), assignmentPayload, { merge: true });
      await seedRiderTrackingForOrder({
        riderId,
        orderId,
        riderName: riderData.name,
        riderPhone: riderData.phone,
        status: 'assigned',
      });
      return;
    }

    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      await updateDoc(orderRef, assignmentPayload);
      await setDoc(bookingRef, assignmentPayload, { merge: true });
      await seedRiderTrackingForOrder({
        riderId,
        orderId,
        riderName: riderData.name,
        riderPhone: riderData.phone,
        status: 'assigned',
      });
      return;
    }

    for (const colName of ['gobuy_orders', 'gobuyOrders']) {
      const gobuyRef = doc(db, colName, orderId);
      const gobuySnap = await getDoc(gobuyRef);
      if (!gobuySnap.exists()) continue;
      await updateDoc(gobuyRef, assignmentPayload);
      await seedRiderTrackingForOrder({
        riderId,
        orderId,
        riderName: riderData.name,
        riderPhone: riderData.phone,
        status: 'assigned',
      });
      return;
    }

    const fuelOrderRef = doc(db, 'fuelOrders', orderId);
    const fuelOrderSnap = await getDoc(fuelOrderRef);
    if (fuelOrderSnap.exists()) {
      const fuelOrder = fuelOrderSnap.data();
      await updateDoc(fuelOrderRef, {
        ...assignmentPayload,
        statusHistory: [
          ...(fuelOrder.statusHistory || []),
          { status: 'assigned', timestamp: Date.now(), note: `Rider ${riderData.name || 'Rider'} accepted` },
        ],
      });

      // Notify the customer in their order chat
      try {
        const { FuelChatNotificationService } = await import('./fuelChatNotificationService');
        await FuelChatNotificationService.sendRiderAssignmentNotification({
          orderId,
          customerId: fuelOrder.customerId,
          riderId,
          riderName: riderData.name || 'Rider',
          riderPhone: riderData.phone || '',
        });
      } catch (notifyErr) {
        console.warn('Could not send fuel rider-assignment chat message:', notifyErr?.message);
      }

      return;
    }

    throw new Error(`Job ${orderId} not found in bookings, orders, gobuy, or fuelOrders`);
  } catch (error) {
    console.error('Error accepting job:', error);
    throw error;
  }
};

/**
 * Update order status
 * @param {string} orderId - The order ID
 * @param {string} status - New status
 * @returns {Promise<void>}
 */
export const updateOrderStatus = async (orderId, status) => {
  try {
    // Normalize legacy rider button labels to canonical customer-facing statuses
    const normalized =
      status === 'picked'
        ? 'picked_up'
        : status === 'arrived_pickup'
          ? 'at_pickup'
          : status === 'arrived_dropoff'
            ? 'at_delivery'
            : status === 'enroute'
              ? 'enroute_dropoff'
              : status;

    const updateData = {
      status: normalized,
      orderStatus: normalized,
      dispatchStatus: normalized,
      updatedAt: Date.now(),
    };

    if (normalized === 'picked_up') {
      updateData['timeline.pickedUp'] = Date.now();
      updateData.pickedUpAt = Date.now();
    } else if (normalized === 'delivered') {
      updateData['timeline.delivered'] = Date.now();
      updateData.deliveredAt = Date.now();
    } else if (normalized === 'at_pickup') {
      updateData.arrivedAtPickupAt = Date.now();
    } else if (normalized === 'at_delivery') {
      updateData.arrivedAtDeliveryAt = Date.now();
    } else if (normalized === 'enroute_dropoff') {
      updateData.enrouteToDeliveryAt = Date.now();
    }

    // Fan out like acceptJob — customer tracking + inbox listen on bookings and orders
    const collections = ['orders', 'bookings', 'gobuyOrders', 'gobuy_orders', 'deliveries', 'fuelOrders'];
    await Promise.allSettled(
      collections.map(async (colName) => {
        const ref = doc(db, colName, orderId);
        const snap = await getDoc(ref);
        if (snap.exists()) await updateDoc(ref, updateData);
      })
    );

    await setDoc(
      doc(db, 'deliveryTracking', orderId),
      { orderId, status: normalized, orderStatus: normalized, updatedAt: Date.now() },
      { merge: true }
    ).catch(() => {});
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

/**
 * Verify OTP for delivery
 * @param {string} orderId - The order ID
 * @param {string} inputOtp - The OTP entered by rider
 * @returns {Promise<boolean>} Whether OTP is valid
 */
export const verifyOtp = async (orderId, inputOtp) => {
  try {
    const normalized = String(inputOtp || '').trim();
    if (!normalized) return false;

    const collections = ['orders', 'bookings', 'gobuyOrders', 'gobuy_orders', 'fuelOrders'];
    for (const colName of collections) {
      const orderRef = doc(db, colName, orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) continue;

      const order = orderSnap.data();
      const expected = String(
        order.deliveryPIN ||
          order.deliveryPin ||
          order.customerPIN ||
          order.verificationCode ||
          order.otp ||
          ''
      ).trim();

      if (!expected) continue;

      const isValid = normalized === expected;
      if (isValid) {
        await updateDoc(orderRef, {
          otpVerified: true,
          deliveryPINVerified: true,
          'timeline.otpVerified': Date.now(),
        });
        if (colName === 'orders') {
          await updateDoc(doc(db, 'bookings', orderId), {
            otpVerified: true,
            deliveryPINVerified: true,
          }).catch(() => {});
        }
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

/**
 * Start rider location tracking loop
 * @param {string} riderId - The rider ID
 * @param {string} orderId - The order ID
 * @returns {Function} Cleanup function to stop tracking
 */
export const startRiderLocationLoop = (riderId, orderId) => {
  if (locationLoopCleanup) {
    locationLoopCleanup();
    locationLoopCleanup = null;
  }

  let intervalId;

  const updateLocation = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            await publishRiderLocation({
              riderId,
              orderId,
              location: { latitude, longitude },
              status: 'delivering',
            });
          } catch (error) {
            console.error('Error updating location:', error);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  };

  updateLocation();
  intervalId = setInterval(updateLocation, 15000);

  locationLoopCleanup = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  return locationLoopCleanup;
};

/**
 * Get the current active job for a rider
 * @param {string} riderId - The rider ID
 * @returns {Promise<Object|null>} The current job or null
 */
export const getCurrentJob = async (riderId) => {
  try {
    const collections = ['orders', 'bookings', 'gobuy_orders', 'gobuyOrders', 'fuelOrders'];

    for (const colName of collections) {
      const q = query(
        collection(db, colName),
        where('riderId', '==', riderId)
      );

      const querySnapshot = await getDocs(q);
      const sortedDocs = querySnapshot.docs.slice().sort((a, b) => {
        const ta = a.data().updatedAt?.toMillis ? a.data().updatedAt.toMillis() : 0;
        const tb = b.data().updatedAt?.toMillis ? b.data().updatedAt.toMillis() : 0;
        return tb - ta;
      });

      for (const orderDoc of sortedDocs) {
        const data = orderDoc.data();
        let job = { id: orderDoc.id, ...data };

        if (colName === 'fuelOrders') {
          const unit = data.fuelType === 'cng' ? 'KG' : 'Litres';
          job = {
            ...job,
            orderType: 'fuel',
            pickupAddress: data.stationAddress || data.stationLocation?.address,
            pickupLocation: data.stationLocation,
            deliveryAddress: data.deliveryLocation?.address,
            dropoffAddress: data.deliveryLocation?.address,
            dropoffLocation: data.deliveryLocation,
            customerAddress: data.deliveryLocation?.address,
            items: [{ name: `${(data.fuelType || 'fuel').toUpperCase()} - ${data.volume || 0} ${unit}`, quantity: 1 }],
            deliveryFee: data.totalDeliveryFee,
            fare: data.totalDeliveryFee,
          };
        }

        if (isTerminalJob(job)) continue;
        if (!isActiveJob(job)) continue;
        if (isStaleJob(job)) continue;

        return job;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting current job:', error);
    return null;
  }
};

/**
 * Get rider earnings statistics
 * @param {string} riderId - The rider ID
 * @returns {Promise<Object>} Earnings data
 */
export const getRiderEarnings = async (riderId) => {
  try {
    const deliveredAtMs = (value) => {
      if (value?.toMillis) return value.toMillis();
      if (typeof value === 'number') return value;
      return 0;
    };

    const isToday = (timestamp) => {
      const d = new Date(deliveredAtMs(timestamp));
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    };

    const getPayout = (order) =>
      Number(order.riderPayout ?? order.riderEarnings ?? order.feeBreakdown?.riderPayout ?? 0);

    const isDelivered = (order) =>
      order.status === 'delivered' || order.orderStatus === 'delivered';

    // Query orders by the single (auto-indexed) riderId field, then filter to
    // delivered in JS below. Using riderId + status as a composite would require a
    // Firestore index that may not exist — and when missing the query throws and
    // the catch below silently returns 0 (done jobs never showing in the rider's
    // account). A single-field query works without any composite index.
    const [ordersSnapshot, fuelSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'orders'), where('riderId', '==', riderId))),
      getDocs(query(collection(db, 'fuelOrders'), where('riderId', '==', riderId))),
    ]);

    const deliveries = [];
    [ordersSnapshot, fuelSnapshot].forEach((snapshot) => {
      snapshot.forEach((doc) => {
        const order = doc.data();
        if (!isDelivered(order)) return;
        const earning = getPayout(order);
        deliveries.push({
          id: doc.id,
          ...order,
          earning,
          deliveredAt: deliveredAtMs(order.deliveredAt),
        });
      });
    });

    let totalEarnings = 0;
    let todayEarnings = 0;
    deliveries.forEach((d) => {
      totalEarnings += d.earning;
      if (isToday(d.deliveredAt)) todayEarnings += d.earning;
    });

    const totalDeliveries = deliveries.length;
    const averageEarning = totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0;

    return {
      total: totalEarnings,
      today: todayEarnings,
      totalEarnings,
      completedDeliveries: totalDeliveries,
      totalDeliveries,
      averageEarning,
      deliveries: deliveries.sort((a, b) => b.deliveredAt - a.deliveredAt),
    };
  } catch (error) {
    console.error('Error getting rider earnings:', error);
    return {
      total: 0,
      today: 0,
      totalEarnings: 0,
      completedDeliveries: 0,
      totalDeliveries: 0,
      averageEarning: 0,
      deliveries: [],
    };
  }
};

/**
 * Complete a delivery and mark as delivered
 * @param {string} orderId - The order ID
 * @param {string} riderId - The rider ID
 * @returns {Promise<void>}
 */
export const completeDelivery = async (orderId, riderId) => {
  try {
    // Fuel & CNG orders live in a separate collection with different fee fields
    const fuelOrderRef = doc(db, 'fuelOrders', orderId);
    const fuelOrderSnap = await getDoc(fuelOrderRef);
    if (fuelOrderSnap.exists()) {
      return await completeFuelDelivery(orderId, riderId, fuelOrderRef, fuelOrderSnap.data());
    }

    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    const priorOrder = orderSnap.exists() ? orderSnap.data() : {};

    const riderRef = doc(db, 'riders', riderId);
    const riderSnap = await getDoc(riderRef);
    const riderData = riderSnap.exists() ? riderSnap.data() : {};

    const { calculateRiderDeliverySplit } = await import('../utils/orderPricing');
    const deliveryFee = Number(priorOrder.deliveryFee ?? priorOrder.fare ?? 0);
    const riderSplit = calculateRiderDeliverySplit(deliveryFee, riderData);

    const feeBreakdown = {
      ...(priorOrder.feeBreakdown || {}),
      riderPayout: riderSplit.riderPayout,
      go7DeliveryShare: riderSplit.go7DeliveryShare,
      riderDeliveryShareRate: riderSplit.riderDeliveryShareRate,
      usesGo7Bike: riderSplit.usesGo7Bike,
      finalizedAt: new Date().toISOString(),
    };

    await updateDoc(orderRef, {
      status: 'delivered',
      orderStatus: 'delivered',
      deliveredAt: Date.now(),
      timeline: {
        delivered: Date.now()
      },
      updatedAt: Date.now(),
      ...riderSplit,
      riderEarnings: riderSplit.riderPayout,
      // Guard flag so the server auto-credit trigger never double-pays this order.
      riderEarningsCredited: true,
      riderPayoutCredited: riderSplit.riderPayout,
      feeBreakdown,
    });

    const bookingRef = doc(db, 'bookings', orderId);
    const bookingSnap = await getDoc(bookingRef);
    if (bookingSnap.exists()) {
      await updateDoc(bookingRef, {
        status: 'delivered',
        orderStatus: 'delivered',
        deliveredAt: Date.now(),
        ...riderSplit,
        riderEarnings: riderSplit.riderPayout,
        feeBreakdown,
        updatedAt: Date.now(),
      });
    }
    
    await updateDoc(riderRef, {
      status: 'available',
      currentOrderId: null,
      totalEarnings: (riderData.totalEarnings || 0) + riderSplit.riderPayout,
      updatedAt: Date.now()
    });

    // Keep the rider wallet in sync so the wallet/earnings balance is not zero
    await setDoc(
      doc(db, 'rider_earnings', riderId),
      {
        riderId,
        totalEarned: increment(riderSplit.riderPayout),
        availableBalance: increment(riderSplit.riderPayout),
        deliveryCount: increment(1),
        completedDeliveries: increment(1),
        lastDeliveryCompleted: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );

    const { creditVendorIfOrderCompleted } = await import('./vendorWalletService');
    await creditVendorIfOrderCompleted(orderId, {
      ...priorOrder,
      status: 'delivered',
      orderStatus: 'delivered',
    });
    
    console.log(`✅ Delivery ${orderId} completed by rider ${riderId}`);
  } catch (error) {
    console.error('Error completing delivery:', error);
    throw error;
  }
};

/**
 * Complete a fuel/CNG delivery (separate collection + fee shape from regular orders)
 * @param {string} orderId
 * @param {string} riderId
 * @param {import('firebase/firestore').DocumentReference} fuelOrderRef
 * @param {object} fuelOrder
 */
async function completeFuelDelivery(orderId, riderId, fuelOrderRef, fuelOrder) {
  const riderRef = doc(db, 'riders', riderId);
  const riderSnap = await getDoc(riderRef);
  const riderData = riderSnap.exists() ? riderSnap.data() : {};

  const { calculateRiderDeliverySplit } = await import('../utils/orderPricing');
  const deliveryFee = Number(fuelOrder.totalDeliveryFee ?? fuelOrder.deliveryFee ?? 0);
  const riderSplit = calculateRiderDeliverySplit(deliveryFee, riderData);

  await updateDoc(fuelOrderRef, {
    status: 'delivered',
    orderStatus: 'delivered',
    deliveredAt: Date.now(),
    updatedAt: Date.now(),
    ...riderSplit,
    riderEarnings: riderSplit.riderPayout,
    // Guard flag so the server auto-credit trigger never double-pays this fuel order.
    riderEarningsCredited: true,
    riderPayoutCredited: riderSplit.riderPayout,
    statusHistory: [
      ...(fuelOrder.statusHistory || []),
      { status: 'delivered', timestamp: Date.now(), note: 'Delivered to customer' },
    ],
  });

  await updateDoc(riderRef, {
    status: 'available',
    isAvailable: true,
    currentOrderId: null,
    currentJobId: null,
    totalEarnings: (riderData.totalEarnings || 0) + riderSplit.riderPayout,
    updatedAt: Date.now(),
  });

  // Keep the rider wallet in sync so the admin wallet dashboard is not zero
  await setDoc(
    doc(db, 'rider_earnings', riderId),
    {
      riderId,
      totalEarned: increment(riderSplit.riderPayout),
      availableBalance: increment(riderSplit.riderPayout),
      deliveryCount: increment(1),
      completedDeliveries: increment(1),
      lastDeliveryCompleted: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    },
    { merge: true }
  );

  try {
    const { FuelChatNotificationService } = await import('./fuelChatNotificationService');
    await FuelChatNotificationService.sendFuelDeliveryConfirmation({
      orderId,
      customerId: fuelOrder.customerId,
      riderId,
      fuelType: fuelOrder.fuelType,
      volume: Number(fuelOrder.volume) || 0,
      deliveryLocation: fuelOrder.deliveryLocation?.address || 'your location',
    });
  } catch (notifyErr) {
    console.warn('Could not send fuel delivery confirmation chat message:', notifyErr?.message);
  }

  console.log(`✅ Fuel order ${orderId} delivered by rider ${riderId}`);
  return { earnings: riderSplit.riderPayout };
}

/**
 * Stop rider location tracking loop
 * @param {Function} cleanupFunction - The cleanup function returned by startRiderLocationLoop
 */
export const stopRiderLocationLoop = (cleanupFunction) => {
  if (typeof cleanupFunction === 'function') {
    cleanupFunction();
  }
  if (locationLoopCleanup) {
    locationLoopCleanup();
    locationLoopCleanup = null;
  }
};
