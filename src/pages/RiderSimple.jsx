import React, { useState } from 'react';

const RiderSimple = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [riderInfo, setRiderInfo] = useState({
    name: "John Rider",
    id: "R12345",
    earnings: "₦15,750",
    completedOrders: 12
  });

  const toggleOnline = () => {
    setIsOnline(!isOnline);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-blue-600 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">GO7 Rider</h1>
              <p className="text-sm opacity-80">{riderInfo.name} • #{riderInfo.id}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
              <button 
                onClick={toggleOnline} 
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${isOnline ? 'bg-green-400' : 'bg-gray-300'}`}
              >
                <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${isOnline ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Status */}
        {isOnline ? (
          <div className="bg-green-100 p-3 border-l-4 border-green-500 text-center">
            <p className="text-green-700 text-sm font-medium">You are online and ready to receive orders</p>
          </div>
        ) : (
          <div className="bg-gray-100 p-3 border-l-4 border-gray-500 text-center">
            <p className="text-gray-700 text-sm font-medium">You are offline. Go online to receive orders</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 p-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">Total Earnings</p>
            <p className="text-xl font-bold text-blue-900">{riderInfo.earnings}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800 font-medium">Completed Orders</p>
            <p className="text-xl font-bold text-green-900">{riderInfo.completedOrders}</p>
          </div>
        </div>

        {/* Demo Features */}
        <div className="p-4 space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-3">Current Location</h3>
            <div className="h-40 bg-gray-200 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Map view would appear here</p>
            </div>
          </div>

          {/* Demo Controls */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-3">Demo Controls</h3>
            <div className="space-y-2">
              <button
                disabled={!isOnline}
                className={`w-full py-2 rounded-lg text-sm font-medium ${
                  isOnline 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Simulate New Order
              </button>
              <button
                disabled={!isOnline}
                className={`w-full py-2 rounded-lg text-sm font-medium ${
                  isOnline 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Start Test Delivery
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 text-center text-xs text-gray-500">
          GO7 Rider Interface • Simple Demo Version
        </div>
      </div>
    </div>
  );
};

export default RiderSimple;