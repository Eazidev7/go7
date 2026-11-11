// GO7 Delivery Chat UI - Responsive Firebase-powered chat
// Mobile-optimized for Nigerian users with fast performance

import React, { useState, useEffect, useRef } from 'react';
import { sendMessage, subscribeToChat, formatMessageTime } from '../services/coreChatFunctions';
import { auth } from '../lib/firebase';
import { useFCMNotifications, NotificationBadge } from '../hooks/useFCMNotifications.jsx';

export default function GO7ChatUI({ 
  deliveryId, 
  receiverId,
  recipientName = 'Delivery Partner',
  isOpen = false, 
  onClose = () => {} 
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Get current user
  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid;
  
  // FCM notifications
  const { clearChatNotifications, getUnreadCount } = useFCMNotifications();

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Subscribe to messages when chat opens
  useEffect(() => {
    if (!isOpen || !deliveryId || !currentUserId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Subscribe to real-time messages
      const unsubscribe = subscribeToChat(deliveryId, (newMessages, error) => {
        if (error) {
          console.error('Chat subscription error:', error);
          setError('Connection lost. Reconnecting...');
          setIsLoading(false);
          return;
        }

        setMessages(newMessages);
        setIsLoading(false);
        setError(null);
        
        // Clear notifications for this delivery when chat is open
        clearChatNotifications(deliveryId);
        
        // Auto-scroll to bottom after messages load
        setTimeout(scrollToBottom, 100);
      });

      unsubscribeRef.current = unsubscribe;

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error setting up chat:', error);
      setError('Failed to connect to chat');
      setIsLoading(false);
    }
  }, [isOpen, deliveryId, currentUserId]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !receiverId || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    setError(null);

    try {
      await sendMessage(deliveryId, currentUserId, receiverId, messageText);
      
      // Focus back to input after sending
      inputRef.current?.focus();
      
      // Auto-scroll after sending
      setTimeout(scrollToBottom, 100);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Message failed to send');
      // Restore message text on error
      setNewMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  // Format message style based on sender
  const getMessageStyle = (message) => {
    const isOwnMessage = message.senderId === currentUserId;
    
    return {
      container: `flex mb-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`,
      bubble: `inline-block max-w-xs sm:max-w-sm px-4 py-2 rounded-2xl ${
        isOwnMessage 
          ? 'bg-blue-500 text-white rounded-br-sm' 
          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
      }`,
      timestamp: `text-xs mt-1 ${
        isOwnMessage 
          ? 'text-blue-100 text-right' 
          : 'text-gray-500 text-left'
      }`
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full h-full sm:w-96 sm:h-[600px] sm:rounded-xl shadow-2xl flex flex-col">
        
        {/* Chat Header */}
        <div className="bg-blue-600 text-white p-4 sm:rounded-t-xl flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{recipientName}</h3>
            <p className="text-sm text-blue-100">
              Delivery #{deliveryId?.slice(-6) || '---'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-blue-200 text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-blue-700 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-3">
            <div className="flex items-center">
              <span className="text-red-400 mr-2">⚠️</span>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-gray-50"
          style={{ scrollBehavior: 'smooth' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-4">💬</div>
                <p className="text-lg font-medium">Start the conversation</p>
                <p className="text-sm">Send your first message!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message) => {
                const styles = getMessageStyle(message);
                
                return (
                  <div key={message.id} className={styles.container}>
                    <div>
                      <div className={styles.bubble}>
                        <p className="text-sm leading-relaxed break-words">
                          {message.text}
                        </p>
                      </div>
                      <p className={styles.timestamp}>
                        {formatMessageTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t bg-white sm:rounded-b-xl">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              disabled={isSending}
              maxLength={500}
              autoComplete="off"
            />
            
            <button
              type="submit"
              disabled={isSending || !newMessage.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm min-w-[60px]"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                '📤'
              )}
            </button>
          </form>
          
          {/* Status Bar */}
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <span>
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
            <span>
              {newMessage.length}/500
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Chat Button Component for easy integration
export function GO7ChatButton({ 
  deliveryId, 
  receiverId,
  recipientName,
  onClick, 
  disabled = false,
  unreadCount = 0,
  className = "" 
}) {
  const { getUnreadCount } = useFCMNotifications();
  const actualUnreadCount = unreadCount || getUnreadCount(deliveryId);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      <span className="mr-2">💬</span>
      Chat
      
      {/* Notification Badge */}
      {actualUnreadCount > 0 && (
        <NotificationBadge 
          deliveryId={deliveryId}
          className="absolute -top-2 -right-2"
        />
      )}
    </button>
  );
}

// Quick Chat Toggle Hook for easy state management
export function useGO7Chat() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [selectedReceiver, setSelectedReceiver] = useState(null);
  const [recipientName, setRecipientName] = useState('');

  const openChat = (deliveryId, receiverId, name = 'Delivery Partner') => {
    setSelectedDelivery(deliveryId);
    setSelectedReceiver(receiverId);
    setRecipientName(name);
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setSelectedDelivery(null);
    setSelectedReceiver(null);
    setRecipientName('');
  };

  return {
    isChatOpen,
    selectedDelivery,
    selectedReceiver,
    recipientName,
    openChat,
    closeChat
  };
}