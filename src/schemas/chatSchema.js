// Firebase Firestore Schema for GO7 Chat System
// Comprehensive data structure for delivery-based messaging

/*
FIRESTORE COLLECTION STRUCTURE:

chats/
  {deliveryId}/                           // Document ID = delivery ID
    metadata: {                           // Chat metadata
      deliveryId: string,                 // Reference to delivery
      participantIds: string[],           // [customerId, riderId]
      lastMessage: string,                // Last message preview
      lastMessageTime: timestamp,         // When last message was sent
      lastSenderId: string,              // Who sent the last message
      createdAt: timestamp,              // When chat was created
      updatedAt: timestamp,              // Last activity
      isActive: boolean,                 // Whether chat is active
      messageCount: number               // Total messages in chat
    }
    
    messages/                            // Subcollection of messages
      {messageId}/                       // Auto-generated message ID
        senderId: string,                // User ID who sent message
        receiverId: string,              // User ID who receives message
        text: string,                    // Message content
        timestamp: timestamp,            // When message was sent
        isRead: boolean,                 // Whether message has been read
        messageType: string,             // 'text', 'image', 'location', 'system'
        
        // Optional fields based on messageType
        imageUrl?: string,               // For image messages
        imageMetadata?: {                // Image details
          fileName: string,
          fileSize: number,
          dimensions: {
            width: number,
            height: number
          }
        },
        
        location?: {                     // For location messages
          lat: number,
          lng: number,
          address?: string
        },
        
        systemMessageType?: string,      // For system messages
        editedAt?: timestamp,            // If message was edited
        deletedAt?: timestamp,           // If message was deleted
        
        // Delivery context
        deliveryId: string,              // Reference to delivery
        deliveryStatus?: string,         // Status when message was sent
        
        // Metadata
        platform: string,                // 'web', 'android', 'ios'
        userAgent?: string,              // Browser/app info
        messageVersion: number           // Schema version
      }

chat_participants/                       // User participation tracking
  {userId}/                             // Document ID = user ID
    activeChats: string[],              // Array of active delivery IDs
    totalMessages: number,              // Total messages sent by user
    lastActive: timestamp,              // Last time user was active
    fcmToken?: string,                  // For push notifications
    notificationSettings: {
      chatMessages: boolean,
      deliveryUpdates: boolean,
      soundEnabled: boolean
    }

deliveries/                             // Main delivery collection (reference)
  {deliveryId}/
    customerId: string,                 // Customer user ID
    riderId: string,                    // Rider user ID
    status: string,                     // Delivery status
    chatEnabled: boolean,               // Whether chat is allowed
    // ... other delivery fields

users/                                  // User profiles (reference)
  {userId}/
    name: string,
    email: string,
    role: string,                       // 'customer', 'rider', 'admin'
    fcmToken?: string,                  // For push notifications
    isOnline: boolean,
    lastSeen: timestamp
    // ... other user fields
*/

// JAVASCRIPT TYPE DEFINITIONS (JSDoc style)

/**
 * @typedef {Object} ChatMetadata
 * @property {string} deliveryId
 * @property {string[]} participantIds
 * @property {string} lastMessage
 * @property {FirebaseFirestore.Timestamp} lastMessageTime
 * @property {string} lastSenderId
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} updatedAt
 * @property {boolean} isActive
 * @property {number} messageCount
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} senderId
 * @property {string} receiverId
 * @property {string} text
 * @property {FirebaseFirestore.Timestamp} timestamp
 * @property {boolean} isRead
 * @property {'text'|'image'|'location'|'system'} messageType
 * @property {string} [imageUrl]
 * @property {Object} [imageMetadata]
 * @property {Object} [location]
 * @property {string} [systemMessageType]
 * @property {FirebaseFirestore.Timestamp} [editedAt]
 * @property {FirebaseFirestore.Timestamp} [deletedAt]
 * @property {string} deliveryId
 * @property {string} [deliveryStatus]
 * @property {'web'|'android'|'ios'} platform
 * @property {string} [userAgent]
 * @property {number} messageVersion
 */

/**
 * @typedef {Object} ChatParticipant
 * @property {string[]} activeChats
 * @property {number} totalMessages
 * @property {FirebaseFirestore.Timestamp} lastActive
 * @property {string} [fcmToken]
 * @property {Object} notificationSettings
 */

// EXAMPLE DOCUMENTS

/*
EXAMPLE CHAT METADATA:
chats/delivery_123456/
{
  "deliveryId": "delivery_123456",
  "participantIds": ["customer_abc", "rider_xyz"],
  "lastMessage": "I'm on my way to pick up your package!",
  "lastMessageTime": "2025-09-19T14:30:00Z",
  "lastSenderId": "rider_xyz",
  "createdAt": "2025-09-19T14:00:00Z",
  "updatedAt": "2025-09-19T14:30:00Z",
  "isActive": true,
  "messageCount": 15
}

EXAMPLE TEXT MESSAGE:
chats/delivery_123456/messages/msg_001/
{
  "senderId": "customer_abc",
  "receiverId": "rider_xyz",
  "text": "Please call when you arrive at the pickup location",
  "timestamp": "2025-09-19T14:25:00Z",
  "isRead": false,
  "messageType": "text",
  "deliveryId": "delivery_123456",
  "deliveryStatus": "assigned",
  "platform": "web",
  "userAgent": "Mozilla/5.0...",
  "messageVersion": 1
}

EXAMPLE IMAGE MESSAGE:
chats/delivery_123456/messages/msg_002/
{
  "senderId": "rider_xyz",
  "receiverId": "customer_abc",
  "text": "Photo of your package",
  "timestamp": "2025-09-19T14:45:00Z",
  "isRead": false,
  "messageType": "image",
  "imageUrl": "https://storage.googleapis.com/go7-delivery/images/package_photo_001.jpg",
  "imageMetadata": {
    "fileName": "package_photo.jpg",
    "fileSize": 245760,
    "dimensions": {
      "width": 1024,
      "height": 768
    }
  },
  "deliveryId": "delivery_123456",
  "deliveryStatus": "picked_up",
  "platform": "android",
  "messageVersion": 1
}

EXAMPLE LOCATION MESSAGE:
chats/delivery_123456/messages/msg_003/
{
  "senderId": "rider_xyz",
  "receiverId": "customer_abc",
  "text": "My current location",
  "timestamp": "2025-09-19T15:00:00Z",
  "isRead": false,
  "messageType": "location",
  "location": {
    "lat": 6.5244,
    "lng": 3.3792,
    "address": "Victoria Island, Lagos, Nigeria"
  },
  "deliveryId": "delivery_123456",
  "deliveryStatus": "enroute",
  "platform": "android",
  "messageVersion": 1
}

EXAMPLE SYSTEM MESSAGE:
chats/delivery_123456/messages/msg_004/
{
  "senderId": "system",
  "receiverId": "customer_abc",
  "text": "Rider Musa A. has been assigned to your delivery",
  "timestamp": "2025-09-19T14:00:00Z",
  "isRead": false,
  "messageType": "system",
  "systemMessageType": "rider_assigned",
  "deliveryId": "delivery_123456",
  "deliveryStatus": "assigned",
  "platform": "system",
  "messageVersion": 1
}
*/

// FIRESTORE INDEXES REQUIRED
/*
Create these composite indexes in Firebase Console:

1. messages collection queries:
   - deliveryId (Ascending) + timestamp (Ascending)
   - senderId (Ascending) + isRead (Ascending)
   - receiverId (Ascending) + isRead (Ascending)
   - messageType (Ascending) + timestamp (Ascending)

2. chats collection queries:
   - participantIds (Array) + lastMessageTime (Descending)
   - isActive (Ascending) + updatedAt (Descending)

3. chat_participants collection queries:
   - activeChats (Array) + lastActive (Descending)
*/

// FIRESTORE SECURITY RULES
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Chat metadata - only participants can read/write
    match /chats/{deliveryId} {
      allow read, write: if request.auth != null && 
        isDeliveryParticipant(deliveryId, request.auth.uid);
      
      // Messages subcollection
      match /messages/{messageId} {
        allow read: if request.auth != null && 
          isDeliveryParticipant(deliveryId, request.auth.uid);
        
        allow create: if request.auth != null && 
          isDeliveryParticipant(deliveryId, request.auth.uid) &&
          request.resource.data.senderId == request.auth.uid &&
          request.resource.data.deliveryId == deliveryId;
        
        allow update: if request.auth != null && 
          resource.data.senderId == request.auth.uid &&
          // Only allow updating isRead, editedAt
          request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['isRead', 'editedAt']);
      }
    }
    
    // Chat participants - users can only access their own data
    match /chat_participants/{userId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
    }
    
    // Helper function
    function isDeliveryParticipant(deliveryId, userId) {
      let delivery = get(/databases/$(database)/documents/deliveries/$(deliveryId));
      return delivery.data.customerId == userId || 
             delivery.data.riderId == userId;
    }
  }
}
*/

// SCHEMA VALIDATION FUNCTIONS

/**
 * Validate chat message structure
 * @param {Object} message - Message object to validate
 * @returns {boolean} - Whether message is valid
 */
export function validateChatMessage(message) {
  const required = ['senderId', 'receiverId', 'text', 'timestamp', 'messageType', 'deliveryId'];
  
  // Check required fields
  for (const field of required) {
    if (!message.hasOwnProperty(field) || message[field] === null || message[field] === undefined) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }
  
  // Validate messageType
  const validTypes = ['text', 'image', 'location', 'system'];
  if (!validTypes.includes(message.messageType)) {
    console.error(`Invalid messageType: ${message.messageType}`);
    return false;
  }
  
  // Validate text length
  if (typeof message.text !== 'string' || message.text.length > 1000) {
    console.error('Text must be a string with max 1000 characters');
    return false;
  }
  
  return true;
}

/**
 * Create a new chat message object
 * @param {Object} params - Message parameters
 * @returns {Object} - Formatted message object
 */
export function createChatMessage(params) {
  const {
    senderId,
    receiverId,
    text,
    messageType = 'text',
    deliveryId,
    platform = 'web',
    imageUrl,
    location,
    systemMessageType
  } = params;
  
  const message = {
    senderId,
    receiverId,
    text,
    timestamp: new Date(), // Will be replaced with serverTimestamp
    isRead: false,
    messageType,
    deliveryId,
    platform,
    messageVersion: 1
  };
  
  // Add optional fields based on type
  if (messageType === 'image' && imageUrl) {
    message.imageUrl = imageUrl;
  }
  
  if (messageType === 'location' && location) {
    message.location = location;
  }
  
  if (messageType === 'system' && systemMessageType) {
    message.systemMessageType = systemMessageType;
  }
  
  return message;
}

export default {
  validateChatMessage,
  createChatMessage
};