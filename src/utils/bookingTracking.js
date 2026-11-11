import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db as configDb, app as configApp, functions, firebaseConfig } from '../firebase/config';
import { haversineKm } from './distance';
import { extractRiderLocation } from './trackingStatusUtils';

function getActiveDb() {
  if (configDb) return configDb;
  const apps = getApps();
  if (apps.length > 0) return getFirestore(apps[0]);
  if (configApp) return getFirestore(configApp);
  try {
    const fallbackApp = initializeApp(firebaseConfig, 'go7-booking-fallback');
    return getFirestore(fallbackApp);
  } catch {
    return null;
  }
}

export function normalizeTrackingId(value) {
  return String(value || '').trim();
}

export function getPickupAddress(order) {
  if (!order) return 'Pickup location';
  if (typeof order.pickup === 'string') return order.pickup;
  if (order.vendorName) return order.vendorName;
  if (order.vendor?.name) return order.vendor.name;
  return order.pickup?.address || order.pickupAddress || 'Pickup location';
}

export function getDropoffAddress(order) {
  if (!order) return 'Delivery location';
  if (typeof order.dropoff === 'string') return order.dropoff;
  if (order.deliveryAddress?.address) return order.deliveryAddress.address;
  if (typeof order.deliveryAddress === 'string') return order.deliveryAddress;
  return order.dropoff?.address || order.dropoffAddress || order.drop || 'Delivery location';
}

export function getPickupCoords(order) {
  if (!order) return null;
  if (order.pickupCoords?.lat != null) return order.pickupCoords;
  if (order.pickup?.lat != null) return { lat: order.pickup.lat, lng: order.pickup.lng };
  if (order.pickup?.coords?.lat != null) return order.pickup.coords;
  if (order.pickup?.coordinates?.lat != null) return order.pickup.coordinates;
  if (order.vendor?.location?.lat != null) return order.vendor.location;
  if (order.vendor?.lat != null) return { lat: order.vendor.lat, lng: order.vendor.lng };
  if (order.vendorCoords?.lat != null) return order.vendorCoords;
  if (order.vendorLocation?.lat != null) return order.vendorLocation;
  if (order.pickupAddress?.lat != null) {
    return { lat: order.pickupAddress.lat, lng: order.pickupAddress.lng };
  }
  return null;
}

export function getDropoffCoords(order) {
  if (!order) return null;
  if (order.dropoffCoords?.lat != null) return order.dropoffCoords;
  if (order.dropoff?.lat != null) return { lat: order.dropoff.lat, lng: order.dropoff.lng };
  if (order.dropoff?.coords?.lat != null) return order.dropoff.coords;
  if (order.dropoff?.coordinates?.lat != null) return order.dropoff.coordinates;
  if (order.deliveryAddress?.coordinates?.lat != null) return order.deliveryAddress.coordinates;
  if (order.deliveryAddress?.lat != null) {
    return { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng };
  }
  if (order.dropoffAddress?.lat != null) {
    return { lat: order.dropoffAddress.lat, lng: order.dropoffAddress.lng };
  }
  return null;
}

export function normalizeBookingStatus(status) {
  const raw = String(status || 'pending').toLowerCase().replace(/\s+/g, '_');
  const map = {
    pending: 'pending',
    searching_rider: 'searching_rider',
    pending_dispatch: 'searching_rider',
    assigned: 'assigned',
    accepted: 'assigned',
    enroute_pickup: 'enroute_pickup',
    heading_to_pickup: 'enroute_pickup',
    at_pickup: 'at_pickup',
    arrived_pickup: 'at_pickup',
    arrived_at_pickup: 'at_pickup',
    enroute: 'enroute_dropoff',
    in_transit: 'enroute_dropoff',
    enroute_dropoff: 'enroute_dropoff',
    picked_up: 'picked_up',
    picked: 'picked_up',
    nearby: 'nearby_dropoff',
    at_delivery: 'nearby_dropoff',
    arrived_dropoff: 'nearby_dropoff',
    arrived_at_delivery: 'nearby_dropoff',
    delivered: 'delivered',
    completed: 'delivered',
    cancelled: 'cancelled',
  };
  return map[raw] || raw || 'pending';
}

export function convertBookingDocToTrackFormat(docData, docId) {
  const pickupCoords = getPickupCoords(docData);
  const dropoffCoords = getDropoffCoords(docData);
  const pickupAddr = getPickupAddress(docData);
  const dropoffAddr = getDropoffAddress(docData);

  const distance =
    pickupCoords && dropoffCoords
      ? haversineKm(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng)
      : docData.distanceKm || null;

  const riderId = docData.riderId || docData.assignedRider?.id;
  const rider = riderId
    ? {
        id: riderId,
        name: docData.assignedRider?.name || docData.riderName || 'Your rider',
        phone: docData.assignedRider?.phone || docData.riderPhone || '',
        code: docData.assignedRider?.code || docData.riderCode || '',
      }
    : null;

  const fare = docData.fare ?? docData.finalFare ?? docData.estimatedFare;

  return {
    id: docId,
    jobId: docData.bookingId || docData.jobId || docId,
    status: normalizeBookingStatus(docData.status),
    raw: docData,
    riderLocation: extractRiderLocation(docData),
    pickupArea: docData.pickupArea || '',
    pickupAddress: pickupAddr,
    dropoffArea: docData.dropoffArea || '',
    dropoffAddress: dropoffAddr,
    pickup: {
      address: pickupAddr,
      coords: pickupCoords || { lat: 0, lng: 0 },
    },
    dropoff: {
      address: dropoffAddr,
      coords: dropoffCoords || { lat: 0, lng: 0 },
    },
    customer: {
      name: docData.sender?.name || docData.customerName || '',
      phone: docData.sender?.phone || docData.customerPhone || docData.phone || '',
    },
    customerName: docData.sender?.name || docData.customerName || '',
    phone: docData.sender?.phone || docData.phone || '',
    rider,
    riderId,
    distanceKm: distance,
    etaMins: docData.etaMinutes || (distance ? Math.ceil((distance / 20) * 60) : null),
    fare,
    fareNaira: fare,
    serviceType: docData.serviceType || docData.parcelType || 'standard',
    priority: docData.priority || 'standard',
    payment: {
      method: docData.paymentMethod || docData.payment?.method || 'wallet',
      status: docData.paymentStatus || docData.payment?.status || 'pending',
    },
    paymentStatus: docData.paymentStatus,
    timeline: docData.timeline || [],
    createdAt: docData.createdAt,
    recipient: docData.recipient,
    sender: docData.sender,
    packageDetails: docData.packageDetails,
  };
}

async function resolveBookingDocIdClient(orderId) {
  const db = getActiveDb();
  if (!db) return null;

  const candidates = [...new Set([orderId, orderId.toUpperCase(), orderId.toLowerCase()])];

  for (const id of candidates) {
    const direct = await getDoc(doc(db, 'bookings', id));
    if (direct.exists()) return direct.id;
  }

  for (const field of ['bookingId', 'jobId', 'id']) {
    for (const id of candidates) {
      const snap = await getDocs(
        query(collection(db, 'bookings'), where(field, '==', id), limit(1))
      );
      if (!snap.empty) return snap.docs[0].id;
    }
  }

  return null;
}

export async function resolveBookingDocId(orderId) {
  const normalized = normalizeTrackingId(orderId);
  if (!normalized) return null;

  const clientId = await resolveBookingDocIdClient(normalized);
  if (clientId) return clientId;

  if (functions) {
    const lookupBooking = httpsCallable(functions, 'lookupBookingForTracking');
    try {
      const result = await lookupBooking({ trackingId: normalized });
      if (result.data?.found && result.data?.docId) {
        return result.data.docId;
      }
    } catch (err) {
      console.warn('Tracking lookup function failed:', err);
    }
  }

  return null;
}

export async function subscribeToBookingByTrackingId(trackingId, onBooking, onError) {
  const normalized = normalizeTrackingId(trackingId);
  const db = getActiveDb();
  if (!normalized || !db) {
    onBooking(null);
    return () => {};
  }

  const docId = await resolveBookingDocId(normalized);
  if (!docId) {
    onBooking(null);
    return () => {};
  }

  return onSnapshot(
    doc(db, 'bookings', docId),
    (snapshot) => {
      if (snapshot.exists()) {
        onBooking(convertBookingDocToTrackFormat(snapshot.data(), snapshot.id));
      } else {
        onBooking(null);
      }
    },
    onError
  );
}
