import React from 'react';

const HeaderBar = ({ location = 'Abeokuta, NG' }) => {
  const currentLocation = location;

  return (
    <div className="flex items-center justify-between p-4 bg-white">
      <div className="flex items-center space-x-2">
        <span className="text-red-600 text-lg">📍</span>
        <span className="text-gray-900 font-medium text-sm">{currentLocation}</span>
      </div>
      <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
        <svg 
          className="w-6 h-6 text-gray-600" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-5-5 5-5h-5m-6 9L9 12l-5-5 5-5"
          />
        </svg>
      </button>
    </div>
  );
};

export default HeaderBar;
