import React, { useState } from 'react';
import { 
  StarIcon, 
  ShoppingCartIcon, 
  HeartIcon,
  MapPinIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { 
  StarIcon as StarIconSolid,
  HeartIcon as HeartIconSolid 
} from '@heroicons/react/24/solid';

const ProductCard = ({ 
  product, 
  onAddToCart, 
  onToggleFavorite, 
  isFavorite = false,
  className = "",
  showVendor = true,
  layout = 'grid' // 'grid' or 'list'
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isImageError, setIsImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Smart image path resolver
  const getImagePath = (product) => {
    const img = product.imageUrl;
    if (!img) return '/assets/products/placeholder.jpg';
    
    // If already a full path (starts with / or http), use as-is
    if (img.startsWith('/') || img.startsWith('http')) return img;
    
    // Otherwise, assume it's a filename and prepend the assets path
    return `/assets/products/${img}`;
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await onAddToCart(product);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    onToggleFavorite(product.id);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <StarIconSolid key={i} className="w-4 h-4 text-yellow-400" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative w-4 h-4">
            <StarIcon className="absolute inset-0 w-4 h-4 text-gray-300" />
            <StarIconSolid className="absolute inset-0 w-4 h-4 text-yellow-400 clip-path-half" />
          </div>
        );
      } else {
        stars.push(
          <StarIcon key={i} className="w-4 h-4 text-gray-300" />
        );
      }
    }
    return stars;
  };

  const discountPercentage = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  // Format price with measurement label
  const formatPrice = () => {
    const { price, measureType, measureLabel } = product;
    
    if (!price) return '₦0';
    
    // Special formatting for kg, tuber, bunch
    if (measureType === 'kg') {
      return (
        <>
          ₦{price.toLocaleString()}<span className="text-sm text-gray-600">/kg</span>
        </>
      );
    }
    
    if (['per_tuber', 'per_bunch', 'per_pack', 'bag'].includes(measureType)) {
      return (
        <>
          ₦{price.toLocaleString()}<span className="text-sm text-gray-600">/{measureLabel}</span>
        </>
      );
    }
    
    if (measureType === 'portion') {
      return (
        <>
          ₦{price.toLocaleString()}<span className="text-sm text-gray-600">/portion</span>
        </>
      );
    }
    
    // Default: per unit
    return `₦${price.toLocaleString()}`;
  };

  if (layout === 'list') {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 ${className}`}>
        <div className="flex p-4">
          {/* Product Image */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
            {!isImageLoaded && !isImageError && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg"></div>
            )}
            
            {isImageError ? (
              <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🍽️</span>
              </div>
            ) : (
              <img
                src={getImagePath(product)}
                alt={product.name}
                loading="lazy"
                className={`w-full h-full object-cover rounded-lg transition-opacity duration-200 ${
                  isImageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setIsImageLoaded(true)}
                onError={(e) => {
                  setIsImageError(true);
                  e.target.src = '/assets/products/placeholder.jpg';
                }}
              />
            )}

            {/* Discount Badge */}
            {discountPercentage > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                -{discountPercentage}%
              </div>
            )}

            {/* Favorite Button */}
            <button
              onClick={handleToggleFavorite}
              className="absolute top-2 left-2 p-1.5 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors"
            >
              {isFavorite ? (
                <HeartIconSolid className="w-4 h-4 text-red-500" />
              ) : (
                <HeartIcon className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>

          {/* Product Info */}
          <div className="flex-1 ml-4 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate pr-2">
                {product.name}
              </h3>
              
              {/* Price */}
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-red-600 text-sm sm:text-base">
                  {formatPrice()}
                </div>
                {product.originalPrice && (
                  <div className="text-xs text-gray-500 line-through">
                    ₦{product.originalPrice.toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {product.description && (
              <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">
                {product.description}
              </p>
            )}

            {/* Vendor Info */}
            {showVendor && product.vendorName && (
              <div className="flex items-center text-xs text-gray-500 mb-2">
                <MapPinIcon className="w-3 h-3 mr-1" />
                <span className="truncate">{product.vendorName}</span>
              </div>
            )}

            {/* Rating and Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {product.rating && (
                  <div className="flex items-center">
                    <div className="flex mr-1">
                      {renderStars(product.rating)}
                    </div>
                    <span className="text-xs text-gray-600">
                      ({product.reviewCount || 0})
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isLoading || !product.available}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
              >
                {isLoading ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShoppingCartIcon className="w-3 h-3" />
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid layout (default)
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 ${className}`}>
      {/* Product Image */}
      <div className="relative aspect-square">
        {!isImageLoaded && !isImageError && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
        )}
        
        {isImageError ? (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
        ) : (
          <img
            src={getImagePath(product)}
            alt={product.name}
            loading="lazy"
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              isImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsImageLoaded(true)}
            onError={(e) => {
              setIsImageError(true);
              e.target.src = '/assets/products/placeholder.jpg';
            }}
          />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col space-y-2">
          {discountPercentage > 0 && (
            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              -{discountPercentage}%
            </div>
          )}
          
          {product.featured && (
            <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              Featured
            </div>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={handleToggleFavorite}
          className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors"
        >
          {isFavorite ? (
            <HeartIconSolid className="w-5 h-5 text-red-500" />
          ) : (
            <HeartIcon className="w-5 h-5 text-gray-600" />
          )}
        </button>

        {/* Quick Add Button */}
        <button
          onClick={handleAddToCart}
          disabled={isLoading || !product.available}
          className="absolute bottom-3 right-3 p-2.5 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all transform hover:scale-110 active:scale-95"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <ShoppingCartIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-gray-600 text-sm mb-2 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Vendor Info */}
        {showVendor && product.vendorName && (
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <MapPinIcon className="w-4 h-4 mr-1" />
            <span className="truncate">{product.vendorName}</span>
          </div>
        )}

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center mb-3">
            <div className="flex mr-2">
              {renderStars(product.rating)}
            </div>
            <span className="text-sm text-gray-600">
              {product.rating} ({product.reviewCount || 0})
            </span>
          </div>
        )}

        {/* Price and Delivery Info */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-red-600 text-lg">
              {formatPrice()}
            </div>
            {product.originalPrice && (
              <div className="text-sm text-gray-500 line-through">
                ₦{product.originalPrice.toLocaleString()}
              </div>
            )}
          </div>
          
          {product.deliveryTime && (
            <div className="flex items-center text-sm text-gray-500">
              <ClockIcon className="w-4 h-4 mr-1" />
              <span>{product.deliveryTime}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;