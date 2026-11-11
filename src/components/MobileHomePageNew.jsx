import React, { useState } from 'react';
import HeaderBar from './mobile/HeaderBar.jsx';
import SearchBar from './mobile/SearchBar.jsx';
import PromoBanner from './mobile/PromoBanner.jsx';
import CategoriesRow from './mobile/CategoriesRow.jsx';
import VendorsCarousel from './mobile/VendorsCarousel.jsx';
import BottomNav from './mobile/BottomNav.jsx';
import TrackFab from './mobile/TrackFab.jsx';

const MobileHomePage = ({ location = 'Abeokuta, NG' }) => {
  const [searchQuery, setSearchQuery] = useState('');

  console.log('📱 MobileHomePage rendering with new components...');

  const handleSearch = (query) => {
    console.log('🔍 Search query:', query);
    // Implement search functionality here
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header with location and notifications */}
      <HeaderBar location={location} />
      
      {/* Search Bar */}
      <SearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
        onSubmit={handleSearch}
      />
      
      {/* Animated Promo Banner */}
      <PromoBanner />
      
      {/* Horizontal Categories */}
      <CategoriesRow />
      
      {/* Top Vendors Carousel */}
      <VendorsCarousel />
      
      {/* Additional content spacing for scroll */}
      <div className="h-8" />
      
      {/* Fixed Bottom Navigation */}
      <BottomNav />
      
      {/* Floating Action Button for Tracking */}
      <TrackFab />
    </div>
  );
};

export default MobileHomePage;