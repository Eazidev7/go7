import { getToken } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getMessagingSafe, auth, db } from '../firebase/config';

/** Firebase web push keys are 88 chars; trailing '=' is often dropped when copying from console */
export function normalizeVapidKey(key) {
  if (!key) return '';
  const trimmed = String(key).trim();
  if (trimmed.length === 87 && !trimmed.endsWith('=')) {
    return `${trimmed}=`;
  }
  return trimmed;
}

export function isValidVapidKey(key) {
  const normalized = normalizeVapidKey(key);
  return normalized.length === 88 && /^[A-Za-z0-9+/=_-]+$/.test(normalized);
}

/**
 * Persist FCM token to Firestore (client write — works without Cloud Functions / Blaze).
 */
export const saveFCMTokenToServer = async (token, userId = null) => {
  try {
    if (!token || !db) return false;
    const uid = userId || auth?.currentUser?.uid;
    if (!uid) {
      console.log('📵 No signed-in user yet — FCM token kept in localStorage only');
      return false;
    }

    await setDoc(
      doc(db, 'users', uid),
      {
        fcmToken: token,
        fcmTokenUpdated: serverTimestamp(),
        fcmTokenUpdatedAt: new Date().toISOString(),
        platform: /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? 'ios-web'
          : /Android/i.test(navigator.userAgent)
            ? 'android-web'
            : 'web',
        lastActive: serverTimestamp(),
      },
      { merge: true }
    );
    console.log('✅ FCM token saved to Firestore for', uid);
    return true;
  } catch (error) {
    console.error('❌ Error saving FCM token to Firestore:', error);
    return false;
  }
};

/**
 * Request notification permission and generate FCM token
 * @returns {Promise<string|null>} FCM token or null if permission denied
 */
export const requestNotificationPermission = async () => {
  try {
    const messaging = await getMessagingSafe();
    if (!messaging) {
      console.warn('🚫 FCM not supported in this browser');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('🚫 Notification permission denied');
      return null;
    }

    const vapidKey = normalizeVapidKey(import.meta.env.VITE_FIREBASE_VAPID_KEY);
    if (!vapidKey) {
      console.warn('⚠️ VAPID key not configured. Push notifications are disabled.');
      console.info('ℹ️ Add VITE_FIREBASE_VAPID_KEY to .env (Firebase → Project Settings → Cloud Messaging → Web Push certificates)');
      return null;
    }

    if (!isValidVapidKey(vapidKey)) {
      console.error('❌ Invalid VAPID key format. Expected exactly 88 character base64 string. Length:', vapidKey.length);
      return null;
    }

    let token = null;
    try {
      const existingReg =
        typeof window !== 'undefined' ? window.fcmSwRegistration : null;
      const registration =
        existingReg ||
        (await navigator.serviceWorker.register(
          `/firebase-messaging-sw.js?v=${encodeURIComponent(String(Date.now()))}`,
          { scope: '/' }
        ));
      if (typeof window !== 'undefined') window.fcmSwRegistration = registration;
      await navigator.serviceWorker.ready;
      token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
    } catch (tokenError) {
      if (
        tokenError.message?.includes('SSL certificate') ||
        tokenError.message?.includes('service worker') ||
        tokenError.message?.includes('failed-service-worker-registration')
      ) {
        console.warn('⚠️ FCM disabled (SSL/service worker issue)');
        return null;
      }
      if (
        tokenError.code === 'messaging/token-subscribe-failed' ||
        tokenError.message?.includes('authentication credential') ||
        tokenError.message?.includes('OAuth 2') ||
        tokenError.message?.includes('401')
      ) {
        console.warn(
          '⚠️ FCM push disabled (401). Check VITE_FIREBASE_VAPID_KEY matches Firebase Console → Project settings → Cloud Messaging → Web Push certificates for go7-app-209e4, then restart/rebuild.'
        );
        return null;
      }
      if (
        tokenError.code === 'installations/request-failed' ||
        tokenError.message?.includes('PERMISSION_DENIED') ||
        tokenError.message?.includes('403')
      ) {
        console.warn('⚠️ FCM not available (Firebase Installations / Cloud Messaging API).');
        return null;
      }
      console.error('❌ Failed to generate FCM token:', tokenError);
      return null;
    }

    if (!token) {
      console.warn('⚠️ FCM token generation returned null');
      return null;
    }

    localStorage.setItem('go7_fcm_token', token);
    await saveFCMTokenToServer(token);
    return token;
  } catch (error) {
    if (error.message?.includes('service worker') || error.message?.includes('Service worker')) {
      console.log('ℹ️ Push notifications not available (service worker)');
      return null;
    }
    console.error('❌ Error requesting notification permission:', error.message);
    return null;
  }
};

export const getStoredFCMToken = () => localStorage.getItem('go7_fcm_token');

export const isNotificationSupported = async () => {
  const messaging = await getMessagingSafe();
  return 'Notification' in window && 'serviceWorker' in navigator && messaging !== null;
};

export const getNotificationPermission = () => {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
};

export const initializeFCM = async () => {
  try {
    if (!(await isNotificationSupported())) {
      console.warn('⚠️ Notifications not supported in this browser');
      return false;
    }

    const permission = getNotificationPermission();
    if (permission === 'granted') {
      const token = await requestNotificationPermission().catch(() => null);
      return !!token;
    }
    if (permission === 'default') {
      console.log('📋 Notification permission not yet requested');
      return false;
    }
    console.warn('🚫 Notification permission previously denied');
    return false;
  } catch (error) {
    console.error('❌ FCM initialization error:', error);
    return false;
  }
};

/** Re-save stored token when auth becomes available (login after permission). */
export const syncStoredFCMTokenForUser = async (userId) => {
  const token = getStoredFCMToken();
  if (!token || !userId) return false;
  return saveFCMTokenToServer(token, userId);
};
