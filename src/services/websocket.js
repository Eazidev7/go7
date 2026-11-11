/**
 * WebSocket Integration Layer
 * Real-time updates for orders, chat, notifications
 */

import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE !== 'false';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  /**
   * Connect to WebSocket server
   */
  connect(userId, token) {
    if (USE_FIREBASE) {
      // Firebase uses onSnapshot for real-time, no WebSocket needed
      console.log('[WebSocket] Using Firebase real-time listeners');
      return;
    }

    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected');
      return;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.connected = true;
      
      // Subscribe to user-specific events
      this.socket.emit('subscribe_user', { userId });
    });

    this.socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
    }
  }

  /**
   * Setup default event listeners
   */
  setupEventListeners() {
    if (!this.socket) return;

    // Order status updates
    this.socket.on('order_status_changed', (data) => {
      console.log('[WebSocket] Order status changed:', data);
      this.emit('order_status_changed', data);
    });

    // Rider location updates
    this.socket.on('rider_location_update', (data) => {
      console.log('[WebSocket] Rider location update:', data);
      this.emit('rider_location_update', data);
    });

    // Rider nearby
    this.socket.on('rider_nearby', (data) => {
      console.log('[WebSocket] Rider nearby:', data);
      this.emit('rider_nearby', data);
    });

    // Order delivered
    this.socket.on('order_delivered', (data) => {
      console.log('[WebSocket] Order delivered:', data);
      this.emit('order_delivered', data);
    });

    // New message
    this.socket.on('new_message', (data) => {
      console.log('[WebSocket] New message:', data);
      this.emit('new_message', data);
    });

    // Typing indicator
    this.socket.on('typing', (data) => {
      this.emit('typing', data);
    });

    // New notification
    this.socket.on('new_notification', (data) => {
      console.log('[WebSocket] New notification:', data);
      this.emit('new_notification', data);
    });

    // Wallet balance update
    this.socket.on('wallet_updated', (data) => {
      console.log('[WebSocket] Wallet updated:', data);
      this.emit('wallet_updated', data);
    });

    // Promo code activated
    this.socket.on('promo_activated', (data) => {
      console.log('[WebSocket] Promo activated:', data);
      this.emit('promo_activated', data);
    });

    // Mission completed
    this.socket.on('mission_completed', (data) => {
      console.log('[WebSocket] Mission completed:', data);
      this.emit('mission_completed', data);
    });
  }

  /**
   * Subscribe to an event
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[WebSocket] Error in ${event} listener:`, error);
      }
    });
  }

  /**
   * Send message to server
   */
  send(event, data) {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Not connected, cannot send:', event);
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Join a room (e.g., order tracking room)
   */
  joinRoom(roomId) {
    if (!this.socket?.connected) return;
    this.socket.emit('join_room', { roomId });
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId) {
    if (!this.socket?.connected) return;
    this.socket.emit('leave_room', { roomId });
  }

  /**
   * Track order (join order room)
   */
  trackOrder(orderId) {
    this.joinRoom(`order_${orderId}`);
  }

  /**
   * Stop tracking order
   */
  stopTrackingOrder(orderId) {
    this.leaveRoom(`order_${orderId}`);
  }

  /**
   * Join chat conversation
   */
  joinChat(conversationId) {
    this.joinRoom(`chat_${conversationId}`);
  }

  /**
   * Leave chat conversation
   */
  leaveChat(conversationId) {
    this.leaveRoom(`chat_${conversationId}`);
  }

  /**
   * Send chat message
   */
  sendMessage(conversationId, message) {
    this.send('send_message', {
      conversationId,
      message,
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(conversationId, isTyping) {
    this.send('typing', {
      conversationId,
      isTyping,
    });
  }
}

// Singleton instance
const wsService = new WebSocketService();

export default wsService;

// ============================================================================
// React Hook for WebSocket
// ============================================================================

import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to connect to WebSocket on mount
 */
export function useWebSocket() {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser?.uid) return;

    const token = localStorage.getItem('token');
    wsService.connect(currentUser.uid, token);

    return () => {
      // Don't disconnect on unmount, keep connection alive
      // Only disconnect on logout
    };
  }, [currentUser?.uid]);

  return wsService;
}

/**
 * Hook to listen to order updates
 */
export function useOrderUpdates(orderId, callback) {
  useEffect(() => {
    if (!orderId) return;

    // Track order
    wsService.trackOrder(orderId);

    // Listen for updates
    const unsubscribe = wsService.on('order_status_changed', (data) => {
      if (data.orderId === orderId) {
        callback(data);
      }
    });

    return () => {
      wsService.stopTrackingOrder(orderId);
      unsubscribe();
    };
  }, [orderId, callback]);
}

/**
 * Hook to listen to rider location updates
 */
export function useRiderLocation(orderId, callback) {
  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = wsService.on('rider_location_update', (data) => {
      if (data.orderId === orderId) {
        callback(data.location);
      }
    });

    return unsubscribe;
  }, [orderId, callback]);
}

/**
 * Hook for chat functionality
 */
export function useChat(conversationId) {
  const sendMessage = useCallback((message) => {
    wsService.sendMessage(conversationId, message);
  }, [conversationId]);

  const sendTyping = useCallback((isTyping) => {
    wsService.sendTyping(conversationId, isTyping);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    wsService.joinChat(conversationId);

    return () => {
      wsService.leaveChat(conversationId);
    };
  }, [conversationId]);

  return { sendMessage, sendTyping };
}

/**
 * Hook to listen for new notifications
 */
export function useNotificationListener(callback) {
  useEffect(() => {
    const unsubscribe = wsService.on('new_notification', callback);
    return unsubscribe;
  }, [callback]);
}

/**
 * Hook to listen for wallet updates
 */
export function useWalletUpdates(callback) {
  useEffect(() => {
    const unsubscribe = wsService.on('wallet_updated', callback);
    return unsubscribe;
  }, [callback]);
}
