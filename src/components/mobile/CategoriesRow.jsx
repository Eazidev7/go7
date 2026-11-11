import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CategoriesRow = () => {
  const [activeCategory, setActiveCategory] = useState('');
  const navigate = useNavigate();

  const categories = [
    { id: 1, name: 'Burger', icon: '🍔', highlight: false },
    { id: 2, name: 'Pizza', icon: '🍕', highlight: false },
    { id: 3, name: 'Salad', icon: '🥗', highlight: false },
    { id: 4, name: 'Sushi', icon: '🍣', highlight: false },
    { id: 5, name: 'Book Delivery', icon: '🚚', highlight: true, route: '/delivery' }
  ];

  // Load saved category from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('go7-active-category');
    if (saved) {
      setActiveCategory(saved);
    }
  }, []);

  const handleCategorySelect = (category) => {
    setActiveCategory(category.name);
    localStorage.setItem('go7-active-category', category.name);
    
    if (category.route) {
      navigate(category.route);
    }
  };

  return (
    <div className="pb-4">
      <div className="px-4 pb-2">
        <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
      </div>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex space-x-3 px-4" style={{ scrollSnapType: 'x mandatory' }}>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category)}
              className={`flex-shrink-0 bg-white rounded-2xl p-4 min-w-[100px] transition-all duration-200 transform ${
                activeCategory === category.name
                  ? 'ring-2 ring-red-500 scale-105'
                  : 'hover:scale-98 active:scale-95'
              } ${
                category.highlight ? 'ring-1 ring-red-200' : ''
              }`}
              style={{ 
                scrollSnapAlign: 'start',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{category.icon}</div>
                <div className="text-sm font-medium text-gray-900">{category.name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoriesRow;
