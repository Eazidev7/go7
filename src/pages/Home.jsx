import React, { lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import HeroSection from '../components/HeroSection';
import FeaturedVendors from '../components/homepage/FeaturedVendors';
import ServiceCategories from '../components/homepage/ServiceCategories';
import ValuePropositions from '../components/homepage/ValuePropositions';
import Footer from '../components/homepage/Footer';
import { isMobileOrTablet } from '../utils/deviceClass.js';

const FigmaApp = lazy(() => import('../../go7 figma/FigmaApp'));

function MobileLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600" />
      <p className="text-sm text-gray-500">Loading GO7...</p>
    </div>
  );
}

const Home = () => {
  // Same gate as main.jsx — phones/tablets get Figma app; desktop gets HeroSection
  const useMobileApp = isMobileOrTablet();

  return (
    <>
      <Helmet>
        <title>GO7 Delivery - Fast & Reliable Delivery Service in Abeokuta</title>
        <meta
          name="description"
          content="GO7 Delivery provides fast and reliable delivery services in Abeokuta. Order food, groceries, pharmacy items and more."
        />
      </Helmet>

      {useMobileApp ? (
        <Suspense fallback={<MobileLoading />}>
          <FigmaApp />
        </Suspense>
      ) : (
        <>
          <HeroSection />
          <FeaturedVendors />
          <ServiceCategories />
          <ValuePropositions />
          <Footer />
        </>
      )}
    </>
  );
};

export default Home;
