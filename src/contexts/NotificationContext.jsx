// Go7 Customer Notification Context
// Comprehensive notification system with FCM integration for Go7 delivery tracking
import { createContext, useState, useContext, useEffect } from "react";
import { onMessage } from 'firebase/messaging';
import { toast } from 'sonner';
import { soundService } from '../services/soundService.js';
import {
  Bike,
  Truck,
  Package,
  MapPin,
  CheckCircle2,
  Target,
  XCircle,
  Bell,
} from 'lucide-react';
import { getMessagingSafe } from '../firebase/config';
import {
  initializeFCM,
  requestNotificationPermission,
  syncStoredFCMTokenForUser,
} from '../utils/requestPermission';
import { useAuth } from './AuthContext';
import { loadNotifPrefs } from '../utils/activityNotificationCopy';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Alias export for compatibility
export const useNotificationContext = useNotification;

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [fcmToken, setFcmToken] = useState(null);
  const [fcmSupported, setFcmSupported] = useState(false);

  const notify = (message, type = "info", duration = 4000, icon = null) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type,
      icon,
      timestamp: new Date(),
      duration
    };

    console.log(`🔔 [Go7 Notification] ${type.toUpperCase()}: ${message}`);

    setNotifications(prev => [...prev, notification]);

    // Trigger device feedback
    if (navigator.vibrate) {
      const vibrationPattern = {
        info: [100],
        success: [100, 50, 100],
        warning: [150, 100, 150],
        error: [200, 100, 200, 100, 200]
      };
      navigator.vibrate(vibrationPattern[type] || [100]);
    }

    // Play notification sound. Routed through the shared sound service so the
    // file path, the browser autoplay unlock and the mute preference are all
    // handled in one place (this previously pointed at /assets/sounds/ — a path
    // that does not exist, so it silently failed every time).
    soundService.playForType(type);

    // Auto-remove notification
    setTimeout(() => {
      removeNotification(id);
    }, duration);

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // FCM Initialization and Foreground Message Handling
  useEffect(() => {
    const setupFCM = async () => {
      try {
        console.log('🚀 Initializing Go7 FCM...');
        
        // Initialize FCM (gracefully handle all errors)
        const isInitialized = await initializeFCM().catch(err => {
          if (err.name === 'AbortError' || err.message?.includes('push service')) {
            console.warn('⚠️ Push notifications unavailable (browser/network limitation). App continues normally.');
          } else if (err.message?.includes('authentication credential') || err.message?.includes('OAuth 2') || err.code === 'messaging/token-subscribe-failed') {
            console.warn('⚠️ FCM authentication issue - push notifications disabled. App will continue normally.');
          } else if (err.message?.includes('SSL certificate') || err.message?.includes('service worker')) {
            console.warn('⚠️ FCM service worker registration failed (SSL certificate - expected for local HTTPS). Trying to continue...');
          } else {
            console.warn('⚠️ FCM not available:', err.message);
          }
          return false;
        });
        setFcmSupported(isInitialized);
        
        if (isInitialized) {
          // Get messaging instance safely
          const messagingInstance = await getMessagingSafe();
          
          if (messagingInstance) {
            // Listen for foreground messages
            const unsubscribe = onMessage(messagingInstance, (payload) => {
              console.log('📱 Foreground FCM message received:', payload);

              const prefs = loadNotifPrefs();
              if (prefs.pushEnabled === false) return;

              const title = payload.notification?.title || 'GO7 Update';
              const message = payload.notification?.body || 'New notification';
              const type = payload.data?.type === 'delivery_issue' ? 'error' :
                          payload.data?.type === 'delivery_complete' || payload.data?.type === 'delivery_status'
                            ? 'success' : 'info';

              // Sonner is what the Figma customer app shows
              if (type === 'error') toast.error(title, { description: message, duration: 6000 });
              else if (type === 'success') toast.success(title, { description: message, duration: 6000 });
              else toast(title, { description: message, duration: 6000 });

              notify(message, type, 6000);
            });
            
            return unsubscribe;
          }
        }
      } catch (error) {
        console.error('❌ FCM setup error:', error);
      }
    };
    
    setupFCM();
  }, []);

  // When user signs in, attach any locally stored FCM token to their Firestore profile
  useEffect(() => {
    if (!user?.uid) return;
    syncStoredFCMTokenForUser(user.uid).catch(() => {});
  }, [user?.uid]);

  // Request notification permission (exposed function)
  const requestPushPermission = async () => {
    try {
      const token = await requestNotificationPermission();
      setFcmToken(token);
      return token;
    } catch (error) {
      console.error('❌ Permission request error:', error);
      return null;
    }
  };

  // Delivery-specific notification shortcuts
  const deliveryNotifications = {
    riderAssigned: (riderName, zone) =>
      notify(`${riderName} from ${zone} has been assigned to your order!`, "success", 4000, Bike),

    riderEnroute: (riderName) =>
      notify(`${riderName} is heading to pickup your order!`, "info", 4000, Bike),

    packagePickedUp: (riderName) =>
      notify(`${riderName} has picked up your package!`, "success", 4000, Package),

    riderDelivering: (riderName, eta) =>
      notify(`${riderName} is on the way! ETA: ${eta}`, "success", 4000, Truck),

    nearDestination: (riderName) =>
      notify(`${riderName} is nearby! Get ready for delivery`, "warning", 4000, MapPin),

    delivered: () =>
      notify(`Delivery completed! Thanks for using Go7!`, "success", 6000, CheckCircle2),

    orderConfirmed: (orderId) =>
      notify(`Order #${orderId} confirmed and processing`, "success", 4000, Target),

    error: (message) =>
      notify(message, "error", 4000, XCircle)
  };

  return (
    <NotificationContext.Provider value={{ 
      notify, 
      removeNotification, 
      clearAll, 
      notifications,
      // FCM functionality
      requestPushPermission,
      fcmToken,
      fcmSupported,
      // Delivery shortcuts
      ...deliveryNotifications 
    }}>
      {children}
      
      {/* Render active notifications */}
      <div className="go7-notification-container">
        {notifications.map(notification => {
          const Icon = typeof notification.icon === 'function' ? notification.icon : Bell;
          return (
            <div
              key={notification.id}
              className={`go7-toast go7-toast--${notification.type}`}
              onClick={() => removeNotification(notification.id)}
            >
              <Icon className="go7-toast__icon" size={18} />
              <div className="go7-toast__content">
                <p className="go7-toast__message">{String(notification.message || '')}</p>
              </div>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};