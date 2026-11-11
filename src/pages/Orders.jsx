import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OrderHistory from '../components/OrderHistory';
import { ArrowLeft } from 'lucide-react';

export default function Orders() {
    console.log('🟢 Orders component rendering!');
    const navigate = useNavigate();
    const { user } = useAuth();

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 pb-20">
                <div className="bg-white p-4 border-b sticky top-0 z-10">
                    <div className="flex items-center">
                        <button
                            onClick={() => navigate('/')}
                            className="mr-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
                    </div>
                </div>

                <div className="p-4">
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Please Login</h2>
                        <p className="text-gray-600 mb-4">
                            You need to be logged in to view your orders
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
                        >
                            Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white p-4 border-b sticky top-0 z-10">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate('/')}
                        className="mr-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
                </div>
            </div>

            <div className="p-4">
                <OrderHistory userId={user.uid} />
            </div>
        </div>
    );
}
