import React from 'react';

const Hero = () => {
  return (
    <section className="relative w-full h-screen bg-[#E60023] overflow-hidden">
      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top Content Area */}
        <div className="flex-1 flex items-center justify-start px-6 md:px-12 lg:px-20">
          <div className="max-w-2xl">
            {/* Main Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              From Meals to Parcels,{' '}
              <span className="block">Go7 Delivers Fast</span>
            </h1>
            
            {/* Subtext */}
            <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-lg">
              Fresh meals, groceries, and packages delivered right to your doorstep
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <a href="/book" className="px-8 py-4 bg-white text-[#E60023] font-bold text-lg rounded-lg hover:bg-gray-50 transition-colors duration-200 shadow-lg text-center">
                Order Now
              </a>
              <a href="/track" className="px-8 py-4 bg-transparent border-2 border-white text-white font-bold text-lg rounded-lg hover:bg-white hover:text-[#E60023] transition-colors duration-200 text-center">
                Track Order
              </a>
            </div>
            
            {/* Vendor CTA Section */}
            <div className="mt-6 pt-6 border-t border-white/30">
              <p className="text-white/90 text-sm mb-3">Are you a restaurant, shop, or business?</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a 
                  href="/vendor/register" 
                  className="px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors duration-200 shadow-lg text-center inline-flex items-center justify-center gap-2"
                >
                  🏪 Become a Vendor
                </a>
                <a 
                  href="/vendor/login" 
                  className="px-6 py-3 bg-transparent border-2 border-orange-400 text-white font-semibold rounded-lg hover:bg-orange-400 transition-colors duration-200 text-center"
                >
                  Vendor Login
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Curved Road Section */}
        <div className="relative h-40 md:h-48 lg:h-56 w-full bg-[#fdf5f0]">
          {/* SVG Curved Road */}
          <div className="absolute bottom-0 w-full h-full">
            <svg
              viewBox="0 0 1200 200"
              className="absolute bottom-0 w-full h-full"
              preserveAspectRatio="none"
            >
              {/* Road Surface */}
              <path
                d="M0,120 Q300,80 600,100 T1200,120 L1200,200 L0,200 Z"
                fill="#333"
                className="road-surface"
              />
              
              {/* Dashed Center Line */}
              <path
                d="M0,120 Q300,80 600,100 T1200,120"
                stroke="white"
                strokeWidth="3"
                strokeDasharray="20,15"
                fill="none"
                className="road-centerline"
              />
              
              {/* Road Edge Lines */}
              <path
                d="M0,110 Q300,70 600,90 T1200,110"
                stroke="white"
                strokeWidth="2"
                fill="none"
                opacity="0.8"
              />
              <path
                d="M0,130 Q300,90 600,110 T1200,130"
                stroke="white"
                strokeWidth="2"
                fill="none"
                opacity="0.8"
              />
            </svg>
          </div>

          {/* Animated Go7 Scooter on Curved Path */}
          <div className="absolute bottom-0 w-full h-full">
            <div className="go7-scooter-curved-animation">
              <img 
                src="/images/go7-bike.png" 
                alt="Go7 Delivery Scooter" 
                className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 object-contain filter drop-shadow-lg"
                onError={(e) => {
                  // Fallback to scooter image if bike image doesn't exist
                  e.target.src = '/images/go7-scooter.png';
                }}
              />
            </div>
          </div>

          {/* Small decorative elements */}
          <div className="absolute top-4 left-1/4 w-3 h-3 bg-[#E60023] rounded-full opacity-30 animate-bounce"></div>
          <div className="absolute top-8 right-1/3 w-2 h-2 bg-[#E60023] rounded-full opacity-40 animate-pulse"></div>
          <div className="absolute top-6 left-3/4 w-4 h-4 bg-[#E60023] rounded-full opacity-20 animate-bounce" style={{animationDelay: '1s'}}></div>
        </div>
      </div>

      {/* Background Pattern/Decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
        <div className="absolute top-10 right-10 w-32 h-32 bg-white rounded-full"></div>
        <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-white rounded-full"></div>
        <div className="absolute bottom-1/3 right-12 w-20 h-20 bg-white rounded-full"></div>
      </div>
    </section>
  );
};

export default Hero;