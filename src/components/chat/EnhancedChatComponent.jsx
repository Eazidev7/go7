/**
 * Enhanced GO7 Delivery Chat Component
 * Includes typing indicators, delivery status updates, and enhanced features
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { enhancedChatService } from '../../services/enhancedChatService';
import { useAuth } from '../../contexts/AuthContext.tsx';

const EnhancedChatComponent = ({ 
  deliveryId, 
  recipientId, 
  className = '',
  onMessageSent = () => {},
  onError = () => {},
  onTyping = () => {},
  enableStatusUpdates = true,
  enableTypingIndicator = true
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userRole, setUserRole] = useState('customer');
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const { user, isAuthenticated } = useAuth();

  // Initialize enhanced chat service and load messages
  useEffect(() => {
    const initializeEnhancedChat = async () => {
      try {
        if (!isAuthenticated || !deliveryId) {
          setLoading(false);
          return;
        }

        await enhancedChatService.initialize();
        
        // Get current user role
        const role = await enhancedChatService.getUserRole(user?.id);
        setUserRole(role);
        
        // Subscribe to enhanced messages
        const messageUnsubscribe = enhancedChatService.subscribeToEnhancedMessages(
          deliveryId,
          (newMessages) => {
            setMessages(newMessages);
            setLoading(false);
            
            // Update unread count
            const unread = newMessages.filter(msg => 
              msg.receiverId === user?.id && !msg.isRead
            ).length;
            setUnreadCount(unread);
          }
        );

        // Subscribe to typing indicators if enabled
        let typingUnsubscribe = () => {};
        if (enableTypingIndicator) {
          typingUnsubscribe = enhancedChatService.subscribeToTyping(
            deliveryId,
            (typingUsersData) => {
              setTypingUsers(typingUsersData);
              onTyping(typingUsersData.length > 0);
            }
          );
        }

        return () => {
          messageUnsubscribe();
          typingUnsubscribe();
        };
      } catch (error) {
        console.error('Error initializing enhanced chat:', error);
        onError(error);
        setLoading(false);
      }
    };

    initializeEnhancedChat();
  }, [deliveryId, isAuthenticated, user?.id, onError, onTyping, enableTypingIndicator]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle typing indicator
  const handleTyping = useCallback((text) => {
    if (!enableTypingIndicator) return;

    const isCurrentlyTyping = text.length > 0;
    
    if (isCurrentlyTyping !== isTyping) {
      setIsTyping(isCurrentlyTyping);
      enhancedChatService.setTypingStatus(deliveryId, isCurrentlyTyping);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    if (isCurrentlyTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        enhancedChatService.setTypingStatus(deliveryId, false);
      }, 2000);
    }
  }, [deliveryId, isTyping, enableTypingIndicator]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending || !recipientId) {
      return;
    }

    setSending(true);
    try {
      await enhancedChatService.sendMessage(deliveryId, newMessage, recipientId);
      setNewMessage('');
      onMessageSent();
      scrollToBottom();
    } catch (error) {
      console.error('Error sending enhanced message:', error);
      onError(error);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !recipientId) return;

    // Check file type and size
    if (file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) { // 5MB limit
      try {
        setSending(true);
        await enhancedChatService.sendImageMessage(deliveryId, file, recipientId);
        onMessageSent();
      } catch (error) {
        console.error('Error sending image:', error);
        onError(error);
      } finally {
        setSending(false);
      }
    } else {
      onError(new Error('Please select an image file under 5MB'));
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatMessageTime = (timestamp) => {
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
      return `${Math.floor(diff / 60000)}m ago`;
    }
    // Less than 24 hours
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    }
    // More than 24 hours
    return date.toLocaleDateString();
  };

  const getMessageBubbleClass = (message) => {
    const isOwnMessage = message.senderId === user?.id;
    const baseClass = 'max-w-xs lg:max-w-md px-4 py-2 rounded-lg mb-2 break-words';
    
    if (message.messageType === 'system') {
      return `${baseClass} bg-blue-50 text-blue-700 text-center mx-auto text-sm border border-blue-200`;
    }
    
    if (isOwnMessage) {
      return `${baseClass} bg-blue-500 text-white ml-auto shadow-sm`;
    }
    
    return `${baseClass} bg-gray-200 text-gray-800 mr-auto shadow-sm`;
  };

  const getMessageAlignment = (message) => {
    if (message.messageType === 'system') {
      return 'justify-center';
    }
    return message.senderId === user?.id ? 'justify-end' : 'justify-start';
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'rider':
        return 'bg-green-100 text-green-800';
      case 'customer':
        return 'bg-blue-100 text-blue-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderSystemMessage = (message) => {
    const statusIcons = {
      'delivery_assigned': '📋',
      'delivery_picked_up': '📦',
      'delivery_in_transit': '🚚',
      'delivery_nearby': '📍',
      'delivery_arrived': '🎯',
      'delivery_delivered': '✅',
      'delivery_cancelled': '❌'
    };

    const icon = statusIcons[message.systemMessageType] || '📊';
    
    return (
      <div className="flex items-center justify-center space-x-2">
        <span className="text-lg">{icon}</span>
        <span className="font-medium">{message.text}</span>
      </div>
    );
  };

  const renderTypingIndicator = () => {
    if (!enableTypingIndicator || typingUsers.length === 0) return null;

    const typingUser = typingUsers[0]; // Show first typing user
    const roleName = typingUser.userRole === 'rider' ? 'Rider' : 'Customer';

    return (
      <div className="flex justify-start mb-2">
        <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100 text-gray-600">
          <div className="flex items-center space-x-2">
            <span className="text-sm">{roleName} is typing</span>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className={`bg-gray-50 p-4 rounded-lg ${className}`}>
        <p className="text-gray-600 text-center">Please log in to access enhanced chat</p>
      </div>
    );
  }

  if (!deliveryId) {
    return (
      <div className={`bg-gray-50 p-4 rounded-lg ${className}`}>
        <p className="text-gray-600 text-center">No delivery selected</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Enhanced Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-green-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <h3 className="font-semibold text-gray-800">Enhanced Chat</h3>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(userRole)}`}>
            {userRole}
          </span>
          {enableTypingIndicator && (
            <span className="text-xs text-gray-500">
              • Typing indicators
            </span>
          )}
          {enableStatusUpdates && (
            <span className="text-xs text-gray-500">
              • Status updates
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-bounce">
            {unreadCount} new
          </span>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-gray-500">No messages yet.</p>
              <p className="text-sm text-gray-400 mt-1">Start the conversation!</p>
              {enableStatusUpdates && (
                <p className="text-xs text-blue-500 mt-2">📊 Delivery updates will appear here</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className={`flex ${getMessageAlignment(message)}`}>
                <div className={getMessageBubbleClass(message)}>
                  {/* Message content */}
                  {message.messageType === 'system' ? (
                    renderSystemMessage(message)
                  ) : (
                    <>
                      <p className="text-sm">{message.text}</p>
                      
                      {/* Enhanced message indicators */}
                      {message.imageUrl && (
                        <div className="mt-2">
                          <div className="text-xs text-blue-500">📸 Image message</div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Message metadata */}
                  <div className="flex items-center justify-between mt-1 text-xs opacity-70">
                    <span>{formatMessageTime(message.timestamp)}</span>
                    {message.senderId === user?.id && message.messageType !== 'system' && (
                      <span className="ml-2">
                        {message.isRead ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                  
                  {/* Role indicator for received messages */}
                  {message.senderId !== user?.id && message.messageType !== 'system' && (
                    <div className="text-xs opacity-60 mt-1">
                      {message.senderRole || 'user'}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {renderTypingIndicator()}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-white rounded-b-lg">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping(e.target.value);
            }}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
            maxLength={500}
          />
          
          {/* Image Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={sending}
            title="Send image (coming soon)"
          >
            📷
          </button>
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Send'
            )}
          </button>
        </div>
        
        {/* Character count and status */}
        <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            {isTyping && enableTypingIndicator && (
              <span className="text-blue-500">Typing...</span>
            )}
          </div>
          <span>{newMessage.length}/500</span>
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </form>
    </div>
  );
};

export default EnhancedChatComponent;