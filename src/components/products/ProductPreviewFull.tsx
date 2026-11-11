import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MinusIcon, 
  PlusIcon, 
  ShoppingCartIcon,
  CheckIcon,
  StarIcon,
  ClockIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import { HeartIcon } from '@heroicons/react/24/solid';

// Import types from ProductForm
export interface AddOn {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  category?: 'protein' | 'carbs' | 'spicy' | 'drinks' | 'dessert';
}

export interface Variant {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  stock?: number;
  description?: string;
  sku?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  category: string;
  productType: 'food' | 'market';
  deliveryTimeMinutes?: number;
  addons?: AddOn[];
  variants?: Variant[];
  vendorId: string;
  vendorName: string;
  rating?: number;
  reviewCount?: number;
  isAvailable?: boolean;
  estimatedDelivery?: string;
}

interface ProductPreviewProps {
  product: Product;
  onAddToCart: (item: CartItem) => void;
  className?: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  productType: 'food' | 'market';
  basePrice: number;
  selectedVariant?: Variant;
  selectedAddons: AddOn[];
  quantity: number;
  totalPrice: number;
  vendorId: string;
  vendorName: string;
}

const ProductPreview: React.FC<ProductPreviewProps> = ({
  product,
  onAddToCart,
  className = ''
}) => {
  // State management
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  );
  const [selectedAddons, setSelectedAddons] = useState<AddOn[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Calculate total price
  const totalPrice = useMemo(() => {
    let price = product.productType === 'market' && selectedVariant 
      ? selectedVariant.price 
      : product.basePrice;
    
    const addonsPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    return (price + addonsPrice) * quantity;
  }, [product, selectedVariant, selectedAddons, quantity]);

  // Handle add-on toggle
  const toggleAddon = (addon: AddOn) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) {
        return prev.filter(a => a.id !== addon.id);
      } else {
        return [...prev, addon];
      }
    });
  };

  // Handle quantity change
  const updateQuantity = (delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    
    const cartItem: CartItem = {
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl,
      productType: product.productType,
      basePrice: product.productType === 'market' && selectedVariant 
        ? selectedVariant.price 
        : product.basePrice,
      selectedVariant: selectedVariant || undefined,
      selectedAddons,
      quantity,
      totalPrice,
      vendorId: product.vendorId,
      vendorName: product.vendorName
    };

    try {
      await onAddToCart(cartItem);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Check if product is available
  const isAvailable = product.isAvailable !== false && 
    (product.productType === 'food' || !selectedVariant || (selectedVariant.stock && selectedVariant.stock > 0));

  // Category emoji mapping
  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      'fast-food': '🍔',
      'restaurant': '🍽️',
      'groceries': '🛒',
      'electronics': '📱',
      'fashion': '👕',
      'home': '🏠'
    };
    return emojiMap[category] || '🏪';
  };

  const getAddonCategoryEmoji = (category?: string) => {
    const emojiMap: Record<string, string> = {
      'protein': '🍗',
      'carbs': '🍚',
      'spicy': '🌶️',
      'drinks': '🥤',
      'dessert': '🍰'
    };
    return emojiMap[category || 'protein'] || '🍽️';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-3xl shadow-2xl overflow-hidden max-w-2xl mx-auto ${className}`}
    >
      {/* Product Image & Header */}
      <div className="relative">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-80 object-cover"
        />
        
        {/* Overlay with product type and favorite */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
              product.productType === 'food' ? 'bg-red-500' : 'bg-blue-500'
            }`}>
              {getCategoryEmoji(product.category)} {product.productType === 'food' ? 'Food' : 'Market'}
            </span>
            {!isAvailable && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-gray-500">
                Out of Stock
              </span>
            )}
          </div>
          
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
          >
            <HeartIcon className={`h-6 w-6 ${isFavorite ? 'text-red-500' : 'text-white'}`} />
          </button>
        </div>

        {/* Product info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <p className="text-lg opacity-90 mb-3">{product.description}</p>
          
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
              <span>{product.rating || 4.5}</span>
              <span className="opacity-75">({product.reviewCount || 128})</span>
            </div>
            
            {product.deliveryTimeMinutes && (
              <div className="flex items-center space-x-1">
                <ClockIcon className="h-4 w-4" />
                <span>{product.deliveryTimeMinutes} mins</span>
              </div>
            )}
            
            <div className="flex items-center space-x-1">
              <TruckIcon className="h-4 w-4" />
              <span>{product.estimatedDelivery || 'Fast delivery'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Content */}
      <div className="p-8">
        {/* Vendor Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sold by</p>
              <p className="font-semibold text-gray-900">{product.vendorName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Base Price</p>
              <p className="text-2xl font-bold text-red-600">
                ₦{(product.productType === 'market' && selectedVariant ? selectedVariant.price : product.basePrice).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Variants Section (Market Products) */}
        {product.productType === 'market' && product.variants && product.variants.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Choose Variant</h3>
            <div className="grid gap-3">
              {product.variants.map((variant) => (
                <motion.button
                  key={variant.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedVariant(variant)}
                  disabled={variant.stock === 0}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedVariant?.id === variant.id
                      ? 'border-red-500 bg-red-50'
                      : variant.stock === 0
                      ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-red-300 hover:bg-red-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {variant.imageUrl && (
                        <img
                          src={variant.imageUrl}
                          alt={variant.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{variant.name}</p>
                        {variant.description && (
                          <p className="text-sm text-gray-600">{variant.description}</p>
                        )}
                        {variant.stock !== undefined && (
                          <p className={`text-xs ${variant.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₦{variant.price.toLocaleString()}</p>
                      {variant.sku && (
                        <p className="text-xs text-gray-500">SKU: {variant.sku}</p>
                      )}
                    </div>
                    {selectedVariant?.id === variant.id && (
                      <CheckIcon className="h-6 w-6 text-red-500 ml-3" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Add-ons Section (Food Products) */}
        {product.productType === 'food' && product.addons && product.addons.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add-ons</h3>
            <div className="grid gap-3">
              {product.addons.map((addon) => {
                const isSelected = selectedAddons.some(a => a.id === addon.id);
                return (
                  <motion.button
                    key={addon.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleAddon(addon)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-300 hover:bg-red-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {addon.imageUrl ? (
                          <img
                            src={addon.imageUrl}
                            alt={addon.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                            {getAddonCategoryEmoji(addon.category)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{addon.name}</p>
                          {addon.description && (
                            <p className="text-sm text-gray-600">{addon.description}</p>
                          )}
                          <p className="text-xs text-gray-500 capitalize">
                            {addon.category || 'Add-on'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <p className="font-bold text-lg">+₦{addon.price.toLocaleString()}</p>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-red-500 bg-red-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <CheckIcon className="h-4 w-4 text-white" />}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity & Total */}
        <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Quantity</p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => updateQuantity(-1)}
                  disabled={quantity <= 1}
                  className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="text-2xl font-bold text-gray-900 min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => updateQuantity(1)}
                  className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Total Price</p>
              <motion.p 
                key={totalPrice}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="text-3xl font-bold text-red-600"
              >
                ₦{totalPrice.toLocaleString()}
              </motion.p>
            </div>
          </div>

          {/* Price Breakdown */}
          {(selectedAddons.length > 0 || (product.productType === 'market' && selectedVariant)) && (
            <div className="text-sm text-gray-600 space-y-1 border-t pt-3">
              <div className="flex justify-between">
                <span>Base Price:</span>
                <span>₦{(product.productType === 'market' && selectedVariant 
                  ? selectedVariant.price 
                  : product.basePrice).toLocaleString()}</span>
              </div>
              {selectedAddons.length > 0 && (
                <div className="flex justify-between">
                  <span>Add-ons ({selectedAddons.length}):</span>
                  <span>+₦{selectedAddons.reduce((sum, addon) => sum + addon.price, 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span>×{quantity}</span>
              </div>
            </div>
          )}
        </div>

        {/* Add to Cart Button */}
        <motion.button
          whileHover={{ scale: isAvailable ? 1.02 : 1 }}
          whileTap={{ scale: isAvailable ? 0.98 : 1 }}
          onClick={handleAddToCart}
          disabled={!isAvailable || isAddingToCart}
          className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all flex items-center justify-center space-x-3 ${
            isAvailable
              ? 'bg-red-500 text-white hover:bg-red-600 hover:shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <ShoppingCartIcon className="h-6 w-6" />
          <span>
            {!isAvailable 
              ? 'Not Available' 
              : isAddingToCart 
              ? 'Adding to Cart...' 
              : `Add to Cart - ₦${totalPrice.toLocaleString()}`
            }
          </span>
        </motion.button>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Free delivery on orders over ₦5,000</p>
          <p className="mt-1">🚚 Fast delivery • 🔒 Secure payment</p>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductPreview;