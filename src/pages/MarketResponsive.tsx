import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMediaQuery';
import { Helmet } from 'react-helmet-async';

interface MarketResponsiveProps {
  className?: string;
}

const MarketResponsive: React.FC<MarketResponsiveProps> = ({ 
  className = "" 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const categories = [
    { id: 'All', name: 'All', icon: '🏪' },
    { id: 'Food', name: 'Food', icon: '🍔' },
    { id: 'Groceries', name: 'Groceries', icon: '🛒' },
    { id: 'Pharmacy', name: 'Pharmacy', icon: '💊' },
    { id: 'Electronics', name: 'Electronics', icon: '📱' },
    { id: 'Fashion', name: 'Fashion', icon: '👕' }
  ];

  const vendors = [
    {
      id: 1,
      name: 'Ibara Market',
      category: 'Groceries',
      rating: 4.8,
      deliveryTime: '15-25 mins',
      deliveryFee: '₦200',
      image: '/images/ibara-market.jpg',
      distance: '0.8 km',
      featured: true,
      tags: ['Fresh Produce', 'Local', 'Organic']
    },
    {
      id: 2,
      name: 'Burger Haven',
      category: 'Food',
      rating: 4.6,
      deliveryTime: '20-30 mins',
      deliveryFee: '₦250',
      image: '/images/burger-haven.jpg',
      distance: '1.2 km',
      featured: false,
      tags: ['Fast Food', 'Burgers', 'Popular']
    },
    {
      id: 3,
      name: 'MedPlus Pharmacy',
      category: 'Pharmacy',
      rating: 4.9,
      deliveryTime: '10-20 mins',
      deliveryFee: '₦150',
      image: '/images/medplus-pharmacy.jpg',
      distance: '0.5 km',
      featured: true,
      tags: ['Prescription', '24/7', 'Verified']
    },
    {
      id: 4,
      name: 'TechHub Electronics',
      category: 'Electronics',
      rating: 4.5,
      deliveryTime: '30-45 mins',
      deliveryFee: '₦300',
      image: '/images/placeholder-tech.jpg',
      distance: '2.1 km',
      featured: false,
      tags: ['Gadgets', 'Repair', 'Warranty']
    }
  ];

  const filteredVendors = vendors.filter(vendor => {
    const matchesCategory = selectedCategory === 'All' || vendor.category === selectedCategory;
    const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const featuredVendors = vendors.filter(vendor => vendor.featured);

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <Helmet>
        <title>Market - Go7</title>
        <meta name="description" content="Discover local businesses and vendors near you on Go7" />
      </Helmet>

      {isMobile ? (
        /* Mobile Layout */
        <div className="min-h-screen">
          {/* Mobile Header */}
          <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="px-4 py-4">
              <div className="flex items-center space-x-3 mb-4">
                <button 
                  onClick={() => navigate(-1)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Market</h1>
                  <p className="text-sm text-gray-600">Discover local businesses</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vendors, products, or services..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Categories Scroll */}
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex space-x-3 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-full border transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">{category.icon}</span>
                  <span className="text-sm font-medium whitespace-nowrap">{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Content */}
          <div className="p-4 space-y-6">
            {/* Featured Section */}
            {featuredVendors.length > 0 && selectedCategory === 'All' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Featured Vendors</h2>
                <div className="space-y-3">
                  {featuredVendors.map((vendor) => (
                    <div key={vendor.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="relative">
                        <img
                          src={vendor.image}
                          alt={vendor.name}
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNDQgNzJIMTc2VjEwNEgxNDRWNzJaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0xNTIgODBIMTY4Vjk2SDE1MlY4MFoiIGZpbGw9IiNGM0Y0RjYiLz4KPC9zdmc+';
                          }}
                        />
                        <div className="absolute top-2 left-2">
                          <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                            Featured
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full px-2 py-1">
                          <div className="flex items-center space-x-1">
                            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-xs font-medium text-gray-700">{vendor.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                            <p className="text-sm text-gray-600">{vendor.category}</p>
                          </div>
                          <span className="text-sm text-gray-500">{vendor.distance}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {vendor.tags.map((tag) => (
                            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>{vendor.deliveryTime}</span>
                            <span>•</span>
                            <span>{vendor.deliveryFee}</span>
                          </div>
                          <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                            Visit Store
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Vendors */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {selectedCategory === 'All' ? 'All Vendors' : `${selectedCategory} Vendors`}
              </h2>
              <div className="space-y-3">
                {filteredVendors.map((vendor) => (
                  <div key={vendor.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex space-x-3">
                      <img
                        src={vendor.image}
                        alt={vendor.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAyNEg0MFY0MEgyNFYyNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTI4IDI4SDM2VjM2SDI4VjI4WiIgZmlsbD0iI0YzRjRGNiIvPgo8L3N2Zz4K';
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                          <span className="text-sm text-gray-500">{vendor.distance}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{vendor.category}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                          <div className="flex items-center space-x-1">
                            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span>{vendor.rating}</span>
                          </div>
                          <span>•</span>
                          <span>{vendor.deliveryTime}</span>
                          <span>•</span>
                          <span>{vendor.deliveryFee}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {vendor.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <button className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                            Visit
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop Layout */
        <div className="min-h-screen p-8">
          <div className="max-w-7xl mx-auto">
            {/* Desktop Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Go7 Market</h1>
              <p className="text-xl text-gray-600">Discover amazing local businesses near you</p>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search vendors, products, or services..."
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-lg"
                  />
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="flex space-x-2 overflow-x-auto">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center space-x-2 px-6 py-4 rounded-xl border transition-all duration-200 whitespace-nowrap ${
                        selectedCategory === category.id
                          ? 'bg-red-100 border-red-300 text-red-700 shadow-md'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:shadow-md'
                      }`}
                    >
                      <span className="text-xl">{category.icon}</span>
                      <span className="font-medium">{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Featured Vendors Desktop */}
            {featuredVendors.length > 0 && selectedCategory === 'All' && (
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Featured Vendors</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredVendors.map((vendor) => (
                    <div key={vendor.id} className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="relative">
                        <img
                          src={vendor.image}
                          alt={vendor.name}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDMyMCAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTkyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNDQgODBIMTc2VjExMkgxNDRWODBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0xNTIgODhIMTY4VjEwNEgxNTJWODhaIiBmaWxsPSIjRjNGNEY2Ii8+Cjwvc3ZnPgo=';
                          }}
                        />
                        <div className="absolute top-4 left-4">
                          <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                            Featured
                          </span>
                        </div>
                        <div className="absolute top-4 right-4 bg-white bg-opacity-95 rounded-full px-3 py-1 shadow-lg">
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">{vendor.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-gray-900 text-xl">{vendor.name}</h3>
                            <p className="text-gray-600">{vendor.category}</p>
                          </div>
                          <span className="text-gray-500 font-medium">{vendor.distance}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {vendor.tags.map((tag) => (
                            <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 text-gray-600">
                            <span className="font-medium">{vendor.deliveryTime}</span>
                            <span>•</span>
                            <span className="font-medium">{vendor.deliveryFee}</span>
                          </div>
                          <button className="bg-red-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-red-700 transition-all duration-200 transform hover:scale-105">
                            Visit Store
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Vendors Grid Desktop */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {selectedCategory === 'All' ? 'All Vendors' : `${selectedCategory} Vendors`}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredVendors.map((vendor) => (
                  <div key={vendor.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <img
                      src={vendor.image}
                      alt={vendor.name}
                      className="w-full h-40 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE2MCIgdmlld0JveD0iMCAwIDMyMCAxNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMzYgNjRIMTg0Vjk2SDEzNlY2NFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE0NCA3MkgxNzZWODhIMTQ0VjcyWiIgZmlsbD0iI0YzRjRGNiIvPgo8L3N2Zz4K';
                      }}
                    />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{vendor.name}</h3>
                        <span className="text-sm text-gray-500">{vendor.distance}</span>
                      </div>
                      <p className="text-gray-600 mb-3">{vendor.category}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="font-medium">{vendor.rating}</span>
                        </div>
                        <span>•</span>
                        <span>{vendor.deliveryTime}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {vendor.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 font-medium">{vendor.deliveryFee}</span>
                        <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors">
                          Visit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketResponsive;