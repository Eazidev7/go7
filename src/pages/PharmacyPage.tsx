import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMediaQuery';
import { Helmet } from 'react-helmet-async';

interface PharmacyVendor {
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
  is24Hours: boolean;
  hasPharmacist: boolean;
  products?: PharmacyProduct[];
}

interface PharmacyProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
  requiresPrescription: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const PharmacyPage: React.FC = () => {
  const [vendors, setVendors] = useState<PharmacyVendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<PharmacyVendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Pharmacy categories
  const categories: Category[] = [
    { id: 'All', name: 'All', icon: '💊', color: 'bg-gray-100' },
    { id: 'Prescription', name: 'Prescription', icon: '📋', color: 'bg-blue-100' },
    { id: 'Pain Relief', name: 'Pain Relief', icon: '🩹', color: 'bg-red-100' },
    { id: 'Vitamins', name: 'Vitamins', icon: '💊', color: 'bg-green-100' },
    { id: 'First Aid', name: 'First Aid', icon: '🏥', color: 'bg-orange-100' },
    { id: 'Baby Care', name: 'Baby Care', icon: '👶', color: 'bg-pink-100' },
    { id: 'Personal Care', name: 'Personal Care', icon: '🧴', color: 'bg-purple-100' },
    { id: 'Health Devices', name: 'Health Devices', icon: '🩺', color: 'bg-teal-100' }
  ];

  // Mock pharmacy data
  const mockVendors: PharmacyVendor[] = [
    {
      id: '1',
      name: 'Alpha Pharmacy',
      image: '/images/alpha-pharmacy.jpg',
      logo: '/images/alpha-logo.png',
      categories: ['Prescription', 'Pain Relief', 'Vitamins'],
      rating: 4.9,
      distance: '0.3 km',
      deliveryTime: '10-20 mins',
      deliveryFee: '₦150',
      isOpen: true,
      is24Hours: true,
      hasPharmacist: true,
      description: '24/7 pharmacy with licensed pharmacist',
      featured: true,
      products: [
        { id: '1', name: 'Paracetamol 500mg', price: 200, image: '/images/paracetamol.jpg', category: 'Pain Relief', inStock: true, requiresPrescription: false },
        { id: '2', name: 'Vitamin C Tablets', price: 800, image: '/images/vitaminc.jpg', category: 'Vitamins', inStock: true, requiresPrescription: false }
      ]
    },
    {
      id: '2',
      name: 'MedPlus Pharmacy',
      image: '/images/medplus-pharmacy.jpg',
      categories: ['Prescription', 'Baby Care', 'Personal Care'],
      rating: 4.7,
      distance: '0.7 km',
      deliveryTime: '15-25 mins',
      deliveryFee: '₦200',
      isOpen: true,
      is24Hours: false,
      hasPharmacist: true,
      description: 'Trusted pharmacy with baby and personal care',
      featured: true
    },
    {
      id: '3',
      name: 'HealthPlus Pharmacy',
      image: '/images/healthplus-pharmacy.jpg',
      logo: '/images/healthplus-logo.png',
      categories: ['Prescription', 'Health Devices', 'First Aid'],
      rating: 4.8,
      distance: '1.1 km',
      deliveryTime: '20-30 mins',
      deliveryFee: '₦250',
      isOpen: true,
      is24Hours: false,
      hasPharmacist: true,
      description: 'Complete health solutions and medical devices',
      featured: false
    },
    {
      id: '4',
      name: 'Remedy Pharmacy',
      image: '/images/remedy-pharmacy.jpg',
      categories: ['Pain Relief', 'Vitamins', 'Personal Care'],
      rating: 4.5,
      distance: '0.9 km',
      deliveryTime: '15-25 mins',
      deliveryFee: '₦200',
      isOpen: true,
      is24Hours: false,
      hasPharmacist: false,
      description: 'Affordable medicines and health products',
      featured: false
    },
    {
      id: '5',
      name: 'CareFirst Pharmacy',
      image: '/images/carefirst-pharmacy.jpg',
      categories: ['Prescription', 'First Aid', 'Baby Care'],
      rating: 4.6,
      distance: '1.5 km',
      deliveryTime: '25-35 mins',
      deliveryFee: '₦300',
      isOpen: false,
      is24Hours: false,
      hasPharmacist: true,
      description: 'Family pharmacy - Opens 8 AM daily',
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
        const vendorData = await VendorService.getPharmacyVendors();
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

  const handleVendorClick = (vendor: PharmacyVendor) => {
    // Navigate to vendor details or booking page
    navigate(`/book-delivery?vendor=${vendor.id}&type=pharmacy`);
  };

  const handleOrderNow = (vendor: PharmacyVendor) => {
    // Navigate directly to booking with pre-filled vendor info
    navigate(`/book-delivery?vendor=${vendor.id}&vendorName=${encodeURIComponent(vendor.name)}&type=pharmacy`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pharmacies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Pharmacy - Go7</title>
        <meta name="description" content="Order medicines and health products from pharmacies near you" />
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
              <h1 className="text-xl font-semibold text-gray-900">Pharmacy</h1>
              <p className="text-sm text-gray-600">Health products delivered</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicines, pharmacies, or health products..."
              className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
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
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : `${category.color} border-gray-200 text-gray-600 hover:border-gray-300`
              }`}
            >
              <span className="text-lg">{category.icon}</span>
              <span className="text-sm font-medium whitespace-nowrap">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Emergency Notice */}
      <div className="bg-red-50 border-l-4 border-red-400 px-4 py-3 mx-4 mt-4 rounded-r-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-800">
            <span className="font-medium">Emergency?</span> Call 199 or visit the nearest hospital
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* 24/7 Pharmacies */}
        {filteredVendors.filter(v => v.is24Hours).length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <span className="text-green-600 mr-2">🟢</span>
              24/7 Available
            </h2>
            <div className="space-y-3">
              {filteredVendors.filter(vendor => vendor.is24Hours).map((vendor) => (
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
                    <div className="absolute top-2 left-2 flex space-x-2">
                      <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                        24/7
                      </span>
                      {vendor.hasPharmacist && (
                        <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                          Pharmacist
                        </span>
                      )}
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
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all active:scale-95"
                      >
                        Order Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Featured Pharmacies */}
        {filteredVendors.filter(v => v.featured && !v.is24Hours).length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Featured Pharmacies</h2>
            <div className="space-y-3">
              {filteredVendors.filter(vendor => vendor.featured && !vendor.is24Hours).map((vendor) => (
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
                    <div className="absolute top-2 left-2 flex space-x-2">
                      <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                        Featured
                      </span>
                      {vendor.hasPharmacist && (
                        <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                          Pharmacist
                        </span>
                      )}
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
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
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

        {/* All Pharmacies */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {selectedCategory === 'All' ? 'All Pharmacies' : `${selectedCategory} Pharmacies`}
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
                        <div className="flex space-x-1">
                          {vendor.is24Hours && (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                              24/7
                            </span>
                          )}
                          {vendor.hasPharmacist && (
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                              Pharmacist
                            </span>
                          )}
                          {!vendor.isOpen && (
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                              Closed
                            </span>
                          )}
                        </div>
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
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
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
            <div className="text-6xl mb-4">💊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No pharmacies found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search or category filter
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg active:scale-95 transition-all"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyPage;