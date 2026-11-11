/**
 * 📱 EXAMPLE: Manual WhatsApp Notification Trigger
 * Use this in your React components to manually send WhatsApp notifications
 * Location: go7/src/utils/whatsappHelper.js
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Send WhatsApp notification for an order
 * @param {string} orderId - The Firestore order document ID
 * @returns {Promise<object>} Result with success status and message ID
 */
export const sendOrderWhatsAppNotification = async (orderId) => {
  try {
    const functions = getFunctions();
    const sendManualWhatsApp = httpsCallable(functions, 'sendManualWhatsApp');
    
    const result = await sendManualWhatsApp({ orderId });
    
    console.log('✅ WhatsApp notification sent:', result.data);
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error('❌ Failed to send WhatsApp:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * EXAMPLE USAGE IN REACT COMPONENT:
 * 
 * import { sendOrderWhatsAppNotification } from '../utils/whatsappHelper';
 * 
 * const handleResendNotification = async () => {
 *   const result = await sendOrderWhatsAppNotification(orderId);
 *   
 *   if (result.success) {
 *     toast.success('WhatsApp notification sent!');
 *   } else {
 *     toast.error('Failed to send notification');
 *   }
 * };
 * 
 * return (
 *   <button onClick={handleResendNotification}>
 *     📱 Resend WhatsApp Notification
 *   </button>
 * );
 */

// Export for use in other modules
export default {
  sendOrderWhatsAppNotification
};
