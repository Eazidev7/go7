/**
 * Example: Modern Explore Page with API Integration
 * Demonstrates how to use the new API services and hooks
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { vendorsApi, menuApi, cartApi, useApiData, usePagination } from '../services/api';
import type { Vendor, MenuItem } from '../services/api';

export default function ExplorePage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const pagination = usePagination(1, 20);

  // Fetch vendors using the new API
  const {
    data: vendorsData,
    loading: vendorsLoading,
    error: vendorsError,
    refetch: refetchVendors
  } = useApiData(
    () => vendorsApi.getVendors({
      type: 'restaurant',
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      page: pagination.page,
      limit: pagination.limit
    }),
    [selectedCategory, pagination.page, pagination.limit]
  );

  // Update pagination total when data changes
  useEffect(() => {
    if (vendorsData?.pagination) {
      pagination.updateTotal(vendorsData.pagination.total);
    }
  }, [vendorsData]);

  // Fetch trending vendors
  const {
    data: trendingData,
    loading: trendingLoading
  } = useApiData(
    () => vendorsApi.getTrendingVendors({ limit: 10 }),
    []
  );

  // Handle vendor click
  const handleVendorClick = async (vendorId: string) => {
    navigate(`/vendor/${vendorId}`);
  };

  // Handle add to cart
  const handleAddToCart = async (item: MenuItem, vendorId: string) => {
    try {
      const response = await cartApi.addToCart({
        vendorId,
        itemId: item.id,
        quantity: 1
      });

      if (response.success) {
        toast.success(`${item.name} added to cart!`);
      } else {
        toast.error(response.error || 'Failed to add to cart');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await vendorsApi.searchVendors(searchQuery, {
        type: 'restaurant',
        page: 1,
        limit: 20
      });

      if (response.success && response.data) {
        // Handle search results
        console.log('Search results:', response.data);
      }
    } catch (error) {
      toast.error('Search failed');
    }
  };

  if (vendorsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (vendorsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">Error: {vendorsError}</p>
        <button
          onClick={refetchVendors}
          className="px-4 py-2 bg-red-500 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Explore Restaurants</h1>
          
          {/* Search Bar */}
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Search for restaurants, food..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Search
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Trending Vendors */}
        {!trendingLoading && trendingData?.vendors && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">🔥 Trending Now</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {trendingData.vendors.map((vendor: Vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  onClick={() => handleVendorClick(vendor.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'Fast Food', 'Pizza', 'Burgers', 'Asian', 'Nigerian'].map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Vendors Grid */}
        <section>
          <h2 className="text-xl font-semibold mb-4">All Restaurants</h2>
          {vendorsData?.vendors && vendorsData.vendors.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vendorsData.vendors.map((vendor: Vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    onClick={() => handleVendorClick(vendor.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  onClick={pagination.prevPage}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={pagination.nextPage}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No restaurants found</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Vendor Card Component
function VendorCard({ vendor, onClick }: { vendor: Vendor; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
    >
      {/* Vendor Image */}
      <div className="relative h-48">
        <img
          src={vendor.image}
          alt={vendor.name}
          className="w-full h-full object-cover"
        />
        {vendor.isFeatured && (
          <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-semibold">
            ⭐ Featured
          </div>
        )}
        {!vendor.isOpen && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-semibold">Closed</span>
          </div>
        )}
      </div>

      {/* Vendor Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
            <p className="text-sm text-gray-500">{vendor.category}</p>
          </div>
          {vendor.logo && (
            <img
              src={vendor.logo}
              alt={`${vendor.name} logo`}
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{vendor.description}</p>

        {/* Rating & Reviews */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">⭐</span>
            <span className="font-medium">{vendor.rating.toFixed(1)}</span>
          </div>
          <span className="text-gray-400">•</span>
          <span className="text-sm text-gray-500">{vendor.reviewCount} reviews</span>
        </div>

        {/* Delivery Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <span>🕐</span>
            <span>{vendor.deliveryTime}</span>
          </div>
          <div className="text-gray-600">
            {vendor.deliveryFee === 0 ? (
              <span className="text-green-600 font-medium">Free delivery</span>
            ) : (
              <span>₦{vendor.deliveryFee.toLocaleString()} delivery</span>
            )}
          </div>
        </div>

        {/* Tags */}
        {vendor.tags && vendor.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {vendor.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
