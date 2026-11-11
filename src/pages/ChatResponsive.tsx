import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMediaQuery';
import { Helmet } from 'react-helmet-async';

interface ChatResponsiveProps {
  className?: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support' | 'system';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  unread: number;
  type: 'support' | 'driver' | 'vendor';
  avatar?: string;
}

const ChatResponsive: React.FC<ChatResponsiveProps> = ({ 
  className = "" 
}) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showChatList, setShowChatList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const chatSessions: ChatSession[] = [
    {
      id: 'support-1',
      title: 'Go7 Support',
      lastMessage: 'How can we help you today?',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      unread: 1,
      type: 'support',
      avatar: '🎧'
    },
    {
      id: 'driver-1',
      title: 'John - Your Driver',
      lastMessage: 'I\'m on my way to pickup location',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      unread: 0,
      type: 'driver',
      avatar: '🚗'
    },
    {
      id: 'vendor-1',
      title: 'Burger Haven',
      lastMessage: 'Your order is being prepared',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      unread: 2,
      type: 'vendor',
      avatar: '🍔'
    }
  ];

  const messages: { [key: string]: Message[] } = {
    'support-1': [
      {
        id: '1',
        text: 'Hello! Welcome to Go7 Support. How can we help you today?',
        sender: 'support',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        status: 'delivered'
      },
      {
        id: '2',
        text: 'I have a question about my recent order',
        sender: 'user',
        timestamp: new Date(Date.now() - 8 * 60 * 1000),
        status: 'read'
      },
      {
        id: '3',
        text: 'I\'d be happy to help you with that! Can you please provide your order ID?',
        sender: 'support',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        status: 'delivered'
      }
    ],
    'driver-1': [
      {
        id: '1',
        text: 'Hi! I\'m John, your delivery driver for order GO7-001234',
        sender: 'support',
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
        status: 'read'
      },
      {
        id: '2',
        text: 'I\'m currently on my way to the pickup location. Should be there in about 10 minutes.',
        sender: 'support',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        status: 'delivered'
      }
    ],
    'vendor-1': [
      {
        id: '1',
        text: 'Thank you for your order! We\'re starting to prepare your food now.',
        sender: 'support',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        status: 'read'
      },
      {
        id: '2',
        text: 'Your order is being prepared and will be ready for pickup in about 15 minutes.',
        sender: 'support',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        status: 'delivered'
      }
    ]
  };

  const quickReplies = [
    'Thank you!',
    'On my way',
    'Please call me',
    'Cancel order',
    'Track my order',
    'Need help'
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat]);

  const handleSendMessage = () => {
    if (!currentMessage.trim() || !selectedChat) return;
    
    // In a real app, this would send the message to the backend
    setCurrentMessage('');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const selectedChatData = selectedChat ? chatSessions.find(chat => chat.id === selectedChat) : null;
  const chatMessages = selectedChat ? messages[selectedChat] || [] : [];

  if (isMobile) {
    return (
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <Helmet>
          <title>Chat - Go7</title>
          <meta name="description" content="Chat with Go7 support, drivers, and vendors" />
        </Helmet>

        {showChatList ? (
          /* Mobile Chat List */
          <div className="min-h-screen bg-white">
            {/* Mobile Header */}
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
              <div className="px-4 py-4">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
                    <p className="text-sm text-gray-600">Chat with support, drivers & vendors</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Sessions */}
            <div className="divide-y divide-gray-200">
              {chatSessions.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    setSelectedChat(chat.id);
                    setShowChatList(false);
                  }}
                  className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                        {chat.avatar}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{chat.title}</h3>
                        <span className="text-xs text-gray-500">{formatLastSeen(chat.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                    </div>
                    {chat.unread > 0 && (
                      <div className="bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                        {chat.unread}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Quick Support Button */}
            <div className="fixed bottom-6 right-6">
              <button className="bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          /* Mobile Chat View */
          <div className="min-h-screen bg-white flex flex-col">
            {/* Chat Header */}
            <div className="bg-white shadow-sm border-b border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setShowChatList(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {selectedChatData && (
                  <>
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                      {selectedChatData.avatar}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">{selectedChatData.title}</h2>
                      <p className="text-sm text-gray-600">
                        {selectedChatData.type === 'support' ? 'Online' : 'Active'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-red-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-red-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            <div className="px-4 py-2 border-t border-gray-200">
              <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => setCurrentMessage(reply)}
                    className="flex-shrink-0 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim()}
                  className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    /* Desktop Layout */
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <Helmet>
        <title>Chat - Go7</title>
        <meta name="description" content="Chat with Go7 support, drivers, and vendors" />
      </Helmet>

      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Go7 Messages</h1>
            <p className="text-xl text-gray-600">Connect with support, drivers, and vendors</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden" style={{ height: '70vh' }}>
            <div className="flex h-full">
              {/* Chat List */}
              <div className="w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Conversations</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {chatSessions.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat.id)}
                      className={`w-full p-6 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 ${
                        selectedChat === chat.id ? 'bg-red-50 border-red-200' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                            {chat.avatar}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">{chat.title}</h3>
                            <span className="text-sm text-gray-500">{formatLastSeen(chat.timestamp)}</span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                        </div>
                        {chat.unread > 0 && (
                          <div className="bg-red-600 text-white text-sm rounded-full w-6 h-6 flex items-center justify-center font-medium">
                            {chat.unread}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat View */}
              <div className="flex-1 flex flex-col">
                {selectedChatData ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                          {selectedChatData.avatar}
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900">{selectedChatData.title}</h2>
                          <p className="text-gray-600">
                            {selectedChatData.type === 'support' ? 'Online • Typically replies instantly' : 'Active'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-md px-6 py-3 rounded-2xl ${
                              message.sender === 'user'
                                ? 'bg-red-600 text-white rounded-br-sm'
                                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                            }`}
                          >
                            <p>{message.text}</p>
                            <p className={`text-sm mt-1 ${
                              message.sender === 'user' ? 'text-red-100' : 'text-gray-500'
                            }`}>
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Replies */}
                    <div className="px-6 py-3 border-t border-gray-200">
                      <div className="flex space-x-2 overflow-x-auto">
                        {quickReplies.map((reply) => (
                          <button
                            key={reply}
                            onClick={() => setCurrentMessage(reply)}
                            className="flex-shrink-0 px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message Input */}
                    <div className="p-6 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        <input
                          type="text"
                          value={currentMessage}
                          onChange={(e) => setCurrentMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!currentMessage.trim()}
                          className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* No Chat Selected */
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a conversation</h3>
                      <p className="text-gray-600">Choose a chat from the list to start messaging</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatResponsive;