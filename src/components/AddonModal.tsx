import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingCart } from "lucide-react";
import type { V2Addon, V2Product } from "../types/product";

interface AddonModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: V2Product;
  onAddToCart: (product: V2Product, selectedAddons: V2Addon[], quantity: number) => void;
}

export function AddonModal({ isOpen, onClose, product, onAddToCart }: AddonModalProps) {
  const [selectedAddons, setSelectedAddons] = useState<Record<string, V2Addon>>({});
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate total price
  const baseTotal = product.basePrice * quantity;
  const addonsTotal = Object.values(selectedAddons).reduce(
    (sum, addon) => sum + (addon.price * quantity), 
    0
  );
  const grandTotal = baseTotal + addonsTotal;

  // Toggle addon selection
  const toggleAddon = useCallback((addon: V2Addon) => {
    setSelectedAddons(prev => {
      const updated = { ...prev };
      if (updated[addon.id]) {
        delete updated[addon.id];
      } else {
        updated[addon.id] = addon;
      }
      return updated;
    });
  }, []);

  // Handle add to cart
  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      await onAddToCart(product, Object.values(selectedAddons), quantity);
      onClose();
      setSelectedAddons({});
      setQuantity(1);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group addons by category
  const groupedAddons = product.addons?.reduce((groups, addon) => {
    const category = addon.category || 'Other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(addon);
    return groups;
  }, {} as Record<string, V2Addon[]>) || {};

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-start space-x-4">
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-white/30"
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
                  <p className="text-white/90 text-sm">{product.description}</p>
                  <div className="mt-2 flex items-center space-x-3">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                      ₦{product.basePrice.toLocaleString()}
                    </span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {product.measurementType}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {Object.keys(groupedAddons).length > 0 ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    🍽️ Add Extras
                  </h3>
                  
                  {Object.entries(groupedAddons).map(([category, addons]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="font-medium text-gray-700 border-b border-gray-200 pb-2">
                        {category}
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {addons.map((addon) => {
                          const isSelected = selectedAddons[addon.id];
                          
                          return (
                            <motion.div
                              key={addon.id}
                              whileTap={{ scale: 0.98 }}
                              className={`
                                relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                                ${isSelected 
                                  ? 'border-orange-500 bg-orange-50 shadow-md' 
                                  : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                                }
                              `}
                              onClick={() => toggleAddon(addon)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    {addon.imageUrl && (
                                      <img
                                        src={addon.imageUrl}
                                        alt={addon.name}
                                        className="w-8 h-8 rounded-lg object-cover"
                                      />
                                    )}
                                    <h5 className="font-medium text-gray-900">
                                      {addon.name}
                                    </h5>
                                  </div>
                                  
                                  {addon.description && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      {addon.description}
                                    </p>
                                  )}
                                  
                                  <p className="text-orange-600 font-semibold mt-2">
                                    +₦{addon.price.toLocaleString()}
                                  </p>
                                </div>
                                
                                <div className={`
                                  w-6 h-6 rounded-full border-2 flex items-center justify-center
                                  ${isSelected 
                                    ? 'border-orange-500 bg-orange-500' 
                                    : 'border-gray-300'
                                  }
                                `}>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-3 h-3 bg-white rounded-full"
                                    />
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🍽️</div>
                  <p>No add-ons available for this item</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
              {/* Quantity Selector */}
              <div className="flex items-center justify-center space-x-4 mb-4">
                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                <div className="flex items-center space-x-3 bg-white rounded-lg border border-gray-300 p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus size={16} className={quantity <= 1 ? 'text-gray-400' : 'text-gray-600'} />
                  </button>
                  
                  <span className="px-4 py-2 font-semibold text-lg min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Plus size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{product.name} × {quantity}</span>
                  <span>₦{baseTotal.toLocaleString()}</span>
                </div>
                
                {Object.values(selectedAddons).map((addon) => (
                  <div key={addon.id} className="flex justify-between text-gray-600">
                    <span>{addon.name} × {quantity}</span>
                    <span>+₦{(addon.price * quantity).toLocaleString()}</span>
                  </div>
                ))}
                
                <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-orange-600">₦{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    <span>Add to Cart • ₦{grandTotal.toLocaleString()}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}