import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Mic, Star, Clock } from 'lucide-react';
import { auth } from '../config/firebase';
import { useLocation } from '../contexts/LocationContext';
import AddressModal from '../components/AddressModal';
import ProductModal from '../components/ProductModal';
import { fetchTrendingProducts, fetchRecommendedProducts } from '../services/firestoreV2';
// Test data functionality removed - using real products from database
import './MobileHome.css';

const MobileHomePage = () => {
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const navigate = useNavigate();
  const { activeAddress } = useLocation();

  // Product state
  const [topPicks, setTopPicks] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  console.log('🎨 NEW MOBILE HOME LOADED - Uber Eats Style - TIMESTAMP:', new Date().getTime());
  
  // FORCE ALERT TO CONFIRM THIS FILE IS BEING USED
  useEffect(() => {
    console.log('🚨 MOBILE HOME COMPONENT MOUNTED - THIS IS THE RIGHT FILE!');
    document.title = 'Mobile Home - Sweet Sensations DEBUG';
    setTimeout(() => {
      if (window.location.pathname === '/mobile') {
        console.log('🎯 MOBILE PAGE CONFIRMED - Check console for window.removeTestData()');
      }
    }, 1000);
  }, []);

  const handleRemoveTestData = async () => {
    if (!window.confirm('Remove all test data (Sweet Sensations, Quick Bites, etc.) from Firebase? This cannot be undone.')) return;
    
    try {
      setIsRemoving(true);
      const result = await removeTestData();
      if (result.success) {
        console.log('✅ Test data removed successfully');
        alert('Test data removed successfully! Refreshing page...');
        window.location.reload(); // Refresh to show updated data
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

  // Make removal function globally accessible
  useEffect(() => {
    window.removeTestData = handleRemoveTestData;
    window.removeSweet = handleRemoveTestData;
    console.log('🌍 GLOBAL FUNCTIONS ADDED: window.removeTestData() and window.removeSweet()');
    return () => {
      delete window.removeTestData;
      delete window.removeSweet;
    };
  }, []);

  // Fetch products from all vendors for mobile home
  useEffect(() => {
    const fetchProductsForHome = async () => {
      try {
        console.log('🏠 MobileHome: Fetching products using V2...');
        
        // Fetch trending products (top 6 by rating and order count)
        const trendingProducts = await fetchTrendingProducts(6);
        setTrending(trendingProducts);
        
        // Fetch recommended products (random/category-based, up to 10)
        const recommendedProducts = await fetchRecommendedProducts(null, 10);
        setTopPicks(recommendedProducts);
        
        setLoading(false);
        
        console.log(`✅ Loaded ${trendingProducts.length} trending products`);
        console.log(`✅ Loaded ${recommendedProducts.length} recommended products`);
        console.log('📊 MOBILE HOME TRENDING:', trendingProducts.map(p => ({ name: p.name, vendor: p.vendorName })));
        console.log('📊 MOBILE HOME FOR YOU:', recommendedProducts.map(p => ({ name: p.name, vendor: p.vendorName })));
        
      } catch (error) {
        console.error('❌ Error loading products:', error);
        setLoading(false);
      }
    };

    fetchProductsForHome();

    // No cleanup needed for one-time fetch
  }, []);

  const categories = [
    { id: 1, name: 'Book Delivery', icon: '🛵', color: '#FFE5E5', route: '/book-delivery' },
    { id: 2, name: 'Track Order', icon: '📍', color: '#E5F5E5', route: '/orders' },
    { id: 3, name: 'Errands', icon: '➕', color: '#FFE5D9', route: '/category/errands' },
    { id: 4, name: 'Pharmacy', icon: '💊', color: '#FFF3E5', route: '/category/pharmacy' }
  ];

  // No fallback data - only show real products from database
  const displayTrending = trending;
  const displayTopPicks = topPicks;

  return (
    <div className="mobile-home">
      {/* Address Modal */}
      <AddressModal 
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />

      {/* Top Header with Location - Above search */}
      <div className="top-header">
        <div className="status-bar">
          <span className="time">9:41</span>
          <div className="status-icons">
            {/* Status icons placeholder */}
          </div>
        </div>
        
        {/* DEBUG: Test Data Removal Button */}
        <div style={{ 
          padding: '15px', 
          textAlign: 'center', 
          backgroundColor: '#ff1744',
          color: 'white',
          fontWeight: 'bold'
        }}>
          <div style={{ marginBottom: '10px', fontSize: '12px' }}>
            DEBUG: Trending: {trending.length} items, For You: {topPicks.length} items
          </div>
          <button 
            onClick={() => {
              console.log('BUTTON CLICKED - Sweet Sensations Removal');
              handleRemoveTestData();
            }}
            disabled={isRemoving}
            style={{
              backgroundColor: '#fff',
              color: '#ff1744',
              border: '2px solid #ff1744',
              padding: '12px 24px',
              borderRadius: '25px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isRemoving ? 'not-allowed' : 'pointer',
              opacity: isRemoving ? 0.6 : 1,
              width: '100%',
              maxWidth: '300px'
            }}
          >
            {isRemoving ? '🗑️ REMOVING TEST DATA...' : '🗑️ REMOVE SWEET SENSATIONS'}
          </button>
        </div>
      </div>

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
          <button className="order-now-btn" onClick={() => navigate('/explore')}>
            Order Now
          </button>
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

        {/* Trending Products */}
        <div className="section">
          <h3 className="section-title">Trending Products</h3>
          <div className="vendors-scroll">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="vendor-card skeleton">
                  <div className="skeleton-img"></div>
                  <div className="skeleton-text"></div>
                  <div className="skeleton-text short"></div>
                </div>
              ))
            ) : displayTrending.length > 0 ? (
              displayTrending.map(product => (
                <div 
                  key={product.id} 
                  className="vendor-card"
                  onClick={() => {
                    setSelectedProduct(product);
                  }}
                >
                  <div className="vendor-image">
                    <img src={product.imageUrl || '/placeholder-product.jpg'} alt={product.name} />
                    <span className="rating-badge">
                      <Star size={12} fill="#FFD700" color="#FFD700" />
                      {product.vendorRating || '4.5'}
                    </span>
                  </div>
                  <div className="vendor-info">
                    <h4>{product.name}</h4>
                    <p className="vendor-category">{product.vendorName}</p>
                    <div className="vendor-meta">
                      <span>
                        <Clock size={12} />
                        {product.vendorDeliveryTime || '25-30'}
                      </span>
                      <span>₦{product.price?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No trending products yet</div>
            )}
          </div>
        </div>

        {/* Promo Cards */}
        <div className="promo-cards">
          <div className="promo-card discount-card" onClick={() => navigate('/promos')}>
            <div className="promo-content">
              <h3>₦400 off</h3>
              <p>orders over</p>
              <h2>₦2500</h2>
            </div>
            <div className="promo-icon">🍔</div>
          </div>
          <div className="promo-card markets-card" onClick={() => navigate('/category/groceries')}>
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
            ) : displayTopPicks.length > 0 ? (
              displayTopPicks.slice(0, 6).map(product => (
                <div 
                  key={product.id} 
                  className="vendor-list-item"
                  onClick={() => {
                    setSelectedProduct(product);
                  }}
                >
                  <img src={product.imageUrl || '/placeholder-product.jpg'} alt={product.name} />
                  <div className="vendor-list-info">
                    <h4>{product.name}</h4>
                    <p>{product.vendorName}</p>
                    <div className="vendor-list-meta">
                      <span className="rating">
                        <Star size={12} fill="#FFD700" color="#FFD700" />
                        {product.vendorRating || '4.5'}
                      </span>
                      <span>{product.vendorDeliveryTime}</span>
                      <span>₦{product.price?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No products available</div>
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
      
      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          vendorId={selectedProduct.vendorId}
          onClose={() => setSelectedProduct(null)}
        />
      )}
      
      {/* Floating Action Button for Test Data Removal */}
      <div 
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          zIndex: 9999,
          backgroundColor: '#ff1744',
          color: 'white',
          borderRadius: '50px',
          padding: '15px 20px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(255, 23, 68, 0.4)',
          border: 'none'
        }}
        onClick={() => {
          console.log('🗑️ Floating button clicked!');
          handleRemoveTestData();
        }}
      >
        🗑️ REMOVE<br/>TEST DATA
      </div>
    </div>
  );
};

export default MobileHomePage;
