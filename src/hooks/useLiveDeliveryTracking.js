import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  getPickupCoords,
  getDropoffCoords,
} from '../utils/bookingTracking';
import { resolveTrackingCollection } from '../utils/loadTrackingOrder';
import {
  extractRiderLocation,
  mapFirestoreToTrackingStatus,
  trackingStatusRank,
  isCoarseTrackingStatus,
} from '../utils/trackingStatusUtils';
import { getDeliveryPinFromOrder } from '../services/orderTracking';
import {
  fetchDrivingRoute,
  progressAlongRoute,
  etaFromRiderToTarget,
} from '../utils/liveTrackingRoute';

function coordsFromDoc(data) {
  const pickup = getPickupCoords(data);
  const dropoff = getDropoffCoords(data);
  return { pickup, dropoff };
}

// GPS older than this is a last-known pin, not a live feed.
const STALE_GPS_MS = 2 * 60 * 1000;

function locTimestamp(...sources) {
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    const t = src.updatedAt ?? src.timestamp ?? src.lastSeen ?? src.lastUpdated ?? null;
    if (!t) continue;
    if (t.toDate instanceof Function) return t.toDate().getTime();
    if (typeof t === 'object' && typeof t.seconds === 'number') return t.seconds * 1000;
    const n = Number(t);
    if (Number.isFinite(n)) return n;
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return null;
}

/**
 * Real-time booking + rider GPS for customer live tracking.
 * Listens to the same Firestore fields the rider app writes.
 */
export function useLiveDeliveryTracking(trackingId) {
  const [loading, setLoading] = useState(true);
  const [trackingDoc, setTrackingDoc] = useState(null);
  const [status, setStatus] = useState('finding_shopper');
  const [riderId, setRiderId] = useState(null);
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [riderProgress, setRiderProgress] = useState(0);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [booking, setBooking] = useState(null);
  const [deliveryPin, setDeliveryPin] = useState('');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [riderLocationAt, setRiderLocationAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const routeCoordsRef = useRef(null);
  const dropoffRef = useRef(null);
  const statusRef = useRef('finding_shopper');

  const applyDocSnapshot = useCallback((data, docId, collectionName) => {
    if (!data) return;

    const firestoreStatus = data.status || data.orderStatus || data.dispatchStatus;
    const mapped = mapFirestoreToTrackingStatus(firestoreStatus);
    const raw = String(firestoreStatus || '').toLowerCase().replace(/\s+/g, '_');
    const currentRank = trackingStatusRank(statusRef.current);
    const nextRank = trackingStatusRank(mapped);
    // Coarse GPS leftovers (delivering/active) must never set/regress lifecycle UI
    const allowStatus =
      mapped === 'delivered' ||
      (!isCoarseTrackingStatus(raw) && nextRank >= currentRank);

    if (allowStatus) {
      setStatus(mapped);
      statusRef.current = mapped;
    }

    const rid = data.riderId || data.rider?.id || data.assignedRider?.id || null;
    if (rid) setRiderId(rid);

    const pin = getDeliveryPinFromOrder(data);
    if (pin) {
      setDeliveryPin(pin);
    } else if (data.requiresDeliveryPin || data.deliveryPINRequired) {
      // New orders keep the PIN in deliverySecrets/{id} (owner+admin only).
      // Non-owner viewers (e.g. public track link) simply can't read it.
      getDoc(doc(db, 'deliverySecrets', docId))
        .then((snap) => {
          const secretPin = snap.exists() ? snap.data()?.pin : null;
          if (secretPin) setDeliveryPin(String(secretPin));
        })
        .catch(() => {});
    }

    const name = data.rider?.name || data.riderName || data.assignedRider?.name || '';
    const phone = data.rider?.phone || data.riderPhone || data.assignedRider?.phone || '';
    if (name) setRiderName(name);
    if (phone) setRiderPhone(phone);

    const { pickup: p, dropoff: d } = coordsFromDoc(data);
    if (p?.lat) setPickup(p);
    if (d?.lat) {
      setDropoff(d);
      dropoffRef.current = d;
    }

    setBooking({
      id: docId,
      collection: collectionName,
      status: mapped,
      riderId: rid,
      raw: data,
      pickup: { coords: p },
      dropoff: { coords: d },
    });

    const loc = extractRiderLocation(data);
    if (loc) {
      setRiderLocation(loc);
      const route = routeCoordsRef.current;
      const drop = dropoffRef.current;
      if (route?.length) setRiderProgress(progressAlongRoute(loc, route));
      const { minutes, km } = etaFromRiderToTarget(loc, drop);
      setEtaMinutes(minutes);
      setDistanceKm(km);
    }
  }, []);

  const applyRiderLoc = useCallback((loc, ts) => {
    if (!loc?.lat) return;
    setRiderLocation(loc);
    if (ts) setRiderLocationAt((prev) => (prev && prev > ts ? prev : ts));

    const route = routeCoordsRef.current;
    const drop = dropoffRef.current;
    const { minutes, km } = etaFromRiderToTarget(loc, drop);
    setEtaMinutes(minutes);
    setDistanceKm(km);

    if (route?.length) {
      setRiderProgress(progressAlongRoute(loc, route));
    }

    const activeStatuses = [
      'rider-assigned',
      'en-route-pickup',
      'at-pickup',
      'picked-up',
      'on-the-way',
      'nearby',
    ];
    if (activeStatuses.includes(statusRef.current)) {
      return;
    }
    if (statusRef.current === 'finding_shopper') {
      const next = 'rider-assigned';
      setStatus(next);
      statusRef.current = next;
    }
  }, []);

  // Resolve orders / bookings / gobuy doc id
  useEffect(() => {
    if (!trackingId) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    resolveTrackingCollection(trackingId)
      .then((resolved) => {
        if (cancelled) return;
        if (!resolved) {
          setTrackingDoc(null);
          setLoading(false);
          return;
        }
        setTrackingDoc(resolved);
      })
      .catch(() => {
        if (!cancelled) {
          setTrackingDoc(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trackingId]);

  // Road route when pickup/dropoff known
  useEffect(() => {
    if (!pickup || !dropoff) return;
    let cancelled = false;
    fetchDrivingRoute(pickup, dropoff).then((route) => {
      if (cancelled || !route) return;
      setRouteCoords(route.coords);
      routeCoordsRef.current = route.coords;
      if (riderLocation) {
        setRiderProgress(progressAlongRoute(riderLocation, route.coords));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  // Live listeners: primary doc + deliveryTracking + riderLocations
  useEffect(() => {
    if (!trackingDoc?.docId || !db) return undefined;
    const { collection: collectionName, docId } = trackingDoc;
    const unsubs = [];

    unsubs.push(
      onSnapshot(
        doc(db, collectionName, docId),
        (snap) => {
          if (!snap.exists()) {
            setLoading(false);
            return;
          }
          const data = snap.data();
          applyDocSnapshot(data, docId, collectionName);
          const loc = extractRiderLocation(data);
          if (loc) {
            applyRiderLoc(loc, locTimestamp(data, data.riderLocation, data.currentLocation, data.rider?.location, data.rider?.currentLocation, data.lastKnownLocation));
          }
          setLoading(false);
        },
        () => setLoading(false)
      )
    );

    // Mirror related collections — keep deliveries for parcel bookings (Book Delivery path).
    const mirrorCollections = [];
    if (collectionName === 'orders') mirrorCollections.push('bookings');
    else if (collectionName === 'bookings') {
      mirrorCollections.push('orders');
      mirrorCollections.push('deliveries');
    } else if (collectionName === 'deliveries') mirrorCollections.push('bookings');
    else if (collectionName === 'gobuy_orders') mirrorCollections.push('gobuyOrders');
    else if (collectionName === 'gobuyOrders') mirrorCollections.push('gobuy_orders');

    for (const mirrorCollection of mirrorCollections) {
      unsubs.push(
        onSnapshot(doc(db, mirrorCollection, docId), (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          applyDocSnapshot(data, docId, mirrorCollection);
          const loc = extractRiderLocation(data);
          if (loc) {
            applyRiderLoc(loc, locTimestamp(data, data.riderLocation, data.currentLocation, data.rider?.location, data.rider?.currentLocation, data.lastKnownLocation));
          }
        })
      );
    }

    unsubs.push(
      onSnapshot(doc(db, 'deliveryTracking', docId), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.status) {
          const raw = String(data.status).toLowerCase().replace(/\s+/g, '_');
          const mapped = mapFirestoreToTrackingStatus(data.status);
          const currentRank = trackingStatusRank(statusRef.current);
          const nextRank = trackingStatusRank(mapped);
          const allow =
            mapped === 'delivered' ||
            (!isCoarseTrackingStatus(raw) && nextRank >= currentRank);
          if (allow) {
            setStatus(mapped);
            statusRef.current = mapped;
          }
        }
        const loc = extractRiderLocation({
          riderLocation: data.riderLocation || data.currentLocation,
          currentLocation: data.currentLocation,
        });
        if (loc) applyRiderLoc(loc, locTimestamp(data, data.riderLocation, data.currentLocation));
        if (data.riderId) setRiderId(data.riderId);
      })
    );

    unsubs.push(
      onSnapshot(doc(db, 'rider_locations', docId), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const loc = extractRiderLocation(data);
        if (loc) applyRiderLoc(loc, locTimestamp(data));
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [trackingDoc, applyDocSnapshot, applyRiderLoc]);

  // Rider GPS — canonical riderLocations path only (legacy riders doc removed at scale).
  useEffect(() => {
    if (!riderId || !db) return undefined;
    return onSnapshot(doc(db, 'riderLocations', riderId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const loc = extractRiderLocation({
        riderLocation: data.location || data,
        currentLocation: data,
      });
      if (loc) applyRiderLoc(loc, locTimestamp(data, data.location));
      if (data.name) setRiderName(data.name);
      if (data.phone) setRiderPhone(data.phone);
    });
  }, [riderId, applyRiderLoc]);

  // Tick so a GPS feed that stops publishing flips to stale without waiting
  // for another state change to re-render.
  useEffect(() => {
    if (!riderLocationAt) return undefined;
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, [riderLocationAt]);

  const hasRider = Boolean(riderId);
  const hasLiveGps =
    Boolean(riderLocation) &&
    riderLocationAt != null &&
    now - riderLocationAt <= STALE_GPS_MS;
  const isSearching = status === 'finding_shopper' && !hasRider;

  return {
    loading,
    booking,
    bookingDocId: trackingDoc?.docId || null,
    status,
    riderId,
    pickup,
    dropoff,
    riderLocation,
    routeCoords,
    riderProgress,
    etaMinutes,
    distanceKm,
    deliveryPin,
    riderName,
    riderPhone,
    hasRider,
    hasLiveGps,
    isSearching,
  };
}
