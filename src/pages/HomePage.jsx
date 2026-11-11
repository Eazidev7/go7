import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Bell, Mic, Star, Clock, DollarSign, Package, Navigation, ShoppingBag, AlertCircle } from 'lucide-react';
import { fetchTrendingProducts, fetchForYouProducts } from '../services/fetchProducts';
import { useLocation } from '../contexts/LocationContext';
import AddressModal from '../components/AddressModal';
import ProductModal from '../components/ProductModal';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const { activeAddress } = useLocation();
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [currentPromo, setCurrentPromo] = useState(0);
  
  // Data states
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [forYouProducts, setForYouProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Promo banners
  const promoBanners = [
    {
      id: 1,
      title: '₦200 Off your first delivery!',
      subtitle: 'Use code FIRST200',
      gradient: 'linear-gradient(135deg, #ff4d6d 0%, #ffb347 100%)'
    },
    {
      id: 2,
      title: 'Free delivery on orders over ₦3000',
      subtitle: 'Limited time offer',
      gradient: 'linear-gradient(135deg, #ff4d6d 0%, #ffb347 100%)'
    }
  ];

  // Categories - matching image exactly
  const categories = [
    { id: 1, name: 'Book Delivery', icon: '🚗', color: '#FFE8E8', route: '/book-delivery' },
    { id: 2, name: 'Track Order', icon: '📍', color: '#E8F5E8', route: '/orders' },
    { id: 3, name: 'Errands', icon: '🧳', color: '#FFE8E8', route: '/category/errands' },
    { id: 4, name: 'Pharmacy', icon: '💊', color: '#FFF3E0', route: '/category/pharmacy' }
  ];

  // Fetch products from V2 system using centralized service
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('🏠 HomePage: Fetching V2 products via centralized service...');
        
        // Use centralized fetch services
        const [trending, forYou] = await Promise.all([
          fetchTrendingProducts(6),
          fetchForYouProducts(6)
        ]);
        
        setTrendingProducts(trending);
        setForYouProducts(forYou);
        
        console.log(`✅ HomePage: Loaded ${trending.length} trending + ${forYou.length} for you products`);
        
      } catch (error) {
        console.error('❌ Error fetching homepage data:', error);
        setTrendingProducts([]);
        setForYouProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-rotate promo banners
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPromo((prev) => (prev + 1) % promoBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [promoBanners.length]);

  return (
    <div className="homepage">
      <AddressModal 
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />

      {/* TOP SECTION - Location + Notification */}
      <div className="top-bar">
        <button className="location-btn" onClick={() => setIsAddressModalOpen(true)}>
          <MapPin size={18} className="location-icon" />
          <div className="location-info">
            <span className="location-label">Deliver to</span>
            <span className="location-address">{activeAddress?.address || 'Select location'}</span>
          </div>
        </button>
        <button className="notification-btn">
          <Bell size={20} />
          <span className="notification-badge"></span>
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="search-section">
        <div className="search-bar" onClick={() => navigate('/search')}>
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search restaurants, shops..."
            readOnly
          />
          <Mic size={20} className="voice-icon" />
        </div>
      </div>

      {/* Main Content Container */}
      <div className="content-container">

        {/* PROMO CAROUSEL */}
        <div className="promo-carousel">
          <div 
            className="promo-slider"
            style={{ transform: `translateX(-${currentPromo * 100}%)` }}
          >
            {promoBanners.map((promo) => (
              <div 
                key={promo.id}
                className="promo-banner"
                style={{ background: promo.gradient }}
              >
                <h2>{promo.title}</h2>
                <p>{promo.subtitle}</p>
                <button className="promo-btn">Order Now</button>
              </div>
            ))}
          </div>
          <div className="promo-indicators">
            {promoBanners.map((_, idx) => (
              <span 
                key={idx}
                className={`indicator ${idx === currentPromo ? 'active' : ''}`}
                onClick={() => setCurrentPromo(idx)}
              />
            ))}
          </div>
        </div>

        {/* CATEGORIES - Exact match to image */}
        <section className="section">
          <div className="section-header">
            <h3 className="section-title">Categories</h3>
            <button className="see-all-btn" onClick={() => navigate('/categories')}>See All</button>
          </div>
          <div className="categories-quick">
            {categories.map((cat) => (
              <div key={cat.id} className="category-quick-item" onClick={() => navigate(cat.route)}>
                <div className="category-quick-icon" style={{ backgroundColor: cat.color }}>
                  {cat.icon}
                </div>
                <span>{cat.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* TRENDING PRODUCTS */}
        <section className="section">
          <h3 className="section-title">Trending Products</h3>
          <div className="products-carousel">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="product-card skeleton">
                  <div className="skeleton-img"></div>
                  <div className="skeleton-text"></div>
                </div>
              ))
            ) : trendingProducts.length > 0 ? (
              trendingProducts.map((product) => (
                <div 
                  key={`${product.vendorId}-${product.id}`}
                  className="product-card"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="product-image">
                    <img 
                      src={product.imageUrl || getFoodPlaceholder()} 
                      alt={product.name}
                      loading="lazy"
                    />
                    <span className="price-badge">
                      ₦{product.price?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="product-details">
                    <h4>{product.name}</h4>
                    <p className="vendor-label">by {product.vendorName}</p>
                    <div className="product-meta">
                      <span><Star size={12} fill="#FFD700" color="#FFD700" /> {product.vendor?.rating || '4.8'}</span>
                      <span><Clock size={12} /> {product.vendor?.deliveryTime || '30-45 mins'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No trending products available</div>
            )}
          </div>
        </section>

        {/* PROMO TILES */}
        <div className="promo-tiles">
          <div className="promo-tile red-tile">
            <h3>₦400 off</h3>
            <p>orders over ₦2500</p>
            <span className="promo-emoji">🍔</span>
          </div>
          <div className="promo-tile green-tile">
            <h3>Explore Markets</h3>
            <p>Groceries, vegetables, and uere delivered to you</p>
            <span className="promo-emoji">🥗</span>
          </div>
        </div>

        {/* FOR YOU SECTION - Popular Products */}
        <section className="section">
          <h3 className="section-title">For You</h3>
          <div className="vendors-list">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="vendor-list-card skeleton">
                  <div className="skeleton-img-list"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-text"></div>
                    <div className="skeleton-text short"></div>
                  </div>
                </div>
              ))
            ) : forYouProducts.length > 0 ? (
              forYouProducts.map((product) => (
                <div 
                  key={`${product.vendorId}-${product.id}`}
                  className="product-list-card"
                  onClick={() => setSelectedProduct(product)}
                >
                  <img 
                    src={product.imageUrl || getProductPlaceholder()} 
                    alt={product.name}
                    className="product-list-img"
                  />
                  <div className="product-list-details">
                    <h4>{product.name}</h4>
                    <p>{product.vendorName} • ₦{product.price?.toLocaleString() || '0'}</p>
                    <div className="product-list-meta">
                      <span className="rating">
                        <Star size={12} fill="#FFD700" color="#FFD700" />
                        {product.vendor?.rating || '4.8'}
                      </span>
                      <span>{product.vendor?.deliveryTime || '30-45 mins'}</span>
                      <span>₦{product.vendor?.deliveryFee || '200'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No recommendations yet</div>
            )}
          </div>
        </section>

      </div>

      {/* BOTTOM NAVIGATION */}
      <nav className="bottom-nav">
        <button className="nav-btn active" onClick={() => navigate('/')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          <span>Explore Go7</span>
        </button>
        <button className="nav-btn" onClick={() => navigate('/orders')}>
          <Package size={24} />
          <span>Orders</span>
        </button>
        <button className="nav-btn" onClick={() => navigate('/track')}>
          <Navigation size={24} />
          <span>Track</span>
        </button>
        <button className="nav-btn" onClick={() => navigate('/chat')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>Chat</span>
        </button>
        <button className="nav-btn" onClick={() => navigate('/profile')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>Profile</span>
        </button>
      </nav>
      
      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          vendor={selectedProduct.vendor}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default HomePage;
