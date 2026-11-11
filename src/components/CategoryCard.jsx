import React from 'react';
import { Link } from 'react-router-dom';

const CategoryCard = ({ icon, name, color = 'bg-go7-red', route }) => {
  const getBgColor = () => {
    switch (color) {
      case 'red': return 'bg-go7-red text-white';
      case 'green': return 'bg-green-500 text-white';
      case 'pink': return 'bg-pink-500 text-white';
      case 'purple': return 'bg-purple-500 text-white';
      case 'peach': return 'bg-orange-300 text-white';
      case 'gray': return 'bg-gray-500 text-white';
      default: return 'bg-go7-red text-white';
    }
  };

  return (
    <Link to={route} className="flex flex-col items-center justify-center mx-2 text-gray-700">
      <div 
        className={`w-[70px] h-[70px] rounded-full ${getBgColor()} flex items-center justify-center text-2xl shadow-md`}
      >
        {icon}
      </div>
      <span className="text-xs font-medium mt-1">{name}</span>
    </Link>
  );
};

export default CategoryCard;