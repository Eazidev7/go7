import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon, MinusIcon, ShoppingCartIcon, CheckIcon } from "@heroicons/react/24/solid";
import { useToasts } from "../addons/ToastNotifications";

interface ProductPreviewProps {
  product: any; // { productType, name, price, addons, variants, imageUrl, description }
  onAddToCart?: (item: any) => void;
  className?: string;
}

export function ProductPreview({ product, onAddToCart, className = "" }: ProductPreviewProps) {
  // State management
  const [qty, setQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product?.variants?.[0]?.id
  );
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  const { showSuccess } = useToasts();

  // Price calculations
  const variantPrice = useMemo(() => {
    if (product.productType === "market") {
      const variant = product.variants?.find((x: any) => x.id === selectedVariantId);
      return variant?.price ?? 0;
    }
    return product.price ?? 0;
  }, [product, selectedVariantId]);

  const addonsTotal = useMemo(() => {
    return Object.entries(selectedAddons).reduce((sum, [id, count]) => {
      const addon = (product.addons || []).find((x: any) => x.id === id);
      return sum + (addon?.price || 0) * count;
    }, 0);
  }, [selectedAddons, product]);

  const total = (variantPrice + addonsTotal) * qty;

  // Handlers
  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
  };

  const handleAddonToggle = (addonId: string, checked: boolean) => {
    setSelectedAddons(prev => ({
      ...prev,
      [addonId]: checked ? 1 : 0
    }));
  };

  const handleQuantityChange = (delta: number) => {
    setQty(q => Math.max(1, q + delta));
  };

  const handleAddToCart = async () => {
    if (!onAddToCart) return;
    
    setIsAddingToCart(true);
    
    const selectedAddonsList = (product.addons || []).filter((addon: any) => 
      selectedAddons[addon.id] > 0
    );
    
    const selectedVariant = product.variants?.find((v: any) => v.id === selectedVariantId);
    
    const cartItem = {
      productId: product.id,
      productName: product.name,
      productType: product.productType,
      basePrice: variantPrice,
      selectedAddons: selectedAddonsList,
      selectedVariant: selectedVariant,
      quantity: qty,
      totalPrice: total,
      imageUrl: product.imageUrl
    };
    
    try {
      await onAddToCart(cartItem);
      showSuccess('Added to Cart', `${product.name} added successfully`);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const getCategoryColor = (category?: string) => {
    const colors = {
      protein: 'from-green-100 to-emerald-100 border-green-200',
      carbs: 'from-yellow-100 to-orange-100 border-yellow-200',
      spicy: 'from-red-100 to-rose-100 border-red-200',
      drinks: 'from-blue-100 to-cyan-100 border-blue-200',
      dessert: 'from-purple-100 to-pink-100 border-purple-200',
      default: 'from-gray-100 to-gray-100 border-gray-200'
    };
    return colors[category as keyof typeof colors] || colors.default;
  };

  const getCategoryEmoji = (category?: string) => {
    const emojis = {
      protein: '🍗',
      carbs: '🍚',
      spicy: '🌶️',
      drinks: '🥤',
      dessert: '🍰'
    };
    return emojis[category as keyof typeof emojis] || '🍽️';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-3xl shadow-xl overflow-hidden ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}
    >
      {/* Product Image */}
      <div className="relative h-64 overflow-hidden">
        <img 
          src={product.imageUrl || `/api/placeholder/400/250?text=${encodeURIComponent(product.name)}`}
          alt={product.name} 
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = `/api/placeholder/400/250?text=${encodeURIComponent(product.name)}`;
          }}
        />
        
        {/* Product Type Badge */}
        <div className={`absolute top-4 left-4 px-3 py-2 rounded-full backdrop-blur-sm ${
          product.productType === 'food' 
            ? 'bg-orange-100/90 text-orange-800 border border-orange-200' 
            : 'bg-blue-100/90 text-blue-800 border border-blue-200'
        }`}>
          <span className="text-sm font-medium">
            {product.productType === 'food' ? '🍽️ Food' : '🛒 Market'}
          </span>
        </div>

        {/* Price Badge */}
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-full backdrop-blur-sm">
          <span className="text-lg font-bold">₦{variantPrice.toLocaleString()}</span>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h3>
        <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>

        {/* Market Variants */}
        {product.productType === "market" && product.variants && product.variants.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📋</span>
              Choose Variant
            </h4>
            <div className="grid grid-cols-1 gap-3">
              <AnimatePresence>
                {product.variants.map((variant: any) => (
                  <motion.button
                    key={variant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleVariantSelect(variant.id)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      variant.id === selectedVariantId
                        ? 'border-red-500 bg-red-50 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-900 text-lg">{variant.name}</div>
                        {variant.description && (
                          <div className="text-sm text-gray-600 mt-1">{variant.description}</div>
                        )}
                        {variant.stock !== undefined && (
                          <div className="text-xs text-gray-500 mt-1">
                            Stock: {variant.stock} available
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">₦{variant.price.toLocaleString()}</div>
                        {variant.id === selectedVariantId && (
                          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mt-2">
                            <CheckIcon className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Food Add-ons */}
        {product.productType === "food" && product.addons && product.addons.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>✨</span>
              Premium Add-ons
            </h4>
            <div className="space-y-3">
              <AnimatePresence>
                {product.addons.map((addon: any, index: number) => (
                  <motion.div
                    key={addon.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer bg-gradient-to-r ${getCategoryColor(addon.category)} ${
                      selectedAddons[addon.id] > 0
                        ? 'border-red-500 shadow-lg'
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => handleAddonToggle(addon.id, selectedAddons[addon.id] === 0)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getCategoryEmoji(addon.category)}</span>
                          <h5 className="font-semibold text-gray-900">{addon.name}</h5>
                        </div>
                        {addon.description && (
                          <p className="text-sm text-gray-600 mb-2">{addon.description}</p>
                        )}
                        {addon.category && (
                          <span className="text-xs bg-white/80 text-gray-700 px-2 py-1 rounded-full font-medium capitalize">
                            {addon.category}
                          </span>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-gray-900">+₦{addon.price.toLocaleString()}</div>
                        <div className={`w-6 h-6 rounded-full border-2 mt-2 flex items-center justify-center transition-all ${
                          selectedAddons[addon.id] > 0
                            ? 'border-red-500 bg-red-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedAddons[addon.id] > 0 && (
                            <CheckIcon className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📦</span>
            Quantity
          </h4>
          <div className="flex items-center justify-center gap-6 bg-gray-50 rounded-2xl p-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleQuantityChange(-1)}
              className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-all"
            >
              <MinusIcon className="w-6 h-6 text-gray-600" />
            </motion.button>
            
            <motion.span 
              key={qty}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-3xl font-bold text-gray-900 min-w-[3rem] text-center"
            >
              {qty}
            </motion.span>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleQuantityChange(1)}
              className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-all"
            >
              <PlusIcon className="w-6 h-6 text-gray-600" />
            </motion.button>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="mb-6 p-4 bg-gray-50 rounded-2xl">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Base Price × {qty}:</span>
              <span>₦{(variantPrice * qty).toLocaleString()}</span>
            </div>
            {addonsTotal > 0 && (
              <div className="flex justify-between text-gray-700">
                <span>Add-ons × {qty}:</span>
                <span>₦{(addonsTotal * qty).toLocaleString()}</span>
              </div>
            )}
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <motion.span 
                  key={total}
                  initial={{ scale: 1.1, color: '#ef4444' }}
                  animate={{ scale: 1, color: '#111827' }}
                  className="text-2xl font-bold"
                >
                  ₦{total.toLocaleString()}
                </motion.span>
              </div>
            </div>
          </div>
        </div>

        {/* Add to Cart Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAddToCart}
          disabled={isAddingToCart}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isAddingToCart ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Adding to Cart...
            </>
          ) : (
            <>
              <ShoppingCartIcon className="w-6 h-6" />
              Add to Cart - ₦{total.toLocaleString()}
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}