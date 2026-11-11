// Simple Chat UI - Responsive design with message bubbles and auto-scroll
// Built with the core chat functions for secure messaging

import React, { useState, useEffect, useRef } from 'react';
import { sendMessage, subscribeToChat, formatMessageTime, canAccessChat } from '../services/coreChatFunctions';
import { auth } from '../lib/firebase';

export default function SimpleChatUI({ 
  deliveryId, 
  receiverId, 
  isOpen = false, 
  onClose = () => {} 
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Check access permissions
  useEffect(() => {
    if (!isOpen || !deliveryId || !auth.currentUser) return;

    const checkAccess = async () => {
      try {
        const canAccess = await canAccessChat(deliveryId, auth.currentUser.uid);
        setHasAccess(canAccess);
        
        if (!canAccess) {
          setError('You do not have permission to access this chat');
        }
      } catch (error) {
        console.error('Error checking chat access:', error);
        setError('Failed to verify chat access');
      }
    };

    checkAccess();
  }, [isOpen, deliveryId]);

  // Subscribe to messages
  useEffect(() => {
    if (!isOpen || !deliveryId || !hasAccess) return;

    setIsLoading(true);
    setError(null);

    try {
      // Subscribe to real-time messages
      const unsubscribe = subscribeToChat(deliveryId, (newMessages, error) => {
        if (error) {
          console.error('Chat subscription error:', error);
          setError('Failed to load messages. Please try again.');
          setIsLoading(false);
          return;
        }

        setMessages(newMessages);
        setIsLoading(false);
        
        // Auto-scroll to bottom
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      });

      unsubscribeRef.current = unsubscribe;

      // Cleanup function
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error setting up chat subscription:', error);
      setError('Failed to connect to chat. Please try again.');
      setIsLoading(false);
    }
  }, [isOpen, deliveryId, hasAccess]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !receiverId) return;

    setIsLoading(true);
    setError(null);

    try {
      await sendMessage(
        deliveryId,
        auth.currentUser.uid,
        receiverId,
        newMessage.trim()
      );
      
      setNewMessage('');
      
      // Auto-scroll after sending
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get message bubble style based on sender
  const getMessageStyle = (message) => {
    const isOwnMessage = message.senderId === auth.currentUser?.uid;
    
    return {
      container: `flex mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`,
      bubble: `max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
        isOwnMessage 
          ? 'bg-blue-500 text-white rounded-br-md' 
          : 'bg-gray-200 text-gray-900 rounded-bl-md'
      }`,
      timestamp: `text-xs mt-1 ${
        isOwnMessage ? 'text-blue-100' : 'text-gray-500'
      }`
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md h-[600px] max-h-[90vh] flex flex-col">
        
        {/* Chat Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-xl flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">💬 Chat</h3>
            <p className="text-sm text-blue-100">
              Delivery: {deliveryId?.slice(-8) || 'Loading...'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-blue-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-700 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-3 m-3 rounded">
            <div className="flex items-center">
              <span className="text-red-400 mr-2">⚠️</span>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 text-xs mt-1 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Messages Container */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-gray-50"
          style={{ scrollBehavior: 'smooth' }}
        >
          {!hasAccess ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-4">🔒</div>
                <p className="text-lg font-medium">Access Denied</p>
                <p className="text-sm">You cannot access this chat</p>
              </div>
            </div>
          ) : isLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p>Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-4">💬</div>
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message) => {
                const styles = getMessageStyle(message);
                
                return (
                  <div key={message.id} className={styles.container}>
                    <div className={styles.bubble}>
                      {/* Sender name for received messages */}
                      {message.senderId !== auth.currentUser?.uid && (
                        <p className="text-xs opacity-75 mb-1 font-medium">
                          {message.senderName || 'User'}
                        </p>
                      )}
                      
                      {/* Message text */}
                      <p className="text-sm leading-relaxed">{message.text}</p>
                      
                      {/* Timestamp */}
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

        {/* Message Input - Only show if user has access */}
        {hasAccess && (
          <div className="p-4 border-t bg-white rounded-b-xl">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                disabled={isLoading}
                maxLength={500}
              />
              
              <button
                type="submit"
                disabled={isLoading || !newMessage.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </form>
            
            {/* Character count and status */}
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
              <span>
                {newMessage.length}/500 characters
              </span>
              <span>
                {messages.length} messages • Real-time sync
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple Chat Button Component
export function SimpleChatButton({ 
  deliveryId, 
  receiverId, 
  onClick, 
  disabled = false,
  className = "" 
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      <span className="mr-2">💬</span>
      Chat
    </button>
  );
}