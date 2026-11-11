import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

/**
 * Fuel Purchase Chat Notification Service
 * Sends automated chat messages when fuel is purchased/delivered
 */

export class FuelChatNotificationService {
  
  /**
   * Send fuel purchase confirmation to customer chat
   * @param {string} orderId - Fuel order ID
   * @param {string} customerId - Customer ID
   * @param {string} riderId - Rider ID
   * @param {object} purchaseDetails - Purchase details
   */
  static async sendFuelPurchaseConfirmation({
    orderId,
    customerId,
    riderId,
    fuelType,
    amount,
    volume,
    stationName,
    stationAddress
  }) {
    try {
      const messagesRef = collection(db, 'chats', orderId, 'messages');
      
      const message = {
        senderId: riderId,
        senderType: 'rider',
        recipientId: customerId,
        recipientType: 'customer',
        type: 'fuel_purchase_confirmation',
        content: `✅ Fuel purchased at ${stationName}\n\n${fuelType.toUpperCase()}: ${volume.toFixed(1)} ${fuelType === 'cng' ? 'KG' : 'Litres'}\nAmount: ₦${amount.toLocaleString()}\n\nYour fuel is on the way! 🚗`,
        metadata: {
          orderId,
          fuelType,
          amount,
          volume,
          stationName,
          stationAddress,
          timestamp: new Date().toISOString()
        },
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(messagesRef, message);
      
      // Update chat metadata
      const chatRef = doc(db, 'chats', orderId);
      await updateDoc(chatRef, {
        lastMessage: message.content,
        lastMessageAt: serverTimestamp(),
        lastMessageBy: riderId,
        updatedAt: serverTimestamp(),
        fuelOrderId: orderId
      });

      return { success: true, messageId: message.id };
    } catch (error) {
      console.error('Error sending fuel purchase confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send fuel delivery completion message
   * @param {string} orderId - Fuel order ID
   * @param {string} customerId - Customer ID
   * @param {string} riderId - Rider ID
   * @param {object} deliveryDetails - Delivery details
   */
  static async sendFuelDeliveryConfirmation({
    orderId,
    customerId,
    riderId,
    fuelType,
    volume,
    deliveryLocation
  }) {
    try {
      const messagesRef = collection(db, 'chats', orderId, 'messages');
      
      const message = {
        senderId: riderId,
        senderType: 'rider',
        recipientId: customerId,
        recipientType: 'customer',
        type: 'fuel_delivery_confirmation',
        content: `🎉 Fuel delivered successfully!\n\n${fuelType.toUpperCase()}: ${volume.toFixed(1)} ${fuelType === 'cng' ? 'KG' : 'Litres'}\nLocation: ${deliveryLocation}\n\nThank you for using GO7 Fuel Delivery!`,
        metadata: {
          orderId,
          fuelType,
          volume,
          deliveryLocation,
          timestamp: new Date().toISOString()
        },
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(messagesRef, message);
      
      // Update chat metadata
      const chatRef = doc(db, 'chats', orderId);
      await updateDoc(chatRef, {
        lastMessage: message.content,
        lastMessageAt: serverTimestamp(),
        lastMessageBy: riderId,
        updatedAt: serverTimestamp(),
        status: 'completed'
      });

      return { success: true, messageId: message.id };
    } catch (error) {
      console.error('Error sending fuel delivery confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send rider assignment notification
   * @param {string} orderId - Fuel order ID
   * @param {string} customerId - Customer ID
   * @param {string} riderId - Rider ID
   * @param {object} riderDetails - Rider details
   */
  static async sendRiderAssignmentNotification({
    orderId,
    customerId,
    riderId,
    riderName,
    riderPhone
  }) {
    try {
      const messagesRef = collection(db, 'chats', orderId, 'messages');
      
      const message = {
        senderId: 'system',
        senderType: 'system',
        recipientId: customerId,
        recipientType: 'customer',
        type: 'rider_assignment',
        content: `🏍️ Rider assigned!\n\nRider: ${riderName}\nPhone: ${riderPhone}\n\nYour fuel order is being processed. Track your order for real-time updates.`,
        metadata: {
          orderId,
          riderId,
          riderName,
          riderPhone,
          timestamp: new Date().toISOString()
        },
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(messagesRef, message);
      
      // Update chat metadata
      const chatRef = doc(db, 'chats', orderId);
      await updateDoc(chatRef, {
        lastMessage: message.content,
        lastMessageAt: serverTimestamp(),
        lastMessageBy: 'system',
        updatedAt: serverTimestamp(),
        riderId
      });

      return { success: true, messageId: message.id };
    } catch (error) {
      console.error('Error sending rider assignment notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send fuel purchase photo proof (optional)
   * @param {string} orderId - Fuel order ID
   * @param {string} customerId - Customer ID
   * @param {string} riderId - Rider ID
   * @param {string} imageUrl - Photo URL
   * @param {string} caption - Photo caption
   */
  static async sendFuelPurchasePhoto({
    orderId,
    customerId,
    riderId,
    imageUrl,
    caption = 'Fuel purchase proof'
  }) {
    try {
      const messagesRef = collection(db, 'chats', orderId, 'messages');
      
      const message = {
        senderId: riderId,
        senderType: 'rider',
        recipientId: customerId,
        recipientType: 'customer',
        type: 'fuel_purchase_photo',
        content: caption,
        imageUrl,
        metadata: {
          orderId,
          imageUrl,
          timestamp: new Date().toISOString()
        },
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(messagesRef, message);
      
      // Update chat metadata
      const chatRef = doc(db, 'chats', orderId);
      await updateDoc(chatRef, {
        lastMessage: '📷 Photo: Fuel purchase proof',
        lastMessageAt: serverTimestamp(),
        lastMessageBy: riderId,
        updatedAt: serverTimestamp(),
        hasPhotoProof: true
      });

      return { success: true, messageId: message.id };
    } catch (error) {
      console.error('Error sending fuel purchase photo:', error);
      return { success: false, error: error.message };
    }
  }
}

export default FuelChatNotificationService;