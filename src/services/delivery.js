// 🚚 Go7 Delivery Service - Frontend Firebase Integration
// Real-time delivery tracking, status updates, and notifications

import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  setDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

class DeliveryService {
  constructor() {
    this.listeners = new Map(); // Track active listeners
    this.messaging = null;
    this.fcmToken = null;
    this.initializeMessaging();
  }

  // 🔹 1️⃣ INITIALIZE FCM MESSAGING
  async initializeMessaging() {
    try {
      // Skip FCM initialization if VAPID key is not configured
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey || vapidKey === 'your-vapid-key-here') {
        console.log('ℹ️ FCM messaging disabled (VAPID key not configured)');
        return null;
      }

      this.messaging = getMessaging();
      
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        
        // Get FCM token
        this.fcmToken = await getToken(this.messaging, {
          vapidKey: vapidKey
        });
        
        console.log('📱 FCM Token:', this.fcmToken);

        // Listen for foreground messages
        onMessage(this.messaging, (payload) => {
          console.log('📨 Foreground message received:', payload);
          this.handleForegroundMessage(payload);
        });

        return this.fcmToken;
      } else {
        console.warn('⚠️ Notification permission denied');
        return null;
      }
    } catch (error) {
      // Handle specific FCM errors gracefully
      if (error.code === 'installations/request-failed' || 
          error.message?.includes('PERMISSION_DENIED') ||
          error.message?.includes('403')) {
        console.warn('⚠️ FCM messaging not available (Firebase Installations API not enabled). App will continue without push notifications.');
        console.info('ℹ️ To enable: Firebase Console → Project Settings → Cloud Messaging API must be enabled');
      } else if (error.message?.includes('SSL certificate') || 
                 error.message?.includes('service worker')) {
        console.warn('⚠️ FCM disabled (SSL/service worker issue - normal for local development)');
      } else {
        console.warn('⚠️ FCM messaging not available:', error.message);
      }
      return null;
    }
  }

  // 🔹 2️⃣ HANDLE FOREGROUND NOTIFICATIONS
  handleForegroundMessage(payload) {
    const { notification, data } = payload;
    
    // Show browser notification
    if (notification) {
      const notificationTitle = notification.title;
      const notificationOptions = {
        body: notification.body,
        icon: notification.icon || '/icon-192.png',
        badge: '/icon-72.png',
        tag: data?.orderId || 'go7-delivery',
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View Order'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      };

      const browserNotification = new Notification(notificationTitle, notificationOptions);
      
      // Handle notification clicks
      browserNotification.onclick = () => {
        if (data?.orderId) {
          window.focus();
          window.location.href = `/mobile-tracking/${data.orderId}`;
        }
      };

      // Show confetti for delivery completion
      if (data?.showConfetti === 'true') {
        this.showDeliveryConfetti();
      }
    }
  }

  // 🔹 3️⃣ START DELIVERY TRACKING
  startDeliveryTracking(orderId, callbacks = {}) {
    try {
      console.log(`🚀 Starting delivery tracking for order: ${orderId}`);
      
      // Clean up existing listener
      this.stopDeliveryTracking(orderId);
      
      // Create new listener
      const deliveryRef = doc(db, 'deliveries', orderId);
      const unsubscribe = onSnapshot(deliveryRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          console.log(`📦 Delivery update for ${orderId}:`, data);
          
          // Call appropriate callbacks
          if (callbacks.onStatusChange && data.status) {
            callbacks.onStatusChange(data.status, data);
          }
          
          if (callbacks.onLocationUpdate && data.currentRiderLocation) {
            callbacks.onLocationUpdate(data.currentRiderLocation, data);
          }
          
          if (callbacks.onETAUpdate && data.etaText) {
            callbacks.onETAUpdate(data.etaText, data.eta, data);
          }
          
          if (callbacks.onDeliveryUpdate) {
            callbacks.onDeliveryUpdate(data);
          }
        } else {
          console.warn(`❌ Delivery ${orderId} not found`);
          if (callbacks.onError) {
            callbacks.onError(new Error('Delivery not found'));
          }
        }
      }, (error) => {
        console.error(`❌ Error tracking delivery ${orderId}:`, error);
        if (callbacks.onError) {
          callbacks.onError(error);
        }
      });
      
      // Store listener for cleanup
      this.listeners.set(orderId, unsubscribe);
      
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error starting delivery tracking:', error);
      throw error;
    }
  }

  // 🔹 4️⃣ START RIDER TRACKING
  startRiderTracking(riderId, callbacks = {}) {
    try {
      console.log(`🚴‍♂️ Starting rider tracking: ${riderId}`);
      
      const riderKey = `rider_${riderId}`;
      this.stopTracking(riderKey);
      
      const riderRef = doc(db, 'riders', riderId);
      const unsubscribe = onSnapshot(riderRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          console.log(`📍 Rider location update for ${riderId}:`, data.location);
          
          if (callbacks.onLocationUpdate && data.location) {
            callbacks.onLocationUpdate(data.location, data);
          }
          
          if (callbacks.onRiderUpdate) {
            callbacks.onRiderUpdate(data);
          }
        }
      }, (error) => {
        console.error(`❌ Error tracking rider ${riderId}:`, error);
        if (callbacks.onError) {
          callbacks.onError(error);
        }
      });
      
      this.listeners.set(riderKey, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error starting rider tracking:', error);
      throw error;
    }
  }

  // 🔹 5️⃣ UPDATE RIDER LOCATION (for rider app)
  async updateRiderLocation(riderId, location) {
    try {
      const riderRef = doc(db, 'riders', riderId);
      await updateDoc(riderRef, {
        location: {
          lat: location.lat,
          lng: location.lng
        },
        lastSeen: serverTimestamp(),
        online: true
      });
      
      console.log(`📍 Updated rider ${riderId} location:`, location);
      return true;
    } catch (error) {
      console.error('❌ Error updating rider location:', error);
      throw error;
    }
  }

  // 🔹 6️⃣ UPDATE DELIVERY STATUS
  async updateDeliveryStatus(orderId, status, additionalData = {}) {
    try {
      const deliveryRef = doc(db, 'deliveries', orderId);
      const updateData = {
        status,
        updatedAt: serverTimestamp(),
        ...additionalData
      };
      
      // Add status-specific data
      if (status === 'delivered') {
        updateData.completedAt = serverTimestamp();
      }
      
      await updateDoc(deliveryRef, updateData);
      
      console.log(`📦 Updated delivery ${orderId} status to: ${status}`);
      return true;
    } catch (error) {
      console.error('❌ Error updating delivery status:', error);
      throw error;
    }
  }

  // 🔹 7️⃣ CREATE NEW DELIVERY
  async createDelivery(orderData) {
    try {
      const deliveryData = {
        // Order details
        orderId: orderData.orderId,
        userId: orderData.userId,
        
        // Location data
        pickupLocation: orderData.pickupLocation,
        dropoffLocation: orderData.dropoffLocation,
        pickupAddress: orderData.pickupAddress,
        dropoffAddress: orderData.dropoffAddress,
        
        // Delivery details
        status: 'requested',
        riderId: null,
        currentRiderLocation: null,
        
        // Timing
        requestedAt: serverTimestamp(),
        eta: null,
        etaText: null,
        
        // Payment
        paymentStatus: orderData.paymentStatus || 'pending',
        amount: orderData.amount,
        
        // Notifications
        notified5min: false,
        notified2min: false,
        notifiedArrived: false,
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const deliveryRef = doc(db, 'deliveries', orderData.orderId);
      await setDoc(deliveryRef, deliveryData);
      
      console.log(`✅ Created delivery: ${orderData.orderId}`);
      return deliveryData;
    } catch (error) {
      console.error('❌ Error creating delivery:', error);
      throw error;
    }
  }

  // 🔹 8️⃣ GET USER DELIVERIES
  getUserDeliveries(userId, callbacks = {}) {
    try {
      const deliveriesRef = collection(db, 'deliveries');
      const q = query(
        deliveriesRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const deliveries = [];
        snapshot.forEach(doc => {
          deliveries.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`📦 Found ${deliveries.length} deliveries for user ${userId}`);
        
        if (callbacks.onDeliveriesUpdate) {
          callbacks.onDeliveriesUpdate(deliveries);
        }
      }, (error) => {
        console.error('❌ Error getting user deliveries:', error);
        if (callbacks.onError) {
          callbacks.onError(error);
        }
      });
      
      const listenerKey = `user_deliveries_${userId}`;
      this.listeners.set(listenerKey, unsubscribe);
      
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up user deliveries listener:', error);
      throw error;
    }
  }

  // 🔹 9️⃣ SAVE USER FCM TOKEN
  async saveUserFCMToken(userId, userData = {}) {
    try {
      if (!this.fcmToken) {
        console.warn('⚠️ No FCM token available');
        return false;
      }
      
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        fcmToken: this.fcmToken,
        lastTokenUpdate: serverTimestamp(),
        ...userData
      }, { merge: true });
      
      console.log(`✅ Saved FCM token for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error saving FCM token:', error);
      return false;
    }
  }

  // 🔹 🔟 SHOW DELIVERY CONFETTI
  showDeliveryConfetti() {
    // Create confetti effect for successful delivery
    try {
      // Import confetti library if available
      if (typeof window !== 'undefined' && window.confetti) {
        window.confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#E0001B', '#FFD700', '#00FF00']
        });
      } else {
        // Fallback: dispatch custom event for confetti component
        const confettiEvent = new CustomEvent('showConfetti', {
          detail: { type: 'delivery_success' }
        });
        window.dispatchEvent(confettiEvent);
      }
    } catch (error) {
      console.error('❌ Error showing confetti:', error);
    }
  }

  // 🔹 CLEANUP METHODS
  stopDeliveryTracking(orderId) {
    const unsubscribe = this.listeners.get(orderId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(orderId);
      console.log(`🛑 Stopped tracking delivery: ${orderId}`);
    }
  }

  stopTracking(key) {
    const unsubscribe = this.listeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(key);
      console.log(`🛑 Stopped tracking: ${key}`);
    }
  }

  stopAllTracking() {
    this.listeners.forEach((unsubscribe, key) => {
      unsubscribe();
      console.log(`🛑 Stopped tracking: ${key}`);
    });
    this.listeners.clear();
  }
}

// Create singleton instance
const deliveryService = new DeliveryService();

export default deliveryService;

// Export individual methods for convenience
export const {
  startDeliveryTracking,
  startRiderTracking,
  updateDeliveryStatus,
  updateRiderLocation,
  createDelivery,
  getUserDeliveries,
  saveUserFCMToken,
  stopDeliveryTracking,
  stopAllTracking
} = deliveryService;