/**
 * Enhanced Chat Service with Typing Indicators and Status Updates
 * Extends the basic chat functionality with real-time typing and delivery status
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
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

/**
 * Enhanced Chat Service with Typing and Status Updates
 */
export class EnhancedChatService {
  constructor() {
    this.currentUser = null;
    this.unsubscribes = new Map();
    this.typingTimeouts = new Map();
    this.TYPING_TIMEOUT = 3000; // 3 seconds
  }

  /**
   * Initialize the enhanced chat service
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          this.currentUser = user;
          console.log('🔐 Enhanced Chat service initialized for user:', user.uid);
          resolve(user);
        } else {
          console.log('❌ No authenticated user for enhanced chat');
          reject(new Error('User not authenticated'));
        }
        unsubscribe();
      });
    });
  }

  /**
   * Send a message with enhanced features
   * @param {string} deliveryId - The delivery ID
   * @param {string} text - Message text
   * @param {string} receiverId - Recipient user ID
   * @param {Object} options - Additional options (messageType, imageUrl, etc.)
   * @returns {Promise<string>} Message ID
   */
  async sendMessage(deliveryId, text, receiverId, options = {}) {
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
        messageType: options.messageType || 'text',
        deliveryId: deliveryId,
        platform: 'web',
        messageVersion: 1,
        
        // Enhanced fields
        ...(options.imageUrl && { imageUrl: options.imageUrl }),
        ...(options.imageMetadata && { imageMetadata: options.imageMetadata }),
        ...(options.location && { location: options.location }),
        ...(options.systemMessageType && { systemMessageType: options.systemMessageType })
      };

      const messagesRef = collection(db, 'chats', deliveryId, 'messages');
      const messageDoc = await addDoc(messagesRef, messageData);

      // Clear typing indicator after sending message
      await this.setTypingStatus(deliveryId, false);

      // Update chat metadata
      await this.updateChatMetadata(deliveryId, text, this.currentUser.uid, senderRole);

      return messageDoc.id;
    } catch (error) {
      console.error('Error sending enhanced message:', error);
      throw error;
    }
  }

  /**
   * Set typing status for current user
   * @param {string} deliveryId - The delivery ID
   * @param {boolean} isTyping - Whether user is typing
   */
  async setTypingStatus(deliveryId, isTyping) {
    try {
      if (!this.currentUser) return;

      const typingRef = doc(db, 'chats', deliveryId, 'typing', this.currentUser.uid);

      if (isTyping) {
        await setDoc(typingRef, {
          userId: this.currentUser.uid,
          isTyping: true,
          timestamp: serverTimestamp(),
          userRole: await this.getUserRole(this.currentUser.uid)
        });

        // Auto-clear typing status after timeout
        if (this.typingTimeouts.has(deliveryId)) {
          clearTimeout(this.typingTimeouts.get(deliveryId));
        }

        const timeout = setTimeout(() => {
          this.setTypingStatus(deliveryId, false);
        }, this.TYPING_TIMEOUT);

        this.typingTimeouts.set(deliveryId, timeout);
      } else {
        await deleteDoc(typingRef);
        
        // Clear timeout
        if (this.typingTimeouts.has(deliveryId)) {
          clearTimeout(this.typingTimeouts.get(deliveryId));
          this.typingTimeouts.delete(deliveryId);
        }
      }
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }

  /**
   * Subscribe to typing indicators
   * @param {string} deliveryId - The delivery ID
   * @param {Function} callback - Callback function to handle typing status
   * @returns {Function} Unsubscribe function
   */
  subscribeToTyping(deliveryId, callback) {
    try {
      if (!deliveryId) {
        throw new Error('Delivery ID is required');
      }

      const typingRef = collection(db, 'chats', deliveryId, 'typing');
      const q = query(typingRef, where('isTyping', '==', true));

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const typingUsers = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            // Only show typing for other users, not current user
            if (data.userId !== this.currentUser?.uid) {
              typingUsers.push({
                userId: data.userId,
                userRole: data.userRole,
                timestamp: data.timestamp?.toDate() || new Date()
              });
            }
          });
          callback(typingUsers);
        },
        (error) => {
          console.error('Error listening to typing status:', error);
          callback([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up typing subscription:', error);
      return () => {};
    }
  }

  /**
   * Send delivery status update as system message
   * @param {string} deliveryId - The delivery ID
   * @param {string} status - New delivery status
   * @param {Object} statusData - Additional status data (location, ETA, etc.)
   */
  async sendDeliveryStatusUpdate(deliveryId, status, statusData = {}) {
    try {
      if (!this.currentUser) {
        throw new Error('User must be authenticated');
      }

      const statusMessages = {
        'assigned': '📋 Rider has been assigned to your delivery',
        'picked_up': '📦 Your order has been picked up and is on the way',
        'in_transit': '🚚 Your delivery is in transit',
        'nearby': '📍 Your rider is nearby (within 1km)',
        'arrived': '🎯 Your rider has arrived at the delivery location',
        'delivered': '✅ Your delivery has been completed',
        'cancelled': '❌ Your delivery has been cancelled'
      };

      const statusText = statusMessages[status] || `📊 Delivery status updated: ${status}`;

      // Add location info if provided
      let enhancedText = statusText;
      if (statusData.location && statusData.location.address) {
        enhancedText += ` at ${statusData.location.address}`;
      }
      if (statusData.estimatedArrival) {
        enhancedText += ` (ETA: ${statusData.estimatedArrival})`;
      }

      // Get delivery participants
      const deliveryDoc = await getDoc(doc(db, 'deliveries', deliveryId));
      if (!deliveryDoc.exists()) {
        throw new Error('Delivery not found');
      }

      const deliveryData = deliveryDoc.data();
      const receiverId = this.currentUser.uid === deliveryData.customerId 
        ? deliveryData.riderId 
        : deliveryData.customerId;

      const messageData = {
        senderId: 'system',
        senderRole: 'system',
        receiverId: receiverId,
        text: enhancedText,
        timestamp: serverTimestamp(),
        isRead: false,
        messageType: 'system',
        systemMessageType: `delivery_${status}`,
        deliveryId: deliveryId,
        platform: 'web',
        messageVersion: 1,
        
        // Status-specific data
        statusData: {
          status: status,
          ...statusData
        }
      };

      const messagesRef = collection(db, 'chats', deliveryId, 'messages');
      await addDoc(messagesRef, messageData);

      // Update chat metadata
      await this.updateChatMetadata(deliveryId, enhancedText, 'system', 'system');

    } catch (error) {
      console.error('Error sending delivery status update:', error);
      throw error;
    }
  }

  /**
   * Send image message (prepared for future implementation)
   * @param {string} deliveryId - The delivery ID
   * @param {File} imageFile - Image file to upload
   * @param {string} receiverId - Recipient user ID
   * @param {string} caption - Optional image caption
   */
  async sendImageMessage(deliveryId, imageFile, receiverId, caption = '') {
    try {
      // This is a placeholder for future image upload functionality
      // In a real implementation, you would:
      // 1. Upload image to Firebase Storage
      // 2. Get download URL
      // 3. Create message with image data

      console.log('📸 Image message functionality coming soon!');
      console.log('File:', imageFile.name, 'Size:', imageFile.size);

      // For now, send a text message indicating image upload intent
      await this.sendMessage(deliveryId, `📸 [Image: ${imageFile.name}] ${caption}`, receiverId, {
        messageType: 'image',
        imageMetadata: {
          fileName: imageFile.name,
          fileSize: imageFile.size,
          status: 'pending_upload'
        }
      });

    } catch (error) {
      console.error('Error sending image message:', error);
      throw error;
    }
  }

  /**
   * Subscribe to enhanced messages with typing and status updates
   * @param {string} deliveryId - The delivery ID
   * @param {Function} callback - Callback function to handle messages
   * @returns {Function} Unsubscribe function
   */
  subscribeToEnhancedMessages(deliveryId, callback) {
    try {
      if (!deliveryId) {
        throw new Error('Delivery ID is required');
      }

      // Clean up existing subscription
      if (this.unsubscribes.has(`messages_${deliveryId}`)) {
        this.unsubscribes.get(`messages_${deliveryId}`)();
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
              timestamp: data.timestamp?.toDate() || new Date()
            });
          });
          
          // Auto-mark messages as read for current user
          this.autoMarkAsRead(deliveryId, messages);
          
          callback(messages);
        },
        (error) => {
          console.error('Error listening to enhanced messages:', error);
          callback([]);
        }
      );

      this.unsubscribes.set(`messages_${deliveryId}`, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up enhanced message subscription:', error);
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
   * Clean up subscriptions and timers
   */
  cleanup() {
    this.unsubscribes.forEach(unsubscribe => unsubscribe());
    this.unsubscribes.clear();
    
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();
  }
}

// Export singleton instance
export const enhancedChatService = new EnhancedChatService();