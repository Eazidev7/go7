import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'rider' | 'vendor' | 'system';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  senderName?: string;
  senderAvatar?: string;
}

interface WhatsAppChatProps {
  isOpen: boolean;
  onClose: () => void;
  chatType: 'rider' | 'vendor' | 'support';
  contactName: string;
  contactAvatar: string;
  orderId: string;
}

const WhatsAppChat: React.FC<WhatsAppChatProps> = ({
  isOpen,
  onClose,
  chatType,
  contactName,
  contactAvatar,
  orderId
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock messages based on chat type
  const initializeMessages = () => {
    const baseMessages: Message[] = [];
    
    if (chatType === 'rider') {
      baseMessages.push(
        {
          id: '1',
          text: `Hi! I'm ${contactName}, your delivery rider for order ${orderId}`,
          sender: 'rider',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          senderName: contactName,
          senderAvatar: contactAvatar,
          status: 'read'
        },
        {
          id: '2',
          text: 'I\'m on my way to pick up your order. Should be there in about 10 minutes.',
          sender: 'rider',
          timestamp: new Date(Date.now() - 8 * 60 * 1000),
          senderName: contactName,
          senderAvatar: contactAvatar,
          status: 'read'
        },
        {
          id: '3',
          text: 'Great! Thank you for the update.',
          sender: 'user',
          timestamp: new Date(Date.now() - 7 * 60 * 1000),
          status: 'read'
        }
      );
    } else if (chatType === 'vendor') {
      baseMessages.push(
        {
          id: '1',
          text: `Hello! This is ${contactName}. We've received your order and are preparing it now.`,
          sender: 'vendor',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          senderName: contactName,
          senderAvatar: contactAvatar,
          status: 'read'
        },
        {
          id: '2',
          text: 'Your order will be ready for pickup in about 15 minutes.',
          sender: 'vendor',
          timestamp: new Date(Date.now() - 12 * 60 * 1000),
          senderName: contactName,
          senderAvatar: contactAvatar,
          status: 'read'
        }
      );
    } else {
      baseMessages.push(
        {
          id: '1',
          text: 'Hi! How can we help you with your Go7 order today?',
          sender: 'system',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          senderName: 'Go7 Support',
          senderAvatar: '🎧',
          status: 'delivered'
        }
      );
    }
    
    setMessages(baseMessages);
  };

  useEffect(() => {
    if (isOpen) {
      initializeMessages();
      // Auto-focus input when chat opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, chatType]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate typing indicator and response
    if (chatType === 'rider' || chatType === 'vendor') {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const response: Message = {
          id: (Date.now() + 1).toString(),
          text: getAutoResponse(),
          sender: chatType,
          timestamp: new Date(),
          senderName: contactName,
          senderAvatar: contactAvatar,
          status: 'delivered'
        };
        setMessages(prev => [...prev, response]);
      }, 2000);
    }
  };

  const getAutoResponse = (): string => {
    const responses = {
      rider: [
        "Thanks for letting me know!",
        "I'll be there shortly.",
        "Almost at your location!",
        "On my way!",
        "Thanks for your patience."
      ],
      vendor: [
        "Thanks for your message!",
        "Your order is being prepared.",
        "We'll have it ready soon.",
        "Thanks for choosing us!",
        "Your order will be ready shortly."
      ]
    };
    
    const typeResponses = responses[chatType as keyof typeof responses] || ["Thanks!"];
    return typeResponses[Math.floor(Math.random() * typeResponses.length)];
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const quickReplies = [
    "Thank you!",
    "On my way",
    "How long?",
    "Call me",
    "👍",
    "❤️"
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black bg-opacity-50">
      <div className="absolute inset-0 bg-white flex flex-col">
        {/* Chat Header */}
        <div className="bg-green-600 text-white p-4 flex items-center space-x-3 shadow-lg">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-green-700 active:scale-95 transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-lg">
            {contactAvatar}
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold">{contactName}</h3>
            <p className="text-sm text-green-100">
              {chatType === 'rider' ? 'Your delivery rider' : 
               chatType === 'vendor' ? 'Restaurant' : 'Support'}
            </p>
          </div>

          <button
            onClick={() => window.location.href = `tel:+234803123456`}
            className="p-2 rounded-full hover:bg-green-700 active:scale-95 transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046 8.954-20 20-20s20 8.954 20 20-8.954 20-20 20-20-8.954-20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                  {message.sender !== 'user' && (
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">{message.senderAvatar}</span>
                      <span className="text-xs text-gray-600 font-medium">{message.senderName}</span>
                    </div>
                  )}
                  
                  <div
                    className={`px-4 py-2 rounded-2xl shadow-sm ${
                      message.sender === 'user'
                        ? 'bg-green-500 text-white rounded-br-md'
                        : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <div className={`flex items-center justify-end mt-1 space-x-1 ${
                      message.sender === 'user' ? 'text-green-100' : 'text-gray-500'
                    }`}>
                      <span className="text-xs">{formatTime(message.timestamp)}</span>
                      {message.sender === 'user' && (
                        <div className="flex">
                          {message.status === 'sent' && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          {(message.status === 'delivered' || message.status === 'read') && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L8 8.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-xs">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">{contactAvatar}</span>
                    <span className="text-xs text-gray-600 font-medium">{contactName}</span>
                  </div>
                  <div className="bg-white text-gray-800 rounded-2xl rounded-bl-md border border-gray-200 px-4 py-3 shadow-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Replies */}
        <div className="px-4 py-2 bg-white border-t border-gray-200">
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                onClick={() => setNewMessage(reply)}
                className="flex-shrink-0 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm active:scale-95 transition-transform"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="w-full px-4 py-3 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
              />
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="bg-green-600 text-white p-3 rounded-full active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppChat;