import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../ui/Card';

interface FoodVendor {
  id: string;
  name: string;
  rating: number;
  image: string;
  category?: string;
  deliveryTime?: string;
}

const FoodVendorsRow = () => {
  const navigate = useNavigate();

  const foodVendors: FoodVendor[] = [
    {
      id: '1',
      name: "Mama's Kitchen",
      rating: 4.8,
      image: '/burger-hero.png',
      category: 'Local Cuisine',
      deliveryTime: '30-45 min'
    },
    {
      id: '2',
      name: 'Spice Corner',
      rating: 4.9,
      image: '/burger-hero.png',
      category: 'Nigerian Food',
      deliveryTime: '25-40 min'
    },
    {
      id: '3',
      name: 'Fresh Delights',
      rating: 4.6,
      image: '/burger-hero.png',
      category: 'Healthy Options',
      deliveryTime: '20-35 min'
    },
    {
      id: '4',
      name: 'Street Eats',
      rating: 4.7,
      image: '/burger-hero.png',
      category: 'Fast Food',
      deliveryTime: '15-30 min'
    },
    {
      id: '5',
      name: 'Golden Pot',
      rating: 4.5,
      image: '/burger-hero.png',
      category: 'Traditional',
      deliveryTime: '35-50 min'
    },
    {
      id: '6',
      name: 'Quick Bites',
      rating: 4.4,
      image: '/burger-hero.png',
      category: 'Snacks',
      deliveryTime: '10-25 min'
    }
  ];

  const handleOrderFood = (vendorId: string) => {
    navigate(`/vendor/${vendorId}`);
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    return (
      <div className="flex items-center space-x-1">
        <span className="text-yellow-400 text-sm">
          {'★'.repeat(fullStars)}
          {hasHalfStar && '☆'}
        </span>
        <span className="text-[#6B7280] text-sm font-medium">
          {rating}
        </span>
      </div>
    );
  };
  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#1E1E1E] mb-2">
              Popular Food Vendors
            </h2>
            <p className="text-[#6B7280]">
              Delicious meals delivered from your favorite local restaurants
            </p>
          </div>
          <button 
            onClick={() => navigate('/food')}
            className="hidden md:block text-[#E53935] font-semibold hover:text-[#B71C1C] transition-colors"
          >
            View All →
          </button>
        </div>

        {/* Desktop: Grid view */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {foodVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow duration-200"
            >
              <div className="aspect-[4/3] overflow-hidden rounded-t-xl">
                <img
                  src={vendor.image}
                  alt={vendor.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-[#1E1E1E] text-lg">
                    {vendor.name}
                  </h3>
                  {renderStars(vendor.rating)}
                </div>
                {vendor.category && (
                  <p className="text-[#6B7280] text-sm mb-2">
                    {vendor.category}
                  </p>
                )}
                {vendor.deliveryTime && (
                  <p className="text-[#6B7280] text-xs mb-4">
                    🚚 {vendor.deliveryTime}
                  </p>
                )}
                <button
                  onClick={() => handleOrderFood(vendor.id)}
                  className="w-full bg-[#E53935] text-white font-semibold py-2 px-4 rounded-full hover:bg-[#B71C1C] transition-colors duration-200"
                >
                  Order Food
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: Horizontal scroll */}
        <div className="md:hidden">
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            {foodVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="flex-shrink-0 w-64 bg-white rounded-xl shadow-sm border"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-t-xl">
                  <img
                    src={vendor.image}
                    alt={vendor.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-[#1E1E1E]">
                      {vendor.name}
                    </h3>
                    {renderStars(vendor.rating)}
                  </div>
                  {vendor.category && (
                    <p className="text-[#6B7280] text-sm mb-2">
                      {vendor.category}
                    </p>
                  )}
                  {vendor.deliveryTime && (
                    <p className="text-[#6B7280] text-xs mb-3">
                      🚚 {vendor.deliveryTime}
                    </p>
                  )}
                  <button
                    onClick={() => handleOrderFood(vendor.id)}
                    className="w-full bg-[#E53935] text-white font-semibold py-2 px-3 rounded-full hover:bg-[#B71C1C] transition-colors duration-200 text-sm"
                  >
                    Order Food
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* View All button for mobile */}
          <div className="text-center mt-4">
            <button 
              onClick={() => navigate('/food')}
              className="text-[#E53935] font-semibold hover:text-[#B71C1C] transition-colors"
            >
              View All Vendors →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FoodVendorsRow;
