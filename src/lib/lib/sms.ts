/**
 * Client-side SMS notification utilities
 * Used to trigger SMS notifications from the frontend
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

// Initialize functions
const functions = getFunctions();

// Types for SMS notification data
export interface SMSNotificationData {
  orderId: string;
  customerPhone: string;
  recipientPhone?: string;
  eventType: 'assigned' | 'enroute_dropoff' | 'delivered';
  riderName?: string;
  eta?: string;
  trackingLink?: string;
  receiptLink?: string;
}

export interface CustomSMSData {
  to: string;
  message: string;
  orderId?: string;
}

/**
 * Send SMS notification for order events
 */
export const sendSMSNotification = async (data: SMSNotificationData): Promise<{ success: boolean; message: string; recipient?: string }> => {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to send SMS notifications');
    }

    const sendSMS = httpsCallable(functions, 'sendSMSNotification');
    const result = await sendSMS(data);
    
    return result.data as { success: boolean; message: string; recipient?: string };
  } catch (error: any) {
    console.error('Error sending SMS notification:', error);
    throw new Error(error.message || 'Failed to send SMS notification');
  }
};

/**
 * Send custom SMS (admin only)
 */
export const sendCustomSMS = async (data: CustomSMSData): Promise<{ success: boolean; message: string; recipient?: string }> => {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to send custom SMS');
    }

    const sendSMS = httpsCallable(functions, 'sendCustomSMS');
    const result = await sendSMS(data);
    
    return result.data as { success: boolean; message: string; recipient?: string };
  } catch (error: any) {
    console.error('Error sending custom SMS:', error);
    throw new Error(error.message || 'Failed to send custom SMS');
  }
};

/**
 * Helper functions for common SMS scenarios
 */

/**
 * Notify customer when rider is assigned
 */
export const notifyRiderAssigned = async (orderId: string, customerPhone: string, riderName: string) => {
  return sendSMSNotification({
    orderId,
    customerPhone,
    eventType: 'assigned',
    riderName,
    trackingLink: `${window.location.origin}/track/${orderId}`
  });
};

/**
 * Notify recipient when package is en route
 */
export const notifyEnRoute = async (orderId: string, recipientPhone: string, eta?: string) => {
  return sendSMSNotification({
    orderId,
    customerPhone: '', // Not used for this event type
    recipientPhone,
    eventType: 'enroute_dropoff',
    eta
  });
};

/**
 * Notify customer when package is delivered
 */
export const notifyDelivered = async (orderId: string, customerPhone: string) => {
  return sendSMSNotification({
    orderId,
    customerPhone,
    eventType: 'delivered',
    receiptLink: `${window.location.origin}/receipt/${orderId}`
  });
};

/**
 * Hook for using SMS notifications in React components
 */
export const useSMSNotifications = () => {
  const sendNotification = async (data: SMSNotificationData) => {
    try {
      const result = await sendSMSNotification(data);
      console.log('SMS sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw error;
    }
  };

  const sendCustom = async (data: CustomSMSData) => {
    try {
      const result = await sendCustomSMS(data);
      console.log('Custom SMS sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to send custom SMS:', error);
      throw error;
    }
  };

  return {
    sendNotification,
    sendCustom,
    notifyRiderAssigned,
    notifyEnRoute,
    notifyDelivered
  };
};
