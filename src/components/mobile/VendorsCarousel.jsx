import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const VendorsCarousel = () => {
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();

  const vendors = [
    {
      id: 1,
      name: 'Cheeseburger',
      type: 'Burger Joint',
      eta: '25 min',
      image: '/api/placeholder/120/80',
      rating: 4.8,
      category: 'burger'
    },
    {
      id: 2,
      name: 'Ibara Market',
      type: 'Local Market',
      eta: '15 min',
      image: '/api/placeholder/120/80',
      rating: 4.6,
      category: 'market'
    },
    {
      id: 3,
      name: 'MediPlus',
      type: 'Pharmacy',
      eta: '20 min',
      image: '/api/placeholder/120/80',
      rating: 4.9,
      category: 'pharmacy'
    }
  ];

  useEffect(() => {
    // Staggered animation for cards
    const timer = setTimeout(() => setIsAnimating(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const handleVendorClick = (vendorId) => {
    navigate(`/vendor/${vendorId}`);
  };

  return (
    <div className="pb-4">
      <div className="px-4 pb-3">
        <h2 className="text-lg font-semibold text-gray-900">Top Vendors</h2>
      </div>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex space-x-4 px-4">
          {vendors.map((vendor, index) => (
            <div
              key={vendor.id}
              onClick={() => handleVendorClick(vendor.id)}
              className={`flex-shrink-0 bg-white rounded-2xl p-4 w-72 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                isAnimating 
                  ? 'translate-y-0 opacity-100' 
                  : 'translate-y-4 opacity-0'
              }`}
              style={{ 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                animationDelay: `${index * 150}ms`,
                transitionDelay: `${index * 150}ms`
              }}
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-16 h-16 bg-gray-200 rounded-xl flex-shrink-0"
                  style={{
                    backgroundImage: `url(${vendor.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* Placeholder for when image doesn't load */}
                  <div className="w-full h-full bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center text-red-600 text-xl">
                    {vendor.category === 'burger' && '🍔'}
                    {vendor.category === 'market' && '🛒'}
                    {vendor.category === 'pharmacy' && '💊'}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-base truncate">
                    {vendor.name}
                  </h3>
                  <p className="text-gray-600 text-sm truncate">
                    {vendor.type}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center space-x-1">
                      <span className="text-yellow-500 text-sm">⭐</span>
                      <span className="text-gray-600 text-sm">{vendor.rating}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-600 text-sm">
                      <span>⏱</span>
                      <span>{vendor.eta}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VendorsCarousel;
