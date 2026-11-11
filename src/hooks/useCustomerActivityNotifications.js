import { useEffect, useRef } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { mapFirestoreToTrackingStatus } from '../utils/trackingStatusUtils';
import {
  ACTIVITY_TOAST_COPY,
  claimActivityToastSlot,
  loadNotifPrefs,
  preferenceKeyForStatus,
} from '../utils/activityNotificationCopy';

const ACTIVE_LIMIT = 25;
const BOOT_QUIET_MS = 2000;

function rawStatus(data) {
  return data?.status || data?.orderStatus || data?.dispatchStatus || '';
}

function shouldToastStatus(mapped) {
  const prefs = loadNotifPrefs();
  if (prefs.pushEnabled === false) return false;
  const key = preferenceKeyForStatus(mapped);
  return prefs[key] !== false;
}

function showActivityToast(mapped, orderId) {
  if (!shouldToastStatus(mapped)) return;
  if (!claimActivityToastSlot(orderId, mapped)) return;

  const copy = ACTIVITY_TOAST_COPY[mapped];
  if (!copy) return;

  toast(copy.title, {
    description: copy.message,
    duration: mapped === 'nearby' || mapped === 'delivered' ? 7000 : 4500,
  });

  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      // eslint-disable-next-line no-new
      new Notification(copy.title, {
        body: copy.message,
        tag: `go7-activity-${orderId}-${mapped}`,
        icon: '/go7-logo.png',
      });
    }
  } catch {
    /* ignore */
  }
}

/**
 * App-wide listener: booking / order / gobuy status changes → Sonner toasts
 * anywhere in the Figma customer app (not only on Track).
 */
export function useCustomerActivityNotifications() {
  const { user, currentUser } = useAuth();
  const uid = user?.uid || currentUser?.uid;
  const lastStatusByKey = useRef(new Map());
  const bootReady = useRef(false);

  useEffect(() => {
    if (!uid) return undefined;

    bootReady.current = false;
    lastStatusByKey.current = new Map();
    const bootTimer = setTimeout(() => {
      bootReady.current = true;
    }, BOOT_QUIET_MS);

    const handleSnapshot = (snapshot, collectionName) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added' && change.type !== 'modified') return;

        const data = change.doc.data() || {};
        const mapped = mapFirestoreToTrackingStatus(rawStatus(data));
        const key = `${collectionName}:${change.doc.id}`;
        const prev = lastStatusByKey.current.get(key);

        // Always seed map on first sighting; only toast after boot + real change
        if (prev === undefined) {
          lastStatusByKey.current.set(key, mapped);
          // New doc after boot (fresh booking) → toast
          if (bootReady.current && change.type === 'added') {
            showActivityToast(mapped, change.doc.id);
          }
          return;
        }

        lastStatusByKey.current.set(key, mapped);
        if (!bootReady.current) return;
        if (prev === mapped) return;

        showActivityToast(mapped, change.doc.id);
      });
    };

    const unsubs = [];

    const collections = [
      { name: 'orders', field: 'userId' },
      { name: 'bookings', field: 'userId' },
      { name: 'gobuyOrders', field: 'userId' },
    ];

    collections.forEach(({ name, field }) => {
      try {
        const q = query(
          collection(db, name),
          where(field, '==', uid),
          limit(ACTIVE_LIMIT)
        );
        unsubs.push(
          onSnapshot(
            q,
            (snap) => handleSnapshot(snap, name),
            (err) => {
              console.warn(`[activity-notifications] ${name} listen failed:`, err?.message || err);
            }
          )
        );
      } catch (err) {
        console.warn(`[activity-notifications] ${name} query failed:`, err?.message || err);
      }
    });

    return () => {
      clearTimeout(bootTimer);
      unsubs.forEach((u) => {
        try {
          u();
        } catch {
          /* ignore */
        }
      });
    };
  }, [uid]);
}

export default useCustomerActivityNotifications;
