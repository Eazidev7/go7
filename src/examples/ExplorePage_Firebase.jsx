/**
 * ExplorePage using Firebase Hooks
 * Example of how to use the new Firebase hooks for real-time data
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useVendors,
  useVendorSearch,
  useFavorites,
  useDebounce
} from '../hooks/useFirebase';

export default function ExplorePage_Firebase() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  
  // Debounce search term to avoid excessive API calls
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  // Use vendors hook with filters
  const { vendors, loading, error } = useVendors({
    category: selectedCategory !== 'all' ? selectedCategory : null,
    sortBy
  });
  
  // Use search hook
  const { results: searchResults, searching, search } = useVendorSearch();
  
  // Use favorites hook
  const { favorites, toggleVendor, isVendorFavorited } = useFavorites();

  // Perform search when debounced term changes
  React.useEffect(() => {
    if (debouncedSearch) {
      search(debouncedSearch);
    }
  }, [debouncedSearch, search]);

  // Determine which vendors to display
  const displayVendors = searchTerm ? searchResults : vendors;

  const categories = [
    { id: 'all', name: 'All', icon: '🍽️' },
    { id: 'food', name: 'Food', icon: '🍔' },
    { id: 'groceries', name: 'Groceries', icon: '🛒' },
    { id: 'pharmacy', name: 'Pharmacy', icon: '💊' },
    { id: 'drinks', name: 'Drinks', icon: '🥤' },
    { id: 'gifts', name: 'Gifts', icon: '🎁' }
  ];

  const handleVendorClick = (vendorId) => {
    navigate(`/vendor/${vendorId}`);
  };

  const handleToggleFavorite = async (e, vendorId) => {
    e.stopPropagation(); // Prevent navigating to vendor
    await toggleVendor(vendorId);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Explore</h1>
          
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for vendors, dishes..."
              className="w-full px-4 py-3 pl-12 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E63946]"
            />
            <svg 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-[#E63946] border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 pb-4 overflow-x-auto">
          <div className="flex gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#E63946] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        {!searchTerm && (
          <div className="px-4 pb-4 flex gap-2">
            {['popular', 'rating', 'deliveryTime', 'distance'].map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  sortBy === sort
                    ? 'bg-[#E63946] text-white'
                    : 'bg-white border border-gray-300 text-gray-700'
                }`}
              >
                {sort === 'popular' && '🔥 Popular'}
                {sort === 'rating' && '⭐ Rating'}
                {sort === 'deliveryTime' && '⚡ Fastest'}
                {sort === 'distance' && '📍 Nearest'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {(loading || searching) && displayVendors.length === 0 && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vendors List */}
        {!loading && displayVendors.length > 0 && (
          <div className="space-y-4">
            {displayVendors.map((vendor) => (
              <div
                key={vendor.id}
                onClick={() => handleVendorClick(vendor.id)}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* Vendor Image */}
                {vendor.image && (
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={vendor.image}
                      alt={vendor.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => handleToggleFavorite(e, vendor.id)}
                      className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                    >
                      <span className="text-xl">
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
                )}

                {/* Vendor Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 mb-1">
                        {vendor.name}
                      </h3>
                      {vendor.cuisine && (
                        <p className="text-sm text-gray-600">{vendor.cuisine}</p>
                      )}
                    </div>
                    {vendor.rating && (
                      <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-lg">
                        <span className="text-sm">⭐</span>
                        <span className="font-semibold text-sm text-green-800">
                          {vendor.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
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
                            ? 'Free delivery' 
                            : `₦${vendor.deliveryFee}`}
                        </span>
                      </div>
                    )}
                    {vendor.distance && (
                      <div className="flex items-center gap-1">
                        <span>📍</span>
                        <span>{vendor.distance}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {vendor.tags && vendor.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {vendor.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !searching && displayVendors.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No results found' : 'No vendors available'}
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? `Try searching for something else`
                : 'Check back later for available vendors'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
