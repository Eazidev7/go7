import React from 'react';

/**
 * Skeleton loader component for maps with shimmer effect
 */
const MapSkeleton = ({ height = '400px', className = '' }) => {
  return (
    <div 
      className={`relative bg-gray-200 rounded-lg overflow-hidden ${className}`}
      style={{ height }}
    >
      {/* Shimmer animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 transform -translate-x-full animate-shimmer"></div>
      </div>
      
      {/* Mock map elements */}
      <div className="absolute top-4 left-4 right-4">
        <div className="h-3 bg-gray-300 rounded w-1/3 mb-2 animate-pulse"></div>
        <div className="h-2 bg-gray-300 rounded w-1/4 animate-pulse"></div>
      </div>
      
      {/* Mock markers */}
      <div className="absolute top-1/4 left-1/4 w-6 h-6 bg-red-300 rounded-full animate-pulse"></div>
      <div className="absolute top-1/3 right-1/3 w-6 h-6 bg-green-300 rounded-full animate-pulse delay-100"></div>
      <div className="absolute bottom-1/3 left-1/2 w-6 h-6 bg-blue-300 rounded-full animate-pulse delay-200"></div>
      
      {/* Loading text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-bounce"></div>
            <span className="text-gray-600 font-medium">Loading map...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapSkeleton;
