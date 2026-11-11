/**
 * In-App Chat System
 * Simple message storage and retrieval for customer-rider communication
 */

// TODO: Replace with proper database storage (MongoDB, PostgreSQL, etc.)
// TODO: Add real-time updates with WebSocket/Socket.io
// TODO: Implement message encryption
// TODO: Add file/image sharing capabilities
// TODO: Add message status indicators (sent, delivered, read)
// TODO: Implement message search and history
// TODO: Add typing indicators

// In-memory storage for chat messages (temporary)
let chatStorage = new Map();

/**
 * Message structure
 * @typedef {Object} ChatMessage
 * @property {string} id - Unique message ID
 * @property {string} orderId - Order ID this chat belongs to
 * @property {string} senderId - ID of the sender
 * @property {string} senderRole - 'customer' or 'rider'
 * @property {string} senderName - Display name of sender
 * @property {string} content - Message content
 * @property {string} type - Message type: 'text', 'system', 'location', 'image'
 * @property {Date} timestamp - When message was sent
 * @property {boolean} isRead - Whether message has been read
 * @property {Object} metadata - Additional message data (location coords, etc.)
 */

/**
 * Initialize a chat thread for an order
 * @param {string} orderId - Order ID
 * @param {Object} participants - { customer: {id, name, phone}, rider: {id, name, phone} }
 */
export function initializeChatThread(orderId, participants) {
  if (!chatStorage.has(orderId)) {
    chatStorage.set(orderId, {
      orderId,
      participants,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date()
    });
    
    // Add system welcome message
    addSystemMessage(orderId, "Chat started. You can now communicate securely with each other about this delivery.");
  }
}

/**
 * Add a new message to a chat thread
 * @param {string} orderId - Order ID
 * @param {string} senderId - Sender's ID
 * @param {string} senderRole - 'customer' or 'rider'
 * @param {string} senderName - Sender's display name
 * @param {string} content - Message content
 * @param {string} type - Message type (default: 'text')
 * @param {Object} metadata - Additional message data
 * @returns {ChatMessage} The created message
 */
export function addChatMessage(orderId, senderId, senderRole, senderName, content, type = 'text', metadata = {}) {
  const chatThread = chatStorage.get(orderId);
  if (!chatThread) {
    throw new Error(`Chat thread not found for order ${orderId}`);
  }
  
  const message = {
    id: generateMessageId(),
    orderId,
    senderId,
    senderRole,
    senderName,
    content,
    type,
    timestamp: new Date(),
    isRead: false,
    metadata
  };
  
  chatThread.messages.push(message);
  chatThread.lastActivity = new Date();
  
  // TODO: Trigger real-time update to other participant
  // TODO: Send push notification if participant is offline
  
  return message;
}

/**
 * Add a system message to a chat thread
 * @param {string} orderId - Order ID
 * @param {string} content - System message content
 * @returns {ChatMessage} The created system message
 */
export function addSystemMessage(orderId, content) {
  return addChatMessage(
    orderId,
    'system',
    'system',
    'GO7 System',
    content,
    'system'
  );
}

/**
 * Get all messages for a chat thread
 * @param {string} orderId - Order ID
 * @param {string} userId - Current user ID (for read status)
 * @returns {ChatMessage[]} Array of messages
 */
export function getChatMessages(orderId, userId = null) {
  const chatThread = chatStorage.get(orderId);
  if (!chatThread) {
    return [];
  }
  
  // Mark messages as read by this user
  if (userId) {
    chatThread.messages.forEach(msg => {
      if (msg.senderId !== userId && !msg.isRead) {
        msg.isRead = true;
      }
    });
  }
  
  return chatThread.messages.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get unread message count for a user in a chat thread
 * @param {string} orderId - Order ID
 * @param {string} userId - User ID
 * @returns {number} Number of unread messages
 */
export function getUnreadMessageCount(orderId, userId) {
  const chatThread = chatStorage.get(orderId);
  if (!chatThread) {
    return 0;
  }
  
  return chatThread.messages.filter(msg => 
    msg.senderId !== userId && !msg.isRead && msg.type !== 'system'
  ).length;
}

/**
 * Get chat thread info
 * @param {string} orderId - Order ID
 * @returns {Object|null} Chat thread info or null if not found
 */
export function getChatThreadInfo(orderId) {
  const chatThread = chatStorage.get(orderId);
  if (!chatThread) {
    return null;
  }
  
  return {
    orderId: chatThread.orderId,
    participants: chatThread.participants,
    messageCount: chatThread.messages.length,
    lastActivity: chatThread.lastActivity,
    createdAt: chatThread.createdAt
  };
}

/**
 * Send location message
 * @param {string} orderId - Order ID
 * @param {string} senderId - Sender's ID
 * @param {string} senderRole - Sender's role
 * @param {string} senderName - Sender's name
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} address - Human-readable address
 * @returns {ChatMessage} The created location message
 */
export function sendLocationMessage(orderId, senderId, senderRole, senderName, lat, lng, address) {
  return addChatMessage(
    orderId,
    senderId,
    senderRole,
    senderName,
    `📍 ${address || 'Current location'}`,
    'location',
    { lat, lng, address }
  );
}

/**
 * Clear chat history (for testing/demo purposes)
 */
export function clearAllChats() {
  chatStorage.clear();
}

/**
 * Get all active chat threads (for admin/debug purposes)
 * @returns {Array} Array of chat thread summaries
 */
export function getAllChatThreads() {
  return Array.from(chatStorage.entries()).map(([orderId, thread]) => ({
    orderId,
    participantCount: Object.keys(thread.participants).length,
    messageCount: thread.messages.length,
    lastActivity: thread.lastActivity,
    createdAt: thread.createdAt
  }));
}

/**
 * Generate a unique message ID
 * @returns {string} Unique message ID
 */
function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// TODO: Database migration functions for when we move to persistent storage
/**
 * TODO: Migrate to database storage
 * 
 * export async function migrateChatToDatabase() {
 *   // Convert in-memory storage to database records
 *   // Handle schema migration
 *   // Preserve message ordering and relationships
 * }
 * 
 * export async function saveChatMessage(message) {
 *   // Save to database with proper indexing
 *   // Handle message encryption
 *   // Update chat thread metadata
 * }
 * 
 * export async function loadChatHistory(orderId, limit = 50, offset = 0) {
 *   // Load from database with pagination
 *   // Include message decryption
 *   // Handle deleted/archived messages
 * }
 */
