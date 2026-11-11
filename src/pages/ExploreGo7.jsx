import React from 'react';
import HomeHeader from '../components/HomeHeader';
import CategoryCarousel from '../components/CategoryCarousel';
import PromoBanner from '../components/PromoBanner';
import VendorList from '../components/VendorList';
import FABMenu from '../components/FABMenu';

/**
 * ExploreGo7 - Modern Mobile Homepage
 * 
 * A modern, Glovo/UberEats-style homepage with:
 * - Sticky header with cart, notifications, profile
 * - Category carousel
 * - Auto-sliding promo banners
 * - Popular vendor list
 * - Floating action button menu
 */
const ExploreGo7 = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header (Sticky) */}
      <HomeHeader />

      {/* Main Content - Add top padding to account for fixed header */}
      <div className="pt-[132px] pb-24">
        {/* Category Carousel */}
        <section>
          <CategoryCarousel />
        </section>

        {/* Promo Banner */}
        <section>
          <PromoBanner />
        </section>

        {/* Spacer */}
        <div className="h-4 bg-gray-100"></div>

        {/* Recommended Vendors */}
        <section>
          <VendorList />
        </section>

        {/* Additional Sections - Can be added later */}
        {/* 
        <section>
          <NearbyRestaurants />
        </section>
        <section>
          <SpecialOffers />
        </section>
        */}
      </div>

      {/* Floating Action Button */}
      <FABMenu />

      {/* Bottom spacing for mobile navigation if needed */}
      <div className="h-16 md:h-0"></div>
    </div>
  );
};

export default ExploreGo7;
