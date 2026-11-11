// GO7 Core Chat Functions - Secure messaging system
// Two core functions: sendMessage() and subscribeToChat()

import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

/**
 * Send a message to a delivery chat
 * @param {string} deliveryId - The delivery ID to send message to
 * @param {string} senderId - ID of the message sender (authenticated user)
 * @param {string} receiverId - ID of the message receiver
 * @param {string} text - The message text content
 * @returns {Promise<string>} - Returns the message document ID
 */
export async function sendMessage(deliveryId, senderId, receiverId, text) {
  try {
    // Verify user is authenticated
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to send messages');
    }

    // Verify sender matches authenticated user
    if (senderId !== auth.currentUser.uid) {
      throw new Error('Sender ID must match authenticated user');
    }

    // Validate inputs
    if (!deliveryId || !senderId || !receiverId || !text?.trim()) {
      throw new Error('All fields (deliveryId, senderId, receiverId, text) are required');
    }

    // Verify user is participant in this delivery (security check)
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    const deliverySnap = await getDoc(deliveryRef);
    
    if (!deliverySnap.exists()) {
      throw new Error('Delivery not found');
    }

    const deliveryData = deliverySnap.data();
    const isParticipant = deliveryData.customerId === senderId || 
                         deliveryData.riderId === senderId;
    
    if (!isParticipant) {
      throw new Error('Access denied: User is not a participant in this delivery');
    }

    // Verify receiver is also a participant
    const isReceiverParticipant = deliveryData.customerId === receiverId || 
                                 deliveryData.riderId === receiverId;
    
    if (!isReceiverParticipant) {
      throw new Error('Receiver is not a participant in this delivery');
    }

    // Create message document
    const messageData = {
      deliveryId: deliveryId,
      senderId: senderId,
      receiverId: receiverId,
      text: text.trim(),
      timestamp: serverTimestamp(),
      isRead: false,
      senderName: auth.currentUser.displayName || 'User',
      messageType: 'text'
    };

    // Add message to Firestore
    const messagesRef = collection(db, 'chats', deliveryId, 'messages');
    const docRef = await addDoc(messagesRef, messageData);

    console.log('✅ Message sent successfully:', docRef.id);
    return docRef.id;

  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time chat messages for a delivery
 * @param {string} deliveryId - The delivery ID to listen to
 * @param {Function} callback - Callback function that receives messages array
 * @returns {Function} - Unsubscribe function to stop listening
 */
export function subscribeToChat(deliveryId, callback) {
  try {
    // Verify user is authenticated
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to subscribe to chat');
    }

    // Validate inputs
    if (!deliveryId) {
      throw new Error('DeliveryId is required');
    }

    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    // Create real-time query for messages
    const messagesRef = collection(db, 'chats', deliveryId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    console.log(`🔄 Subscribing to chat messages for delivery: ${deliveryId}`);

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages = [];
        
        snapshot.forEach((doc) => {
          messages.push({
            id: doc.id,
            ...doc.data()
          });
        });

        console.log(`📨 Received ${messages.length} messages for delivery ${deliveryId}`);
        
        // Call the callback with messages array
        callback(messages);
      },
      (error) => {
        console.error('❌ Error in chat subscription:', error);
        
        // Call callback with error
        if (typeof callback === 'function') {
          callback([], error);
        }
      }
    );

    // Return unsubscribe function
    return () => {
      unsubscribe();
      console.log(`🔇 Unsubscribed from chat for delivery: ${deliveryId}`);
    };

  } catch (error) {
    console.error('❌ Error setting up chat subscription:', error);
    throw error;
  }
}

/**
 * Utility function to format message timestamp
 * @param {any} timestamp - Firebase timestamp
 * @returns {string} - Formatted time string
 */
export function formatMessageTime(timestamp) {
  if (!timestamp) return '';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
}

/**
 * Utility function to check if user can access delivery chat
 * @param {string} deliveryId - The delivery ID
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} - True if user can access
 */
export async function canAccessChat(deliveryId, userId) {
  try {
    if (!deliveryId || !userId) return false;

    const deliveryRef = doc(db, 'deliveries', deliveryId);
    const deliverySnap = await getDoc(deliveryRef);
    
    if (!deliverySnap.exists()) return false;

    const deliveryData = deliverySnap.data();
    return deliveryData.customerId === userId || deliveryData.riderId === userId;
  } catch (error) {
    console.error('Error checking chat access:', error);
    return false;
  }
}