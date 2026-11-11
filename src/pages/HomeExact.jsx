import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Bell, Mic, Star, Clock, Home as HomeIcon, Package, Navigation as NavIcon, MessageCircle, User } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useLocation } from '../contexts/LocationContext';
import AddressModal from '../components/AddressModal';
import styles from './HomeExact.module.css';

const HomeExact = () => {
  const navigate = useNavigate();
  const { activeAddress } = useLocation();
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [currentPromo, setCurrentPromo] = useState(0);
  const [trendingVendors, setTrendingVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Promo banners
  const promoBanners = [
    {
      id: 1,
      title: '₦200 Off your first delivery!',
      subtitle: 'Use code FIRST200',
    }
  ];

  // Categories - EXACT from screenshot with correct icons
  const categories = [
    { id: 1, name: 'Book Delivery', icon: '🚗', bgColor: '#FFF3F3' },
    { id: 2, name: 'Track Order', icon: '📍', bgColor: '#F3FFF6' },
    { id: 3, name: 'Errands', icon: '🩹', bgColor: '#FFF5F0' },
    { id: 4, name: 'Pharmacy', icon: '💊', bgColor: '#FFFBF0' }
  ];

  // Fetch trending vendors
  useEffect(() => {
    const vendorsRef = collection(db, 'vendors');
    const trendingQuery = query(vendorsRef, orderBy('rating', 'desc'), limit(6));

    const unsubscribe = onSnapshot(trendingQuery, (snapshot) => {
      const vendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrendingVendors(vendors.filter(v => (v.rating || 0) >= 4));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-rotate promo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPromo((prev) => (prev + 1) % promoBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.container}>
      <AddressModal 
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />

      {/* Location Selector + Notification */}
      <div className={styles.topBar}>
        <button className={styles.locationBtn} onClick={() => setIsAddressModalOpen(true)}>
          <MapPin size={18} color="#E0001B" />
          <div className={styles.locationInfo}>
            <span className={styles.locationLabel}>Deliver to</span>
            <span className={styles.locationAddress}>
              {activeAddress?.address || 'Select location'}
            </span>
          </div>
        </button>
        <button className={styles.notificationBtn}>
          <Bell size={20} color="#374151" />
          <span className={styles.notificationBadge}></span>
        </button>
      </div>

      {/* Search Bar */}
      <div className={styles.searchSection}>
        <div className={styles.searchBar} onClick={() => navigate('/search')}>
          <Search size={20} color="#999" />
          <input 
            type="text" 
            placeholder="Search restaurants, shops..."
            readOnly
          />
          <Mic size={20} color="#999" />
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        
        {/* Promo Banner */}
        <div className={styles.promoBanner}>
          <h2>₦200 Off your first delivery!</h2>
          <p>Use code <strong>FIRST200</strong></p>
          <button className={styles.promoBtn}>Order Now</button>
          <div className={styles.promoIndicators}>
            <span className={styles.indicatorActive}></span>
            <span className={styles.indicator}></span>
            <span className={styles.indicator}></span>
          </div>
        </div>

        {/* Categories */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Categories</h3>
            <button className={styles.seeAll}>See All</button>
          </div>
          <div className={styles.categoriesGrid}>
            {categories.map((cat) => (
              <div key={cat.id} className={styles.categoryItem}>
                <div className={styles.categoryIcon} style={{ backgroundColor: cat.bgColor }}>
                  <span>{cat.icon}</span>
                </div>
                <span className={styles.categoryName}>{cat.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Trending Vendors */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Trending Vendors</h3>
          <div className={styles.vendorsScroll}>
            {loading ? (
              // Skeleton loaders
              [...Array(3)].map((_, i) => (
                <div key={i} className={styles.vendorCard}>
                  <div className={styles.vendorImageSkeleton}></div>
                  <div className={styles.vendorInfo}>
                    <div className={styles.skeletonText}></div>
                    <div className={styles.skeletonTextSmall}></div>
                  </div>
                </div>
              ))
            ) : trendingVendors.length > 0 ? (
              trendingVendors.map((vendor) => (
                <div 
                  key={vendor.id} 
                  className={styles.vendorCard}
                  onClick={() => navigate(`/vendor/${vendor.id}`)}
                >
                  <div className={styles.vendorImage}>
                    <img 
                      src={vendor.image || vendor.thumbnail || 'https://via.placeholder.com/300x200'} 
                      alt={vendor.name}
                    />
                    <div className={styles.ratingBadge}>
                      <Star size={12} fill="#FFD700" color="#FFD700" />
                      <span>{vendor.rating || '4.5'}</span>
                    </div>
                  </div>
                  <div className={styles.vendorInfo}>
                    <h4>{vendor.name}</h4>
                    <p className={styles.vendorCategory}>{vendor.category || vendor.vendorType || 'Food'}</p>
                    <div className={styles.vendorMeta}>
                      <span><Clock size={12} /> {vendor.delivery_time || vendor.deliveryTime || '25-30'} min</span>
                      <span>₦{vendor.deliveryFee || '200'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback vendors
              <>
                <div className={styles.vendorCard}>
                  <div className={styles.vendorImage}>
                    <img src="https://via.placeholder.com/300x200/FFA500/FFFFFF?text=Chicken+Republic" alt="Chicken Republic" />
                    <div className={styles.ratingBadge}>
                      <Star size={12} fill="#FFD700" color="#FFD700" />
                      <span>4.5</span>
                    </div>
                  </div>
                  <div className={styles.vendorInfo}>
                    <h4>Chicken Republic</h4>
                    <p className={styles.vendorCategory}>Feel Food</p>
                    <div className={styles.vendorMeta}>
                      <span><Clock size={12} /> 25-30 min</span>
                      <span>₦200</span>
                    </div>
                  </div>
                </div>
                <div className={styles.vendorCard}>
                  <div className={styles.vendorImage}>
                    <img src="https://via.placeholder.com/300x200/90EE90/FFFFFF?text=Toastles" alt="Toastles" />
                    <div className={styles.ratingBadge}>
                      <Star size={12} fill="#FFD700" color="#FFD700" />
                      <span>4.7</span>
                    </div>
                  </div>
                  <div className={styles.vendorInfo}>
                    <h4>Toastles</h4>
                    <p className={styles.vendorCategory}>Deli</p>
                    <div className={styles.vendorMeta}>
                      <span><Clock size={12} /> 20-25 min</span>
                      <span>₦150</span>
                    </div>
                  </div>
                </div>
                <div className={styles.vendorCard}>
                  <div className={styles.vendorImage}>
                    <img src="https://via.placeholder.com/300x200/FFD700/FFFFFF?text=Spaghetti+del+Gio" alt="Spaghetti del Gio" />
                    <div className={styles.ratingBadge}>
                      <Star size={12} fill="#FFD700" color="#FFD700" />
                      <span>4.5</span>
                    </div>
                  </div>
                  <div className={styles.vendorInfo}>
                    <h4>Spaghetti del Gio</h4>
                    <p className={styles.vendorCategory}>Desertes</p>
                    <div className={styles.vendorMeta}>
                      <span><Clock size={12} /> 25-30 min</span>
                      <span>₦300</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Promo Tiles */}
        <div className={styles.promoTiles}>
          <div className={styles.promoTileLeft}>
            <h3>₦400 off</h3>
            <p>orders over ₦2500</p>
            <div className={styles.promoEmoji}>🍔</div>
          </div>
          <div className={styles.promoTileRight}>
            <h3>Explore Markets</h3>
            <p>Groceries, vegetables, and uere delivered to you</p>
            <div className={styles.promoEmoji}>🥗</div>
          </div>
        </div>

        {/* For You Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>For You</h3>
        </section>

      </div>

      {/* Bottom Navigation */}
      <nav className={styles.bottomNav}>
        <button className={styles.navBtnActive}>
          <HomeIcon size={24} />
          <span>Explore Go7</span>
        </button>
        <button className={styles.navBtn}>
          <Package size={24} />
          <span>Orders</span>
        </button>
        <button className={styles.navBtn}>
          <NavIcon size={24} />
          <span>Track</span>
        </button>
        <button className={styles.navBtn}>
          <MessageCircle size={24} />
          <span>Chat</span>
        </button>
        <button className={styles.navBtn}>
          <User size={24} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default HomeExact;
