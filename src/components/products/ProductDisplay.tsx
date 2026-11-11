import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, MinusIcon, ShoppingCartIcon, EyeIcon } from '@heroicons/react/24/solid';
import { ToastContainer, useToasts } from '../addons/ToastNotifications';
import productService, { Product, Addon, Variant } from '../../services/productServiceNew';

interface ProductDisplayProps {
  vendorId: string;
  onAddToCart: (item: any) => void;
}

interface CartItem {
  productId: string;
  productName: string;
  basePrice: number;
  selectedAddons: Addon[];
  selectedVariant?: Variant;
  quantity: number;
  totalPrice: number;
}

const ProductDisplay: React.FC<ProductDisplayProps> = ({ vendorId, onAddToCart }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [filter, setFilter] = useState<'all' | 'food' | 'market'>('all');
  
  const { toasts, showSuccess, showError, showInfo, removeToast } = useToasts();

  useEffect(() => {
    fetchProducts();
  }, [vendorId]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const vendorProducts = await productService.getVendorProducts(vendorId);
      setProducts(vendorProducts);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      showError('Load Failed', 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    if (filter === 'all') return true;
    return product.productType === filter;
  });

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setSelectedAddons(new Set());
    setSelectedVariant(product.variants?.[0] || null);
    setQuantity(1);
  };

  const handleAddonToggle = (addonId: string) => {
    const newSelectedAddons = new Set(selectedAddons);
    if (newSelectedAddons.has(addonId)) {
      newSelectedAddons.delete(addonId);
    } else {
      newSelectedAddons.add(addonId);
    }
    setSelectedAddons(newSelectedAddons);
  };

  const calculateTotalPrice = () => {
    if (!selectedProduct) return 0;
    
    let basePrice = selectedVariant ? selectedVariant.price : selectedProduct.basePrice;
    let addonsPrice = 0;
    
    if (selectedProduct.addons) {
      selectedProduct.addons.forEach(addon => {
        if (selectedAddons.has(addon.id)) {
          addonsPrice += addon.price;
        }
      });
    }
    
    return (basePrice + addonsPrice) * quantity;
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    
    const selectedAddonsList = selectedProduct.addons?.filter(addon => 
      selectedAddons.has(addon.id)
    ) || [];
    
    const cartItem: CartItem = {
      productId: selectedProduct.id!,
      productName: selectedProduct.name,
      basePrice: selectedVariant ? selectedVariant.price : selectedProduct.basePrice,
      selectedAddons: selectedAddonsList,
      selectedVariant: selectedVariant || undefined,
      quantity,
      totalPrice: calculateTotalPrice()
    };
    
    onAddToCart(cartItem);
    showSuccess('Added to Cart', `${selectedProduct.name} added successfully`);
    setSelectedProduct(null);
  };

  const ProductCard: React.FC<{ product: Product; index: number }> = ({ product, index }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      {/* Product Image */}
      <div className="relative h-48">
        <img
          src={product.imageUrl || `/api/placeholder/300/200?text=${encodeURIComponent(product.name)}`}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = `/api/placeholder/300/200?text=${encodeURIComponent(product.name)}`;
          }}
        />
        
        {/* Product Type Badge */}
        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-sm font-medium ${
          product.productType === 'food' 
            ? 'bg-orange-100 text-orange-800' 
            : 'bg-blue-100 text-blue-800'
        }`}>
          {product.productType === 'food' ? '🍽️ Food' : '🛒 Market'}
        </div>

        {/* Add-ons/Variants Indicator */}
        {((product.productType === 'food' && product.addons && product.addons.length > 0) ||
          (product.productType === 'market' && product.variants && product.variants.length > 0)) && (
          <div className="absolute top-3 right-3 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
            ✨ {product.productType === 'food' ? 'Add-ons' : 'Variants'}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.desc}</p>
        
        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xl font-bold text-gray-900">₦{product.basePrice.toLocaleString()}</span>
            {product.productType === 'market' && product.variants && product.variants.length > 1 && (
              <span className="text-sm text-gray-500 ml-1">starting from</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>📦</span>
            <span>{product.orderCount || 0} orders</span>
          </div>
        </div>

        {/* Category */}
        <div className="mb-4">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {product.category}
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={() => handleProductClick(product)}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
        >
          <EyeIcon className="w-5 h-5" />
          {product.productType === 'food' && product.addons && product.addons.length > 0
            ? 'Add extras'
            : product.productType === 'market' && product.variants && product.variants.length > 0
            ? 'Select Variant'
            : 'Add to Cart'
          }
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Our Products</h1>
          <p className="text-gray-600">Discover our delicious food and fresh market items</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6">
          {[
            { key: 'all', label: 'All Items', icon: '🍽️🛒' },
            { key: 'food', label: 'Food Items', icon: '🍽️' },
            { key: 'market', label: 'Market Items', icon: '🛒' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                filter === tab.key
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-md animate-pulse">
                <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">
              {filter === 'food' ? '🍽️' : filter === 'market' ? '🛒' : '📦'}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No {filter === 'all' ? '' : filter} products available
            </h3>
            <p className="text-gray-600">
              Check back later for new items!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}

        {/* Product Detail Modal */}
        <AnimatePresence>
          {selectedProduct && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedProduct(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Product Header */}
                <div className="relative">
                  <img
                    src={selectedProduct.imageUrl || `/api/placeholder/600/300?text=${encodeURIComponent(selectedProduct.name)}`}
                    alt={selectedProduct.name}
                    className="w-full h-64 object-cover rounded-t-3xl"
                  />
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>
                  <p className="text-gray-600 mb-4">{selectedProduct.desc}</p>

                  {/* Variants (for market items) */}
                  {selectedProduct.productType === 'market' && selectedProduct.variants && selectedProduct.variants.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Variant</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {selectedProduct.variants.map((variant) => (
                          <button
                            key={variant.id}
                            onClick={() => setSelectedVariant(variant)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                              selectedVariant?.id === variant.id
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-semibold text-gray-900">{variant.name}</h4>
                                {variant.description && (
                                  <p className="text-sm text-gray-600">{variant.description}</p>
                                )}
                                {variant.stock !== undefined && (
                                  <p className="text-xs text-gray-500">Stock: {variant.stock}</p>
                                )}
                              </div>
                              <span className="text-lg font-bold text-gray-900">
                                ₦{variant.price.toLocaleString()}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add-ons (for food items) */}
                  {selectedProduct.productType === 'food' && selectedProduct.addons && selectedProduct.addons.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Add-ons (Optional)</h3>
                      <div className="space-y-3">
                        {selectedProduct.addons.map((addon) => (
                          <div
                            key={addon.id}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                              selectedAddons.has(addon.id)
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleAddonToggle(addon.id)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-semibold text-gray-900">{addon.name}</h4>
                                {addon.description && (
                                  <p className="text-sm text-gray-600">{addon.description}</p>
                                )}
                                {addon.category && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full mt-1 inline-block">
                                    {addon.category}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-lg font-bold text-gray-900">
                                  +₦{addon.price.toLocaleString()}
                                </span>
                                <div className={`w-6 h-6 rounded-full border-2 mt-1 ml-auto flex items-center justify-center ${
                                  selectedAddons.has(addon.id)
                                    ? 'border-red-500 bg-red-500'
                                    : 'border-gray-300'
                                }`}>
                                  {selectedAddons.has(addon.id) && (
                                    <span className="text-white text-sm">✓</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity Selector */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Quantity</h3>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <MinusIcon className="w-5 h-5 text-gray-600" />
                      </button>
                      <span className="text-2xl font-bold text-gray-900 w-12 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <PlusIcon className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Total Price & Add to Cart */}
                  <div className="border-t pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold text-gray-900">Total Price:</span>
                      <span className="text-2xl font-bold text-red-600">
                        ₦{calculateTotalPrice().toLocaleString()}
                      </span>
                    </div>
                    
                    <button
                      onClick={handleAddToCart}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <ShoppingCartIcon className="w-6 h-6" />
                      Add to Cart - ₦{calculateTotalPrice().toLocaleString()}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default ProductDisplay;