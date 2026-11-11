import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Bell, ChevronDown, Star, Clock, Bike } from 'lucide-react';
import { auth } from '../config/firebase';
import MobileNavBar from '../components/MobileNavBar';
import VendorClickableWrapper from '../components/VendorClickableWrapper';
import { useLocation } from '../contexts/LocationContext';
import AddressModal from '../components/AddressModal';
import { getTrendingVendors } from '../services/customerProductServiceV2';
import { resolveVendorImage } from '../utils/vendorImage';
import { getVendorPlaceholder } from '../utils/placeholderImages';
import { removeTestData } from '../utils/removeTestData';
import { db } from '../config/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const MobileHomePage = () => {
  const [userName, setUserName] = useState('Guest');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [trendingVendors, setTrendingVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);
  const navigate = useNavigate();
  const { activeAddress } = useLocation();

  console.log('🎯 ACTUAL MOBILE HOME PAGE LOADED! Sweet Sensations should be here:', trendingVendors.map(v => v.name));

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || user.email?.split('@')[0] || 'User');
    }

    const verifyOnline = async () => {
      if (!navigator.onLine) {
        setIsOnline(false);
        return;
      }
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        await fetch(`${window.location.origin}/go7-logo.png`, { method: 'HEAD', cache: 'no-store', signal: ctrl.signal });
        clearTimeout(t);
        setIsOnline(true);
      } catch {
        setIsOnline(navigator.onLine);
      }
    };

    const handleOnline = () => verifyOnline();
    const handleOffline = () => setIsOnline(false);
    
    verifyOnline();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') verifyOnline();
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch real trending vendors
  useEffect(() => {
    const fetchTrendingVendors = async () => {
      try {
        setLoadingVendors(true);
        const { vendors } = await getTrendingVendors(6);
        setTrendingVendors(vendors);
      } catch (error) {
        console.error('Error fetching trending vendors:', error);
      } finally {
        setLoadingVendors(false);
      }
    };

    fetchTrendingVendors();
  }, []);

  const handleRemoveTestData = async () => {
    if (!window.confirm('Remove all test data (Sweet Sensations, Quick Bites, etc.) from Firebase? This cannot be undone.')) return;
    
    try {
      setIsRemoving(true);
      const result = await removeTestData();
      if (result.success) {
        console.log('✅ Test data removed successfully');
        alert('Test data removed successfully! Refreshing page...');
        window.location.reload();
      } else {
        console.error('❌ Failed to remove test data:', result.error);
        alert('Failed to remove test data: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error removing test data:', error);
      alert('Error removing test data: ' + error.message);
    } finally {
      setIsRemoving(false);
    }
  };

  // Admin function to remove specific vendor
  const adminRemoveVendor = async (vendorId) => {
    try {
      console.log(`🗑️ Removing vendor: ${vendorId}`);
      
      // Remove all products first
      const productsRef = collection(db, 'vendors', vendorId, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      for (const productDoc of productsSnapshot.docs) {
        console.log(`  🗑️ Removing product: ${productDoc.id}`);
        
        // Remove addons
        const addonsRef = collection(db, 'vendors', vendorId, 'products', productDoc.id, 'addons');
        const addonsSnapshot = await getDocs(addonsRef);
        
        for (const addonDoc of addonsSnapshot.docs) {
          await deleteDoc(doc(db, 'vendors', vendorId, 'products', productDoc.id, 'addons', addonDoc.id));
        }
        
        // Remove product
        await deleteDoc(doc(db, 'vendors', vendorId, 'products', productDoc.id));
      }
      
      // Remove the vendor
      await deleteDoc(doc(db, 'vendors', vendorId));
      console.log(`✅ Successfully removed vendor: ${vendorId}`);
      alert('Vendor removed! Refreshing page...');
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Error removing vendor:', error);
      alert('Error: ' + error.message);
    }
  };

  // Make removal functions globally accessible
  useEffect(() => {
    window.removeTestData = handleRemoveTestData;
    window.removeSweet = handleRemoveTestData;
    window.adminRemoveVendor = adminRemoveVendor;
    window.adminRemoveSweetSensation = () => adminRemoveVendor('fW4EoEvkVpPmNtIMmNYit06xrl02');
    window.removeGuyVendor = () => adminRemoveVendor('fW4EoEvkVpPmNtIMmNYit06xrl02');
    
    console.log('🌍 GLOBAL FUNCTIONS ADDED:');
    console.log('- window.removeGuyVendor() <- USE THIS to remove guy image vendor');
    console.log('- window.adminRemoveSweetSensation() <- Same thing');
    console.log('- window.adminRemoveVendor("vendorId") <- Remove any vendor');
    
    document.title = 'REAL Mobile Home - Guy Vendor Remover';
    return () => {
      delete window.removeTestData;
      delete window.removeSweet;
      delete window.adminRemoveVendor;
      delete window.adminRemoveSweetSensation;
      delete window.removeGuyVendor;
    };
  }, []);

  // Category cards - all route to explore page
  const categoryCards = [
    { 
      id: 1, 
      name: 'Fast Food', 
      route: '/explore',
      image: 'https://cdn-icons-png.flaticon.com/512/1046/1046784.png',
      bgColor: '#FFF3E0'
    },
    { 
      id: 2, 
      name: 'Groceries', 
      route: '/explore',
      image: 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png',
      bgColor: '#E8F5E9'
    },
    { 
      id: 3, 
      name: 'Errands', 
      route: '/book-delivery',
      image: 'https://cdn-icons-png.flaticon.com/512/2972/2972302.png',
      bgColor: '#E3F2FD'
    },
    { 
      id: 4, 
      name: 'Pharmacy', 
      route: '/explore',
      image: 'https://cdn-icons-png.flaticon.com/512/2965/2965567.png',
      bgColor: '#F3E5F5'
    },
    { 
      id: 5, 
      name: 'Shops', 
      route: '/explore',
      image: 'https://cdn-icons-png.flaticon.com/512/869/869636.png',
      bgColor: '#FCE4EC'
    },
    { 
      id: 6, 
      name: 'Markets', 
      route: '/explore',
      image: 'https://cdn-icons-png.flaticon.com/512/4151/4151416.png',
      bgColor: '#FFF9C4'
    }
  ];

  // Core Services - 3 main actions with modern icons
  const coreServices = [
    {
      title: 'Book Delivery',
      subtitle: 'Send packages',
      route: '/book-delivery',
      icon: 'https://cdn-icons-png.flaticon.com/512/709/709790.png', // Modern delivery box
      color: '#e61e25',
      bgGradient: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)'
    },
    {
      title: 'Track Order',
      subtitle: 'Live tracking',
      route: '/track',
      icon: 'https://cdn-icons-png.flaticon.com/512/854/854878.png', // Location pin with route
      color: '#0891b2',
      bgGradient: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)'
    },
    {
      title: 'GoBuy',
      subtitle: 'Shop for you',
      route: '/go-buy',
      icon: 'https://cdn-icons-png.flaticon.com/512/1170/1170678.png', // Shopping cart modern
      color: '#16a34a',
      bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
    }
  ];

  // Trending vendors now loaded from V2 system

  return (
    <div className="min-h-screen bg-gray-50 page-with-bottom-nav" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      
      {/* VERSION INDICATOR - Temporary to confirm new version loaded */}
      <div 
        className="fixed bottom-20 right-4 z-[100] bg-red-600 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg"
        style={{ opacity: 0.9 }}
      >
        v3.0 Uber Eats Style ✨
      </div>

      {/* PWA Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white px-4 py-2 text-center text-sm font-semibold">
          📴 Offline Mode - Limited features available
        </div>
      )}

      {/* HEADER - Fixed */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="px-4 py-4">
          {/* Location Bar */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={() => setIsAddressModalOpen(true)}
              className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-all active:scale-95"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <MapPin size={18} className="text-red-600" />
              <div className="text-left">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Deliver to</p>
                <p className="text-sm font-semibold text-gray-900">
                  {activeAddress?.address || 'Abeokuta, NG'}
                </p>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
            
            <button 
              className="relative p-2.5 hover:bg-gray-50 rounded-full transition-all active:scale-90"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Bell size={20} className="text-gray-700" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full border border-white animate-pulse"></span>
            </button>
          </div>

          {/* Search Bar */}
          <button 
            onClick={() => navigate('/search')}
            className="w-full bg-gray-50 p-3.5 rounded-xl flex items-center gap-3 hover:bg-gray-100 transition-all active:scale-[0.98]"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Search size={18} className="text-gray-400" />
            <span className="text-gray-400 text-sm">Search restaurants, shops or items…</span>
          </button>
        </div>
      </div>

      {/* Content with top padding for fixed header */}
      <div className="pt-36">
        
        {/* EMERGENCY VENDOR REMOVAL BUTTON */}
        <div className="px-4 mb-4">
          <button 
            onClick={() => {
              console.log('🚨 REMOVING GUY VENDOR NOW...');
              window.adminRemoveVendor && window.adminRemoveVendor('fW4EoEvkVpPmNtIMmNYit06xrl02');
            }}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-bold text-lg"
            style={{ 
              position: 'sticky', 
              top: '140px', 
              zIndex: 1000,
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            🚨 REMOVE GUY VENDOR (EMERGENCY)
          </button>
        </div>
        
        {/* PROMO CARDS SLIDER - Enhanced with Animations */}
        <div className="mb-5 animate-fadeIn">
          <div 
            className="flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide"
            style={{ 
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {/* Card 1 - First Order Discount */}
            <div 
              className="flex-shrink-0 w-[280px] rounded-[18px] p-4 relative overflow-hidden snap-start group cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]" 
              style={{ 
                background: 'linear-gradient(135deg, #ff1744 0%, #f50057 50%, #e91e63 100%)',
                boxShadow: '0 6px 20px rgba(255,23,68,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                WebkitTapHighlightColor: 'transparent'
              }}
              onClick={() => navigate('/explore')}
            >
              {/* Animated background pattern */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.2) 0%, transparent 50%)',
                  animation: 'pulse 3s ease-in-out infinite'
                }}
              />
              
              {/* Floating elements */}
              <div className="absolute top-3 right-3 w-16 h-16 bg-white opacity-10 rounded-full blur-2xl animate-pulse" />
              <div className="absolute bottom-3 left-3 w-12 h-12 bg-white opacity-10 rounded-full blur-xl" style={{ animationDelay: '1s' }} />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🎉</span>
                  <span className="bg-white bg-opacity-20 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    NEW USER
                  </span>
                </div>
                <h3 className="text-white font-bold text-base mb-1 leading-tight">
                  ₦200 Off your first delivery!
                </h3>
                <p className="text-white text-sm mb-3 opacity-90">
                  Use code <span className="font-bold bg-white bg-opacity-20 px-1.5 py-0.5 rounded">FIRST200</span> at checkout
                </p>
                <button 
                  className="bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90 active:scale-95 transition-all shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/explore');
                  }}
                >
                  Order Now
                </button>
              </div>
            </div>

            {/* Card 2 - Referral Bonus */}
            <div 
              className="flex-shrink-0 w-[280px] rounded-[18px] p-4 relative overflow-hidden snap-start group cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                boxShadow: '0 6px 20px rgba(102,126,234,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                WebkitTapHighlightColor: 'transparent'
              }}
              onClick={() => navigate('/refer')}
            >
              {/* Animated background pattern */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2) 0%, transparent 50%)',
                  animation: 'pulse 3s ease-in-out infinite',
                  animationDelay: '0.5s'
                }}
              />
              
              {/* Floating elements */}
              <div className="absolute top-4 right-4 w-18 h-18 bg-white opacity-10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
              <div className="absolute bottom-4 left-4 w-14 h-14 bg-white opacity-10 rounded-full blur-xl animate-pulse" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">💰</span>
                  <span className="bg-white bg-opacity-20 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    EARN REWARDS
                  </span>
                </div>
                <h3 className="text-white font-bold text-base mb-1 leading-tight">
                  Refer & Earn ₦500
                </h3>
                <p className="text-white text-sm opacity-90">
                  Invite friends and both get rewards!
                </p>
              </div>
            </div>

            {/* Card 3 - Free Delivery */}
            <div 
              className="flex-shrink-0 w-[280px] rounded-[18px] p-4 relative overflow-hidden snap-start group cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 50%, #0cebeb 100%)',
                boxShadow: '0 6px 20px rgba(17,153,142,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                WebkitTapHighlightColor: 'transparent'
              }}
              onClick={() => navigate('/explore')}
            >
              {/* Animated background pattern */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                  animation: 'pulse 3s ease-in-out infinite',
                  animationDelay: '1s'
                }}
              />
              
              {/* Floating elements */}
              <div className="absolute top-5 right-5 w-20 h-20 bg-white opacity-10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🚀</span>
                  <span className="bg-white bg-opacity-20 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    LIMITED TIME
                  </span>
                </div>
                <h3 className="text-white font-bold text-base mb-1 leading-tight">
                  Free Delivery on Orders ₦2000+
                </h3>
                <p className="text-white text-sm opacity-90">
                  This week only - No delivery fee!
                </p>
              </div>
            </div>
          </div>

          {/* Scroll dots indicator */}
          <div className="flex justify-center gap-2 mt-3">
            <div className="w-2 h-2 rounded-full bg-red-600"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          </div>
        </div>

        {/* Hide scrollbar CSS */}
        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(1.1); }
          }
        `}</style>

        {/* QUICK ACTIONS SECTION - Premium Uber Eats Style */}
        <div className="px-4 mb-5 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[17px] font-bold text-gray-900">Quick Actions</h2>
            <div className="w-8 h-0.5 bg-gradient-to-r from-red-500 to-transparent rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-3 gap-2.5">
            {coreServices.map((service, idx) => (
              <button
                key={idx}
                onClick={() => navigate(service.route)}
                className="rounded-[14px] p-3 transition-all duration-300 text-center relative overflow-hidden group"
                style={{ 
                  background: service.bgGradient,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: '1.5px solid rgba(255,255,255,0.8)',
                  WebkitTapHighlightColor: 'transparent',
                  animationDelay: `${idx * 0.05}s`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = `0 6px 20px ${service.color}25`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${service.color}20`;
                }}
                onTouchEnd={(e) => {
                  setTimeout(() => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                  }, 150);
                }}
              >
                {/* Icon container with glass effect */}
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-2 mx-auto relative transition-all duration-300 group-hover:scale-110"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: `0 3px 10px ${service.color}20, inset 0 1px 0 rgba(255,255,255,0.5)`,
                    border: '2px solid rgba(255,255,255,0.7)'
                  }}
                >
                  {/* Subtle glow effect */}
                  <div 
                    className="absolute inset-0 rounded-full opacity-30"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${service.color}25 0%, transparent 70%)`
                    }}
                  />
                  
                  <img 
                    src={service.icon} 
                    alt={service.title} 
                    className="w-8 h-8 object-contain relative z-10 transition-all duration-300 group-hover:scale-110"
                    style={{ 
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                
                {/* Title with gradient - same size as categories */}
                <span 
                  className="text-[11px] font-semibold block text-center leading-tight"
                  style={{ 
                    background: `linear-gradient(135deg, ${service.color} 0%, ${service.color}dd 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {service.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* CATEGORIES GRID */}
        <div className="px-4 mb-5 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-[17px] font-bold text-gray-900 mb-3">Browse by Category</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {categoryCards.map((category, idx) => (
              <button
                key={category.id}
                onClick={() => {
                  // Analytics event
                  if (window.gtag) {
                    window.gtag('event', 'category_click', {
                      category_name: category.name,
                      category_route: category.route
                    });
                  }
                  navigate(category.route);
                }}
                className="bg-white rounded-[14px] p-3 hover:scale-[1.05] active:scale-95 transition-all duration-200"
                style={{ 
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.04)',
                  WebkitTapHighlightColor: 'transparent',
                  animationDelay: `${idx * 0.03}s`
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.borderColor = '#e61e25';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(230,30,37,0.15)';
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onTouchEnd={(e) => {
                  setTimeout(() => {
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.04)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }, 150);
                }}
              >
                <div 
                  className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-2"
                  style={{ background: category.bgColor }}
                >
                  <img 
                    src={category.image} 
                    alt={category.name} 
                    className="w-8 h-8 object-contain"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-gray-800 block text-center leading-tight">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TRENDING VENDORS */}
        <div className="mb-5 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
          <div className="px-4 mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-gray-900">
              🔥 Trending Now ({trendingVendors.length})
              {trendingVendors.some(v => v.id === 'fW4EoEvkVpPmNtIMmNYit06xrl02') && (
                <span className="text-red-600 ml-2">⚠️ GUY VENDOR DETECTED</span>
              )}
            </h2>
            <button 
              className="text-red-600 text-sm font-semibold hover:text-red-700 active:scale-95 transition-all" 
              onClick={() => navigate('/explore')}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              See All
            </button>
          </div>
          <div 
            className="flex gap-3 overflow-x-auto px-4 pb-2" 
            style={{ 
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none' // IE/Edge
            }}
          >
            {loadingVendors ? (
              // Loading skeleton
              [...Array(3)].map((_, idx) => (
                <div key={idx} className="flex-shrink-0 bg-gray-200 rounded-[14px] animate-pulse" style={{ width: '165px', height: '160px' }}>
                  <div className="h-28 bg-gray-300 rounded-t-[14px] mb-2"></div>
                  <div className="p-2.5 space-y-2">
                    <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-2 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : trendingVendors.map((vendor, idx) => (
              <button
                key={vendor.id}
                onClick={() => {
                  // Analytics event
                  if (window.gtag) {
                    window.gtag('event', 'vendor_click', {
                      vendor_name: vendor.businessName || vendor.name,
                      vendor_category: vendor.categories?.[0] || 'Food'
                    });
                  }
                  navigate(`/vendor/${vendor.id}`);
                }}
                className="flex-shrink-0 bg-white rounded-[14px] overflow-hidden hover:scale-[1.02] active:scale-95 transition-all duration-300 animate-fadeIn"
                style={{ 
                  width: '165px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.04)',
                  scrollSnapAlign: 'start',
                  WebkitTapHighlightColor: 'transparent',
                  animationDelay: `${0.4 + (idx * 0.1)}s`
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(230,30,37,0.15)';
                  e.currentTarget.style.transform = 'scale(0.97)';
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div className="relative h-28 overflow-hidden bg-gray-100">
                  <img 
                    src={resolveVendorImage(vendor) || getVendorPlaceholder()} 
                    alt={vendor.businessName || vendor.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.style.background = 'linear-gradient(135deg, #f5f5f5, #e0e0e0)';
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                    <Star size={11} className="text-yellow-500 fill-current" />
                    <span className="text-[11px] font-bold">{vendor.rating || '4.5'}</span>
                  </div>
                  {!vendor.isOnline && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">
                      Offline
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <h4 className="text-[13px] font-bold text-gray-900 mb-0.5 truncate">
                    {vendor.businessName || vendor.name}
                    {vendor.id === 'fW4EoEvkVpPmNtIMmNYit06xrl02' && (
                      <span className="text-red-600 ml-1 text-[10px]">🚨 GUY</span>
                    )}
                  </h4>
                  <p className="text-[10px] text-gray-500 mb-2">{vendor.categories?.[0] || 'Food'}</p>
                  <div className="flex items-center justify-between text-[10px] text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock size={11} />
                      <span>{vendor.deliveryTime || '30-45 mins'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bike size={11} />
                      <span>₦{vendor.deliveryFee || '200'}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Hide scrollbar for trending vendors on webkit browsers */}
        <style>{`
          .overflow-x-auto::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* EXPLORE ABEOKUTA MARKETS */}
        <div className="px-4 mb-6 animate-fadeIn" style={{ animationDelay: '0.5s' }}>
          <h2 className="text-lg font-bold text-gray-900 mb-4">🛍 Explore Abeokuta Markets</h2>
          <div 
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-[18px] p-4 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer" 
            style={{ 
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              WebkitTapHighlightColor: 'transparent'
            }}
            onClick={() => navigate('/explore?category=markets')}
          >
            <h4 className="text-base font-bold text-gray-900 mb-2">Fresh from local markets</h4>
            <p className="text-sm text-gray-600 mb-3">Groceries, vegetables, and more delivered to you</p>
            <button 
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 active:scale-95 transition-all"
            >
              Browse Markets
            </button>
          </div>
        </div>

        {/* POPULAR RESTAURANTS */}
        <div className="px-4 mb-6 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
          <h2 className="text-lg font-bold text-gray-900 mb-4">🍔 Popular Restaurants</h2>
          <div 
            className="bg-gradient-to-br from-orange-50 to-red-50 rounded-[18px] p-4 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer" 
            style={{ 
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              WebkitTapHighlightColor: 'transparent'
            }}
            onClick={() => navigate('/explore?category=restaurants')}
          >
            <h4 className="text-base font-bold text-gray-900 mb-2">Delicious meals near you</h4>
            <p className="text-sm text-gray-600 mb-3">Order from your favorite restaurants</p>
            <button 
              className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-700 active:scale-95 transition-all"
            >
              View Restaurants
            </button>
          </div>
        </div>

        {/* PHARMACIES NEAR YOU */}
        <div className="px-4 mb-8 animate-fadeIn" style={{ animationDelay: '0.7s' }}>
          <h2 className="text-lg font-bold text-gray-900 mb-4">💊 Pharmacies Near You</h2>
          <div 
            className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-[18px] p-4 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer" 
            style={{ 
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              WebkitTapHighlightColor: 'transparent'
            }}
            onClick={() => navigate('/explore?category=pharmacy')}
          >
            <h4 className="text-base font-bold text-gray-900 mb-2">Health & wellness essentials</h4>
            <p className="text-sm text-gray-600 mb-3">Get medicines delivered quickly</p>
            <button 
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 active:scale-95 transition-all"
            >
              Find Pharmacies
            </button>
          </div>
        </div>

        {/* REAL VENDOR CARDS - LOCAL MARKETS */}
        {!loadingVendors && trendingVendors.filter(v => v.categories?.includes('local market') || v.type === 'Local Market').length > 0 && (
          <section className="px-4 mb-6 animate-fadeIn vendor-feed" style={{ animationDelay: '0.6s' }}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              🛍 Local Markets
            </h3>
            <div className="vendor-list flex overflow-x-auto gap-3 pb-2" style={{ scrollSnapType: 'x mandatory' }}>
              {trendingVendors.filter(v => v.categories?.includes('local market') || v.type === 'Local Market').slice(0, 6).map(vendor => (
                <VendorClickableWrapper key={vendor.id} vendor={vendor}>
                  <div 
                    className="vendor-card flex-shrink-0 w-[140px] bg-white rounded-[14px] shadow-sm border border-gray-100 text-center hover:shadow-md transition-all duration-300 active:scale-95"
                    style={{ scrollSnapAlign: 'start', WebkitTapHighlightColor: 'transparent' }}
                  >
                    <img 
                      src={vendor.profileImage || 'https://via.placeholder.com/140x90'} 
                      alt={vendor.businessName || vendor.name}
                      className="w-full h-[90px] object-cover rounded-t-[14px]"
                      loading="lazy"
                    />
                    <div className="p-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">{vendor.businessName || vendor.name}</h4>
                      <p className="text-xs text-gray-600 mb-2">{vendor.categories?.[0] || 'Market'}</p>
                      <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">⭐ {vendor.rating || '4.5'}</span>
                    </div>
                  </div>
                </VendorClickableWrapper>
              ))}
            </div>
          </section>
        )}

        {/* REAL VENDOR CARDS - RESTAURANTS */}
        {!loadingVendors && trendingVendors.filter(v => v.categories?.includes('food') || v.type === 'Food').length > 0 && (
          <section className="px-4 mb-6 animate-fadeIn vendor-feed" style={{ animationDelay: '0.7s' }}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              🍔 Popular Restaurants
            </h3>
            <div className="vendor-list flex overflow-x-auto gap-3 pb-2" style={{ scrollSnapType: 'x mandatory' }}>
              {trendingVendors.filter(v => v.categories?.includes('food') || v.type === 'Food').slice(0, 6).map(vendor => (
                <VendorClickableWrapper key={vendor.id} vendor={vendor}>
                  <div 
                    className="vendor-card flex-shrink-0 w-[140px] bg-white rounded-[14px] shadow-sm border border-gray-100 text-center hover:shadow-md transition-all duration-300 active:scale-95"
                    style={{ scrollSnapAlign: 'start', WebkitTapHighlightColor: 'transparent' }}
                  >
                    <img 
                      src={vendor.profileImage || 'https://via.placeholder.com/140x90'} 
                      alt={vendor.businessName || vendor.name}
                      className="w-full h-[90px] object-cover rounded-t-[14px]"
                      loading="lazy"
                    />
                    <div className="p-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">{vendor.businessName || vendor.name}</h4>
                      <p className="text-xs text-gray-600 mb-2">{vendor.categories?.[0] || 'Food'}</p>
                      <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">⭐ {vendor.rating || '4.5'}</span>
                    </div>
                  </div>
                </VendorClickableWrapper>
              ))}
            </div>
          </section>
        )}

        {/* REAL VENDOR CARDS - PHARMACIES */}
        {!loadingVendors && trendingVendors.filter(v => v.categories?.includes('pharmacy') || v.type === 'Pharmacy').length > 0 && (
          <section className="px-4 mb-6 animate-fadeIn vendor-feed" style={{ animationDelay: '0.8s' }}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              💊 Pharmacies Near You
            </h3>
            <div className="vendor-list flex overflow-x-auto gap-3 pb-2" style={{ scrollSnapType: 'x mandatory' }}>
              {trendingVendors.filter(v => v.categories?.includes('pharmacy') || v.type === 'Pharmacy').slice(0, 6).map(vendor => (
                <VendorClickableWrapper key={vendor.id} vendor={vendor}>
                  <div 
                    className="vendor-card flex-shrink-0 w-[140px] bg-white rounded-[14px] shadow-sm border border-gray-100 text-center hover:shadow-md transition-all duration-300 active:scale-95"
                    style={{ scrollSnapAlign: 'start', WebkitTapHighlightColor: 'transparent' }}
                  >
                    <img 
                      src={vendor.profileImage || 'https://via.placeholder.com/140x90'} 
                      alt={vendor.businessName || vendor.name}
                      className="w-full h-[90px] object-cover rounded-t-[14px]"
                      loading="lazy"
                    />
                    <div className="p-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">{vendor.businessName || vendor.name}</h4>
                      <p className="text-xs text-gray-600 mb-2">{vendor.categories?.[0] || 'Pharmacy'}</p>
                      <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">⭐ {vendor.rating || '4.5'}</span>
                    </div>
                  </div>
                </VendorClickableWrapper>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* Address Selection Modal */}
      <AddressModal 
        isOpen={isAddressModalOpen} 
        onClose={() => setIsAddressModalOpen(false)} 
      />

      {/* FLOATING ACTION BUTTON FOR TEST DATA REMOVAL */}
      <div 
        style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 9999,
          backgroundColor: '#ff1744',
          color: 'white',
          borderRadius: '50px',
          padding: '15px 20px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(255, 23, 68, 0.6)',
          border: 'none',
          textAlign: 'center'
        }}
        onClick={() => {
          console.log('🗑️ REAL Mobile Home - Remove button clicked!');
          handleRemoveTestData();
        }}
      >
        🗑️ REMOVE<br/>SWEET<br/>SENSATIONS
      </div>

      {/* DEBUG INFO BAR WITH VISIBLE BUTTON */}
      <div style={{
        position: 'fixed',
        bottom: '80px',
        left: '0',
        right: '0',
        backgroundColor: '#ff1744',
        color: 'white',
        padding: '12px',
        fontSize: '14px',
        textAlign: 'center',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>VENDORS: {trendingVendors.length}</span>
        <button
          onClick={() => adminRemoveVendor('fW4EoEvkVpPmNtIMmNYit06xrl02')}
          style={{
            backgroundColor: 'white',
            color: '#ff1744',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          🗑️ REMOVE GUY VENDOR
        </button>
        <span>ID: fW4E...l02</span>
      </div>

      {/* BOTTOM NAV */}
      <MobileNavBar />
    </div>
  );
};

export default MobileHomePage;