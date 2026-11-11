import React, { useState, useRef, useEffect } from 'react';
import { foodVendors, type FoodVendor } from '../../data/foodVendors';
import { CardSkeleton } from '../ui/Skeleton';
import { VendorsEmptyState } from '../ui/EmptyState';

// Lazy Image Component with Intersection Observer
const LazyImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}> = ({ src, alt, className = '', fallbackSrc = '/images/vendor-fallback.jpg' }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
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

  const handleLoad = () => setLoaded(true);
  const handleError = () => {
    setError(true);
    setLoaded(true);
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
          src={error ? fallbackSrc : src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
};

// Vendor Card Component
const VendorCard: React.FC<{ vendor: FoodVendor }> = ({ vendor }) => {
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
      <div className="relative h-48">
        <LazyImage
          src={vendor.image}
          alt={vendor.name}
          className="w-full h-full"
          fallbackSrc="/images/vendor-fallback.jpg"
        />
        <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 shadow-sm">
          <span className="text-sm font-medium text-gray-700 flex items-center">
            ⭐ {vendor.rating}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-[#111827] text-lg mb-1 group-hover:text-[#E32227] transition-colors">
          {vendor.name}
        </h3>
        <p className="text-gray-600 text-sm mb-3">{vendor.cuisine}</p>
        
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-500">🕐 {vendor.deliveryTime}</span>
          <span className="text-sm font-medium text-[#16A34A]">Available</span>
        </div>
        
        <button className="w-full bg-[#E32227] hover:bg-[#D32F2F] text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
          Order Food
        </button>
      </div>
    </div>
  );
};

interface FoodVendorsRowProps {
  selectedArea?: string | null;
}

const FoodVendorsRow: React.FC<FoodVendorsRowProps> = ({ selectedArea }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Filter vendors by selected area
  const filteredVendors = selectedArea 
    ? foodVendors.filter(vendor => vendor.name.toLowerCase().includes(selectedArea.toLowerCase()))
    : foodVendors;

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#111827] mb-4">
            {selectedArea ? `Food Vendors in ${selectedArea}` : 'Popular Food Vendors'}
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Order from your favorite local restaurants and get fresh, delicious meals delivered to your doorstep.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            // Show skeletons while loading
            Array.from({ length: 4 }, (_, index) => (
              <CardSkeleton key={index} className="go7-skeleton-vendor-card" />
            ))
          ) : filteredVendors.length > 0 ? (
            // Show actual vendor cards
            filteredVendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))
          ) : (
            // Show empty state
            <div className="col-span-full">
              <VendorsEmptyState selectedArea={selectedArea || undefined} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FoodVendorsRow;
