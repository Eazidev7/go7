import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, Clock, Zap } from 'lucide-react';
import { AddonModal } from './AddonModal';
import type { V2Product, V2Addon } from '../types/product';

interface ProductCardProps {
  product: V2Product;
  vendorId: string;
  onAddToCart?: (product: V2Product, selectedAddons: V2Addon[], quantity: number) => void;
  className?: string;
}

export function ProductCard({ 
  product, 
  vendorId, 
  onAddToCart, 
  className = '' 
}: ProductCardProps) {
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleAddToCart = (product: V2Product, selectedAddons: V2Addon[], quantity: number) => {
    onAddToCart?.(product, selectedAddons, quantity);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (product.addons && product.addons.length > 0) {
      setShowAddonModal(true);
    } else {
      handleAddToCart(product, [], 1);
    }
  };

  const getMeasurementLabel = (type: string) => {
    const labels = {
      unit: 'per item',
      portion: 'per serving',
      bundle: 'per bundle',
      weight: 'per kg'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5 }}
        className={`
          bg-white rounded-2xl shadow-lg overflow-hidden 
          border border-gray-100 hover:shadow-xl 
          transition-all duration-300 cursor-pointer
          ${className}
        `}
        onClick={() => setShowAddonModal(true)}
      >
        {/* Image Section */}
        <div className="relative h-48 bg-gradient-to-br from-orange-100 to-red-100">
          {product.imageUrl && !imageError ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-6xl text-gray-300">🍽️</div>
            </div>
          )}
          
          {/* Availability Badge */}
          {!product.isAvailable && (
            <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              Unavailable
            </div>
          )}
          
          {/* Quick Add Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleQuickAdd}
            className="absolute bottom-3 right-3 bg-orange-500 text-white p-3 rounded-full shadow-lg hover:bg-orange-600 transition-colors"
            disabled={!product.isAvailable}
          >
            <ShoppingCart size={16} />
          </motion.button>
          
          {/* Addon Count Badge */}
          {product.addons && product.addons.length > 0 && (
            <div className="absolute top-3 right-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              +{product.addons.length} addon{product.addons.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4">
          {/* Category & Measurement Type */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded-full">
              {product.category || 'Food'}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {getMeasurementLabel(product.measurementType)}
            </span>
          </div>

          {/* Product Name */}
          <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
            {product.name}
          </h3>

          {/* Description */}
          {product.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {product.description}
            </p>
          )}

          {/* Price & Features */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">
                {formatPrice(product.basePrice)}
              </span>
              <span className="text-xs text-gray-500">
                {getMeasurementLabel(product.measurementType)}
              </span>
            </div>
            
            {/* Features */}
            <div className="flex items-center space-x-2">
              {product.isPopular && (
                <div className="flex items-center text-yellow-500 text-xs">
                  <Star size={12} className="mr-1" fill="currentColor" />
                  Popular
                </div>
              )}
              
              {product.preparationTime && (
                <div className="flex items-center text-green-600 text-xs">
                  <Clock size={12} className="mr-1" />
                  {product.preparationTime}m
                </div>
              )}
            </div>
          </div>

          {/* Addon Preview */}
          {product.addons && product.addons.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">Add-ons available:</p>
              <div className="flex flex-wrap gap-1">
                {product.addons.slice(0, 3).map((addon, index) => (
                  <span
                    key={addon.id}
                    className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full"
                  >
                    {addon.name}
                  </span>
                ))}
                {product.addons.length > 3 && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    +{product.addons.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleQuickAdd}
            disabled={!product.isAvailable}
            className={`
              w-full py-3 px-4 rounded-xl font-semibold text-sm
              transition-all duration-200 flex items-center justify-center space-x-2
              ${product.isAvailable 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-md hover:shadow-lg' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {product.addons && product.addons.length > 0 ? (
              <>
                <Zap size={16} />
                <span>Add extras</span>
              </>
            ) : (
              <>
                <ShoppingCart size={16} />
                <span>Add to Cart</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Addon Modal */}
      <AddonModal
        isOpen={showAddonModal}
        onClose={() => setShowAddonModal(false)}
        product={product}
        onAddToCart={handleAddToCart}
      />
    </>
  );
}