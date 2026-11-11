import React from 'react';
import { useNavigate } from 'react-router-dom';

interface QuickCategory {
  title: string;
  emoji: string;
  path: string;
  description?: string;
}

const QuickCategories = () => {
  const navigate = useNavigate();

  const primaryCategories: QuickCategory[] = [
    {
      title: 'Food Delivery',
      emoji: '🍔',
      path: '/food',
      description: 'Order from local restaurants'
    },
    {
      title: 'Grocery Delivery',
      emoji: '🛒',
      path: '/groceries',
      description: 'Fresh groceries delivered'
    },
    {
      title: 'Local Markets',
      emoji: '🧺',
      path: '/markets',
      description: 'Browse nearby markets'
    },
    {
      title: 'Pay on Delivery',
      emoji: '💳',
      path: '/pod',
      description: 'Cash payment option'
    }
  ];

  const secondaryCategories: QuickCategory[] = [
    {
      title: 'Courier/Logistics',
      emoji: '📦',
      path: '/courier',
      description: 'Package delivery service'
    },
    {
      title: 'Powerbank Rentals',
      emoji: '🔋',
      path: '/powerbank',
      description: 'Rent portable chargers'
    }
  ];

  const handleCategoryClick = (path: string) => {
    navigate(path);
  };

  const CategoryCard = ({ category }: { category: QuickCategory }) => (
    <button
      onClick={() => handleCategoryClick(category.path)}
      className="group w-full rounded-xl p-5 bg-[#FFF6F3] hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md"
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-200">
          {category.emoji}
        </div>
        <h3 className="font-semibold text-[#1E1E1E] text-lg">
          {category.title}
        </h3>
        {category.description && (
          <p className="text-[#6B7280] text-sm">
            {category.description}
          </p>
        )}
      </div>
    </button>
  );

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Primary Categories - 4 in a row on desktop, 2x2 on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {primaryCategories.map((category) => (
            <CategoryCard key={category.path} category={category} />
          ))}
        </div>

        {/* Secondary Categories - Optional second row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {secondaryCategories.map((category) => (
            <CategoryCard key={category.path} category={category} />
          ))}
          {/* Empty divs to maintain grid structure on larger screens */}
          <div className="hidden md:block"></div>
          <div className="hidden md:block"></div>
        </div>
      </div>
    </section>
  );
};

export default QuickCategories;
