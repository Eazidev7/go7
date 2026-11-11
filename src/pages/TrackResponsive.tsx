import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMediaQuery';
import { Helmet } from 'react-helmet-async';

interface TrackResponsiveProps {
  className?: string;
}

const TrackResponsive: React.FC<TrackResponsiveProps> = ({ 
  className = "" 
}) => {
  const [trackingId, setTrackingId] = useState('');
  const [error, setError] = useState('');
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trackingId.trim()) {
      setError('Please enter a tracking ID');
      return;
    }
    
    // Clear any error and navigate to tracking page
    setError('');
    navigate(`/live-tracking`);
  };

  const recentOrders = [
    { id: 'GO7-001234', status: 'Delivered', time: '2 hours ago' },
    { id: 'GO7-001235', status: 'En Route', time: '30 mins ago' },
    { id: 'GO7-001236', status: 'Processing', time: '1 hour ago' }
  ];

  return (
    <div className={`min-h-screen ${isMobile ? 'bg-gray-50' : 'bg-gradient-to-br from-gray-50 to-gray-100'} ${className}`}>
      <Helmet>
        <title>Track Your Order - Go7</title>
        <meta name="description" content="Track your Go7 delivery in real-time with live GPS updates" />
      </Helmet>

      {isMobile ? (
        /* Mobile Layout */
        <div className="min-h-screen">
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
                  <h1 className="text-xl font-semibold text-gray-900">Track Order</h1>
                  <p className="text-sm text-gray-600">Enter your tracking ID</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Content */}
          <div className="p-4 space-y-6">
            {/* Track Form Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-6">
                <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Track Your Delivery</h2>
                <p className="text-gray-600 text-sm mt-1">Get real-time updates on your order</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="trackingId" className="block text-sm font-medium text-gray-700 mb-2">
                    Tracking ID
                  </label>
                  <input
                    type="text"
                    id="trackingId"
                    value={trackingId}
                    onChange={(e) => {
                      setTrackingId(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter tracking ID (e.g., GO7-001234)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  />
                  {error && (
                    <p className="text-red-600 text-sm mt-2">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Track Order
                </button>
              </form>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => navigate('/live-tracking')}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{order.id}</div>
                        <div className="text-sm text-gray-600">{order.time}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'En Route' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop Layout */
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-4xl w-full">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Track Your Go7 Delivery</h1>
              <p className="text-xl text-gray-600">Enter your tracking ID to get real-time updates</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Track Form */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                <div className="text-center mb-8">
                  <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Track Order</h2>
                  <p className="text-gray-600">Get live GPS updates</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="trackingIdDesktop" className="block text-sm font-medium text-gray-700 mb-2">
                      Tracking ID
                    </label>
                    <input
                      type="text"
                      id="trackingIdDesktop"
                      value={trackingId}
                      onChange={(e) => {
                        setTrackingId(e.target.value);
                        setError('');
                      }}
                      placeholder="GO7-001234"
                      className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-lg"
                    />
                    {error && (
                      <p className="text-red-600 text-sm mt-2">{error}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Track My Order
                  </button>
                </form>
              </div>

              {/* Recent Orders Desktop */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Recent Orders</h3>
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => navigate('/live-tracking')}
                      className="w-full p-6 border border-gray-200 rounded-xl hover:shadow-lg hover:border-red-200 transition-all duration-200 text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900 text-lg group-hover:text-red-600 transition-colors">
                            {order.id}
                          </div>
                          <div className="text-gray-600">{order.time}</div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'En Route' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status}
                          </span>
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackResponsive;