// 🚀 GO7 PRODUCT MODAL — V2 Add-on System (Nov 2025)
// Premium product customization modal with V2 addon fetching

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useCart } from '../contexts/CartContext';
import { X, Plus, Minus, ShoppingCart, Star, Clock, Sparkles } from 'lucide-react';
import './ProductModalV2.css';

// TypeScript interfaces for V2 system
interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  imageUrl?: string;
  description: string;
  measurementType: 'portion' | 'kg' | 'bunch' | 'tuber';
  category?: string;
  rating?: number;
  preparationTime?: string;
}

interface Addon {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  productId: string;
  isActive: boolean;
  measurementType: 'piece' | 'portion' | 'tuber' | 'kg' | 'bunch';
  minQty: number;
  maxQty: number;
  category?: string;
}

interface SelectedAddon extends Addon {
  quantity: number;
}

interface ProductModalProps {
  product: Product;
  vendorId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({
  product,
  vendorId,
  isOpen,
  onClose
}) => {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [productQuantity, setProductQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { addToCart } = useCart();

  // Fetch addons from V2 system when modal opens
  useEffect(() => {
    if (!isOpen || !vendorId || !product.id) return;

    const fetchAddons = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch addons from NEW V2 path: vendors/{vendorId}/products/{productId}/addons
        console.log(`🔍 Fetching addons from: vendors/${vendorId}/products/${product.id}/addons`);
        
        const addonsRef = collection(db, `vendors/${vendorId}/products/${product.id}/addons`);
        const addonsSnapshot = await getDocs(addonsRef);
        
        const fetchedAddons: Addon[] = addonsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            price: data.price || 0,
            description: data.description,
            imageUrl: data.imageUrl || data.image,
            measurementType: data.measurementType || 'piece',
            minQty: data.minQty || 1,
            maxQty: data.maxQty || 10,
            isActive: data.isActive !== false,
            productId: product.id
          } as Addon;
        });
        
        console.log(`✅ Found ${fetchedAddons.length} addons for product ${product.id}`);

        setAddons(fetchedAddons);
      } catch (err) {
        console.error('Error fetching addons:', err);
        setError('Failed to load add-ons');
      } finally {
        setLoading(false);
      }
    };

    fetchAddons();
  }, [isOpen, vendorId, product.id]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAddons([]);
      setProductQuantity(1);
      setError(null);
    }
  }, [isOpen]);

  // Handle addon selection
  const handleAddonAdd = (addon: Addon) => {
    setSelectedAddons(prev => {
      const existing = prev.find(item => item.id === addon.id);
      if (existing) {
        const maxQty = addon.maxQty || 10;
        if (existing.quantity < maxQty) {
          return prev.map(item =>
            item.id === addon.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return prev;
      } else {
        return [...prev, { ...addon, quantity: 1 }];
      }
    });
  };

  // Handle addon quantity change
  const handleAddonQuantityChange = (addonId: string, delta: number) => {
    setSelectedAddons(prev => {
      return prev.map(item => {
        if (item.id === addonId) {
          const minQty = item.minQty || 1;
          const maxQty = item.maxQty || 10;
          const newQuantity = Math.max(0, Math.min(maxQty, item.quantity + delta));
          
          return newQuantity === 0 
            ? null 
            : { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean) as SelectedAddon[];
    });
  };

  // Calculate totals
  const baseTotal = product.price * productQuantity;
  const addonsTotal = selectedAddons.reduce(
    (sum, addon) => sum + (addon.price * addon.quantity), 
    0
  ) * productQuantity;
  const grandTotal = baseTotal + addonsTotal;

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(price);
  };

  // Handle add to cart
  const handleAddToCart = () => {
    try {
      console.log('🛒 MODAL: Adding product to cart with customization');
      console.log('🛒 MODAL: Product:', product);
      console.log('🛒 MODAL: Product quantity:', productQuantity);
      console.log('🛒 MODAL: Selected addons:', selectedAddons);
      console.log('🛒 MODAL: Grand total:', grandTotal);
      console.log('🛒 MODAL: Product price:', product.price);
      
      const cartItem = {
        vendorId: vendorId,
        productId: product.id,
        title: product.name,
        price: grandTotal, // Use grand total including addons
        imageUrl: product.imageUrl || product.image,
        quantity: productQuantity,
        options: {
          description: product.description || '',
          measurementType: product.measurementType || 'portion',
          addons: selectedAddons.map(addon => `${addon.name} (x${addon.quantity})`).join(', ')
        }
      };
      
      console.log('🛒 MODAL: Mapped cart item:', cartItem);
      console.log('🛒 MODAL: Cart item price:', cartItem.price);
      console.log('🛒 MODAL: Cart item quantity:', cartItem.quantity);

      addToCart(cartItem);
      
      console.log('✅ MODAL: Item added to cart successfully');
      onClose();
    } catch (error) {
      console.error('❌ MODAL: Error adding to cart:', error);
      console.error('❌ MODAL: Error details:', { product, productQuantity, selectedAddons, grandTotal, vendorId });
    }
  };

  // Get measurement label
  const getMeasurementLabel = (type: string) => {
    const labels: Record<string, string> = {
      portion: 'per portion',
      kg: 'per kg',
      bunch: 'per bunch',
      tuber: 'per tuber'
    };
    return labels[type] || 'each';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-60 product-modal-backdrop flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden product-modal-card fade-in-up"
        >
          {/* Header */}
          <div className="relative">
            <img 
              src={product.imageUrl || product.image || '/placeholder-product.png'}
              alt={product.name}
              className="w-full h-64 object-cover"
            />
            <div className="absolute top-4 right-4">
              <button
                onClick={onClose}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Product badge */}
            <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 px-4 py-2 rounded-full">
              <div className="flex items-center gap-2">
                {product.rating && (
                  <div className="flex items-center gap-1">
                    <Star size={14} fill="#FFD700" color="#FFD700" />
                    <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
                  </div>
                )}
                {product.preparationTime && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock size={14} />
                    <span className="text-sm">{product.preparationTime}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-16rem)] product-modal-content">
            {/* Product Info */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
              <p className="text-gray-600 mb-4">{product.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold price-display">
                  {formatPrice(product.price)}
                  <span className="text-sm text-gray-500 font-normal ml-1">
                    {getMeasurementLabel(product.measurementType)}
                  </span>
                </div>
                
                {/* Product Quantity */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Quantity:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center quantity-btn"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-semibold">{productQuantity}</span>
                    <button
                      onClick={() => setProductQuantity(productQuantity + 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center quantity-btn"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Add-ons Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Add Extras
                </h3>
                  {addons.length > 0 && (
                  <span className="premium-badge text-white px-2 py-1 rounded-full text-xs font-medium">
                    {addons.length} available
                  </span>
                )}
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading add-ons...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600 mb-2">{error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="text-red-600 hover:text-red-700 font-medium"
                  >
                    Try Again
                  </button>
                </div>
              ) : addons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No add-ons available for this product</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addons.map((addon) => {
                    const selectedAddon = selectedAddons.find(item => item.id === addon.id);
                    const quantity = selectedAddon?.quantity || 0;
                    const maxQty = addon.maxQty || 1;

                    return (
                      <motion.div
                        key={addon.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`addon-card bg-gray-50 rounded-xl p-4 flex items-center gap-4 ${quantity > 0 ? 'selected selected-addon-glow' : ''}`}
                      >
                        <img 
                          src={addon.imageUrl || '/placeholder-addon.jpg'}
                          alt={addon.name}
                          className="w-16 h-16 object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-addon.jpg';
                          }}
                        />
                        
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{addon.name}</h4>
                          {addon.description && (
                            <p className="text-sm text-gray-600 mt-1">{addon.description}</p>
                          )}
                          <div className="text-lg font-bold price-display mt-2">
                            +{formatPrice(addon.price)}
                            {addon.measurementType && addon.measurementType !== 'piece' && (
                              <span className="text-xs text-gray-500 ml-1">/{addon.measurementType}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {quantity === 0 ? (
                            <button
                              onClick={() => handleAddonAdd(addon)}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              Add
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAddonQuantityChange(addon.id, -1)}
                                className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center border quantity-btn"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center font-semibold">{quantity}</span>
                              <button
                                onClick={() => handleAddonQuantityChange(addon.id, 1)}
                                disabled={quantity >= maxQty}
                                className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white flex items-center justify-center quantity-btn"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Add-ons Summary */}
            {selectedAddons.length > 0 && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Selected Add-ons</h4>
                <div className="space-y-2">
                  {selectedAddons.map((addon) => (
                    <div key={addon.id} className="flex justify-between items-center text-sm">
                      <span>{addon.name} × {addon.quantity}</span>
                      <span className="font-semibold">
                        {formatPrice(addon.price * addon.quantity * productQuantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-600">Total</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatPrice(grandTotal)}
                </div>
                {selectedAddons.length > 0 && (
                  <div className="text-xs text-gray-500">
                    Base: {formatPrice(baseTotal)} + Add-ons: {formatPrice(addonsTotal * productQuantity)}
                  </div>
                )}
              </div>
              
              <button
                onClick={handleAddToCart}
                className="add-to-cart-btn text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2"
              >
                <ShoppingCart size={18} />
                Add to Cart
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProductModal;