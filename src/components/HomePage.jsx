import React from 'react';
import '../styles/responsive.css';
import { Helmet } from 'react-helmet-async';
import { useIsMobile } from '../hooks/useMediaQuery';
import { MobilePromoBanner, LiveLocationBox } from './mobile/MobileComponents';
import MobileHomePage from './MobileHomePage';
import HeroSection from './HeroSection';

const HomePage = () => {
  const isMobile = useIsMobile();

  console.log("🏠 HomePage rendering - Mobile:", isMobile);

  return (
    <div>
      <Helmet>
        <title>Go7 - Fast Delivery in Abeokuta</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Order food, book deliveries, and track packages in Abeokuta with Go7. Fast, reliable, and affordable." />
      </Helmet>

      {isMobile ? (
        /* Mobile Layout */
        <div className="min-h-screen bg-gray-50">
          {/* Mobile Promo Banner */}
          <MobilePromoBanner className="mt-4 mb-6" />

          {/* Live Location Box */}
          <LiveLocationBox className="mb-6" />

          {/* Mobile Homepage Content */}
          <div>
            <MobileHomePage />
          </div>
        </div>
      ) : (
        /* Desktop Layout */
        <div>
          <HeroSection />
        </div>
      )}
    </div>
  );
};

export default HomePage;