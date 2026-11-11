import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Beef, Pizza as PizzaIcon, Salad, UtensilsCrossed, 
  Store, Pill, Package, MapPin, Bell, Search, Truck, Users
} from 'lucide-react';
import { auth } from '../config/firebase';
import Go7Icon from './Go7Icon';
import '../styles/go7-icons.css';
import '../styles/motion.css';

const MobileHomePage = ({ location = 'Abeokuta, NG' }) => {
  const [activeCategory, setActiveCategory] = useState('Fast Food');
  const [searchQuery, setSearchQuery] = useState('');
  const [userName, setUserName] = useState('Guest');
  const navigate = useNavigate();

  // Get user name from Firebase Auth
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || user.email?.split('@')[0] || 'User');
    }
  }, []);

  // Debug block - to verify component is rendering
  console.log('📱 MobileHomePage rendering...', { location, activeCategory, userName });

  // Quick Action Categories (6 items for horizontal scroll)
  const quickActions = [
    { id: 1, name: 'Fast Food', icon: '🍔', color: 'from-red-500 to-red-600', route: '/menu' },
    { id: 2, name: 'Groceries', icon: '🛒', color: 'from-green-500 to-green-600', route: '/market' },
    { id: 3, name: 'Errands', icon: '🏃', color: 'from-purple-500 to-purple-600', route: '/errands' },
    { id: 4, name: 'Pharmacy', icon: '💊', color: 'from-pink-500 to-pink-600', route: '/pharmacy' },
    { id: 5, name: 'Packages', icon: '📦', color: 'from-gray-500 to-gray-600', route: '/book-delivery' },
    { id: 6, name: 'Delivery', icon: '🚚', color: 'from-blue-500 to-blue-600', route: '/book-delivery' }
  ];

  // Recommended merchants data
  const recommendedMerchants = [
    {
      id: 1,
      name: 'Tasty Bites',
      image: '/burger-haven.jpg',
      rating: 4.7,
      category: 'Fast Food',
      eta: '15-25 min',
      deliveryFee: '₦200'
    },
    {
      id: 2,
      name: 'Fresh Market',
      image: '/ibara-market.jpg',
      rating: 4.5,
      category: 'Groceries',
      eta: '10-20 min',
      deliveryFee: '₦150'
    },
    {
      id: 3,
      name: 'Pizza Palace',
      image: '/pizza-palace.jpg',
      rating: 4.8,
      category: 'Fast Food',
      eta: '20-30 min',
      deliveryFee: '₦250'
    },
    {
      id: 4,
      name: 'HealthPlus Pharmacy',
      image: '/medplus-pharmacy.jpg',
      rating: 4.9,
      category: 'Healthcare',
      eta: '5-15 min',
      deliveryFee: '₦100'
    }
  ];

  // Bottom navigation items
  const navItems = [
    { id: 1, name: 'Explore Go7', iconType: 'home', active: true },
    { id: 2, name: 'Orders', iconType: 'orders', active: false },
    { id: 3, name: 'Track', iconType: 'track', active: false },
    { id: 4, name: 'Chat', iconType: 'chat', active: false },
    { id: 5, name: 'Profile', iconType: 'profile', active: false }
  ];

  // Handle quick action clicks
  const handleQuickActionClick = (action) => {
    setActiveCategory(action.name);
    navigate(action.route);
  };

  // Handle merchant clicks
  const handleMerchantClick = (merchant) => {
    if (merchant.category === 'Groceries') {
      navigate('/market');
    } else if (merchant.category === 'Healthcare') {
      navigate('/pharmacy');
    } else {
      navigate(`/vendor/${merchant.id}`);
    }
  };

  // Handle bottom navigation clicks
  const handleNavClick = (item) => {
    console.log(`🔵 [MobileHomePage] Navigation clicked: ${item.name}`);
    
    if (item.name === 'Orders') {
      console.log('🔵 [MobileHomePage] Navigating to /orders');
      navigate('/orders');
    } else if (item.name === 'Track') {
      console.log('🔵 [MobileHomePage] Navigating to /track');
      navigate('/track');
    } else if (item.name === 'Chat') {
      console.log('🔵 [MobileHomePage] Navigating to /chat');
      navigate('/chat');
    } else if (item.name === 'Profile') {
      console.log('🔵 [MobileHomePage] Navigating to /profile');
      navigate('/profile');
    } else if (item.name === 'Explore Go7') {
      console.log('🔵 [MobileHomePage] Staying on mobile home');
      // Stay on current page
    }
  };

  return (
    <div className="mobile-homepage-container font-['Inter',system-ui,sans-serif] bg-white min-h-screen">
      <div className="pb-24">
        {/* 1️⃣ HEADER */}
        <div className="px-5 pt-6 pb-4 bg-white">
          {/* Greeting Row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Hi {userName}, 👋
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">ready to order?</p>
            </div>
            
            {/* Profile Photo with Badge */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {userName.charAt(0).toUpperCase()}
              </div>
              {/* Red notification badge */}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
            </div>
          </div>

          {/* Location Input Row */}
          <button 
            onClick={() => navigate('/location')}
            className="w-full bg-gray-50 rounded-xl px-4 py-3.5 flex items-center gap-3 hover:bg-gray-100 transition-colors"
          >
            <MapPin size={20} className="text-gray-600 flex-shrink-0" strokeWidth={2} />
            <div className="flex-1 text-left">
              <p className="text-sm text-gray-600">Deliver restaurants, groceries...</p>
            </div>
          </button>
        </div>

        {/* 2️⃣ QUICK ACTION STRIP */}
        <div className="px-5 mb-5">
          <div 
            className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
            style={{
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickActionClick(action)}
                className="flex-shrink-0 flex flex-col items-center gap-2 group"
              >
                {/* Circular Icon Background */}
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 group-active:scale-95 transition-transform duration-200`}>
                  {action.icon}
                </div>
                {/* Label */}
                <span className="text-xs font-medium text-gray-700 text-center whitespace-nowrap">
                  {action.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 3️⃣ PROMO BANNER */}
        <div className="px-5 mb-4">
          <div 
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{ backgroundColor: '#d62828' }}
          >
            {/* Decorative circles */}
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full"></div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white opacity-5 rounded-full"></div>
            
            <div className="relative z-10">
              <h3 className="text-white text-xl font-bold mb-1">
                ₦200 off your first delivery!
              </h3>
              <p className="text-white text-sm opacity-90 mb-4">
                Use code <span className="font-bold">GOFIRST</span> at checkout
              </p>
              <button 
                onClick={() => navigate('/menu')}
                className="bg-black text-white px-8 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-900 active:scale-95 transition-all duration-200 shadow-lg"
              >
                Order Now
              </button>
            </div>
          </div>
        </div>

        {/* 4️⃣ REFERRAL BANNER */}
        <div className="px-5 mb-6">
          <div 
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #5b21b6 0%, #dc2626 100%)'
            }}
          >
            {/* Corner glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h3 className="text-white text-xl font-bold mb-1">
                  Refer & Earn ₦500
                </h3>
                <p className="text-white text-sm opacity-90 max-w-[200px]">
                  Invite friends to Go7 and earn rewards!
                </p>
              </div>
              <div className="flex-shrink-0">
                <Users size={48} className="text-white opacity-80" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>

        {/* 5️⃣ RECOMMENDED FOR YOU SECTION */}
        <div className="px-5 mb-6">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Recommended for You</h3>
            <button 
              onClick={() => navigate('/vendors')}
              className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              See All
            </button>
          </div>

          {/* Horizontal Scroll Cards */}
          <div 
            className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
            style={{
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {recommendedMerchants.map((merchant) => (
              <div
                key={merchant.id}
                onClick={() => handleMerchantClick(merchant)}
                className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-95 group relative"
              >
                {/* Image */}
                <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-6xl">
                    {merchant.category === 'Fast Food' ? '🍔' : 
                     merchant.category === 'Groceries' ? '🛒' : 
                     merchant.category === 'Healthcare' ? '💊' : '🍕'}
                  </div>
                  {/* Rating Badge */}
                  <div className="absolute top-2 left-2 bg-white rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
                    <span className="text-yellow-500 text-xs">⭐</span>
                    <span className="text-xs font-bold text-gray-900">{merchant.rating}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3">
                  <h4 className="font-bold text-sm text-gray-900 mb-1">{merchant.name}</h4>
                  <p className="text-xs text-gray-500 mb-2">{merchant.eta} • {merchant.deliveryFee}</p>
                  
                  {/* Red + Button */}
                  <button className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-lg shadow-lg hover:bg-red-700 active:scale-90 transition-all duration-200">
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Extra spacing for bottom nav */}
        <div className="h-4"></div>
      </div>
          <div
            className="p-5 rounded-2xl text-white relative overflow-hidden"
            style={{ backgroundColor: '#e60023' }}
          >
            <div className="relative z-10">
              <h2 className="text-lg font-semibold mb-1">Get ₦200 Off Your First Order on Go7</h2>
              <p className="text-sm opacity-90 mb-4 font-medium">Use code GOFIRST at checkout</p>
              <button className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-900 transition-all duration-200 active:scale-95">
                Order Now
              </button>
            </div>

            {/* Decorative elements */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white opacity-5 rounded-full"></div>
          </div>
        </div>

        {/* Categories Row */}
        <div className="px-4 mb-6">
          <div className="flex gap-3 overflow-x-auto pb-2" style={{
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>
            {categories.map((category) => {
              const IconComponent = 
                category.name === 'Burger' ? Beef :
                category.name === 'Pizza' ? PizzaIcon :
                category.name === 'Salad' ? Salad :
                category.name === 'Sushi' ? UtensilsCrossed :
                category.name === 'Local Market' ? Store :
                category.name === 'Pharmacy' ? Pill :
                Package;
              
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.name)}
                  className={`flex-shrink-0 flex flex-col items-center gap-2 px-4 py-3 rounded-2xl min-w-max transition-all duration-300 hover:scale-105 active:scale-95 ${
                    category.highlight
                      ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30'
                      : activeCategory === category.name
                      ? 'bg-red-50 text-red-600 border-2 border-red-200'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-100 shadow-sm'
                  }`}
                >
                  <div className="w-10 h-10 flex items-center justify-center">
                    <IconComponent 
                      size={24} 
                      strokeWidth={2}
                      className={category.highlight || activeCategory === category.name ? 'text-current' : 'text-gray-600'}
                    />
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ${
                    category.highlight ? 'text-white' : activeCategory === category.name ? 'text-red-600' : 'text-gray-800'
                  }`}>
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vendors Section */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 font-inter">Popular Near You</h3>
            <button className="text-red-500 text-sm font-medium hover:text-red-600 transition-colors duration-200">
              See All
            </button>
          </div>

          <div className="space-y-4">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-[0.98] group"
                onClick={() => handleVendorClick(vendor)}
              >
                {/* Professional Vendor Image */}
                <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                  <img
                    src={vendor.image}
                    alt={vendor.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.name)}&size=400&background=e5e5e5&color=666`;
                    }}
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  
                  {/* Rating Badge */}
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center space-x-1 shadow-lg">
                    <span className="text-yellow-500 text-sm">⭐</span>
                    <span className="text-xs font-bold text-gray-800">{vendor.rating}</span>
                  </div>

                  {/* Category Icon */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                    <span className="text-xl">{vendor.icon}</span>
                  </div>
                </div>

                {/* Vendor Info */}
                <div className="p-4">
                  <div className="mb-3">
                    <h4 className="font-bold text-gray-900 text-base mb-1">{vendor.name}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{vendor.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="flex items-center space-x-1 text-gray-600">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{vendor.eta}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-green-600 font-semibold">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>{vendor.deliveryFee}</span>
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{vendor.priceTag}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 mb-24" style={{ minWidth: '360px' }}>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/market')}
              className="bg-gradient-to-br from-green-500 to-green-600 text-white p-5 text-left relative overflow-hidden group active:scale-[1.03] transition-all duration-200 ease-out hover:scale-[1.02]"
              style={{
                borderRadius: '16px',
                boxShadow: '0 3px 8px rgba(0,0,0,0.08)',
                minHeight: '100px'
              }}
            >
              {/* Ripple effect overlay */}
              <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-10 transition-opacity duration-200"></div>

              {/* Icon */}
              <div className="flex items-center justify-center w-8 h-8 mb-3">
                <svg className="w-6 h-6 text-white stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>

              <div className="relative z-10">
                <div className="font-semibold text-sm mb-1">Local Market</div>
                <div className="text-xs opacity-90 leading-tight">Fresh groceries delivered</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/pharmacy')}
              className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 text-left relative overflow-hidden group active:scale-[1.03] transition-all duration-200 ease-out hover:scale-[1.02]"
              style={{
                borderRadius: '16px',
                boxShadow: '0 3px 8px rgba(0,0,0,0.08)',
                minHeight: '100px'
              }}
            >
              {/* Ripple effect overlay */}
              <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-10 transition-opacity duration-200"></div>

              {/* Icon */}
              <div className="flex items-center justify-center w-8 h-8 mb-3">
                <svg className="w-6 h-6 text-white stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c.251.023.501.05.75.082m-.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393a9.065 9.065 0 01-2.461.588l-2.685.092a5.136 5.136 0 01-.796-.06L9.75 15.9m10.05-.6a9.135 9.135 0 01-4.096 1.902L12 17.25l-3.754-.048A9.135 9.135 0 014.2 15.3M9.75 15.9c-.896-.393-1.7-1.016-2.32-1.793" />
                </svg>
              </div>

              <div className="relative z-10">
                <div className="font-semibold text-sm mb-1">Pharmacy</div>
                <div className="text-xs opacity-90 leading-tight">Health products fast</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/book-delivery')}
              className="bg-gradient-to-br from-red-500 to-red-600 text-white p-5 text-left relative overflow-hidden group active:scale-[1.03] transition-all duration-200 ease-out hover:scale-[1.02]"
              style={{
                borderRadius: '16px',
                boxShadow: '0 3px 8px rgba(0,0,0,0.08)',
                minHeight: '100px'
              }}
            >
              {/* Ripple effect overlay */}
              <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-10 transition-opacity duration-200"></div>

              {/* Icon */}
              <div className="flex items-center justify-center w-8 h-8 mb-3">
                <svg className="w-6 h-6 text-white stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0V6a3 3 0 013-3h6a3 3 0 013 3v7.5M8.25 18.75h1.5a1.5 1.5 0 001.5-1.5V12a1.5 1.5 0 00-1.5-1.5h-1.5m0 7.5v-7.5m0 0H6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 001.5 1.5h2.25M19.5 12v6a1.5 1.5 0 01-1.5 1.5h-1.5a1.5 1.5 0 01-1.5-1.5v-1.5a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5z" />
                </svg>
              </div>

              <div className="relative z-10">
                <div className="font-semibold text-sm mb-1">Book Delivery</div>
                <div className="text-xs opacity-90 leading-tight">Send anything, anywhere</div>
              </div>
            </button>

            <button
              onClick={() => {
                // Get active order ID from localStorage or use default
                const orderId = localStorage.getItem("activeOrderId") || "go7-NTX72PK";
                console.log('📍 [Track Order] Navigating to live tracking with orderId:', orderId);
                navigate(`/live-tracking/${orderId}`);
              }}
              className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-5 text-left relative overflow-hidden group active:scale-[1.03] transition-all duration-200 ease-out hover:scale-[1.02]"
              style={{
                borderRadius: '16px',
                boxShadow: '0 3px 8px rgba(0,0,0,0.08)',
                minHeight: '100px'
              }}
            >
              {/* Ripple effect overlay */}
              <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-10 transition-opacity duration-200"></div>

              {/* Icon */}
              <div className="flex items-center justify-center w-8 h-8 mb-3">
                <svg className="w-6 h-6 text-white stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>

              <div className="relative z-10">
                <div className="font-semibold text-sm mb-1">Track Order</div>
                <div className="text-xs opacity-90 leading-tight">Real-time tracking</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/gobuy')}
              className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-5 text-left relative overflow-hidden group active:scale-[1.03] transition-all duration-200 ease-out hover:scale-[1.02]"
              style={{
                borderRadius: '16px',
                boxShadow: '0 3px 8px rgba(0,0,0,0.08)',
                minHeight: '100px'
              }}
            >
              {/* Ripple effect overlay */}
              <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-10 transition-opacity duration-200"></div>

              {/* Icon */}
              <div className="flex items-center justify-center w-8 h-8 mb-3">
                <svg className="w-6 h-6 text-white stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>

              <div className="relative z-10">
                <div className="font-semibold text-sm mb-1">GoBuy</div>
                <div className="text-xs opacity-90 leading-tight">Personal shopping</div>
              </div>
            </button>
          </div>
        </div>

        {/* Bottom Navigation - Sticky with Go7 Red Theme */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50" style={{ boxShadow: '0 -2px 10px rgba(0,0,0,0.08)' }}>
          <div className="flex justify-around py-2 px-2 max-w-md mx-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 active:scale-95 ${item.active
                  ? 'text-white bg-gradient-to-br from-red-500 to-red-600 shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                style={item.active ? { boxShadow: '0 2px 8px rgba(214, 40, 40, 0.3)' } : {}}
              >
                <div className={`p-1 rounded-full transition-all duration-200 ${item.active ? 'bg-white/20' : ''
                  }`}>
                  <Go7Icon
                    type={item.iconType}
                    size={22}
                    active={item.active}
                    alt={`${item.name} navigation`}
                  />
                </div>
                <span className={`text-xs font-medium font-inter ${item.active ? 'font-bold' : ''}`}>{item.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Styles for Scrollbar Hide - converted from style jsx to inline styles */}
      </div>
    </div>
  );
};

export default MobileHomePage;