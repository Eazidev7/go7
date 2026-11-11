import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMediaQuery';
import { Helmet } from 'react-helmet-async';

interface Vendor {
  id: string;
  name: string;
  image: string;
  logo?: string;
  categories: string[];
  rating: number;
  distance: string;
  deliveryTime: string;
  deliveryFee: string;
  isOpen: boolean;
  description: string;
  featured: boolean;
  products?: Product[];
}

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const MarketPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Market categories
  const categories: Category[] = [
    { id: 'All', name: 'All', icon: '🏪', color: 'bg-gray-100' },
    { id: 'Groceries', name: 'Groceries', icon: '🛒', color: 'bg-green-100' },
    { id: 'Fresh Produce', name: 'Fresh Produce', icon: '🥕', color: 'bg-orange-100' },
    { id: 'Meat & Fish', name: 'Meat & Fish', icon: '🐟', color: 'bg-red-100' },
    { id: 'Dairy', name: 'Dairy', icon: '🥛', color: 'bg-blue-100' },
    { id: 'Bakery', name: 'Bakery', icon: '🍞', color: 'bg-yellow-100' },
    { id: 'Beverages', name: 'Beverages', icon: '🥤', color: 'bg-purple-100' },
    { id: 'Household', name: 'Household', icon: '🧽', color: 'bg-indigo-100' }
  ];

  // Mock vendor data
  const mockVendors: Vendor[] = [
    {
      id: '1',
      name: 'Ibara Market',
      image: '/images/ibara-market.jpg',
      logo: '/images/ibara-logo.png',
      categories: ['Groceries', 'Fresh Produce', 'Meat & Fish'],
      rating: 4.8,
      distance: '0.8 km',
      deliveryTime: '15-25 mins',
      deliveryFee: '₦200',
      isOpen: true,
      description: 'Fresh groceries and local produce daily',
      featured: true,
      products: [
        { id: '1', name: 'Fresh Tomatoes', price: 500, image: '/images/tomatoes.jpg', category: 'Fresh Produce', inStock: true },
        { id: '2', name: 'Rice (5kg)', price: 2500, image: '/images/rice.jpg', category: 'Groceries', inStock: true }
      ]
    },
    {
      id: '2',
      name: 'Adatan Market',
      image: '/images/adatan-market.jpg',
      categories: ['Fresh Produce', 'Meat & Fish', 'Dairy'],
      rating: 4.6,
      distance: '1.2 km',
      deliveryTime: '20-30 mins',
      deliveryFee: '₦250',
      isOpen: true,
      description: 'Traditional market with fresh local products',
      featured: false
    },
    {
      id: '3',
      name: 'ShopRite Abeokuta',
      image: '/images/shoprite.jpg',
      logo: '/images/shoprite-logo.png',
      categories: ['Groceries', 'Household', 'Beverages', 'Dairy'],
      rating: 4.7,
      distance: '2.1 km',
      deliveryTime: '25-35 mins',
      deliveryFee: '₦300',
      isOpen: true,
      description: 'Modern supermarket with wide selection',
      featured: true
    },
    {
      id: '4',
      name: 'Olumo Bakery',
      image: '/images/olumo-bakery.jpg',
      categories: ['Bakery', 'Beverages'],
      rating: 4.5,
      distance: '0.5 km',
      deliveryTime: '10-20 mins',
      deliveryFee: '₦150',
      isOpen: true,
      description: 'Fresh bread and baked goods daily',
      featured: false
    },
    {
      id: '5',
      name: 'Kuto Market',
      image: '/images/kuto-market.jpg',
      categories: ['Fresh Produce', 'Groceries', 'Household'],
      rating: 4.4,
      distance: '1.8 km',
      deliveryTime: '30-40 mins',
      deliveryFee: '₦350',
      isOpen: false,
      description: 'Local market - Opens 6 AM daily',
      featured: false
    }
  ];

  // Load vendors (Firebase + fallback to mock data)
  useEffect(() => {
    const loadVendors = async () => {
      setIsLoading(true);
      try {
        // Try to load from Firebase first, falls back to mock if needed
        const { VendorService } = await import('../services/VendorService');
        const vendorData = await VendorService.getMarketVendors();
        setVendors(vendorData);
        setFilteredVendors(vendorData);
      } catch (error) {
        console.error('Error loading vendors:', error);
        // Use mock data as final fallback
        setVendors(mockVendors);
        setFilteredVendors(mockVendors);
      }
      setIsLoading(false);
    };

    loadVendors();
  }, []);

  // Filter vendors based on search and category
  useEffect(() => {
    let filtered = vendors;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(vendor =>
        vendor.categories.includes(selectedCategory)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(vendor =>
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.categories.some(cat =>
          cat.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    setFilteredVendors(filtered);
  }, [vendors, selectedCategory, searchQuery]);

  const handleVendorClick = (vendor: Vendor) => {
    // Navigate to vendor details or booking page
    navigate(`/book-delivery?vendor=${vendor.id}&type=market`);
  };

  const handleOrderNow = (vendor: Vendor) => {
    // Navigate directly to booking with pre-filled vendor info
    navigate(`/book-delivery?vendor=${vendor.id}&vendorName=${encodeURIComponent(vendor.name)}&type=market`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading markets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Local Markets - Go7</title>
        <meta name="description" content="Order fresh groceries and local products from markets near you" />
      </Helmet>

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center space-x-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 active:scale-95 transition-all"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Local Markets</h1>
              <p className="text-sm text-gray-600">Fresh groceries delivered</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search markets, products, or categories..."
              className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Categories Horizontal Scroll */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex space-x-3 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-full border transition-all ${
                selectedCategory === category.id
                  ? 'bg-red-100 border-red-300 text-red-700'
                  : `${category.color} border-gray-200 text-gray-600 hover:border-gray-300`
              }`}
            >
              <span className="text-lg">{category.icon}</span>
              <span className="text-sm font-medium whitespace-nowrap">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Featured Markets */}
        {filteredVendors.filter(v => v.featured).length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Featured Markets</h2>
            <div className="space-y-3">
              {filteredVendors.filter(vendor => vendor.featured).map((vendor) => (
                <div key={vendor.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="relative">
                    <img
                      src={vendor.image}
                      alt={vendor.name}
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDMyMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNDQgNTZIMTc2Vjg4SDE0NFY1NloiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE1MiA2NEgxNjhWODBIMTUyVjY0WiIgZmlsbD0iI0YzRjRGNiIvPgo8L3N2Zz4K';
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
                    {!vendor.isOpen && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="bg-white text-gray-900 px-3 py-1 rounded-full text-sm font-medium">
                          Closed
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                        <p className="text-sm text-gray-600">{vendor.description}</p>
                      </div>
                      <span className="text-sm text-gray-500">{vendor.distance}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {vendor.categories.map((category) => (
                        <span key={category} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {category}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{vendor.deliveryTime}</span>
                        <span>•</span>
                        <span>{vendor.deliveryFee}</span>
                      </div>
                      <button
                        onClick={() => handleOrderNow(vendor)}
                        disabled={!vendor.isOpen}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                          vendor.isOpen
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {vendor.isOpen ? 'Order Now' : 'Closed'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Markets */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {selectedCategory === 'All' ? 'All Markets' : `${selectedCategory} Markets`}
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({filteredVendors.length})
            </span>
          </h2>
          <div className="space-y-3">
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 active:scale-95 transition-all"
                onClick={() => handleVendorClick(vendor)}
              >
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
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">{vendor.distance}</span>
                        {!vendor.isOpen && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                            Closed
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{vendor.description}</p>
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
                        {vendor.categories.slice(0, 2).map((category) => (
                          <span key={category} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {category}
                          </span>
                        ))}
                        {vendor.categories.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{vendor.categories.length - 2}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOrderNow(vendor);
                        }}
                        disabled={!vendor.isOpen}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                          vendor.isOpen
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {vendor.isOpen ? 'Order' : 'Closed'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* No Results */}
        {filteredVendors.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No markets found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search or category filter
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg active:scale-95 transition-all"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketPage;