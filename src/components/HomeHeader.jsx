import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Bell, MapPin, ChevronDown, User } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { auth } from '../config/firebase';

const HomeHeader = () => {
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const [userName, setUserName] = useState('Guest');
  const [location, setLocation] = useState('Abeokuta, NG');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || user.email?.split('@')[0] || 'User');
    }
  }, []);

  const cartCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        {/* Greeting */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-semibold text-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-gray-500">Welcome back</p>
            <p className="text-sm font-semibold text-gray-900">Hi, {userName}!</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {/* Cart */}
          <button
            onClick={() => navigate('/cart')}
            className="relative p-2 hover:bg-gray-50 rounded-full transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-gray-700" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {cartCount}
              </span>
            )}
          </button>

          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 hover:bg-gray-50 rounded-full transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-700" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full"></span>
          </button>

          {/* Profile */}
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-50 rounded-full transition-colors"
          >
            <User className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Location Bar */}
      <div
        onClick={() => navigate('/location-picker')}
        className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-red-50 to-orange-50 cursor-pointer hover:from-red-100 hover:to-orange-100 transition-all"
      >
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-red-600" />
          <div>
            <p className="text-xs text-gray-600">Deliver to</p>
            <p className="text-sm font-semibold text-gray-900">{location}</p>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-600" />
      </div>
    </div>
  );
};

export default HomeHeader;
