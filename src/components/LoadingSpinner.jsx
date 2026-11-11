import React from 'react';

const LoadingSpinner = ({ size = 'medium', color = 'red', text }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  const colorClasses = {
    red: 'border-red-600',
    white: 'border-white',
    gray: 'border-gray-600',
    blue: 'border-blue-600'
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`
        ${sizeClasses[size]} 
        border-4 ${colorClasses[color]} border-t-transparent 
        rounded-full animate-spin
      `}></div>
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
};

// Full page loading spinner
export const PageLoadingSpinner = ({ text = "Loading..." }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="large" color="red" />
        <h2 className="mt-4 text-xl font-semibold text-gray-700">{text}</h2>
        <p className="mt-2 text-gray-500">Please wait while we load your content</p>
      </div>
    </div>
  );
};

// Inline loading spinner
export const InlineLoadingSpinner = ({ text = "Loading...", size = 'medium' }) => {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner size={size} color="red" text={text} />
    </div>
  );
};

// Button loading spinner
export const ButtonLoadingSpinner = ({ size = 'small' }) => {
  return (
    <LoadingSpinner size={size} color="white" />
  );
};

export default LoadingSpinner;