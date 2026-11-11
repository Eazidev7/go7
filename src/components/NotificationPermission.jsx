import React, { useState, useEffect } from 'react';
import { fcmService } from '../services/fcmService';

/**
 * NotificationPermission component
 * Handles requesting and displaying notification permission status
 * Can be included in settings, profile, or onboarding screens
 */
const NotificationPermission = ({ onPermissionChange, style, buttonStyle }) => {
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      setIsSupported(false);
      return;
    }

    // Get current permission status
    setPermissionStatus(Notification.permission);
    
    // Initialize FCM
    fcmService.initialize();
  }, []);

  const requestPermission = async () => {
    try {
      // Request permission via FCM service
      const token = await fcmService.requestPermission();
      
      // Update state with new permission status
      setPermissionStatus(Notification.permission);
      
      // Notify parent component
      if (onPermissionChange) {
        onPermissionChange({
          status: Notification.permission,
          token: token
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // If notifications are not supported, return a message
  if (!isSupported) {
    return (
      <div className="notification-permission" style={style}>
        <p>Push notifications are not supported in your browser.</p>
      </div>
    );
  }

  // Render UI based on permission status
  return (
    <div className="notification-permission" style={style}>
      {permissionStatus === 'default' && (
        <div>
          <p>Enable notifications to get updates on your deliveries</p>
          <button
            onClick={requestPermission}
            className="btn-primary"
            style={buttonStyle}
          >
            Enable Notifications
          </button>
        </div>
      )}
      
      {permissionStatus === 'granted' && (
        <div>
          <p>✅ Notifications are enabled</p>
          <p className="text-sm">You'll receive updates about your deliveries</p>
        </div>
      )}
      
      {permissionStatus === 'denied' && (
        <div>
          <p>❌ Notifications are blocked</p>
          <p className="text-sm">
            Please enable notifications in your browser settings to receive
            delivery updates
          </p>
          <button
            onClick={() => window.open('chrome://settings/content/notifications')}
            className="btn-secondary"
            style={buttonStyle}
          >
            Open Browser Settings
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPermission;