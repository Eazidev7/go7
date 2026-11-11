import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Chat() {
    console.log('🟢 Chat component rendering!');
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white p-4 border-b sticky top-0 z-10">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate('/')}
                        className="mr-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        ←
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">Chat</h1>
                </div>
            </div>

            <div className="p-4">
                <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Chats</h2>
                    <p className="text-gray-600 mb-4">
                        Chat with your rider when you have an active delivery
                    </p>
                    <button
                        onClick={() => navigate('/book-delivery')}
                        className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                        Book a Delivery
                    </button>
                </div>

                <div className="mt-6 space-y-3">
                    <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-start">
                            <span className="text-2xl mr-3">ℹ️</span>
                            <div>
                                <p className="text-sm font-medium text-blue-900 mb-1">Real-time Communication</p>
                                <p className="text-sm text-blue-700">
                                    Chat directly with your rider during deliveries for updates and special instructions.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-start">
                            <span className="text-2xl mr-3">✅</span>
                            <div>
                                <p className="text-sm font-medium text-green-900 mb-1">Secure & Private</p>
                                <p className="text-sm text-green-700">
                                    All chats are encrypted and only accessible during active deliveries.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
