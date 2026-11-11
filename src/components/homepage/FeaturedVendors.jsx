import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrendingVendors } from '../../services/customerProductServiceV2';
import { resolveVendorImage } from '../../utils/vendorImage';

const FeaturedVendors = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const { vendors: trending } = await getTrendingVendors(8);
        const vendorData = trending.map((vendor) => ({
          id: vendor.id,
          name: vendor.name,
          image: resolveVendorImage(vendor),
          rating: vendor.rating || 4.5,
          reviews: 0,
          deliveryTime: String(vendor.deliveryTime || '30-35').replace(' mins', '').replace(' min', ''),
          minOrder: 2000,
          categories: vendor.categories || ['Food'],
          featured: vendor.featured === true || vendor.trending === true,
          isOnline: vendor.isOnline,
        }));
        setVendors(vendorData);
      } catch (error) {
        console.error('❌ Error fetching vendors:', error);
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  const handleVendorClick = (vendorId) => {
    navigate(`/vendor/${vendorId}`);
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-red-50 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="h-10 bg-gray-200 rounded-lg w-96 mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded-lg w-64 mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-red-50 to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - matches hero text style */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Popular Restaurants & Stores
          </h2>
          <p className="text-lg sm:text-xl text-gray-600">
            Fresh food and groceries from Abeokuta's best vendors
          </p>
        </div>

        {/* Vendor Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {vendors.map(vendor => (
            <div 
              key={vendor.id}
              onClick={() => handleVendorClick(vendor.id)}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl 
                       transition-all duration-300 transform hover:scale-105 
                       cursor-pointer overflow-hidden group"
            >
              {/* Vendor Image */}
              <div className="relative h-40 bg-gray-200 overflow-hidden">
                {vendor.image ? (
                  <img 
                    src={vendor.image} 
                    alt={vendor.name}
                    className="w-full h-full object-cover group-hover:scale-110 
                             transition-transform duration-300"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                {/* Fallback gradient */}
                <div 
                  className={`${vendor.image ? 'hidden' : 'flex'} w-full h-full 
                             bg-gradient-to-br from-red-500 to-red-600 
                             items-center justify-center`}
                  style={{ display: vendor.image ? 'none' : 'flex' }}
                >
                  <span className="text-4xl">
                    {vendor.categories?.[0]?.toLowerCase().includes('food') ? '🍔' : 
                     vendor.categories?.[0]?.toLowerCase().includes('grocer') ? '🛒' :
                     vendor.categories?.[0]?.toLowerCase().includes('pharma') ? '💊' : '🏪'}
                  </span>
                </div>

                {/* Status Badges */}
                <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                  {/* Online/Offline Badge */}
                  {vendor.isOnline !== undefined && (
                    <div className={`${
                      vendor.isOnline ? 'bg-green-500' : 'bg-gray-500'
                    } text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg`}>
                      {vendor.isOnline ? '🟢 Open' : '⚫ Closed'}
                    </div>
                  )}
                  
                  {/* Featured Badge - yellow accent from hero */}
                  {vendor.featured && (
                    <div className="bg-yellow-400 text-red-900 px-3 py-1 
                                  rounded-full text-xs font-bold shadow-lg ml-auto">
                      ⭐ Featured
                    </div>
                  )}
                </div>

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Vendor Info */}
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">
                  {vendor.name}
                </h3>
                
                {/* Rating & Stats Row */}
                <div className="flex items-center justify-between text-sm mb-3">
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">⭐</span>
                    <span className="font-semibold text-gray-900">
                      {vendor.rating?.toFixed(1) || '4.5'}
                    </span>
                    <span className="text-gray-500">
                      ({vendor.reviews || vendor.reviewCount || 0})
                    </span>
                  </div>
                  <div className="text-gray-600 flex items-center">
                    <span className="mr-1">🕐</span>
                    {vendor.deliveryTime || '30-35'} min
                  </div>
                </div>

                {/* Categories */}
                {vendor.categories && vendor.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {vendor.categories.slice(0, 2).map((cat, index) => (
                      <span 
                        key={`${vendor.id}-cat-${index}-${cat}`}
                        className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Min Order - red accent from hero */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Min. Order</span>
                  <span className="font-semibold text-red-600">
                    ₦{(vendor.minOrder || vendor.minimumOrder || 2000).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View More Button - matches hero button style */}
        <div className="text-center mt-10">
          <button 
            onClick={() => navigate('/explore')}
            className="bg-red-600 text-white px-8 py-4 rounded-xl 
                     font-semibold text-lg hover:bg-red-700 
                     transition-all duration-200 transform hover:scale-105 
                     shadow-lg hover:shadow-2xl inline-flex items-center space-x-2"
          >
            <span>View All Vendors</span>
            <span className="transform group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedVendors;
