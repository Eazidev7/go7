// FCM Service - Client-side Firebase Cloud Messaging
// Handles push notification registration and token management

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';
import { isValidVapidKey, normalizeVapidKey } from '../utils/requestPermission';

class FCMService {
  constructor() {
    this.messaging = null;
    this.currentToken = null;
    this.isSupported = false;
    this.initialized = false;
  }

  // Initialize FCM service
  async initialize() {
    try {
      // Check if browser supports FCM
      this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
      
      if (!this.isSupported) {
        console.log('📱 FCM not supported in this browser');
        return false;
      }

      // Initialize messaging
      this.messaging = getMessaging();
      // Listen for messages from the service worker (e.g. pushsubscriptionchange notifications)
      if (navigator.serviceWorker && navigator.serviceWorker.addEventListener) {
        try {
          navigator.serviceWorker.addEventListener('message', (event) => {
            try {
              const data = event.data || {};
              if (data.type === 'GO7_PUSH_SUBSCRIPTION_CHANGED') {
                console.log('🔔 FCMService: Received push-subscription-change from SW. Re-requesting permission/token...');
                // Re-run permission/token flow in page context where VAPID key is available
                this.requestPermission();
              }
            } catch (msgErr) {
              console.error('❌ Error handling SW message in FCMService:', msgErr);
            }
          });
        } catch (listenerErr) {
          console.warn('⚠️ Could not attach service worker message listener:', listenerErr);
        }
      }
      this.initialized = true;

      console.log('🔔 FCM Service initialized');
      return true;

    } catch (error) {
      console.error('❌ Error initializing FCM:', error);
      return false;
    }
  }

  // Request notification permission and get FCM token
  async requestPermission() {
    try {
      if (!this.initialized) {
        const success = await this.initialize();
        if (!success) return null;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('📵 Notification permission denied');
        return null;
      }

      console.log('✅ Notification permission granted');

      // Check if VAPID key is configured
      const vapidKey = normalizeVapidKey(import.meta.env.VITE_FIREBASE_VAPID_KEY);
      if (!vapidKey) {
        console.warn('⚠️ VAPID key not configured. Push notifications disabled.');
        console.info('💡 Add VITE_FIREBASE_VAPID_KEY to .env to enable push notifications');
        console.info('💡 Get VAPID key: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates');
        return null;
      }

      if (!isValidVapidKey(vapidKey)) {
        console.error('❌ Invalid VAPID key format. Expected exactly 88 character base64 string.');
        console.error('💡 Current key length:', vapidKey.length, '(should be 88)');
        console.error('💡 Auto-fix available: Run "npm run fix-firebase" to generate valid key');
        return null;
      }

      console.log('✅ VAPID key validation passed');

      try {
        const token = await getToken(this.messaging, {
          vapidKey: vapidKey
        });

        if (!token) {
          console.warn('⚠️ FCM token is null - notifications may not work');
          return null;
        }

        console.log('📱 FCM Token received:', token.substring(0, 20) + '...');
        this.currentToken = token;
        localStorage.setItem('go7_fcm_token', token);

        // Prefer client Firestore write (works without Blaze); fall back to callable
        try {
          const { saveFCMTokenToServer } = await import('../utils/requestPermission');
          await saveFCMTokenToServer(token);
        } catch (saveErr) {
          console.warn('Client FCM save failed, trying callable:', saveErr?.message || saveErr);
          await this.updateUserToken(token);
        }

        return token;
      } catch (tokenError) {
        console.error('❌ FCM token generation failed:', tokenError);
        if (tokenError.message?.includes('applicationServerKey') || tokenError.message?.includes('VAPID')) {
          console.error('💡 Solution: Verify VAPID key in Firebase Console → Project Settings → Cloud Messaging');
        }
        return null;
      }

    } catch (error) {
      console.error('❌ Error getting FCM permission/token:', error.message);
      
      // Provide helpful error messages
      if (error.message?.includes('applicationServerKey') || error.message?.includes('VAPID')) {
        console.warn('💡 TIP: Get VAPID key from Firebase Console → Cloud Messaging → Web Push certificates');
      }
      
      return null;
    }
  }

  // Update user's FCM token in Firestore
  async updateUserToken(token) {
    try {
      if (!auth.currentUser) {
        console.log('📵 User not authenticated, skipping token update');
        return false;
      }

      const updateFCMToken = httpsCallable(functions, 'updateFCMToken');
      
      const result = await updateFCMToken({
        fcmToken: token,
        platform: this.getPlatform()
      });

      console.log('✅ FCM token updated in user profile');
      return result.data.success;

    } catch (error) {
      console.error('❌ Error updating FCM token:', error);
      return false;
    }
  }

  // Set up foreground message listener
  setupMessageListener() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('🔔 Foreground message received:', payload);

      const { notification, data } = payload;

      // Handle different message types
      if (data.type === 'chat_message') {
        this.handleChatNotification(notification, data);
      } else if (data.type === 'delivery_status') {
        this.handleDeliveryStatusNotification(notification, data);
      }

      // Show browser notification if page is not focused
      if (document.hidden && notification) {
        this.showBrowserNotification(notification, data);
      }
    });
  }

  // Handle chat message notifications
  handleChatNotification(notification, data) {
    const { deliveryId, senderId, senderName, senderRole } = data;

    console.log(`💬 Chat notification: ${senderName} (${senderRole}) in delivery ${deliveryId}`);

    // Dispatch custom event for app to handle
    const chatEvent = new CustomEvent('go7ChatNotification', {
      detail: {
        deliveryId,
        senderId,
        senderName,
        senderRole,
        message: notification.body,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(chatEvent);

    // Update unread count in UI if chat is not open
    this.updateUnreadCount(deliveryId);
  }

  // Handle delivery status notifications
  handleDeliveryStatusNotification(notification, data) {
    const { deliveryId, newStatus, userRole } = data;

    console.log(`📦 Delivery status notification: ${deliveryId} → ${newStatus}`);

    // Dispatch custom event for app to handle
    const statusEvent = new CustomEvent('go7DeliveryStatusNotification', {
      detail: {
        deliveryId,
        newStatus,
        userRole,
        message: notification.body,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(statusEvent);
  }

  // Show browser notification
  showBrowserNotification(notification, data) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const options = {
      body: notification.body,
      icon: notification.icon || '/icons/go7-icon-192.png',
      badge: notification.badge || '/icons/go7-badge-72.png',
      tag: notification.tag || `go7-${Date.now()}`,
      requireInteraction: false,
      actions: notification.actions || [],
      data: data
    };

    const browserNotification = new Notification(notification.title, options);

    // Handle notification click
    browserNotification.onclick = (event) => {
      event.preventDefault();
      
      // Focus window
      window.focus();
      
      // Navigate to relevant page
      if (data.clickAction) {
        window.location.href = data.clickAction;
      } else if (data.deliveryId) {
        window.location.href = `/tracking/${data.deliveryId}`;
      }
      
      browserNotification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => {
      browserNotification.close();
    }, 5000);
  }

  // Update unread message count (placeholder)
  updateUnreadCount(deliveryId) {
    // This would integrate with your chat state management
    // For now, just dispatch an event
    const unreadEvent = new CustomEvent('go7UnreadMessage', {
      detail: { deliveryId }
    });
    window.dispatchEvent(unreadEvent);
  }

  // Get platform information
  getPlatform() {
    if (/Android/i.test(navigator.userAgent)) return 'android';
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'ios';
    return 'web';
  }

  // Check if FCM is supported
  isSupported() {
    return this.isSupported;
  }

  // Get current FCM token
  getCurrentToken() {
    return this.currentToken;
  }

  // Refresh FCM token
  async refreshToken() {
    return await this.requestPermission();
  }
}

// Create singleton instance
export const fcmService = new FCMService();

// Auto-initialize when user is authenticated
auth.onAuthStateChanged((user) => {
  if (user) {
    // Initialize FCM for authenticated users
    fcmService.initialize().then(() => {
      fcmService.setupMessageListener();
      
      // Request permission after short delay
      setTimeout(() => {
        fcmService.requestPermission();
      }, 2000);
    });
  }
});

export default fcmService;