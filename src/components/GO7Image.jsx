import React, { useState } from 'react';
import { getProductImagePath, getVendorImagePath, handleImageError } from '../utils/imageUtils';

/**
 * GO7 Optimized Image Component
 * Handles lazy loading, fallbacks, and proper path resolution
 */
const GO7Image = ({
  item,
  type = 'product', // 'product' or 'vendor'
  alt,
  className = '',
  style = {},
  width,
  height,
  objectFit = 'cover',
  showPlaceholder = true,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Get the correct image path based on type
  const getImageSrc = () => {
    if (type === 'vendor') {
      return getVendorImagePath(item);
    }
    return getProductImagePath(item);
  };

  const handleLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    setHasError(true);
    handleImageError(e, type);
    if (onError) onError(e);
  };

  const imageSrc = getImageSrc();
  const altText = alt || item?.name || `GO7 ${type}`;

  const imageStyle = {
    width: width || '100%',
    height: height || '100%',
    objectFit,
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0,
    ...style
  };

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {/* Loading Placeholder */}
      {!isLoaded && !hasError && showPlaceholder && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
        />
      )}

      {/* Image */}
      <img
        src={imageSrc}
        alt={altText}
        loading="lazy"
        className={className}
        style={imageStyle}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />

      {/* Error Fallback Icon */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-4xl">
            {type === 'vendor' ? '🏪' : '🍽️'}
          </span>
        </div>
      )}
    </div>
  );
};

export default GO7Image;
