// Simple Chat Demo - Test the secure chat system
// Mobile and desktop responsive demo

import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import SimpleChatUI, { SimpleChatButton } from '../components/SimpleChatUI';

export default function SimpleChatDemo() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Demo data
  const demoDeliveryId = 'demo_delivery_001';
  const demoReceiverId = 'go7_rider_001';

  const openChat = () => {
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

  return (
    <>
      <Helmet>
        <title>Simple Chat Demo - GO7</title>
        <meta name="description" content="Test the secure chat system with Firebase" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">GO7 Simple Chat Demo</h1>
                <span className="ml-3 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  ✅ Secure
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Delivery:</span> {demoDeliveryId}
                </div>
                <SimpleChatButton 
                  deliveryId={demoDeliveryId}
                  receiverId={demoReceiverId}
                  onClick={openChat}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          
          {/* Feature Overview */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Security Features */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Security</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Firebase Authentication required
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Delivery participant access only
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Firestore security rules enforced
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Real-time message validation
                </li>
              </ul>
            </div>

            {/* Core Functions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Functions</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">📤</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">sendMessage()</code>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">🔄</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">subscribeToChat()</code>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">🕒</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">formatMessageTime()</code>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">🔐</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">canAccessChat()</code>
                </li>
              </ul>
            </div>

            {/* UI Features */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📱</span>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">UI Features</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Responsive design (mobile/desktop)
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Auto-scroll to latest message
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Message bubbles with timestamps
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Real-time message sync
                </li>
              </ul>
            </div>
          </div>

          {/* Demo Instructions */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🧪 How to Test</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Customer View:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Click the "💬 Chat" button above</li>
                  <li>Chat window opens with delivery context</li>
                  <li>Send messages to the rider</li>
                  <li>View real-time message sync</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Security Testing:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Try accessing without authentication</li>
                  <li>Test with different user IDs</li>
                  <li>Verify Firestore rules enforcement</li>
                  <li>Check delivery participant validation</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 Technical Implementation</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Core Functions:</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="bg-white p-3 rounded border">
                    <code className="text-blue-600">sendMessage(deliveryId, senderId, receiverId, text)</code>
                    <p className="mt-1 text-xs">Securely saves message to Firestore with validation</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <code className="text-blue-600">subscribeToChat(deliveryId, callback)</code>
                    <p className="mt-1 text-xs">Real-time listener for message updates</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Security Rules:</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="bg-white p-3 rounded border">
                    <p className="font-mono text-xs">✓ Authentication required</p>
                    <p className="font-mono text-xs">✓ Delivery participant only</p>
                    <p className="font-mono text-xs">✓ Message validation</p>
                    <p className="font-mono text-xs">✓ Access control enforced</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simple Chat UI Component */}
        <SimpleChatUI 
          deliveryId={demoDeliveryId}
          receiverId={demoReceiverId}
          isOpen={isChatOpen}
          onClose={closeChat}
        />
      </div>
    </>
  );
}