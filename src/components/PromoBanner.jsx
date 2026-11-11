import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PromoBanner = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const promos = [
    {
      id: 1,
      title: '₦200 OFF',
      subtitle: 'Your first delivery!',
      description: 'Use code: FIRST200',
      gradient: 'from-red-600 to-orange-500',
      cta: 'Order Now',
      action: () => navigate('/restaurants')
    },
    {
      id: 2,
      title: 'Refer & Earn',
      subtitle: '₦500 per friend',
      description: 'Share your code today',
      gradient: 'from-purple-600 to-pink-500',
      cta: 'Share Now',
      action: () => navigate('/referral')
    },
    {
      id: 3,
      title: 'GoBuy',
      subtitle: 'We shop for you!',
      description: 'Anything from any store',
      gradient: 'from-blue-600 to-cyan-500',
      cta: 'Try GoBuy',
      action: () => navigate('/gobuy')
    },
    {
      id: 4,
      title: 'Free Delivery',
      subtitle: 'Orders over ₦2,000',
      description: 'Limited time offer',
      gradient: 'from-green-600 to-emerald-500',
      cta: 'Shop Now',
      action: () => navigate('/groceries')
    }
  ];

  // Auto-slide every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promos.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [promos.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % promos.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + promos.length) % promos.length);
  };

  return (
    <div className="relative bg-white py-4">
      <div className="px-4">
        {/* Slider Container */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg">
          {/* Slides */}
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {promos.map((promo) => (
              <div
                key={promo.id}
                className="min-w-full"
              >
                <div
                  className={`bg-gradient-to-br ${promo.gradient} p-6 relative overflow-hidden`}
                  style={{ minHeight: '160px' }}
                >
                  {/* Decorative Circles */}
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full"></div>
                  <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full"></div>

                  {/* Content */}
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {promo.title}
                    </h3>
                    <p className="text-lg text-white/90 mb-1">
                      {promo.subtitle}
                    </p>
                    <p className="text-sm text-white/80 mb-4">
                      {promo.description}
                    </p>

                    {/* CTA Button */}
                    <button
                      onClick={promo.action}
                      className="bg-white text-gray-900 px-6 py-2.5 rounded-full font-semibold text-sm shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 active:scale-95"
                    >
                      {promo.cta}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors z-20"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 text-gray-800" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors z-20"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 text-gray-800" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
            {promos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'bg-white w-6'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromoBanner;
