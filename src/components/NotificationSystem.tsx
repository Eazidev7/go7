import React, { useState, useEffect } from 'react';

export interface NotificationData {
  id: string;
  type: 'order_confirmed' | 'rider_pickup' | 'rider_arriving' | 'delivered' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number; // in milliseconds, default 4000
}

interface NotificationProps {
  notification: NotificationData;
  onDismiss: (id: string) => void;
}

interface NotificationSystemProps {
  notifications: NotificationData[];
  onDismiss: (id: string) => void;
  className?: string;
}

// Individual notification component with animations
const NotificationToast: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger vibration on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]); // Short vibration pattern
    }

    // Slide in animation
    setTimeout(() => setIsVisible(true), 100);

    // Auto-dismiss timer
    const dismissTimer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onDismiss(notification.id), 300);
    }, notification.duration || 4000);

    return () => clearTimeout(dismissTimer);
  }, [notification.id, notification.duration, onDismiss]);

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'order_confirmed':
        return (
          <div className="bg-green-100 rounded-full p-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'rider_pickup':
        return (
          <div className="bg-blue-100 rounded-full p-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        );
      case 'rider_arriving':
        return (
          <div className="bg-yellow-100 rounded-full p-2">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        );
      case 'delivered':
        return (
          <div className="bg-green-100 rounded-full p-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 3H5M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="bg-orange-100 rounded-full p-2">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L2.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-100 rounded-full p-2">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="bg-blue-100 rounded-full p-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getNotificationColors = () => {
    switch (notification.type) {
      case 'order_confirmed':
      case 'delivered':
        return 'bg-white border-l-4 border-green-500 shadow-lg';
      case 'rider_pickup':
      case 'info':
        return 'bg-white border-l-4 border-blue-500 shadow-lg';
      case 'rider_arriving':
      case 'warning':
        return 'bg-white border-l-4 border-yellow-500 shadow-lg';
      case 'error':
        return 'bg-white border-l-4 border-red-500 shadow-lg';
      default:
        return 'bg-white border-l-4 border-gray-500 shadow-lg';
    }
  };

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-[9999] transform transition-all duration-300 ease-out ${
        isVisible && !isLeaving 
          ? 'translate-y-0 opacity-100' 
          : '-translate-y-full opacity-0'
      }`}
      style={{
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <div className={`${getNotificationColors()} rounded-lg p-4 mx-auto max-w-sm`}>
        <div className="flex items-start space-x-3">
          {getNotificationIcon()}
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {notification.title}
            </h4>
            <p className="text-sm text-gray-600 leading-5">
              {notification.message}
            </p>
            <div className="text-xs text-gray-400 mt-1">
              {notification.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>

          <button
            onClick={() => {
              setIsLeaving(true);
              setTimeout(() => onDismiss(notification.id), 300);
            }}
            className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
          <div
            className={`h-1 rounded-full transition-all duration-[${notification.duration || 4000}ms] ease-linear ${
              notification.type === 'delivered' || notification.type === 'order_confirmed' 
                ? 'bg-green-500' 
                : notification.type === 'rider_arriving' || notification.type === 'warning'
                ? 'bg-yellow-500'
                : notification.type === 'error'
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}
            style={{
              width: isVisible && !isLeaving ? '0%' : '100%',
              transitionDuration: `${notification.duration || 4000}ms`
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Main notification system component
const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onDismiss,
  className = ""
}) => {
  return (
    <div className={`notification-system ${className}`}>
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};

// Hook for managing notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const addNotification = (notificationData: Omit<NotificationData, 'id' | 'timestamp'>) => {
    const notification: NotificationData = {
      ...notificationData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };

    setNotifications(prev => [...prev, notification]);

    // Play notification sound if available
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      speechSynthesis.speak(utterance);
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Pre-defined notification creators
  const showOrderConfirmed = (orderId: string) => {
    addNotification({
      type: 'order_confirmed',
      title: 'Order Confirmed! 🎉',
      message: `Your order ${orderId} has been confirmed and is being prepared.`,
    });
  };

  const showRiderPickup = (riderName: string, orderId: string) => {
    addNotification({
      type: 'rider_pickup',
      title: 'Order Picked Up! 📦',
      message: `${riderName} has picked up your order ${orderId} and is on the way.`,
    });
  };

  const showRiderArriving = (riderName: string, eta: string) => {
    addNotification({
      type: 'rider_arriving',
      title: 'Rider Arriving Soon! 🚴‍♂️',
      message: `${riderName} will arrive in ${eta}. Please be ready to receive your order.`,
    });
  };

  const showDelivered = (orderId: string) => {
    addNotification({
      type: 'delivered',
      title: 'Order Delivered! ✅',
      message: `Your order ${orderId} has been delivered successfully. Enjoy your meal!`,
      duration: 6000, // Show longer for delivered status
    });
  };

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAllNotifications,
    showOrderConfirmed,
    showRiderPickup,
    showRiderArriving,
    showDelivered,
  };
};

export default NotificationSystem;