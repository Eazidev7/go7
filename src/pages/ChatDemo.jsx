/**
 * Chat Demo Page - Test the DeliveryChatComponent
 * Standalone page for testing chat functionality
 */

import React, { useState } from 'react';
import DeliveryChatComponent from '../components/chat/DeliveryChatComponent';
import { useAuth } from '../contexts/AuthContext';

const ChatDemo = () => {
  const [deliveryId, setDeliveryId] = useState('demo_delivery_001');
  const [recipientId, setRecipientId] = useState('demo_user_002');
  const [messages, setMessages] = useState([]);
  const { user, isAuthenticated, login } = useAuth();

  // Demo login function
  const handleDemoLogin = (role) => {
    const demoUsers = {
      customer: {
        id: 'demo_customer_123',
        name: 'John Customer',
        email: 'customer@demo.com',
        role: 'customer'
      },
      rider: {
        id: 'demo_rider_456',
        name: 'Mike Rider',
        email: 'rider@demo.com',
        role: 'rider'
      }
    };

    login(demoUsers[role]);
    
    // Set recipient based on logged in user
    if (role === 'customer') {
      setRecipientId('demo_rider_456');
    } else {
      setRecipientId('demo_customer_123');
    }
  };

  const handleMessageSent = () => {
    console.log('✅ Message sent successfully');
  };

  const handleChatError = (error) => {
    console.error('❌ Chat error:', error);
    alert(`Chat Error: ${error.message}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            GO7 Chat Component Demo
          </h1>
          <p className="text-gray-600">
            Test the real-time chat functionality with Firebase Firestore
          </p>
        </div>

        {/* Authentication Section */}
        {!isAuthenticated ? (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Demo Authentication
            </h2>
            <p className="text-gray-600 mb-4">
              Choose a demo user to test the chat functionality:
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => handleDemoLogin('customer')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Login as Customer
              </button>
              <button
                onClick={() => handleDemoLogin('rider')}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Login as Rider
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Logged in as: {user?.name}
            </h2>
            <p className="text-gray-600">
              Role: <span className="font-medium">{user?.role}</span> |
              User ID: <span className="font-mono text-sm">{user?.id}</span>
            </p>
          </div>
        )}

        {/* Configuration Section */}
        {isAuthenticated && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Chat Configuration
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery ID
                </label>
                <input
                  type="text"
                  value={deliveryId}
                  onChange={(e) => setDeliveryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter delivery ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient ID
                </label>
                <input
                  type="text"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter recipient user ID"
                />
              </div>
            </div>
          </div>
        )}

        {/* Chat Component */}
        {isAuthenticated && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Live Chat Interface
            </h2>
            <div className="h-96 border border-gray-200 rounded-lg">
              <DeliveryChatComponent
                deliveryId={deliveryId}
                recipientId={recipientId}
                className="h-full"
                onMessageSent={handleMessageSent}
                onError={handleChatError}
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            Testing Instructions
          </h3>
          <ol className="list-decimal list-inside text-blue-700 space-y-1">
            <li>Open this page in two different browser windows/tabs</li>
            <li>Login as "Customer" in one tab and "Rider" in another</li>
            <li>Use the same delivery ID in both tabs</li>
            <li>Start sending messages between the two users</li>
            <li>Observe real-time message sync and read receipts</li>
          </ol>
        </div>

        {/* Features */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Component Features
          </h3>
          <ul className="list-disc list-inside text-green-700 space-y-1">
            <li>Real-time message synchronization with Firebase Firestore</li>
            <li>Automatic scroll to latest messages</li>
            <li>Role-based message styling (customer vs rider)</li>
            <li>Read receipts with ✓ and ✓✓ indicators</li>
            <li>Firebase Authentication integration</li>
            <li>Mobile-responsive TailwindCSS design</li>
            <li>Character limit and input validation</li>
            <li>Loading states and error handling</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChatDemo;