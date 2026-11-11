/**
 * Enhanced Firebase Chat Service for GO7 Delivery System
 * Real-time messaging with read receipts and role-based authentication
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  where,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';

/**
 * Enhanced Chat Service Class
 */
export class DeliveryChatService {
  constructor() {
    this.currentUser = null;
    this.unsubscribes = new Map();
  }

  /**
   * Initialize the chat service with authenticated user
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          this.currentUser = user;
          console.log('🔐 Enhanced Chat service initialized for user:', user.uid);
          resolve(user);
        } else {
          console.log('❌ No authenticated user for chat');
          reject(new Error('User not authenticated'));
        }
        unsubscribe();
      });
    });
  }

  /**
   * Send a message to a delivery chat
   * @param {string} deliveryId - The delivery ID
   * @param {string} text - Message text
   * @param {string} receiverId - Recipient user ID
   * @returns {Promise<string>} Message ID
   */
  async sendMessage(deliveryId, text, receiverId) {
    try {
      if (!this.currentUser) {
        throw new Error('User must be authenticated to send messages');
      }

      if (!deliveryId || !text.trim() || !receiverId) {
        throw new Error('Missing required fields: deliveryId, text, or receiverId');
      }

      // Get sender role
      const senderRole = await this.getUserRole(this.currentUser.uid);

      const messageData = {
        senderId: this.currentUser.uid,
        senderRole: senderRole,
        receiverId: receiverId,
        text: text.trim(),
        timestamp: serverTimestamp(),
        isRead: false,
        messageType: 'text',
        deliveryId: deliveryId,
        platform: 'web',
        messageVersion: 1
      };

      const messagesRef = collection(db, 'chats', deliveryId, 'messages');
      const messageDoc = await addDoc(messagesRef, messageData);

      // Update chat metadata
      await this.updateChatMetadata(deliveryId, text, this.currentUser.uid, senderRole);

      return messageDoc.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time messages for a delivery
   * @param {string} deliveryId - The delivery ID
   * @param {Function} callback - Callback function to handle messages
   * @returns {Function} Unsubscribe function
   */
  subscribeToMessages(deliveryId, callback) {
    try {
      if (!deliveryId) {
        throw new Error('Delivery ID is required');
      }

      // Clean up existing subscription
      if (this.unsubscribes.has(deliveryId)) {
        this.unsubscribes.get(deliveryId)();
      }

      const messagesRef = collection(db, 'chats', deliveryId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const messages = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
              id: doc.id,
              ...data,
              // Convert timestamp to Date for easier handling
              timestamp: data.timestamp?.toDate() || new Date()
            });
          });
          
          // Auto-mark messages as read for current user
          this.autoMarkAsRead(deliveryId, messages);
          
          callback(messages);
        },
        (error) => {
          console.error('Error listening to messages:', error);
          callback([]);
        }
      );

      this.unsubscribes.set(deliveryId, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up message subscription:', error);
      return () => {};
    }
  }

  /**
   * Auto-mark messages as read when user views them
   * @param {string} deliveryId - The delivery ID
   * @param {Array} messages - Array of messages
   */
  async autoMarkAsRead(deliveryId, messages) {
    if (!this.currentUser) return;

    try {
      const unreadMessages = messages.filter(msg => 
        msg.receiverId === this.currentUser.uid && !msg.isRead
      );

      if (unreadMessages.length > 0) {
        const promises = unreadMessages.map(msg => {
          const messageRef = doc(db, 'chats', deliveryId, 'messages', msg.id);
          return updateDoc(messageRef, {
            isRead: true,
            readAt: serverTimestamp()
          });
        });

        await Promise.all(promises);
      }
    } catch (error) {
      console.error('Error auto-marking messages as read:', error);
    }
  }

  /**
   * Get user role from Firebase Auth or Firestore
   * @param {string} userId - User ID
   * @returns {Promise<string>} User role
   */
  async getUserRole(userId) {
    try {
      // First check custom claims
      if (this.currentUser && this.currentUser.uid === userId) {
        const token = await this.currentUser.getIdTokenResult();
        if (token.claims.role) {
          return token.claims.role;
        }
      }

      // Fallback to Firestore user document
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data().role || 'customer';
      }

      return 'customer';
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'customer';
    }
  }

  /**
   * Update chat metadata
   * @param {string} deliveryId - The delivery ID
   * @param {string} lastMessage - Last message text
   * @param {string} senderId - Sender user ID
   * @param {string} senderRole - Sender role
   */
  async updateChatMetadata(deliveryId, lastMessage, senderId, senderRole) {
    try {
      const chatRef = doc(db, 'chats', deliveryId);
      const chatDoc = await getDoc(chatRef);

      const updateData = {
        lastMessage: lastMessage,
        lastMessageTime: serverTimestamp(),
        lastSenderId: senderId,
        lastSenderRole: senderRole,
        updatedAt: serverTimestamp()
      };

      if (chatDoc.exists()) {
        updateData.messageCount = (chatDoc.data().messageCount || 0) + 1;
        await updateDoc(chatRef, updateData);
      } else {
        await setDoc(chatRef, {
          deliveryId: deliveryId,
          participantIds: [senderId],
          isActive: true,
          messageCount: 1,
          createdAt: serverTimestamp(),
          ...updateData
        });
      }
    } catch (error) {
      console.error('Error updating chat metadata:', error);
    }
  }

  /**
   * Get unread message count for current user
   * @param {string} deliveryId - The delivery ID
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount(deliveryId) {
    if (!this.currentUser) return 0;

    try {
      const messagesRef = collection(db, 'chats', deliveryId, 'messages');
      const q = query(
        messagesRef,
        where('receiverId', '==', this.currentUser.uid),
        where('isRead', '==', false)
      );

      return new Promise((resolve) => {
        const unsubscribe = onSnapshot(q, (snapshot) => {
          resolve(snapshot.size);
          unsubscribe();
        });
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Initialize chat for a delivery
   * @param {string} deliveryId - The delivery ID
   * @param {string} customerId - Customer user ID
   * @param {string} riderId - Rider user ID
   */
  async initializeDeliveryChat(deliveryId, customerId, riderId) {
    try {
      const chatRef = doc(db, 'chats', deliveryId);
      
      await setDoc(chatRef, {
        deliveryId: deliveryId,
        participantIds: [customerId, riderId],
        lastMessage: 'Chat initialized',
        lastMessageTime: serverTimestamp(),
        lastSenderId: 'system',
        lastSenderRole: 'system',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        messageCount: 0
      }, { merge: true });

    } catch (error) {
      console.error('Error initializing delivery chat:', error);
      throw error;
    }
  }

  /**
   * Clean up subscriptions
   */
  cleanup() {
    this.unsubscribes.forEach(unsubscribe => unsubscribe());
    this.unsubscribes.clear();
  }
}

// Export singleton instance
export const deliveryChatService = new DeliveryChatService();