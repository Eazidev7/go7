/**
 * Capacitor native FCM registration (Android Play build).
 * Web push continues to use VAPID + service worker separately.
 */
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

let listenersBound = false;

async function saveNativeToken(uid, token) {
  if (!uid || !token || !db) return;
  await setDoc(
    doc(db, 'users', uid),
    {
      fcmToken: token,
      fcmTokenPlatform: 'android-native',
      fcmTokenUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function initNativePushNotifications(uid) {
  if (!uid || !Capacitor.isNativePlatform()) return { ok: false, reason: 'not_native' };
  if (Capacitor.getPlatform() !== 'android') return { ok: false, reason: 'not_android' };

  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') {
      return { ok: false, reason: 'denied' };
    }

    if (!listenersBound) {
      await PushNotifications.addListener('registration', async (token) => {
        try {
          await saveNativeToken(uid, token.value);
          console.log('[nativePush] token saved');
        } catch (err) {
          console.warn('[nativePush] save failed', err?.message);
        }
      });
      await PushNotifications.addListener('registrationError', (err) => {
        console.warn('[nativePush] registrationError', err);
      });
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[nativePush] received', notification?.title || notification);
      });
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[nativePush] action', action?.notification?.data);
      });
      listenersBound = true;
    }

    await PushNotifications.register();
    return { ok: true };
  } catch (err) {
    console.warn('[nativePush] init failed', err?.message || err);
    return { ok: false, reason: err?.message || 'error' };
  }
}
