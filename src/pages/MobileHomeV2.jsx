// 🚀 GO7 MOBILE HOME PAGE — Auto-populated Vendors (Nov 2025)
// Dynamic homepage with real-time Firestore vendor updates

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import VendorCarousel from '../components/VendorCarousel';
import CategoryGrid from '../components/CategoryGrid';
import PromoBanner from '../components/PromoBanner';
import QuickActions from '../components/QuickActions';
import VendorCardSkeleton from '../components/VendorCardSkeleton';
import { Search, MapPin } from 'lucide-react';
import './MobileHomeV2.css';

export default function MobileHomeV2() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [userLocation, setUserLocation] = useState('Abeokuta, Nigeria');

  // Real-time vendor fetching
  useEffect(() => {
    const vendorsRef = collection(db, 'vendors');
    const q = query(vendorsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const vendorsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVendors(vendorsList);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching vendors:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter and sort vendors for different sections
  const topPicks = vendors
    .filter((v) => v.isOnline === true)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 10);

  const newVendors = vendors
    .filter((v) => v.isOnline === true)
    .sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    })
    .slice(0, 10);

  const trending = vendors
    .filter((v) => v.isOnline === true && (v.rating || 0) >= 4)
    .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
    .slice(0, 10);

  const restaurants = vendors
    .filter((v) => v.vendorType === 'restaurant' && v.isOnline === true)
    .slice(0, 10);

  const groceries = vendors
    .filter((v) => v.vendorType === 'groceries' && v.isOnline === true)
    .slice(0, 10);

  const pharmacies = vendors
    .filter((v) => v.vendorType === 'pharmacy' && v.isOnline === true)
    .slice(0, 10);

  const categories = [
    { id: 'restaurant', icon: '🍔', label: 'Restaurants', color: '#FF6B6B' },
    { id: 'groceries', icon: '🥬', label: 'Groceries', color: '#4ECB71' },
    { id: 'errands', icon: '🚴', label: 'Errands', color: '#4DA8FF' },
    { id: 'pharmacy', icon: '💊', label: 'Pharmacy', color: '#9B59B6' },
    { id: 'shops', icon: '🛍️', label: 'Shops', color: '#F39C12' },
  ];

  return (
    <div className="mobile-home-v2">
      {/* Header */}
      <div className="home-header">
        <div className="location-bar">
          <MapPin size={18} className="location-icon" />
          <div className="location-info">
            <span className="location-label">Deliver to</span>
            <span className="location-name">{userLocation}</span>
          </div>
        </div>
        <div className="search-bar" onClick={() => navigate('/search')}>
          <Search size={18} />
          <span>Search for food, groceries...</span>
        </div>
      </div>

      {/* Promo Banner */}
      <PromoBanner />

      {/* Quick Actions */}
      <QuickActions />

      {/* Category Grid */}
      <CategoryGrid categories={categories} />

      {/* Top Picks Near You */}
      {loading ? (
        <div className="carousel-section">
          <h2>🔥 Top Picks Near You</h2>
          <div className="carousel-container">
            <VendorCardSkeleton count={3} />
          </div>
        </div>
      ) : (
        topPicks.length > 0 && (
          <VendorCarousel
            title="🔥 Top Picks Near You"
            vendors={topPicks}
            viewAllLink="/vendors?filter=popular"
          />
        )
      )}

      {/* New on Go7 */}
      {loading ? (
        <div className="carousel-section">
          <h2>✨ New on Go7</h2>
          <div className="carousel-container">
            <VendorCardSkeleton count={3} />
          </div>
        </div>
      ) : (
        newVendors.length > 0 && (
          <VendorCarousel
            title="✨ New on Go7"
            vendors={newVendors}
            viewAllLink="/vendors?filter=new"
          />
        )
      )}

      {/* Trending Now */}
      {loading ? (
        <div className="carousel-section">
          <h2>📈 Trending Now</h2>
          <div className="carousel-container">
            <VendorCardSkeleton count={3} />
          </div>
        </div>
      ) : (
        trending.length > 0 && (
          <VendorCarousel
            title="📈 Trending Now"
            vendors={trending}
            viewAllLink="/vendors?filter=trending"
          />
        )
      )}

      {/* Restaurants */}
      {!loading && restaurants.length > 0 && (
        <VendorCarousel
          title="🍕 Restaurants"
          vendors={restaurants}
          viewAllLink="/category/restaurant"
        />
      )}

      {/* Groceries */}
      {!loading && groceries.length > 0 && (
        <VendorCarousel
          title="🥬 Groceries & Essentials"
          vendors={groceries}
          viewAllLink="/category/groceries"
        />
      )}

      {/* Pharmacies */}
      {!loading && pharmacies.length > 0 && (
        <VendorCarousel
          title="💊 Health & Pharmacy"
          vendors={pharmacies}
          viewAllLink="/category/pharmacy"
        />
      )}

      {/* Bottom Spacing */}
      <div style={{ height: '100px' }} />
    </div>
  );
}
