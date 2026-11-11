import React, { useState, useEffect } from 'react';
import { localMarkets, type LocalMarket } from '../../data/localMarketsNew';
import { CardSkeleton } from '../ui/Skeleton';
import { MarketsEmptyState } from '../ui/EmptyState';

// Simple Image Component
const SimpleImage: React.FC<{
  src: string;
  altSrc?: string;
  placeholder?: string;
  alt: string;
  className?: string;
}> = ({ src, altSrc, placeholder, alt, className = '' }) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);

  const handleError = () => {
    console.log(`Image failed: ${currentSrc}`);
    if (currentSrc === src && altSrc) {
      console.log(`Trying alt: ${altSrc}`);
      setCurrentSrc(altSrc);
    } else if (currentSrc === altSrc && placeholder) {
      console.log(`Trying placeholder: ${placeholder}`);
      setCurrentSrc(placeholder);
    }
  };

  const handleLoad = () => {
    console.log(`Image loaded: ${currentSrc}`);
    setLoaded(true);
  };

  return (
    <div className={`relative ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <span className="text-gray-500">Loading...</span>
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={handleLoad}
        onError={handleError}
        style={{ height: '200px' }}
      />
    </div>
  );
};

// Market Card Component
const MarketCard: React.FC<{ market: LocalMarket }> = ({ market }) => {
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group border border-gray-100">
      <div className="relative h-50">
        <SimpleImage
          src={market.image}
          altSrc={market.altImage}
          placeholder={market.placeholder}
          alt={`${market.name} - ${market.category}`}
          className="w-full h-full rounded-t-xl"
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
            <span className="mr-1">🚚</span>
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

interface LocalMarketsGridProps {
  selectedArea?: string | null;
}

const LocalMarketsGrid: React.FC<LocalMarketsGridProps> = ({ selectedArea }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Filter markets by selected area
  const filteredMarkets = selectedArea 
    ? localMarkets.filter(market => market.name.toLowerCase().includes(selectedArea.toLowerCase()))
    : localMarkets;

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#111827] mb-4">
              Fresh from Local Markets
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Loading fresh produce...
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }, (_, index) => (
              <CardSkeleton key={index} className="go7-skeleton-market-card" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#111827] mb-4">
            {selectedArea ? `Local Markets in ${selectedArea}` : 'Fresh from Local Markets'}
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Shop fresh, local produce—delivered same day.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredMarkets.length > 0 ? (
            filteredMarkets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))
          ) : (
            <div className="col-span-full">
              <MarketsEmptyState selectedArea={selectedArea || undefined} />
            </div>
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
