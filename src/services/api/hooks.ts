/**
 * React Hooks for API Integration
 * Easy-to-use hooks for components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as websocketApi from './websocket';
import type { OrderStatusUpdate, RiderLocationUpdate, ChatMessage } from './websocket';

// ============================================================================
// WebSocket Hooks
// ============================================================================

/**
 * Hook to manage WebSocket connection
 */
export function useWebSocketConnection() {
  const { currentUser } = useAuth();
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (currentUser?.uid) {
      socketRef.current = websocketApi.connectWebSocket(currentUser.uid);
      
      return () => {
        websocketApi.disconnectWebSocket();
      };
    }
  }, [currentUser?.uid]);

  return {
    socket: socketRef.current,
    isConnected: websocketApi.isConnected(),
  };
}

/**
 * Hook to track an order in real-time
 */
export function useOrderTracking(orderId: string | null) {
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [riderInfo, setRiderInfo] = useState<any>(null);
  const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
  const [isNearby, setIsNearby] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = websocketApi.subscribeToOrder(orderId, {
      onStatusChange: (data: OrderStatusUpdate) => {
        setOrderStatus(data.status);
      },
      onRiderLocationUpdate: (data: RiderLocationUpdate) => {
        setRiderLocation(data.location);
      },
      onRiderAssigned: (data) => {
        setRiderInfo(data.rider);
      },
      onPickedUp: (data) => {
        setEstimatedArrival(data.estimatedArrival || null);
      },
      onNearby: (data) => {
        setIsNearby(true);
        setEstimatedArrival(data.eta || null);
      },
      onDelivered: () => {
        setOrderStatus('delivered');
      },
    });

    return unsubscribe;
  }, [orderId]);

  return {
    orderStatus,
    riderLocation,
    riderInfo,
    estimatedArrival,
    isNearby,
  };
}

/**
 * Hook for chat functionality
 */
export function useChat(conversationId: string | null) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!conversationId) return;

    websocketApi.joinConversation(conversationId);

    const unsubscribe = websocketApi.subscribeToChatEvents({
      onNewMessage: (message) => {
        setMessages((prev) => [...prev, message]);
      },
      onTyping: (data) => {
        if (data.userId !== currentUser?.uid) {
          setIsTyping(data.isTyping);
        }
      },
    });

    return () => {
      websocketApi.leaveConversation(conversationId);
      unsubscribe();
    };
  }, [conversationId, currentUser?.uid]);

  const sendMessage = useCallback((text: string) => {
    if (conversationId) {
      websocketApi.sendMessage(conversationId, { type: 'text', text });
    }
  }, [conversationId]);

  const sendTypingIndicator = useCallback((typing: boolean) => {
    if (conversationId) {
      websocketApi.sendTyping(conversationId, typing);
    }
  }, [conversationId]);

  return {
    messages,
    isTyping,
    sendMessage,
    sendTypingIndicator,
  };
}

/**
 * Hook for real-time notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = websocketApi.subscribeToNotifications((notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return unsubscribe;
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
  };
}

// ============================================================================
// API Data Hooks
// ============================================================================

/**
 * Generic hook for fetching data from API
 */
export function useApiData<T>(
  apiFunction: () => Promise<any>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFunction();
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for pagination
 */
export function usePagination(initialPage = 1, initialLimit = 20) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / limit);

  const nextPage = useCallback(() => {
    setPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToPage = useCallback((pageNum: number) => {
    setPage(Math.max(1, Math.min(pageNum, totalPages)));
  }, [totalPages]);

  const updateTotal = useCallback((newTotal: number) => {
    setTotal(newTotal);
  }, []);

  return {
    page,
    limit,
    total,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    setLimit,
    updateTotal,
  };
}

/**
 * Hook for debounced search
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
