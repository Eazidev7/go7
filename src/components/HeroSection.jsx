import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  ShoppingBagIcon, 
  TruckIcon,
  ClockIcon,
  StarIcon 
} from '@heroicons/react/24/outline';

function HeroSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const navigate = useNavigate();

  const filterChips = [
    { id: 'all', label: 'All', icon: '🛍️' },
    { id: 'food', label: 'Food', icon: '🍔' },
    { id: 'groceries', label: 'Groceries', icon: '🛒' },
    { id: 'pharmacy', label: 'Pharmacy', icon: '💊' },
    { id: 'errands', label: 'Errands', icon: '📦' }
  ];

  const stats = [
    { icon: TruckIcon, number: '500+', label: 'Deliveries Daily' },
    { icon: ClockIcon, number: '30min', label: 'Average Delivery' },
    { icon: StarIcon, number: '4.8', label: 'Customer Rating' }
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    // Simple heuristic to determine if it's an address or vendor search
    const isAddress = /\d/.test(searchQuery) ||
      searchQuery.toLowerCase().includes('street') ||
      searchQuery.toLowerCase().includes('road') ||
      searchQuery.toLowerCase().includes('avenue') ||
      searchQuery.toLowerCase().includes('close') ||
      searchQuery.toLowerCase().includes('estate');

    if (isAddress) {
      // Navigate to booking page with address pre-filled
      navigate(`/book-delivery?address=${encodeURIComponent(searchQuery)}`);
    } else {
      // Search for vendors/restaurants
      navigate(`/explore?q=${encodeURIComponent(searchQuery)}&filter=${activeFilter}`);
    }
  };

  const handleFilterClick = (filterId) => {
    setActiveFilter(filterId);
  };

  return (
    <section className="bg-gradient-to-br from-red-600 to-red-700 text-white overflow-hidden relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Vendor Buttons - Top Right */}
      <div className="absolute top-4 right-4 z-20 flex gap-3">
        <button
          onClick={() => navigate('/vendor/register')}
          className="flex items-center space-x-2 bg-yellow-400 text-red-900 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-300 transition-all duration-200 shadow-lg text-sm"
        >
          <span>🏪</span>
          <span className="hidden sm:inline">Become a Vendor</span>
          <span className="sm:hidden">Vendor</span>
        </button>
        <button
          onClick={() => navigate('/vendor/login')}
          className="flex items-center space-x-2 border-2 border-yellow-400 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-400 hover:text-red-900 transition-all duration-200 text-sm"
        >
          <span className="hidden sm:inline">Vendor Login</span>
          <span className="sm:hidden">Login</span>
        </button>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-12 py-12 lg:py-20 min-h-[80vh] lg:min-h-[70vh]">

          {/* LEFT COLUMN - Content */}
          <div className="flex flex-col justify-center text-center lg:text-left space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
                From Burgers to Parcels,{" "}
                <span className="relative">
                  <span className="relative z-10">We Deliver</span>
                  <span className="absolute bottom-2 left-0 w-full h-3 bg-yellow-400 opacity-30 transform -skew-x-12"></span>
                </span>{" "}
                <span className="text-yellow-300">Fast</span>
              </h1>

              <p className="text-lg sm:text-xl lg:text-2xl opacity-90 max-w-2xl mx-auto lg:mx-0">
                Fresh meals, groceries, and packages delivered right to your doorstep in Abeokuta.
              </p>
            </div>

            {/* Search Bar */}
            <div className="w-full max-w-2xl mx-auto lg:mx-0">
              <div className="bg-white rounded-2xl shadow-2xl p-2 flex items-center transition-all duration-300 hover:shadow-3xl">
                <div className="flex-1 flex items-center">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 ml-4 mr-3" />
                  <input
                    type="text"
                    placeholder="Search restaurants, stores, or enter delivery address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 py-3 text-gray-800 placeholder-gray-500 border-0 outline-none text-base"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              {filterChips.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => handleFilterClick(chip.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                    activeFilter === chip.id
                      ? 'bg-white text-red-600 shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/20'
                  }`}
                >
                  <span className="mr-2">{chip.icon}</span>
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => navigate('/book-delivery')}
                className="flex items-center justify-center space-x-2 bg-yellow-400 text-red-900 px-6 py-3 rounded-xl font-semibold hover:bg-yellow-300 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <TruckIcon className="h-5 w-5" />
                <span>Book Delivery</span>
              </button>
              <button
                onClick={() => navigate('/explore')}
                className="flex items-center justify-center space-x-2 border-2 border-white text-white px-6 py-3 rounded-xl font-semibold hover:bg-white hover:text-red-600 transition-all duration-200 transform hover:scale-105"
              >
                <ShoppingBagIcon className="h-5 w-5" />
                <span>Browse Stores</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/20">
              {stats.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <IconComponent className="h-6 w-6 text-yellow-300" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold">{stat.number}</div>
                    <div className="text-xs sm:text-sm opacity-80">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN - Hero Image/Illustration */}
          <div className="relative h-64 sm:h-80 lg:h-96 xl:h-[500px] w-full flex items-center justify-center order-first lg:order-last">
            {/* Background decorative elements */}
            <div className="absolute inset-0 opacity-20">
              {/* Floating delivery icons */}
              <div className="absolute top-1/4 left-1/4 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce delay-0">
                <span className="text-sm">🍔</span>
              </div>
              <div className="absolute top-1/3 right-1/3 w-6 h-6 bg-white rounded-full flex items-center justify-center animate-bounce delay-300">
                <span className="text-xs">📦</span>
              </div>
              <div className="absolute bottom-1/3 left-1/3 w-7 h-7 bg-yellow-300 rounded-full flex items-center justify-center animate-bounce delay-700">
                <span className="text-sm">🛒</span>
              </div>
              <div className="absolute bottom-1/4 right-1/4 w-5 h-5 bg-white rounded-full flex items-center justify-center animate-bounce delay-1000">
                <span className="text-xs">💊</span>
              </div>
            </div>

            {/* Main delivery rider image container */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <div className="relative w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96">
                {/* Background circle */}
                <div className="absolute inset-0 bg-white/10 rounded-full backdrop-blur-sm"></div>
                
                {/* Delivery hero image */}
                <div className="absolute inset-4 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm">
                  <img 
                    src="/5787391259843873389-removebg-preview.png" 
                    alt="Go7 Delivery Scooter"
                    className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      // Fallback to a delivery icon if image doesn't load
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  {/* Fallback delivery icon */}
                  <div className="hidden w-full h-full bg-white/30 backdrop-blur-sm rounded-full items-center justify-center">
                    <TruckIcon className="h-24 w-24 text-white" />
                  </div>
                </div>

                {/* Floating delivery route */}
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                </div>
                <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-green-400 rounded-full flex items-center justify-center animate-pulse delay-500">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Speed lines effect */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent transform -translate-y-1/2 animate-pulse"></div>
              <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-y-1/2 translate-y-4 animate-pulse delay-300"></div>
              <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent transform -translate-y-1/2 -translate-y-4 animate-pulse delay-700"></div>
            </div>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="border-t border-white/20 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center text-white/80 text-sm mb-4">
              Trusted by thousands of customers in Abeokuta
            </div>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="text-white text-xs">⭐⭐⭐⭐⭐ 4.8/5 Rating</div>
              <div className="text-white text-xs">🏆 #1 Delivery App</div>
              <div className="text-white text-xs">⚡ 30min Average</div>
              <div className="text-white text-xs">🔒 Secure Payments</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
