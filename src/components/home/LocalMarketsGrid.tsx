import React, { useState, useRef, useEffect } from 'react';
import { localMarkets, type LocalMarket } from '../../data/localMarkets';

// Shimmer skeleton component
const MarketCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
    <div className="h-48 bg-gray-200"></div>
    <div className="p-5">
      <div className="h-4 bg-gray-200 rounded mb-2"></div>
      <div className="h-3 bg-gray-200 rounded mb-3 w-3/4"></div>
      <div className="flex justify-between mb-4">
        <div className="h-3 bg-gray-200 rounded w-16"></div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
  </div>
);

// Lazy loading image component
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  fallbackSrc = '/images/market-fallback.jpg',
  onLoad,
  onError 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
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
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Shimmer skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer"></div>
        </div>
      )}
      
      {/* Actual image */}
      {isInView && (
        <img
          src={hasError ? fallbackSrc : src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}
    </div>
  );
};

// Market card component
interface MarketCardProps {
  market: LocalMarket;
  onShopClick: (marketId: string) => void;
}

const MarketCard: React.FC<MarketCardProps> = ({ market, onShopClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatPrice = (amount: number): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="text-yellow-400">⭐</span>);
    }

    if (hasHalfStar) {
      stars.push(<span key="half" className="text-yellow-400">⭐</span>);
    }

    return stars;
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
      {/* Market Image Container */}
      <div className="relative h-48">
        <LazyImage
          src={market.image}
          alt={market.name}
          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {market.popular && (
            <span className="bg-[#E32227] text-white px-2 py-1 rounded-full text-xs font-semibold">
              Popular
            </span>
          )}
          {market.verified && (
            <span className="bg-[#16A34A] text-white px-2 py-1 rounded-full text-xs font-semibold">
              ✓ Verified
            </span>
          )}
        </div>

        {/* Rating overlay */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1">
          <div className="flex items-center gap-1">
            {renderStars(market.rating)}
            <span className="text-[#111827] text-sm font-medium ml-1">
              {market.rating}
            </span>
          </div>
        </div>
      </div>

      {/* Market Info */}
      <div className="p-5">
        <div className="mb-3">
          <h3 className="font-bold text-[#111827] text-lg mb-1 line-clamp-1">
            {market.name}
          </h3>
          <p className="text-gray-600 text-sm line-clamp-1">
            {market.category}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <span className="text-[#E32227]">🕒</span>
            <span>{market.eta} mins</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#E32227]">💰</span>
            <span>Min: {formatPrice(market.minOrder)}</span>
          </div>
        </div>

        {/* Shop Button */}
        <button 
          onClick={() => onShopClick(market.id)}
          className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:ring-opacity-50"
        >
          Shop Market
        </button>
      </div>
    </div>
  );
};

// Main component
const LocalMarketsGrid: React.FC = () => {
  const [loading, setLoading] = useState(true);

  const handleShopClick = (marketId: string) => {
    console.log(`Shopping at market: ${marketId}`);
    // Add navigation logic here
    // navigate(`/market/${marketId}`);
  };

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#111827] mb-4">
            Local Markets in Abeokuta
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Shop from trusted local markets and get your items delivered to your doorstep
          </p>
        </div>

        {/* Markets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            // Show skeletons while loading
            Array.from({ length: 8 }).map((_, index) => (
              <MarketCardSkeleton key={index} />
            ))
          ) : (
            // Show actual market cards
            localMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                onShopClick={handleShopClick}
              />
            ))
          )}
        </div>

        {/* View All Markets Button */}
        <div className="text-center mt-12">
          <button className="bg-white hover:bg-gray-50 text-[#E32227] font-semibold py-3 px-8 border-2 border-[#E32227] rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#E32227] focus:ring-opacity-50">
            View All Markets
          </button>
        </div>

        {/* Stats Section */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-[#E32227] mb-2">50+</div>
              <div className="text-gray-600 text-sm">Local Markets</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#E32227] mb-2">10K+</div>
              <div className="text-gray-600 text-sm">Products Available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#E32227] mb-2">25min</div>
              <div className="text-gray-600 text-sm">Avg Delivery Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#E32227] mb-2">4.7★</div>
              <div className="text-gray-600 text-sm">Customer Rating</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocalMarketsGrid;
