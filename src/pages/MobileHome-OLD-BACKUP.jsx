import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Mic, Star, Clock } from 'lucide-react';
import { auth, db } from '../config/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useLocation } from '../contexts/LocationContext';
import AddressModal from '../components/AddressModal';
import './MobileHome.css';

const MobileHomePage = () => {
  const [userName, setUserName] = useState('Guest');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const navigate = useNavigate();
  const { activeAddress } = useLocation();

  // Vendor state
  const [topPicks, setTopPicks] = useState([]);
  const [newVendors, setNewVendors] = useState([]);
  const [trending, setTrending] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [groceries, setGroceries] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || user.email?.split('@')[0] || 'User');
    }

    // PWA offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch vendors from Firestore with real-time updates
  useEffect(() => {
    const vendorsRef = collection(db, 'vendors');

    // Top Picks - Online vendors sorted by rating
    const topPicksQuery = query(
      vendorsRef,
      where('isOnline', '==', true),
      orderBy('rating', 'desc'),
      limit(10)
    );

    // New on Go7 - Recently added vendors
    const newVendorsQuery = query(
      vendorsRef,
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    // Trending - High order count and good rating
    const trendingQuery = query(
      vendorsRef,
      where('rating', '>=', 4),
      orderBy('rating', 'desc'),
      limit(10)
    );

    // Restaurants
    const restaurantsQuery = query(
      vendorsRef,
      where('vendorType', '==', 'restaurant'),
      where('isOnline', '==', true),
      limit(8)
    );

    // Groceries
    const groceriesQuery = query(
      vendorsRef,
      where('vendorType', '==', 'groceries'),
      where('isOnline', '==', true),
      limit(8)
    );

    // Pharmacies
    const pharmaciesQuery = query(
      vendorsRef,
      where('vendorType', '==', 'pharmacy'),
      where('isOnline', '==', true),
      limit(8)
    );

    // Real-time listeners
    const unsubscribeTopPicks = onSnapshot(topPicksQuery, (snapshot) => {
      const vendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTopPicks(vendors);
    });

    const unsubscribeNew = onSnapshot(newVendorsQuery, (snapshot) => {
      const vendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNewVendors(vendors);
    });

    const unsubscribeTrending = onSnapshot(trendingQuery, (snapshot) => {
      const vendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrending(vendors);
      setLoading(false);
    });

    const unsubscribeRestaurants = onSnapshot(restaurantsQuery, (snapshot) => {
      const vendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRestaurants(vendors);
    });

    const unsubscribeGroceries = onSnapshot(groceriesQuery, (snapshot) => {
      const vendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroceries(vendors);
    });

    const unsubscribePharmacies = onSnapshot(pharmaciesQuery, (snapshot) => {
      const vendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPharmacies(vendors);
    });

    // Cleanup listeners
    return () => {
      unsubscribeTopPicks();
      unsubscribeNew();
      unsubscribeTrending();
      unsubscribeRestaurants();
      unsubscribeGroceries();
      unsubscribePharmacies();
    };
  }, []);

  // Category cards with image URLs
  const categories = [
    { 
      id: 1, 
      name: 'Fast Food', 
      route: '/explore?category=restaurants',
      image: 'https://cdn-icons-png.flaticon.com/512/1046/1046784.png',
      bgColor: '#FFF3E0'
    },
    { 
      id: 2, 
      name: 'Groceries', 
      route: '/explore?category=groceries',
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
      route: '/explore?category=pharmacy',
      image: 'https://cdn-icons-png.flaticon.com/512/2965/2965567.png',
      bgColor: '#F3E5F5'
    },
    { 
      id: 5, 
      name: 'Shops', 
      route: '/explore?category=shops',
      image: 'https://cdn-icons-png.flaticon.com/512/869/869636.png',
      bgColor: '#FCE4EC'
    },
    { 
      id: 6, 
      name: 'Markets', 
      route: '/explore?category=markets',
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

  // Trending vendors (sample data - replace with real data)
  const trendingVendors = [
    {
      id: 1,
      name: 'Chicken Republic',
      category: 'Fast Food',
      rating: 4.5,
      eta: '25-30',
      deliveryFee: 200,
      image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400'
    },
    {
      id: 2,
      name: 'ShopRite Express',
      category: 'Groceries',
      rating: 4.7,
      eta: '35-40',
      deliveryFee: 300,
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'
    },
    {
      id: 3,
      name: 'MedPlus Pharmacy',
      category: 'Pharmacy',
      rating: 4.8,
      eta: '20-25',
      deliveryFee: 150,
  const categories = [
    { id: 1, name: 'Book Delivery', icon: '🛵', color: '#FFE5E5', route: '/book-delivery' },
    { id: 2, name: 'Track Order', icon: '📍', color: '#E5F5E5', route: '/orders' },
    { id: 3, name: 'Errands', icon: '➕', color: '#FFE5D9', route: '/category/errands' },
    { id: 4, name: 'Pharmacy', icon: '💊', color: '#FFF3E5', route: '/category/pharmacy' }
  ];

  return (
    <div className="mobile-home">
      {/* Address Modal */}
      <AddressModal 
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />

      {/* Search Bar - Fixed at top */}
      <div className="search-header">
        <div className="search-box" onClick={() => navigate('/search')}>
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search restaurants, shops..."
            readOnly
          />
          <Mic size={20} className="mic-icon" />
        </div>
      </div>

      {/* Main Content */}
      <div className="content-wrapper">
        
        {/* Promo Banner */}
        <div className="promo-banner">
          <h2>₦200 Off your first delivery!</h2>
          <p>Use code <strong>FIRST200</strong></p>
          <button className="order-now-btn">Order Now</button>
          <div className="promo-dots">
            <span className="dot active"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>

        {/* Categories */}
        <div className="section">
          <div className="section-header">
            <h3>Categories</h3>
            <Link to="/categories" className="see-all">See All</Link>
          </div>
          <div className="categories-grid">
            {categories.map(cat => (
              <div 
                key={cat.id} 
                className="category-card"
                style={{ backgroundColor: cat.color }}
                onClick={() => navigate(cat.route)}
              >
                <div className="category-icon">{cat.icon}</div>
                <p>{cat.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Vendors */}
        <div className="section">
          <h3 className="section-title">Trending Vendors</h3>
          <div className="vendors-scroll">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="vendor-card skeleton">
                  <div className="skeleton-img"></div>
                  <div className="skeleton-text"></div>
                  <div className="skeleton-text short"></div>
                </div>
              ))
            ) : trending.length > 0 ? (
              trending.slice(0, 3).map(vendor => (
                <div 
                  key={vendor.id} 
                  className="vendor-card"
                  onClick={() => navigate(`/vendor/${vendor.id}`)}
                >
                  <div className="vendor-image">
                    <img src={vendor.image || '/placeholder-vendor.jpg'} alt={vendor.name} />
                    <span className="rating-badge">
                      <Star size={12} fill="#FFD700" color="#FFD700" />
                      {vendor.rating || '4.5'}
                    </span>
                  </div>
                  <div className="vendor-info">
                    <h4>{vendor.name}</h4>
                    <p className="vendor-category">{vendor.vendorType || 'Food'}</p>
                    <div className="vendor-meta">
                      <span>
                        <Clock size={12} />
                        {vendor.deliveryTime || '25-30'} min
                      </span>
                      <span>₦{vendor.deliveryFee || '200'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No trending vendors yet</div>
            )}
          </div>
        </div>

        {/* Promo Cards */}
        <div className="promo-cards">
          <div className="promo-card discount-card">
            <div className="promo-content">
              <h3>₦400 off</h3>
              <p>orders over</p>
              <h2>₦2500</h2>
            </div>
            <div className="promo-icon">🍔</div>
          </div>
          <div className="promo-card markets-card">
            <div className="promo-content">
              <h3>Explore Markets</h3>
              <p>Groceries, vegetables, and uere delivered to you</p>
            </div>
            <div className="promo-icon">🥗</div>
          </div>
        </div>

        {/* For You Section */}
        <div className="section">
          <h3 className="section-title">For You</h3>
          <div className="vendors-list">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="vendor-list-item skeleton">
                  <div className="skeleton-img"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-text"></div>
                    <div className="skeleton-text short"></div>
                  </div>
                </div>
              ))
            ) : topPicks.length > 0 ? (
              topPicks.slice(0, 6).map(vendor => (
                <div 
                  key={vendor.id} 
                  className="vendor-list-item"
                  onClick={() => navigate(`/vendor/${vendor.id}`)}
                >
                  <img src={vendor.image || '/placeholder-vendor.jpg'} alt={vendor.name} />
                  <div className="vendor-list-info">
                    <h4>{vendor.name}</h4>
                    <p>{vendor.vendorType || 'Restaurant'}</p>
                    <div className="vendor-list-meta">
                      <span className="rating">
                        <Star size={12} fill="#FFD700" color="#FFD700" />
                        {vendor.rating || '4.5'}
                      </span>
                      <span>{vendor.deliveryTime || '25-30'} min</span>
                      <span>₦{vendor.deliveryFee || '200'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No vendors available</div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link to="/" className="nav-item active">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          <span>Explore Go7</span>
        </Link>
        <Link to="/orders" className="nav-item">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 3v18M15 3v18"/>
          </svg>
          <span>Orders</span>
        </Link>
        <Link to="/track" className="nav-item">
          <MapPin size={24} />
          <span>Track</span>
        </Link>
        <Link to="/chat" className="nav-item">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>Chat</span>
        </Link>
        <Link to="/profile" className="nav-item">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
};
    <div className="min-h-screen bg-gray-50 pb-24" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      
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
            {categories.map((category, idx) => (
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
                      // Fallback if image fails to load
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
            <h2 className="text-[17px] font-bold text-gray-900">🔥 Trending Now</h2>
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
            {trendingVendors.map((vendor, idx) => (
              <button
                key={vendor.id}
                onClick={() => {
                  // Analytics event
                  if (window.gtag) {
                    window.gtag('event', 'vendor_click', {
                      vendor_name: vendor.name,
                      vendor_category: vendor.category
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
                    src={vendor.image} 
                    alt={vendor.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.style.background = 'linear-gradient(135deg, #f5f5f5, #e0e0e0)';
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                    <Star size={11} className="text-yellow-500 fill-current" />
                    <span className="text-[11px] font-bold">{vendor.rating}</span>
                  </div>
                </div>
                <div className="p-2.5">
                  <h4 className="text-[13px] font-bold text-gray-900 mb-0.5 truncate">{vendor.name}</h4>
                  <p className="text-[10px] text-gray-500 mb-2">{vendor.category}</p>
                  <div className="flex items-center justify-between text-[10px] text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock size={11} />
                      <span>{vendor.eta} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bike size={11} />
                      <span>₦{vendor.deliveryFee}</span>
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

        {/* TOP PICKS NEAR YOU - Dynamic Firestore Data */}
        <VendorCarousel 
          title="🔥 Top Picks Near You"
          icon={TrendingUp}
          vendors={topPicks}
          loading={loading}
          viewAllLink="/vendors?filter=popular"
        />

        {/* NEW ON GO7 - Dynamic Firestore Data */}
        <VendorCarousel 
          title="✨ New on Go7"
          icon={Sparkles}
          vendors={newVendors}
          loading={loading}
          viewAllLink="/vendors?filter=new"
        />

        {/* TRENDING NOW - Dynamic Firestore Data */}
        <VendorCarousel 
          title="🔥 Trending Now"
          icon={TrendingUp}
          vendors={trending}
          loading={loading}
          viewAllLink="/vendors?filter=trending"
        />

        {/* RESTAURANTS - Dynamic Firestore Data */}
        <VendorCarousel 
          title="🍔 Popular Restaurants"
          vendors={restaurants}
          loading={loading}
          viewAllLink="/category/restaurant"
        />

        {/* PHARMACIES - Dynamic Firestore Data */}
        <VendorCarousel 
          title="💊 Pharmacies Near You"
          vendors={pharmacies}
          loading={loading}
          viewAllLink="/category/pharmacy"
        />

        {/* GROCERIES - Dynamic Firestore Data */}
        <VendorCarousel 
          title="🛒 Grocery Stores"
          vendors={groceries}
          loading={loading}
          viewAllLink="/category/groceries"
        />

      </div>

      {/* Address Selection Modal */}
      <AddressModal 
        isOpen={isAddressModalOpen} 
        onClose={() => setIsAddressModalOpen(false)} 
      />

      {/* BOTTOM NAV */}
      <MobileNavBar />
    </div>
  );
};

export default MobileHomePage;