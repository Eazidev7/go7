// GO7 Secure Chat Service - Firebase-powered real-time messaging
// Secure chat system tied to delivery sessions with authentication

import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  getDoc,
  updateDoc 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// Firestore data structure:
// chats/{deliveryId}/messages/{messageId}
// - senderId: string (Firebase Auth UID)
// - senderRole: 'customer' | 'rider' | 'vendor'
// - message: string
// - timestamp: serverTimestamp
// - deliveryId: string
// - isRead: boolean
// - messageType: 'text' | 'system' | 'location'

export class GO7ChatService {
  constructor() {
    this.currentUser = null;
    this.unsubscribes = new Map();
  }

  // Initialize chat service with authenticated user
  async initialize() {
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          this.currentUser = user;
          console.log('🔐 Chat service initialized for user:', user.uid);
          resolve(user);
        } else {
          console.log('❌ No authenticated user for chat');
          reject(new Error('User not authenticated'));
        }
        unsubscribe();
      });
    });
  }

  // Send a message in a delivery chat
  async sendMessage(deliveryId, message, senderRole = 'customer') {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    if (!deliveryId || !message.trim()) {
      throw new Error('DeliveryId and message are required');
    }

    // Verify user has access to this delivery
    const hasAccess = await this.verifyDeliveryAccess(deliveryId, this.currentUser.uid, senderRole);
    if (!hasAccess) {
      throw new Error('Access denied to this delivery chat');
    }

    try {
      const chatRef = collection(db, 'chats', deliveryId, 'messages');
      
      const messageData = {
        senderId: this.currentUser.uid,
        senderRole: senderRole,
        senderName: this.currentUser.displayName || 'Anonymous',
        message: message.trim(),
        timestamp: serverTimestamp(),
        deliveryId: deliveryId,
        isRead: false,
        messageType: 'text'
      };

      const docRef = await addDoc(chatRef, messageData);
      
      // Update chat metadata
      await this.updateChatMetadata(deliveryId, messageData);
      
      console.log('💬 Message sent:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  // Send system message (delivery status updates, etc.)
  async sendSystemMessage(deliveryId, message) {
    try {
      const chatRef = collection(db, 'chats', deliveryId, 'messages');
      
      const messageData = {
        senderId: 'system',
        senderRole: 'system',
        senderName: 'GO7 System',
        message: message,
        timestamp: serverTimestamp(),
        deliveryId: deliveryId,
        isRead: false,
        messageType: 'system'
      };

      const docRef = await addDoc(chatRef, messageData);
      console.log('🤖 System message sent:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error sending system message:', error);
      throw error;
    }
  }

  // Subscribe to real-time messages for a delivery
  subscribeToMessages(deliveryId, callback) {
    if (!deliveryId) {
      throw new Error('DeliveryId is required');
    }

    // Unsubscribe from previous listener for this delivery
    this.unsubscribeFromMessages(deliveryId);

    const messagesRef = collection(db, 'chats', deliveryId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));

      console.log(`💬 Real-time messages update for ${deliveryId}:`, messages.length);
      callback(messages);
    }, (error) => {
      console.error('❌ Error listening to messages:', error);
      callback([]);
    });

    // Store unsubscribe function
    this.unsubscribes.set(deliveryId, unsubscribe);
    return unsubscribe;
  }

  // Unsubscribe from messages
  unsubscribeFromMessages(deliveryId) {
    const unsubscribe = this.unsubscribes.get(deliveryId);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribes.delete(deliveryId);
      console.log(`🔇 Unsubscribed from messages for ${deliveryId}`);
    }
  }

  // Verify user has access to delivery chat
  async verifyDeliveryAccess(deliveryId, userId, userRole) {
    try {
      const deliveryRef = doc(db, 'deliveries', deliveryId);
      const deliverySnap = await getDoc(deliveryRef);
      
      if (!deliverySnap.exists()) {
        console.log('❌ Delivery not found:', deliveryId);
        return false;
      }

      const deliveryData = deliverySnap.data();
      
      // Check access based on role
      switch (userRole) {
        case 'customer':
          return deliveryData.customerInfo?.userId === userId || 
                 deliveryData.userId === userId;
        
        case 'rider':
          return deliveryData.riderId === userId;
        
        case 'vendor':
          return deliveryData.vendorId === userId;
        
        default:
          return false;
      }
    } catch (error) {
      console.error('❌ Error verifying delivery access:', error);
      return false;
    }
  }

  // Update chat metadata (last message, unread count, etc.)
  async updateChatMetadata(deliveryId, messageData) {
    try {
      const chatMetaRef = doc(db, 'chat_metadata', deliveryId);
      
      await updateDoc(chatMetaRef, {
        lastMessage: messageData.message,
        lastMessageTime: messageData.timestamp,
        lastSenderId: messageData.senderId,
        lastSenderRole: messageData.senderRole,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      // If document doesn't exist, create it
      await setDoc(chatMetaRef, {
        deliveryId: deliveryId,
        lastMessage: messageData.message,
        lastMessageTime: messageData.timestamp,
        lastSenderId: messageData.senderId,
        lastSenderRole: messageData.senderRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  }

  // Mark messages as read
  async markMessagesAsRead(deliveryId, userId) {
    try {
      const messagesRef = collection(db, 'chats', deliveryId, 'messages');
      const q = query(
        messagesRef, 
        where('isRead', '==', false),
        where('senderId', '!=', userId)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isRead: true });
      });

      await batch.commit();
      console.log(`✅ Marked ${snapshot.docs.length} messages as read`);
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  }

  // Send location message
  async sendLocationMessage(deliveryId, location, senderRole = 'rider') {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const chatRef = collection(db, 'chats', deliveryId, 'messages');
      
      const messageData = {
        senderId: this.currentUser.uid,
        senderRole: senderRole,
        senderName: this.currentUser.displayName || 'Rider',
        message: `📍 Current location: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
        timestamp: serverTimestamp(),
        deliveryId: deliveryId,
        isRead: false,
        messageType: 'location',
        location: {
          lat: location.lat,
          lng: location.lng
        }
      };

      const docRef = await addDoc(chatRef, messageData);
      await this.updateChatMetadata(deliveryId, messageData);
      
      console.log('📍 Location message sent:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error sending location message:', error);
      throw error;
    }
  }

  // Clean up all subscriptions
  cleanup() {
    this.unsubscribes.forEach((unsubscribe, deliveryId) => {
      unsubscribe();
      console.log(`🧹 Cleaned up subscription for ${deliveryId}`);
    });
    this.unsubscribes.clear();
  }
}

// Export singleton instance
export const chatService = new GO7ChatService();

// Helper functions for UI components
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  const now = new Date();
  const diff = now - date;
  
  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  // More than 24 hours
  return date.toLocaleDateString();
};

export const getMessageAlignment = (message, currentUserId) => {
  if (message.messageType === 'system') {
    return 'center';
  }
  return message.senderId === currentUserId ? 'right' : 'left';
};

export const getMessageStyle = (message, currentUserId) => {
  if (message.messageType === 'system') {
    return 'bg-gray-100 text-gray-600 text-center';
  }
  
  return message.senderId === currentUserId 
    ? 'bg-blue-500 text-white ml-auto' 
    : 'bg-gray-200 text-gray-900 mr-auto';
};