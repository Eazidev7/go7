import React, { useState, useRef, useEffect } from 'react';
import { localMarkets, type LocalMarket } from '../../data/localMarketsNew';

// Enhanced Lazy Image Component with Multiple Fallbacks
const LazyImage: React.FC<{
  src: string;
  altSrc?: string;
  placeholder?: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}> = ({ 
  src, 
  altSrc, 
  placeholder, 
  alt, 
  className = '', 
  fallbackSrc = '/images/market-fallback.jpg' 
}) => {
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setLoaded(true);
    setError(false);
  };

  const handleError = () => {
    if (retryCount === 0 && altSrc) {
      // First fallback: try alternative URL
      setCurrentSrc(altSrc);
      setRetryCount(1);
    } else if (retryCount === 1 && placeholder) {
      // Second fallback: try placeholder
      setCurrentSrc(placeholder);
      setRetryCount(2);
    } else {
      // Final fallback: local image
      setCurrentSrc(fallbackSrc);
      setError(true);
      setLoaded(true);
    }
  };

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" 
             style={{
               backgroundSize: '1000px 100%',
               backgroundImage: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)'
             }} />
      )}
      {inView && (
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleLoad}
          onError={handleError}
          style={{ height: '200px' }}
        />
      )}
    </div>
  );
};

// Market Card Skeleton
const MarketCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse border border-gray-100">
    <div className="h-48 bg-gray-200 relative">
      <div className="absolute top-3 right-3 w-12 h-6 bg-gray-300 rounded-full"></div>
      <div className="absolute bottom-3 left-3 w-16 h-5 bg-gray-300 rounded-full"></div>
    </div>
    <div className="p-5 space-y-3">
      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="flex justify-between items-center">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-6 bg-gray-200 rounded-full w-1/4"></div>
      </div>
      <div className="h-10 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

// Market Card Component
const MarketCard: React.FC<{ market: LocalMarket }> = ({ market }) => {
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group border border-gray-100">
      <div className="relative h-48">
        <LazyImage
          src={market.image}
          alt={market.name}
          className="w-full h-full"
          fallbackSrc="/images/market-fallback.jpg"
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
          <span className="text-sm font-medium text-gray-700 flex items-center">
            ⭐ {market.rating}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 bg-[#E32227]/90 backdrop-blur-sm text-white px-2 py-1 rounded-full">
          <span className="text-xs font-medium">Fresh Daily</span>
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="font-bold text-[#111827] text-lg mb-1 group-hover:text-[#E32227] transition-colors">
          {market.name}
        </h3>
        <p className="text-gray-600 text-sm mb-3 flex items-center">
          <span className="w-2 h-2 bg-[#16A34A] rounded-full mr-2"></span>
          {market.category}
        </p>
        
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-500 flex items-center">
            <span className="mr-1">�</span>
            {market.deliveryTime}
          </span>
          <span className="text-sm font-medium text-[#16A34A] bg-green-50 px-2 py-1 rounded-full">
            Open Now
          </span>
        </div>
        
        <button className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center group-hover:shadow-md">
          <span className="mr-2">🛒</span>
          Shop Market
        </button>
      </div>
    </div>
  );
};

const LocalMarketsGrid: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#111827] mb-4">
            Fresh from Local Markets
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Shop authentic fresh produce directly from Abeokuta's trusted local markets. Farm-fresh vegetables, fruits, and spices delivered to your doorstep.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            // Show skeletons while loading
            Array.from({ length: 5 }, (_, index) => (
              <MarketCardSkeleton key={index} />
            ))
          ) : (
            // Show actual market cards
            localMarkets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))
          )}
        </div>

        {/* Trust indicators */}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
            <div className="flex items-center">
              <span className="text-[#16A34A] mr-2">✓</span>
              Fresh Daily Delivery
            </div>
            <div className="flex items-center">
              <span className="text-[#16A34A] mr-2">✓</span>
              Quality Guaranteed
            </div>
            <div className="flex items-center">
              <span className="text-[#16A34A] mr-2">✓</span>
              Local Market Direct
            </div>
            <div className="flex items-center">
              <span className="text-[#16A34A] mr-2">✓</span>
              Best Prices
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocalMarketsGrid;
