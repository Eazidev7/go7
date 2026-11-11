/**
 * WebSocket Client for Real-time Features
 * Following GO7 Backend Integration Guide - Section 6 & 7
 */

import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000;

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface OrderStatusUpdate {
  orderId: string;
  status: string;
  timestamp: string;
}

export interface RiderLocationUpdate {
  orderId: string;
  location: { lat: number; lng: number };
  heading?: number;
  speed?: number;
}

export interface RiderAssigned {
  orderId: string;
  rider: {
    id: string;
    name: string;
    phone: string;
    avatar: string;
    rating: number;
    vehicleType: string;
    vehicleNumber: string;
  };
}

export interface DeliveryUpdate {
  orderId: string;
  distance?: number;
  eta?: string;
  estimatedArrival?: string;
  reason?: string;
  newEta?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: 'text' | 'image' | 'order' | 'location' | 'system';
  text?: string;
  imageUrl?: string;
  metadata?: {
    orderId?: string;
    location?: { lat: number; lng: number };
  };
  isRead: boolean;
  createdAt: string;
}

export interface TypingIndicator {
  userId: string;
  isTyping: boolean;
}

export interface MessageRead {
  messageId: string;
  readAt: string;
}

// ============================================================================
// WebSocket Connection Management
// ============================================================================

/**
 * Connect to WebSocket server
 */
export function connectWebSocket(userId: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  const token = localStorage.getItem('authToken');
  
  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: RECONNECT_DELAY,
  });

  // Connection events
  socket.on('connect', () => {
    console.log('✅ WebSocket connected');
    reconnectAttempts = 0;
    
    // Subscribe to user-specific channel
    socket?.emit('subscribe_user', { userId });
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ WebSocket disconnected:', reason);
  });

  socket.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });

  socket.on('reconnect_attempt', (attempt) => {
    console.log(`🔄 Reconnection attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS}`);
    reconnectAttempts = attempt;
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ Failed to reconnect after maximum attempts');
  });

  return socket;
}

/**
 * Disconnect from WebSocket server
 */
export function disconnectWebSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Check if socket is connected
 */
export function isConnected(): boolean {
  return socket?.connected || false;
}

// ============================================================================
// Order Tracking Events
// ============================================================================

/**
 * Subscribe to order updates
 */
export function subscribeToOrder(
  orderId: string,
  callbacks: {
    onStatusChange?: (data: OrderStatusUpdate) => void;
    onRiderLocationUpdate?: (data: RiderLocationUpdate) => void;
    onRiderAssigned?: (data: RiderAssigned) => void;
    onPickedUp?: (data: DeliveryUpdate) => void;
    onNearby?: (data: DeliveryUpdate) => void;
    onDelivered?: (data: DeliveryUpdate) => void;
    onDelayed?: (data: DeliveryUpdate) => void;
  }
): () => void {
  if (!socket) {
    console.error('Socket not connected. Call connectWebSocket() first.');
    return () => {};
  }

  // Subscribe to order
  socket.emit('subscribe_order', { orderId });

  // Register event listeners
  if (callbacks.onStatusChange) {
    socket.on('order_status_changed', callbacks.onStatusChange);
  }

  if (callbacks.onRiderLocationUpdate) {
    socket.on('rider_location_update', callbacks.onRiderLocationUpdate);
  }

  if (callbacks.onRiderAssigned) {
    socket.on('rider_assigned', callbacks.onRiderAssigned);
  }

  if (callbacks.onPickedUp) {
    socket.on('order_picked_up', callbacks.onPickedUp);
  }

  if (callbacks.onNearby) {
    socket.on('rider_nearby', callbacks.onNearby);
  }

  if (callbacks.onDelivered) {
    socket.on('order_delivered', callbacks.onDelivered);
  }

  if (callbacks.onDelayed) {
    socket.on('delivery_delayed', callbacks.onDelayed);
  }

  // Return cleanup function
  return () => {
    socket?.emit('unsubscribe_order', { orderId });
    
    if (callbacks.onStatusChange) {
      socket?.off('order_status_changed', callbacks.onStatusChange);
    }
    if (callbacks.onRiderLocationUpdate) {
      socket?.off('rider_location_update', callbacks.onRiderLocationUpdate);
    }
    if (callbacks.onRiderAssigned) {
      socket?.off('rider_assigned', callbacks.onRiderAssigned);
    }
    if (callbacks.onPickedUp) {
      socket?.off('order_picked_up', callbacks.onPickedUp);
    }
    if (callbacks.onNearby) {
      socket?.off('rider_nearby', callbacks.onNearby);
    }
    if (callbacks.onDelivered) {
      socket?.off('order_delivered', callbacks.onDelivered);
    }
    if (callbacks.onDelayed) {
      socket?.off('delivery_delayed', callbacks.onDelayed);
    }
  };
}

// ============================================================================
// Chat Events
// ============================================================================

/**
 * Connect to chat system
 */
export function connectChat(userId: string): void {
  if (!socket) {
    console.error('Socket not connected. Call connectWebSocket() first.');
    return;
  }

  socket.emit('chat_connect', { userId });
}

/**
 * Join a conversation
 */
export function joinConversation(conversationId: string): void {
  socket?.emit('join_conversation', { conversationId });
}

/**
 * Leave a conversation
 */
export function leaveConversation(conversationId: string): void {
  socket?.emit('leave_conversation', { conversationId });
}

/**
 * Send a chat message
 */
export function sendMessage(
  conversationId: string,
  message: {
    text?: string;
    type: 'text' | 'image' | 'order' | 'location';
    metadata?: any;
  }
): void {
  socket?.emit('send_message', { conversationId, message });
}

/**
 * Send typing indicator
 */
export function sendTyping(conversationId: string, isTyping: boolean): void {
  socket?.emit('typing', { conversationId, isTyping });
}

/**
 * Mark message as read
 */
export function markMessageRead(messageId: string): void {
  socket?.emit('mark_read', { messageId });
}

/**
 * Subscribe to chat events
 */
export function subscribeToChatEvents(callbacks: {
  onNewMessage?: (message: ChatMessage) => void;
  onTyping?: (data: TypingIndicator) => void;
  onMessageRead?: (data: MessageRead) => void;
}): () => void {
  if (!socket) {
    console.error('Socket not connected. Call connectWebSocket() first.');
    return () => {};
  }

  if (callbacks.onNewMessage) {
    socket.on('new_message', callbacks.onNewMessage);
  }

  if (callbacks.onTyping) {
    socket.on('typing', callbacks.onTyping);
  }

  if (callbacks.onMessageRead) {
    socket.on('message_read', callbacks.onMessageRead);
  }

  // Return cleanup function
  return () => {
    if (callbacks.onNewMessage) {
      socket?.off('new_message', callbacks.onNewMessage);
    }
    if (callbacks.onTyping) {
      socket?.off('typing', callbacks.onTyping);
    }
    if (callbacks.onMessageRead) {
      socket?.off('message_read', callbacks.onMessageRead);
    }
  };
}

// ============================================================================
// Notification Events
// ============================================================================

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  imageUrl?: string;
  createdAt: string;
}

/**
 * Subscribe to notifications
 */
export function subscribeToNotifications(
  callback: (notification: Notification) => void
): () => void {
  if (!socket) {
    console.error('Socket not connected. Call connectWebSocket() first.');
    return () => {};
  }

  socket.on('notification', callback);

  return () => {
    socket?.off('notification', callback);
  };
}

// ============================================================================
// React Hook for WebSocket
// ============================================================================

/**
 * Custom hook for using WebSocket in React components
 */
export function useWebSocket(userId: string) {
  if (typeof window === 'undefined') return null;

  if (!socket || !socket.connected) {
    return connectWebSocket(userId);
  }

  return socket;
}
