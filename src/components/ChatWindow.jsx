// GO7 ChatWindow Component - Real-time secure messaging interface
// Secure chat UI with proper message alignment and real-time sync

import React, { useState, useEffect, useRef } from 'react';
import { 
  chatService, 
  formatMessageTime, 
  getMessageAlignment, 
  getMessageStyle 
} from '../services/chatService';

export default function ChatWindow({ 
  deliveryId, 
  userRole = 'customer', 
  isOpen = false, 
  onClose = () => {},
  currentUserId = null 
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Initialize chat service and subscribe to messages
  useEffect(() => {
    if (!isOpen || !deliveryId) return;

    const initializeChat = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize chat service with authentication
        if (!isInitialized) {
          await chatService.initialize();
          setIsInitialized(true);
        }

        // Subscribe to real-time messages
        const unsubscribe = chatService.subscribeToMessages(deliveryId, (newMessages) => {
          setMessages(newMessages);
          scrollToBottom();
        });

        // Send system message when chat opens (first time)
        if (messages.length === 0) {
          await chatService.sendSystemMessage(
            deliveryId, 
            `${userRole === 'customer' ? 'Customer' : 'Rider'} joined the chat`
          );
        }

        return unsubscribe;
      } catch (error) {
        console.error('❌ Error initializing chat:', error);
        setError('Failed to initialize chat. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();

    // Cleanup on unmount or when deliveryId changes
    return () => {
      if (deliveryId) {
        chatService.unsubscribeFromMessages(deliveryId);
      }
    };
  }, [isOpen, deliveryId, userRole, isInitialized]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    try {
      setIsLoading(true);
      await chatService.sendMessage(deliveryId, newMessage, userRole);
      setNewMessage('');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send location (for riders)
  const handleSendLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          setIsLoading(true);
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          await chatService.sendLocationMessage(deliveryId, location, userRole);
        } catch (error) {
          console.error('❌ Error sending location:', error);
          setError('Failed to send location. Please try again.');
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        setError('Failed to get your location. Please enable location access.');
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-[600px] flex flex-col">
        {/* Chat Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div>
            <h3 className="font-semibold">💬 Delivery Chat</h3>
            <p className="text-sm text-blue-100">
              ID: {deliveryId?.slice(-8)} • {userRole === 'customer' ? 'Customer' : 'Rider'} View
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-blue-200 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-3">
            <p className="text-red-700 text-sm">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 text-xs mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Messages Container */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
        >
          {isLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p>Loading chat...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <p className="text-lg">💬</p>
                <p>No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${getMessageAlignment(message, currentUserId) === 'right' ? 'justify-end' : 
                  getMessageAlignment(message, currentUserId) === 'center' ? 'justify-center' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${getMessageStyle(message, currentUserId)}`}>
                  {/* Sender Name (for received messages) */}
                  {message.senderId !== currentUserId && message.messageType !== 'system' && (
                    <p className="text-xs text-gray-500 mb-1">
                      {message.senderName || 'Unknown'}
                    </p>
                  )}
                  
                  {/* Message Content */}
                  <p className="text-sm">{message.message}</p>
                  
                  {/* Location Link for location messages */}
                  {message.messageType === 'location' && message.location && (
                    <a
                      href={`https://maps.google.com/?q=${message.location.lat},${message.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-blue-300 hover:text-blue-100 mt-1 underline"
                    >
                      📍 View on Map
                    </a>
                  )}
                  
                  {/* Timestamp */}
                  <p className={`text-xs mt-1 ${
                    message.messageType === 'system' 
                      ? 'text-gray-400' 
                      : message.senderId === currentUserId 
                        ? 'text-blue-100' 
                        : 'text-gray-500'
                  }`}>
                    {formatMessageTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t bg-white rounded-b-lg">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            
            {/* Send Location Button (for riders) */}
            {userRole === 'rider' && (
              <button
                type="button"
                onClick={handleSendLocation}
                disabled={isLoading}
                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                title="Send current location"
              >
                📍
              </button>
            )}
            
            {/* Send Message Button */}
            <button
              type="submit"
              disabled={isLoading || !newMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </form>
          
          {/* Chat Controls */}
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <span>
              {messages.length} messages • Real-time sync
            </span>
            <span>
              {userRole === 'rider' ? '📍 Location sharing enabled' : '👀 Customer view'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini Chat Button Component for integration
export function ChatButton({ deliveryId, userRole, unreadCount = 0, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
    >
      <span className="mr-1">💬</span>
      Chat
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}