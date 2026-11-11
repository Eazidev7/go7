// 🔔 GO7 NOTIFICATION UTILITIES — Nov 2025
// Request FCM permissions and save token to Firestore

import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

// VAPID key from Firebase Console > Project Settings > Cloud Messaging
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "YOUR_VAPID_KEY_HERE";

/**
 * Request notification permission and get FCM token
 * @param {string} userId - Current user ID
 * @returns {Promise<string|null>} - FCM token or null if denied
 */
export const requestNotificationPermission = async (userId) => {
  try {
    // Check if notifications are supported
    if (!("Notification" in window)) {
      console.log("❌ This browser does not support notifications");
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      console.log("✅ Notification permission granted");
      
      // Get FCM token
      const messaging = getMessaging();
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (token) {
        console.log("🔑 FCM Token:", token);
        
        // Save token to Firestore user document
        if (userId) {
          await saveFCMToken(userId, token);
        }
        
        return token;
      } else {
        console.log("❌ No registration token available");
        return null;
      }
    } else if (permission === "denied") {
      console.log("❌ Notification permission denied");
      return null;
    } else {
      console.log("⚠️ Notification permission dismissed");
      return null;
    }
  } catch (error) {
    console.error("❌ Error requesting notification permission:", error);
    return null;
  }
};

/**
 * Save FCM token to user's Firestore document
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 */
export const saveFCMToken = async (userId, token) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      fcmToken: token,
      fcmTokenUpdatedAt: new Date(),
    });
    console.log("✅ FCM token saved to Firestore");
  } catch (error) {
    console.error("❌ Error saving FCM token:", error);
    throw error;
  }
};

/**
 * Listen for foreground notifications
 * @param {Function} callback - Function to handle notification payload
 */
export const onForegroundMessage = (callback) => {
  try {
    const messaging = getMessaging();
    
    onMessage(messaging, (payload) => {
      console.log("🔔 Foreground notification received:", payload);
      
      const { title, body } = payload.notification || {};
      const data = payload.data || {};
      
      // Show browser notification
      if (title && body) {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: data.orderId || "go7-notification",
          data,
        });
      }
      
      // Call custom callback
      if (callback && typeof callback === "function") {
        callback(payload);
      }
    });
  } catch (error) {
    console.error("❌ Error setting up foreground message listener:", error);
  }
};

/**
 * Check if user has granted notification permission
 * @returns {boolean}
 */
export const hasNotificationPermission = () => {
  if (!("Notification" in window)) return false;
  return Notification.permission === "granted";
};

/**
 * Check notification permission status
 * @returns {string} - "granted", "denied", "default"
 */
export const getNotificationPermissionStatus = () => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
};

/**
 * Show a simple notification (requires permission)
 * @param {string} title - Notification title
 * @param {Object} options - Notification options
 */
export const showNotification = (title, options = {}) => {
  if (!hasNotificationPermission()) {
    console.log("⚠️ Notification permission not granted");
    return;
  }

  const defaultOptions = {
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    ...options,
  };

  new Notification(title, defaultOptions);
};
