import React, { useState, useEffect } from 'react';
import { fcmService } from '../services/fcmService';
import NotificationPermission from './NotificationPermission';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

/**
 * FCMTester Component
 * A component to test Firebase Cloud Messaging functionality
 * Can be used in development/admin pages to verify FCM is working
 */
const FCMTester = () => {
  const [fcmToken, setFcmToken] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('Test Notification');
  const [notificationBody, setNotificationBody] = useState('This is a test notification from GO7 Delivery');
  const [notificationType, setNotificationType] = useState('chat_message');
  const [sendStatus, setSendStatus] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // Check if FCM is initialized
    const initializeFCM = async () => {
      try {
        await fcmService.initialize();
        const token = fcmService.getCurrentToken();
        if (token) {
          setFcmToken(token);
        }
      } catch (error) {
        console.error('Error initializing FCM:', error);
      }
    };

    initializeFCM();
  }, []);

  const handlePermissionChange = (permissionData) => {
    console.log('Permission changed:', permissionData);
    if (permissionData.token) {
      setFcmToken(permissionData.token);
    }
  };

  const handleTokenRefresh = async () => {
    try {
      const token = await fcmService.refreshToken();
      if (token) {
        setFcmToken(token);
        setSendStatus('Token refreshed successfully');
      } else {
        setSendStatus('Failed to refresh token');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      setSendStatus(`Error: ${error.message}`);
    }
  };

  const handleSendTestNotification = async () => {
    if (!fcmToken) {
      setSendStatus('No FCM token available. Enable notifications first.');
      return;
    }

    setIsSending(true);
    setSendStatus('Sending notification...');

    try {
      // Use Firebase Cloud Function to send test notification
      const sendTestNotification = httpsCallable(functions, 'sendTestNotification');
      
      const result = await sendTestNotification({
        token: fcmToken,
        notification: {
          title: notificationTitle,
          body: notificationBody
        },
        data: {
          type: notificationType,
          deliveryId: 'test-delivery-123',
          senderName: 'FCM Test',
          senderRole: 'system',
          clickAction: '/notifications/test'
        }
      });

      console.log('Notification sent:', result.data);
      setSendStatus(`Notification sent successfully: ${result.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.error('Error sending notification:', error);
      setSendStatus(`Error: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fcm-tester p-4 border rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Firebase Cloud Messaging Tester</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Notification Permission</h3>
        <NotificationPermission onPermissionChange={handlePermissionChange} />
      </div>
      
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">FCM Token</h3>
        <div className="flex items-center mb-2">
          <input
            type="text"
            value={fcmToken}
            readOnly
            className="flex-1 p-2 border rounded mr-2 text-xs font-mono overflow-x-auto"
            placeholder="No token available"
          />
          <button
            onClick={handleTokenRefresh}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Send Test Notification</h3>
        
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Notification Type</label>
          <select
            value={notificationType}
            onChange={(e) => setNotificationType(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="chat_message">Chat Message</option>
            <option value="delivery_status">Delivery Status</option>
            <option value="system_alert">System Alert</option>
          </select>
        </div>
        
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={notificationTitle}
            onChange={(e) => setNotificationTitle(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Notification Title"
          />
        </div>
        
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea
            value={notificationBody}
            onChange={(e) => setNotificationBody(e.target.value)}
            className="w-full p-2 border rounded"
            rows="3"
            placeholder="Notification Message"
          ></textarea>
        </div>
        
        <button
          onClick={handleSendTestNotification}
          disabled={isSending || !fcmToken}
          className={`w-full py-2 rounded text-white ${
            isSending || !fcmToken ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isSending ? 'Sending...' : 'Send Test Notification'}
        </button>
        
        {sendStatus && (
          <div className={`mt-3 p-2 rounded text-sm ${
            sendStatus.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {sendStatus}
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-500">
        <p>Note: For testing FCM in development, make sure you:</p>
        <ol className="list-decimal pl-5 mt-1">
          <li>Have deployed the required Cloud Functions</li>
          <li>Are using a secure context (HTTPS or localhost)</li>
          <li>Have granted notification permissions</li>
        </ol>
      </div>
    </div>
  );
};

export default FCMTester;