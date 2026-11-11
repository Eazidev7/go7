/**
 * Single write path for rider GPS — fans out to all collections tracking reads from.
 */
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

function normalizeCoords(input) {
  const lat = Number(input?.latitude ?? input?.lat);
  const lng = Number(input?.longitude ?? input?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, latitude: lat, longitude: lng };
}

/**
 * @param {{ riderId: string, orderId?: string, location: object, status?: string, riderName?: string, riderPhone?: string }} params
 */
export async function publishRiderLocation({
  riderId,
  orderId = null,
  location,
  status = null,
  riderName = null,
  riderPhone = null,
}) {
  if (!riderId || !db) return;

  const coords = normalizeCoords(location);
  if (!coords) return;

  const riderLocation = {
    latitude: coords.lat,
    longitude: coords.lng,
    lat: coords.lat,
    lng: coords.lng,
    updatedAt: Date.now(),
  };

  const ts = serverTimestamp();

  const riderPatch = {
    currentLocation: { latitude: coords.lat, longitude: coords.lng },
    lat: coords.lat,
    lng: coords.lng,
    lastUpdated: ts,
    lastActive: ts,
  };
  if (orderId) riderPatch.currentOrderId = orderId;
  if (status) riderPatch.status = status;

  await setDoc(doc(db, 'riders', riderId), riderPatch, { merge: true });

  await setDoc(
    doc(db, 'riderLocations', riderId),
    {
      riderId,
      orderId,
      location: riderLocation,
      ...riderLocation,
      name: riderName,
      phone: riderPhone,
      status,
      updatedAt: ts,
    },
    { merge: true }
  );

  if (!orderId) return;

  const orderPatch = {
    riderId,
    riderLocation,
    locationUpdatedAt: ts,
  };

  const orderCollections = ['orders', 'bookings', 'gobuyOrders', 'gobuy_orders', 'deliveries'];
  await Promise.allSettled(
    orderCollections.map((col) => setDoc(doc(db, col, orderId), orderPatch, { merge: true }))
  );

  // GPS pings must not overwrite order lifecycle status (at_pickup / picked_up / enroute_dropoff).
  await setDoc(
    doc(db, 'deliveryTracking', orderId),
    {
      orderId,
      riderId,
      currentLocation: riderLocation,
      riderLocation,
      updatedAt: ts,
    },
    { merge: true }
  );

  // Legacy path used by older tracking listeners
  await setDoc(
    doc(db, 'rider_locations', orderId),
    {
      lat: coords.lat,
      lng: coords.lng,
      latitude: coords.lat,
      longitude: coords.lng,
      riderId,
      status,
      updatedAt: Date.now(),
      timestamp: Date.now(),
    },
    { merge: true }
  );
}

/**
 * Seed customer tracking immediately after rider assignment (uses rider's last known GPS).
 */
export async function seedRiderTrackingForOrder({
  riderId,
  orderId,
  riderName = null,
  riderPhone = null,
  status = 'assigned',
}) {
  if (!riderId || !orderId || !db) return;

  try {
    const riderSnap = await getDoc(doc(db, 'riders', riderId));
    const riderData = riderSnap.exists() ? riderSnap.data() : {};
    const location =
      riderData.currentLocation ||
      (riderData.latitude != null || riderData.lat != null
        ? {
            latitude: riderData.latitude ?? riderData.lat,
            longitude: riderData.longitude ?? riderData.lng,
          }
        : null);

    if (!location) return;

    await publishRiderLocation({
      riderId,
      orderId,
      location,
      status,
      riderName: riderName || riderData.name || riderData.fullName,
      riderPhone: riderPhone || riderData.phone || riderData.phoneNumber,
    });
  } catch (error) {
    console.warn('seedRiderTrackingForOrder failed:', error?.message || error);
  }
}
