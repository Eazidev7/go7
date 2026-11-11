import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaTachometerAlt, FaShoppingBag, FaDollarSign, FaClipboardList, FaMapMarkedAlt, FaBars } from 'react-icons/fa';

const VendorNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      path: '/vendor/dashboard',
      icon: FaTachometerAlt,
      label: 'Dashboard',
      description: 'Overview & Stats'
    },
    {
      path: '/vendor/orders',
      icon: FaClipboardList,
      label: 'Orders',
      description: 'Manage Orders'
    },
    {
      path: '/vendor/live-tracking',
      icon: FaMapMarkedAlt,
      label: 'Live Track',
      description: 'Real-time Tracking'
    },
    {
      path: '/vendor/products',
      icon: FaShoppingBag,
      label: 'Products',
      description: 'Manage Products'
    },
    {
      path: '/vendor/earnings',
      icon: FaDollarSign,
      label: 'Earnings',
      description: 'Revenue & Payouts'
    }
  ];

  const isActive = (path) => {
    return location.pathname === path || 
           (path === '/vendor/dashboard' && location.pathname === '/vendor');
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center py-2 px-1 transition-colors ${
                  active
                    ? 'text-red-600 bg-red-50'
                    : 'text-gray-600 hover:text-red-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Side Navigation */}
      <div className="hidden md:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-40">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">G7</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Go7 Vendor</h2>
              <p className="text-sm text-gray-600">Management Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-red-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm opacity-75">{item.description}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="p-4 mt-8 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/book-delivery')}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <FaHome className="w-4 h-4" />
              <span>Book Delivery</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <FaHome className="w-4 h-4" />
              <span>Go to Customer App</span>
            </button>
          </div>
        </div>

        {/* Vendor Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <FaBars className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Vendor Portal</p>
              <p className="text-xs text-gray-500">v1.0.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G7</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Go7 Vendor</h1>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-600 hover:text-red-600 transition-colors"
          >
            <FaHome className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
};

export default VendorNavigation;