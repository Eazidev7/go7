import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UtensilsCrossed, 
  ShoppingBasket, 
  Package, 
  Pill, 
  ShoppingBag 
} from 'lucide-react';

const CategoryCarousel = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const categories = [
    {
      id: 'food',
      name: 'Fast Food',
      icon: UtensilsCrossed,
      emoji: '🍔',
      gradient: 'from-red-500 to-orange-500',
      route: '/restaurants'
    },
    {
      id: 'groceries',
      name: 'Groceries',
      icon: ShoppingBasket,
      emoji: '🛒',
      gradient: 'from-green-500 to-emerald-500',
      route: '/groceries'
    },
    {
      id: 'errands',
      name: 'Errands',
      icon: ShoppingBag,
      emoji: '🏃',
      gradient: 'from-blue-500 to-cyan-500',
      route: '/book-delivery'
    },
    {
      id: 'pharmacy',
      name: 'Pharmacy',
      icon: Pill,
      emoji: '💊',
      gradient: 'from-purple-500 to-pink-500',
      route: '/pharmacy'
    },
    {
      id: 'packages',
      name: 'Packages',
      icon: Package,
      emoji: '📦',
      gradient: 'from-yellow-500 to-amber-500',
      route: '/packages'
    }
  ];

  const handleCategoryClick = (category) => {
    navigate(category.route);
  };

  return (
    <div className="bg-white py-4">
      <div className="px-4 mb-3">
        <h2 className="text-lg font-bold text-gray-900">What do you need?</h2>
        <p className="text-xs text-gray-500">Choose a service</p>
      </div>

      {/* Scrollable Categories */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-3 px-4 pb-2 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((category) => {
          const IconComponent = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category)}
              className="flex-shrink-0 snap-start group"
            >
              <div className="flex flex-col items-center space-y-2 w-20">
                {/* Icon Circle */}
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${category.gradient} shadow-lg flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-active:scale-95`}
                >
                  <span className="text-3xl">{category.emoji}</span>
                </div>

                {/* Label */}
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-900 leading-tight">
                    {category.name}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Hide scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default CategoryCarousel;
