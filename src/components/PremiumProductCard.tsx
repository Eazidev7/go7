/**
 * 🎨 PREMIUM PRODUCT CARD V2
 * 
 * Beautiful product card for customer interface with:
 * - High-quality images
 * - Addon preview
 * - Premium design
 * - Interactive elements
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Star, 
  Clock, 
  DollarSign, 
  Package,
  Heart,
  ShoppingCart,
  Eye
} from 'lucide-react';
import { V2Product, V2Addon } from '../services/productServiceV2';
import { VendorInfo } from '../services/customerProductServiceV2';

interface PremiumProductCardProps {
  product: V2Product;
  vendor?: VendorInfo;
  onAddToCart?: (product: V2Product, addons: V2Addon[], quantity: number) => void;
  onViewProduct?: (product: V2Product) => void;
  className?: string;
}

const PremiumProductCard: React.FC<PremiumProductCardProps> = ({
  product,
  vendor,
  onAddToCart,
  onViewProduct,
  className = ''
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showAddons, setShowAddons] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<V2Addon[]>([]);
  const [quantity, setQuantity] = useState(1);

  const toggleAddon = (addon: V2Addon) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) {
        return prev.filter(a => a.id !== addon.id);
      } else {
        return [...prev, addon];
      }
    });
  };

  const getTotalPrice = () => {
    const basePrice = product.basePrice * quantity;
    const addonsPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0) * quantity;
    return basePrice + addonsPrice;
  };

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product, selectedAddons, quantity);
    }
    setShowAddons(false);
    setSelectedAddons([]);
    setQuantity(1);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getMeasurementLabel = () => {
    switch (product.measurementType) {
      case 'unit': return 'per unit';
      case 'portion': return 'per portion';
      case 'bundle': return 'per bundle';
      case 'weight': return 'per kg';
      default: return '';
    }
  };

  return (
    <>
      <motion.div
        layout
        whileHover={{ y: -4 }}
        className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 ${className}`}
      >
        {/* Product Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Package size={32} className="text-gray-400" />
            </div>
          )}
          
          {/* Overlay Buttons */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2 rounded-full backdrop-blur-sm transition ${
                isLiked 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/80 text-gray-600 hover:bg-white'
              }`}
            >
              <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
            
            {onViewProduct && (
              <button
                onClick={() => onViewProduct(product)}
                className="p-2 rounded-full bg-white/80 text-gray-600 hover:bg-white backdrop-blur-sm transition"
              >
                <Eye size={16} />
              </button>
            )}
          </div>

          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-black/20 text-white text-xs font-medium rounded-full backdrop-blur-sm">
              {product.category}
            </span>
          </div>

          {/* Vendor Info */}
          {vendor && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              {vendor.profileImage ? (
                <img
                  src={vendor.profileImage}
                  alt={vendor.name}
                  className="w-6 h-6 rounded-full border-2 border-white"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
                  <Package size={12} className="text-gray-600" />
                </div>
              )}
              <span className="text-white text-xs font-medium bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                {vendor.name}
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 text-lg leading-tight">
              {product.name}
            </h3>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {formatPrice(product.basePrice)}
              </div>
              {getMeasurementLabel() && (
                <div className="text-xs text-gray-500">
                  {getMeasurementLabel()}
                </div>
              )}
            </div>
          </div>

          {product.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {product.description}
            </p>
          )}

          {/* Vendor Rating & Delivery */}
          {vendor && (
            <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Star size={12} className="text-yellow-400 fill-current" />
                <span>{vendor.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{vendor.deliveryTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign size={12} />
                <span>{formatPrice(vendor.deliveryFee)} delivery</span>
              </div>
            </div>
          )}

          {/* Addons Preview */}
          {product.addons && product.addons.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">
                {product.addons.length} add-on{product.addons.length !== 1 ? 's' : ''} available
              </div>
              <div className="flex gap-1 overflow-hidden">
                {product.addons.slice(0, 3).map((addon, index) => (
                  <div
                    key={addon.id}
                    className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 whitespace-nowrap"
                  >
                    {addon.name}
                  </div>
                ))}
                {product.addons.length > 3 && (
                  <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                    +{product.addons.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={() => setShowAddons(true)}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Plus size={18} />
            Add to Cart
          </button>
        </div>
      </motion.div>

      {/* Addons Modal */}
      {showAddons && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[80vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-6 border-b">
              <div className="flex items-center gap-4 mb-4">
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
                  <p className="text-gray-600">{formatPrice(product.basePrice)} {getMeasurementLabel()}</p>
                </div>
                <button
                  onClick={() => setShowAddons(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-96">
              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(product.minQty, quantity - 1))}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 border border-gray-300 rounded-lg min-w-16 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.maxQty, quantity + 1))}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Min: {product.minQty} • Max: {product.maxQty}
                </div>
              </div>

              {/* Addons */}
              {product.addons && product.addons.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Add-ons (Optional)
                  </label>
                  <div className="space-y-3">
                    {product.addons.map((addon) => (
                      <label
                        key={addon.id}
                        className={`flex items-center p-3 border rounded-xl cursor-pointer transition ${
                          selectedAddons.find(a => a.id === addon.id)
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selectedAddons.find(a => a.id === addon.id)}
                          onChange={() => toggleAddon(addon)}
                          className="mr-3 text-yellow-500 focus:ring-yellow-500"
                        />
                        
                        {addon.imageUrl && (
                          <img
                            src={addon.imageUrl}
                            alt={addon.name}
                            className="w-12 h-12 rounded-lg object-cover mr-3"
                          />
                        )}
                        
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{addon.name}</div>
                          <div className="text-sm text-gray-600">{formatPrice(addon.price)}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(getTotalPrice())}
                </span>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddons(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  Add to Cart
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default PremiumProductCard;