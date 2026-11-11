import { collection, doc, getDoc, getDocs, query, where, limit, getFirestore } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { db as configDb, app as configApp, firebaseConfig } from '../firebase/config';
import {
  resolveBookingDocId,
  getPickupCoords,
  getDropoffCoords,
  getPickupAddress,
  getDropoffAddress,
  normalizeTrackingId,
} from './bookingTracking';
import { mapFirestoreToTrackingStatus } from './trackingStatusUtils';

function getActiveDb() {
  if (configDb) return configDb;
  const apps = getApps();
  if (apps.length > 0) return getFirestore(apps[0]);
  if (configApp) return getFirestore(configApp);
  try {
    const fallbackApp = initializeApp(firebaseConfig, 'go7-tracking-fallback');
    return getFirestore(fallbackApp);
  } catch {
    return null;
  }
}

async function findBookingRecord(trackingId, activeDb) {
  const normalized = normalizeTrackingId(trackingId);
  if (!normalized) return null;

  const candidates = [...new Set([normalized, normalized.toUpperCase(), normalized.toLowerCase()])];

  for (const id of candidates) {
    try {
      const snap = await getDoc(doc(activeDb, 'bookings', id));
      if (snap.exists()) {
        return { collection: 'bookings', docId: snap.id, data: snap.data() };
      }
    } catch (err) {
      if (err?.code !== 'permission-denied') {
        console.warn('[tracking] bookings direct read failed:', id, err?.code || err?.message);
      }
    }
  }

  for (const field of ['bookingId', 'jobId', 'id', 'orderId']) {
    for (const id of candidates) {
      try {
        const snap = await getDocs(
          query(collection(activeDb, 'bookings'), where(field, '==', id), limit(1))
        );
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          return { collection: 'bookings', docId: docSnap.id, data: docSnap.data() };
        }
      } catch (err) {
        if (err?.code !== 'permission-denied') {
          console.warn('[tracking] bookings query failed:', field, id, err?.code || err?.message);
        }
      }
    }
  }

  return null;
}

async function findOrderDoc(trackingId) {
  const activeDb = getActiveDb();
  if (!activeDb || !trackingId) {
    console.error('[tracking] Firestore unavailable or missing tracking ID', { trackingId });
    return null;
  }

  const bookingRecord = await findBookingRecord(trackingId, activeDb);
  if (bookingRecord) return bookingRecord;

  const candidates = [...new Set([
    normalizeTrackingId(trackingId),
    normalizeTrackingId(trackingId).toUpperCase(),
  ])].filter(Boolean);

  for (const id of candidates) {
    try {
      const direct = await getDoc(doc(activeDb, 'orders', id));
      if (direct.exists()) {
        return { collection: 'orders', docId: direct.id, data: direct.data() };
      }
    } catch (err) {
      if (err?.code !== 'permission-denied') throw err;
    }
  }

  for (const field of ['orderId', 'bookingId', 'jobId']) {
    for (const id of candidates) {
      try {
        const snap = await getDocs(
          query(collection(activeDb, 'orders'), where(field, '==', id), limit(1))
        );
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          return { collection: 'orders', docId: docSnap.id, data: docSnap.data() };
        }
      } catch (err) {
        if (err?.code !== 'permission-denied') throw err;
      }
    }
  }

  for (const collectionName of ['gobuy_orders', 'gobuyOrders']) {
    for (const id of candidates) {
      const direct = await getDoc(doc(activeDb, collectionName, id));
      if (direct.exists()) {
        return { collection: collectionName, docId: direct.id, data: direct.data() };
      }
    }
  }

  for (const id of candidates) {
    const direct = await getDoc(doc(activeDb, 'deliveries', id));
    if (direct.exists()) {
      return { collection: 'deliveries', docId: direct.id, data: direct.data() };
    }
  }

  const bookingDocId = await resolveBookingDocId(trackingId);
  if (bookingDocId) {
    const bookingSnap = await getDoc(doc(activeDb, 'bookings', bookingDocId));
    if (bookingSnap.exists()) {
      return { collection: 'bookings', docId: bookingSnap.id, data: bookingSnap.data() };
    }
  }

  return null;
}

function isPaid(order, orderType) {
  const status = String(order.paymentStatus || order.payment?.status || '').toLowerCase();
  const paidStatuses = new Set([
    'paid',
    'paid_wallet',
    'wallet',
    'completed',
    'success',
    'confirmed',
  ]);
  if (orderType === 'booking') {
    return (
      paidStatuses.has(status) ||
      order.paid === true ||
      order.payment?.paid === true
    );
  }
  return paidStatuses.has(status) || order.paid === true || order.payment?.paid === true;
}

export function mapOrderType(collectionName) {
  if (collectionName === 'bookings' || collectionName === 'deliveries') return 'booking';
  if (collectionName === 'gobuy_orders' || collectionName === 'gobuyOrders') return 'gobuy';
  return 'food';
}

export function mapFirestoreStatusToUi(status, orderType) {
  // Keep booking statuses aligned with useLiveDeliveryTracking / TrackDeliveryPage.
  // Missing keys used to fall through to finding_shopper and overwrite live rider status.
  if (orderType === 'booking') {
    const mapped = mapFirestoreToTrackingStatus(status);
    const uiMap = {
      finding_shopper: 'finding_shopper',
      'rider-assigned': 'rider-assigned',
      'en-route-pickup': 'rider-assigned',
      'at-pickup': 'rider-assigned',
      'picked-up': 'picked-up',
      'on-the-way': 'on-the-way',
      nearby: 'nearby',
      delivered: 'delivered',
      confirmed: 'confirmed',
      preparing: 'preparing',
      'ready-for-pickup': 'ready-for-pickup',
      shopping: 'shopping',
      'shopper-assigned': 'shopper-assigned',
    };
    return uiMap[mapped] || 'finding_shopper';
  }
  return status || 'on-the-way';
}

export function buildTrackingViewModel(record) {
  if (!record) return null;

  const { collection: collectionName, docId, data } = record;
  const orderType = mapOrderType(collectionName);
  const pickupCoords = getPickupCoords(data);
  const dropoffCoords = getDropoffCoords(data);
  const pickupAddr = getPickupAddress(data);
  const dropoffAddr = getDropoffAddress(data);

  const displayId =
    data.bookingId || data.orderId || data.jobId || docId;

  return {
    id: docId,
    collection: collectionName,
    orderType,
    raw: data,
    displayId,
    isPaid: isPaid(data, orderType),
    pickupCoords,
    dropoffCoords,
    pickupAddress: pickupAddr,
    dropoffAddress: dropoffAddr,
    riderId: data.riderId || data.assignedRider?.id || null,
    status: mapFirestoreStatusToUi(data.status || data.orderStatus, orderType),
    paymentStatus: data.paymentStatus || data.payment?.status,
    items: data.items || [],
    total:
      data.total ||
      data.totalAmount ||
      data.totalCost ||
      data.fare ||
      data.finalFare ||
      data.estimatedFare ||
      0,
    deliveryFee: data.deliveryFee,
    subtotal: data.subtotal,
    vendorName: data.vendor?.name || data.vendorName,
    riderName: data.assignedRider?.name || data.riderName || (orderType === 'gobuy' ? 'Go7 Shopper' : 'Your Rider'),
    riderPhone: data.assignedRider?.phone || data.riderPhone || '',
    riderPhoto: data.assignedRider?.photo || data.riderPhoto || '',
    riderRating: data.assignedRider?.rating || data.riderRating || 0,
  };
}

export async function loadTrackingOrder(trackingId) {
  const record = await findOrderDoc(trackingId);
  return buildTrackingViewModel(record);
}

export async function resolveTrackingCollection(trackingId) {
  const record = await findOrderDoc(trackingId);
  if (!record) return null;
  return { collection: record.collection, docId: record.docId };
}
