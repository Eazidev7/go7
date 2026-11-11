// Go7 Notification Settings Component
// Allows users to enable/disable push notifications and manage preferences

import { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import './NotificationSettings.css';

const NotificationSettings = () => {
  const { 
    requestPushPermission, 
    fcmToken, 
    fcmSupported, 
    notify 
  } = useNotification();
  
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    orderUpdates: true,
    riderUpdates: true,
    deliveryComplete: true,
    promotions: false
  });

  // Check current notification permission status
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleEnablePushNotifications = async () => {
    setIsLoading(true);
    
    try {
      const token = await requestPushPermission();
      
      if (token) {
        setNotificationPermission('granted');
        notify('🔔 Push notifications enabled! You\'ll receive real-time delivery updates.', 'success');
      } else {
        notify('❌ Failed to enable push notifications. Please check your browser settings.', 'error');
      }
    } catch (error) {
      console.error('Push notification setup error:', error);
      notify('❌ Error setting up push notifications', 'error');
    }
    
    setIsLoading(false);
  };

  const handlePreferenceChange = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    // Save preferences to localStorage
    const updatedPrefs = { ...preferences, [key]: !preferences[key] };
    localStorage.setItem('go7_notification_preferences', JSON.stringify(updatedPrefs));
  };

  // Load saved preferences on mount
  useEffect(() => {
    const saved = localStorage.getItem('go7_notification_preferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    }
  }, []);

  const getPermissionStatus = () => {
    switch (notificationPermission) {
      case 'granted':
        return { status: 'Enabled', color: '#28a745', icon: '✅' };
      case 'denied':
        return { status: 'Blocked', color: '#dc3545', icon: '🚫' };
      default:
        return { status: 'Not Set', color: '#ffc107', icon: '⚪' };
    }
  };

  const permissionStatus = getPermissionStatus();

  if (!fcmSupported) {
    return (
      <div className="notification-settings">
        <div className="settings-header">
          <h3>📱 Notification Settings</h3>
        </div>
        <div className="unsupported-notice">
          <p>⚠️ Push notifications are not supported in your current browser.</p>
          <p>For the best Go7 experience, try using Chrome, Firefox, or Safari.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-settings">
      <div className="settings-header">
        <h3>📱 Notification Settings</h3>
        <p>Stay updated on your deliveries with real-time notifications</p>
      </div>

      <div className="permission-status">
        <div className="status-row">
          <span className="status-label">Push Notifications:</span>
          <span 
            className="status-value" 
            style={{ color: permissionStatus.color }}
          >
            {permissionStatus.icon} {permissionStatus.status}
          </span>
        </div>
        
        {fcmToken && (
          <div className="token-info">
            <small>✅ Device registered for notifications</small>
          </div>
        )}
      </div>

      {notificationPermission !== 'granted' && (
        <div className="enable-section">
          <button 
            className="enable-notifications-btn"
            onClick={handleEnablePushNotifications}
            disabled={isLoading || notificationPermission === 'denied'}
          >
            {isLoading ? (
              <>🔄 Setting up...</>
            ) : notificationPermission === 'denied' ? (
              '🚫 Notifications Blocked'
            ) : (
              '🔔 Enable Push Notifications'
            )}
          </button>
          
          {notificationPermission === 'denied' && (
            <p className="blocked-help">
              To enable notifications, click the 🔒 icon in your address bar and allow notifications for this site.
            </p>
          )}
        </div>
      )}

      <div className="preferences-section">
        <h4>📋 Notification Preferences</h4>
        <div className="preference-list">
          <label className="preference-item">
            <input
              type="checkbox"
              checked={preferences.orderUpdates}
              onChange={() => handlePreferenceChange('orderUpdates')}
            />
            <span className="preference-label">
              🎯 Order confirmations and status updates
            </span>
          </label>

          <label className="preference-item">
            <input
              type="checkbox"
              checked={preferences.riderUpdates}
              onChange={() => handlePreferenceChange('riderUpdates')}
            />
            <span className="preference-label">
              🛵 Rider assignment and pickup updates
            </span>
          </label>

          <label className="preference-item">
            <input
              type="checkbox"
              checked={preferences.deliveryComplete}
              onChange={() => handlePreferenceChange('deliveryComplete')}
            />
            <span className="preference-label">
              🎉 Delivery completion notifications
            </span>
          </label>

          <label className="preference-item">
            <input
              type="checkbox"
              checked={preferences.promotions}
              onChange={() => handlePreferenceChange('promotions')}
            />
            <span className="preference-label">
              🏷️ Promotions and special offers
            </span>
          </label>
        </div>
      </div>

      <div className="notification-info">
        <h4>ℹ️ About Notifications</h4>
        <ul>
          <li>✅ Get real-time updates even when the app is closed</li>
          <li>🔋 Battery-efficient background notifications</li>
          <li>🔒 Your notification preferences are private and secure</li>
          <li>⚙️ You can change these settings anytime</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationSettings;