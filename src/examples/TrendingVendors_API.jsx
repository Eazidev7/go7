/**
 * TrendingVendors Component - Integrated with API
 * Example showing how to migrate from hardcoded data to API
 */

import React from 'react';
import { useTrendingVendors, useFavorites } from '../hooks/useAPI';
import { useNavigate } from 'react-router-dom';

export default function TrendingVendors_API() {
  const navigate = useNavigate();
  const { vendors, loading } = useTrendingVendors();
  const { toggleVendor, isVendorFavorited } = useFavorites();

  const handleVendorClick = (vendor) => {
    navigate('/vendor', { 
      state: { 
        vendor: {
          id: vendor.id,
          name: vendor.name,
          type: vendor.type || 'restaurant',
          image: vendor.image,
          rating: vendor.rating,
          deliveryTime: vendor.deliveryTime,
          deliveryFee: vendor.deliveryFee
        }
      } 
    });
  };

  const handleFavoriteClick = async (e, vendorId) => {
    e.stopPropagation();
    await toggleVendor(vendorId);
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <h2 className="text-xl font-bold mb-4">Trending Now 🔥</h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-[280px] bg-white rounded-xl animate-pulse">
              <div className="h-40 bg-gray-200 rounded-t-xl"></div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!vendors || vendors.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold mb-4">Trending Now 🔥</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            onClick={() => handleVendorClick(vendor)}
            className="flex-shrink-0 w-[280px] bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            {/* Vendor Image */}
            <div className="relative h-40 overflow-hidden rounded-t-xl">
              <img
                src={vendor.image || getVendorPlaceholder()}
                alt={vendor.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = getVendorPlaceholder();
                }}
              />
              
              {/* Favorite Button */}
              <button
                onClick={(e) => handleFavoriteClick(e, vendor.id)}
                className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <span className="text-lg">
                  {isVendorFavorited(vendor.id) ? '❤️' : '🤍'}
                </span>
              </button>

              {/* Promo Badge */}
              {vendor.promo && (
                <div className="absolute bottom-3 left-3 bg-[#E63946] text-white px-3 py-1 rounded-full text-xs font-semibold">
                  {vendor.promo}
                </div>
              )}
            </div>

            {/* Vendor Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-gray-900 flex-1 line-clamp-1">
                  {vendor.name}
                </h3>
                {vendor.rating && (
                  <div className="flex items-center gap-1 bg-green-100 px-2 py-0.5 rounded-lg ml-2">
                    <span className="text-xs">⭐</span>
                    <span className="font-semibold text-xs text-green-800">
                      {vendor.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {vendor.cuisine && (
                <p className="text-sm text-gray-600 mb-2">{vendor.cuisine}</p>
              )}

              {/* Meta Info */}
              <div className="flex items-center gap-3 text-xs text-gray-600">
                {vendor.deliveryTime && (
                  <div className="flex items-center gap-1">
                    <span>⏱️</span>
                    <span>{vendor.deliveryTime}</span>
                  </div>
                )}
                {vendor.deliveryFee !== undefined && (
                  <div className="flex items-center gap-1">
                    <span>🚚</span>
                    <span>
                      {vendor.deliveryFee === 0 
                        ? 'Free' 
                        : `₦${vendor.deliveryFee}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
