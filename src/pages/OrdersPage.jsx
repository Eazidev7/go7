import React from 'react';
import { useNavigate } from 'react-router-dom';

const OrdersPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 border-b">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/')}
            className="mr-3 p-2 rounded-full hover:bg-gray-100"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
        </div>
      </div>
      
      <div className="p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No orders yet
          </h2>
          <p className="text-gray-600 mb-6">
            Start exploring Go7 to place your first order
          </p>
          <button 
            onClick={() => navigate('/')}
            className="bg-red-600 text-white px-6 py-3 rounded-full font-medium hover:bg-red-700 transition-colors"
            style={{ backgroundColor: '#E30613' }}
          >
            Start Shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;