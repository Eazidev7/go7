import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Bell, ChevronDown, ShoppingBag, Package, ShoppingCart, Pill } from 'lucide-react';
import { auth } from '../firebase/config';

/**
 * GO7 v2.0 REFINED CLASSIC HOMEPAGE - TEST ROUTE
 * Direct access without any caching
 */
const HomeV2Test = () => {
  const [userName, setUserName] = useState('Guest');
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🏠 HomeV2Test RENDERING - Direct Route');
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || user.email?.split('@')[0] || 'User');
    }
  }, []);

  const quickActions = [
    { icon: ShoppingBag, label: 'Food Delivery', path: '/explore', gradient: 'from-red-500 to-red-600' },
    { icon: Package, label: 'Package Delivery', path: '/book-delivery', gradient: 'from-orange-500 to-orange-600' },
    { icon: ShoppingCart, label: 'Market Shopping', path: '/go-buy', gradient: 'from-green-500 to-green-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pb-24">
      {/* MASSIVE GREEN SUCCESS BANNER */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        fontSize: '18px',
        fontWeight: '700',
        zIndex: 10000,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        🎉 SUCCESS! v2.0 LOADED - {new Date().toLocaleTimeString()}
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 pt-24 pb-4 px-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mb-3">
          <button className="flex items-center gap-2">
            <MapPin size={18} className="text-red-600" />
            <div className="text-left">
              <p className="text-[10px] text-gray-500 uppercase">Deliver to</p>
              <p className="text-sm font-semibold text-gray-900">Abeokuta, NG</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          <button className="relative p-2 hover:bg-gray-50 rounded-full">
            <Bell size={20} className="text-gray-700" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search restaurants, groceries..."
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pt-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-[18px] p-6 mb-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {userName}!</h2>
          <p className="text-red-100 text-sm">Fast delivery to your doorstep</p>
        </div>

        {/* Core Services - 3 Column Grid */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Services</h3>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center p-4 bg-white rounded-[16px] hover:scale-102 transition-transform"
                style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
              >
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3`}>
                  <action.icon size={24} className="text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700 text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Special Offers */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Offers</h3>
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-[18px] p-5">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
              <h4 className="text-base font-bold text-gray-900 mb-1">₦200 off your first delivery!</h4>
              <p className="text-sm text-gray-600 mb-3">Use code FIRST200 at checkout</p>
              <button className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-700">
                Order Now
              </button>
            </div>
          </div>
        </div>

        {/* Version Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-blue-900 mb-2">✅ You're viewing v2.0 Refined Classic</p>
          <p className="text-xs text-blue-700">This is a test route to verify the new design loads correctly.</p>
          <p className="text-xs text-blue-600 mt-2 font-mono">Route: /home-v2-test</p>
        </div>
      </div>
    </div>
  );
};

export default HomeV2Test;
