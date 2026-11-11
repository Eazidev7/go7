import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&filter=${activeFilter}`);
    }
  };

  const handleFilterClick = (filterId) => {
    setActiveFilter(filterId);
  };

  return (
    <section className="bg-[#E53935] text-white overflow-hidden min-h-[100svh] md:min-h-screen w-full">
      <div className="max-w-[1220px] mx-auto px-4 md:px-6 h-full">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-12 py-12 md:py-0 h-full">
          
          {/* LEFT COLUMN - Content */}
          <div className="flex flex-col justify-center text-center md:text-left">
            <h1 className="text-[32px] md:text-[48px] lg:text-[56px] font-bold leading-tight mb-4">
              From Burgers to Parcels, We Deliver{" "}
              <span className="underline underline-offset-8 decoration-4 md:decoration-8 decoration-white">
                Fast
              </span>
            </h1>
            
            <p className="text-lg md:text-xl mb-8 opacity-90 max-w-md mx-auto md:mx-0">
              Fresh meals, groceries, and packages delivered right to your doorstep.
            </p>

            {/* Search Bar */}
            <div className="w-full max-w-none md:max-w-[80%] mx-auto md:mx-0 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-2 flex items-center">
                <input
                  type="text"
                  placeholder="Search for restaurant, store, or address"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-4 py-3 text-gray-800 placeholder-gray-500 border-0 outline-none text-base"
                />
                <button
                  onClick={handleSearch}
                  className="bg-[#E53935] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d32f2f] transition-colors"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-8">
              {filterChips.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => handleFilterClick(chip.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeFilter === chip.id
                      ? 'bg-white text-[#E53935] shadow-md'
                      : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                  }`}
                >
                  <span className="mr-2">{chip.icon}</span>
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button 
                onClick={() => navigate('/book-delivery')}
                className="px-6 py-3 bg-white text-[#E53935] font-bold rounded-xl hover:-translate-y-0.5 transition-transform shadow-lg"
              >
                Book a Delivery
              </button>
              <button 
                onClick={() => navigate('/track-package')}
                className="px-6 py-3 bg-transparent border-2 border-white text-white font-bold rounded-xl hover:bg-white hover:text-[#E53935] transition-colors"
              >
                Track Package
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN - Delivery Rider Illustration */}
          <div className="relative h-[350px] md:h-[500px] w-full flex items-center justify-center">
            {/* Background decorative elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-white rounded-full animate-pulse"></div>
              <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-white rounded-full animate-pulse delay-300"></div>
              <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-white rounded-full animate-pulse delay-700"></div>
              <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-white rounded-full animate-pulse delay-1000"></div>
            </div>
            
            {/* Main delivery rider image */}
            <div className="relative z-10 flex items-center justify-center">
              <img
                src="/scooter.png"
                alt="Delivery Rider"
                className="h-[280px] md:h-[400px] object-contain drop-shadow-2xl"
                onError={(e) => {
                  console.log('Scooter image failed to load, using fallback');
                  // Fallback if scooter image doesn't exist
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              {/* Fallback icon if image doesn't load */}
              <div className="hidden items-center justify-center w-[280px] h-[280px] md:w-[400px] md:h-[400px] bg-white/10 rounded-full backdrop-blur-sm">
                <div className="text-6xl md:text-8xl">🛵</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;