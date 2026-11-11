// React Hook for FCM Notifications
// Integrates push notifications with GO7 chat and delivery tracking

import { useEffect, useState } from 'react';
import { fcmService } from '../services/fcmService';

export function useFCMNotifications() {
  const [fcmToken, setFcmToken] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [chatNotifications, setChatNotifications] = useState([]);
  const [deliveryNotifications, setDeliveryNotifications] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Initialize FCM when component mounts
  useEffect(() => {
    const initializeFCM = async () => {
      const supported = await fcmService.initialize();
      if (supported) {
        setNotificationPermission(Notification.permission);
        
        // Get existing token if permission already granted
        if (Notification.permission === 'granted') {
          const token = await fcmService.requestPermission();
          setFcmToken(token);
        }
      }
    };

    initializeFCM();
  }, []);

  // Set up event listeners for notifications
  useEffect(() => {
    // Chat notification handler
    const handleChatNotification = (event) => {
      const notification = event.detail;
      
      setChatNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
      
      // Update unread count for delivery
      setUnreadCounts(prev => ({
        ...prev,
        [notification.deliveryId]: (prev[notification.deliveryId] || 0) + 1
      }));
    };

    // Delivery status notification handler
    const handleDeliveryStatusNotification = (event) => {
      const notification = event.detail;
      
      setDeliveryNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
    };

    // Unread message handler
    const handleUnreadMessage = (event) => {
      const { deliveryId } = event.detail;
      
      setUnreadCounts(prev => ({
        ...prev,
        [deliveryId]: (prev[deliveryId] || 0) + 1
      }));
    };

    // Add event listeners
    window.addEventListener('go7ChatNotification', handleChatNotification);
    window.addEventListener('go7DeliveryStatusNotification', handleDeliveryStatusNotification);
    window.addEventListener('go7UnreadMessage', handleUnreadMessage);

    // Cleanup
    return () => {
      window.removeEventListener('go7ChatNotification', handleChatNotification);
      window.removeEventListener('go7DeliveryStatusNotification', handleDeliveryStatusNotification);
      window.removeEventListener('go7UnreadMessage', handleUnreadMessage);
    };
  }, []);

  // Request notification permission
  const requestPermission = async () => {
    const token = await fcmService.requestPermission();
    setFcmToken(token);
    setNotificationPermission(Notification.permission);
    return token;
  };

  // Clear notifications for a specific delivery
  const clearChatNotifications = (deliveryId) => {
    setChatNotifications(prev => 
      prev.filter(notif => notif.deliveryId !== deliveryId)
    );
    
    setUnreadCounts(prev => ({
      ...prev,
      [deliveryId]: 0
    }));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setChatNotifications([]);
    setDeliveryNotifications([]);
    setUnreadCounts({});
  };

  // Get unread count for specific delivery
  const getUnreadCount = (deliveryId) => {
    return unreadCounts[deliveryId] || 0;
  };

  // Check if FCM is supported
  const isSupported = fcmService.isSupported();

  return {
    // FCM status
    fcmToken,
    notificationPermission,
    isSupported,
    
    // Notification data
    chatNotifications,
    deliveryNotifications,
    unreadCounts,
    
    // Actions
    requestPermission,
    clearChatNotifications,
    clearAllNotifications,
    getUnreadCount,
    
    // Utility
    hasPermission: notificationPermission === 'granted',
    needsPermission: notificationPermission === 'default'
  };
}

// Component for requesting notification permissions
export function NotificationPermissionBanner({ onPermissionGranted }) {
  const { needsPermission, requestPermission } = useFCMNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // Show banner after short delay if permission needed
  useEffect(() => {
    if (needsPermission) {
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [needsPermission]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const token = await requestPermission();
      if (token) {
        setIsVisible(false);
        onPermissionGranted?.(token);
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !needsPermission) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-2xl mr-3">🔔</span>
          <div>
            <p className="font-medium">Stay updated on your deliveries</p>
            <p className="text-sm text-blue-100">Get notified when riders send messages or delivery status changes</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRequestPermission}
            disabled={isRequesting}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 disabled:opacity-50"
          >
            {isRequesting ? 'Enabling...' : 'Enable Notifications'}
          </button>
          <button
            onClick={handleDismiss}
            className="text-blue-200 hover:text-white p-2"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// Notification badge component
export function NotificationBadge({ deliveryId, className = "" }) {
  const { getUnreadCount } = useFCMNotifications();
  const count = getUnreadCount(deliveryId);

  if (count === 0) return null;

  return (
    <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}