// 🚀 GO7 VENDOR PRODUCTS PAGE — V2 Product System (Nov 2025)
// Display vendor products with addons using vendors/{vendorId}/products structure

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useCartStore } from '../store/cartStore';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Plus, Minus, Star, Clock, MapPin } from 'lucide-react';

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {number} basePrice
 * @property {string} imageUrl
 * @property {string} description
 * @property {'unit'|'portion'|'bundle'|'weight'} measurementType
 * @property {boolean} isActive
 * @property {string} [category]
 * @property {string} vendorId
 * @property {Addon[]} [addons]
 */

/**
 * @typedef {Object} Addon
 * @property {string} id
 * @property {string} name
 * @property {number} price
 * @property {string} [description]
 * @property {string} [image]
 * @property {string} productId
 * @property {boolean} isActive
 */

/**
 * @typedef {Object} Vendor
 * @property {string} id
 * @property {string} name
 * @property {string} businessName
 * @property {string} image
 * @property {string} description
 * @property {number} rating
 * @property {string} deliveryTime
 * @property {string} deliveryFee
 * @property {string} address
 * @property {string} vendorType
 * @property {boolean} isOnline
 * @property {boolean} isActive
 */

/**
 * @typedef {Product & {quantity: number, selectedAddons: Addon[]}} CartItem
 */

const VendorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState([]);

  // V2 Product System: Fetch vendor and products
  const fetchVendorData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch vendor details
      const vendorDoc = await getDoc(doc(db, 'vendors', id));
      if (!vendorDoc.exists()) {
        setError('Vendor not found');
        return;
      }

      const vendorData = { id: vendorDoc.id, ...vendorDoc.data() };
      setVendor(vendorData);
      console.log('✅ Vendor loaded:', vendorData.businessName || vendorData.name);

      // Fetch products from vendors/{vendorId}/products
      console.log('🔍 Fetching products from: vendors/' + id + '/products');
      const productsQuery = query(
        collection(db, 'vendors', id, 'products'),
        where('isActive', '==', true)
        // Removed orderBy to avoid Firestore index requirement
        // Products will be sorted in memory below
      );
      const productsSnapshot = await getDocs(productsQuery);
      
      console.log(`📦 Found ${productsSnapshot.size} products for vendor ${id}`);
      
      if (productsSnapshot.empty) {
        console.warn('❌ No products found for vendor:', id);
        console.warn('💡 Products should be at: vendors/' + id + '/products');
        setProducts([]);
        return;
      }

      // Fetch addons for all products
      console.log('🎁 Fetching addons from: vendors/' + id + '/addons');
      const addonsQuery = query(
        collection(db, 'vendors', id, 'addons'),
        where('isActive', '==', true)
      );
      const addonsSnapshot = await getDocs(addonsQuery);
      
      console.log(`🎁 Found ${addonsSnapshot.size} addons for vendor ${id}`);
      
      const allAddons = addonsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Combine products with their addons
      const productsWithAddons = productsSnapshot.docs.map(doc => {
        const product = { id: doc.id, ...doc.data() };
        
        // Filter addons for this specific product
        const productAddons = allAddons.filter(addon => addon.productId === product.id);
        
        console.log(`Product: ${product.name} - Price: ₦${product.basePrice || product.price} - Addons: ${productAddons.length}`);
        
        return {
          ...product,
          addons: productAddons
        };
      }).sort((a, b) => (a.name || '').localeCompare(b.name || '')); // Sort in memory

      console.log('✅ Total products with addons loaded:', productsWithAddons.length);
      setProducts(productsWithAddons);
    } catch (err) {
      console.error('❌ Error fetching vendor data:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        vendorId: id
      });
      setError('Failed to load vendor data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorData();
  }, [id]);

  // Product selection and cart handlers
  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setProductQuantity(1);
    setSelectedAddons([]);
  };

  const handleAddonToggle = (addon) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) {
        return prev.filter(a => a.id !== addon.id);
      } else {
        return [...prev, addon];
      }
    });
  };

  const handleAddToCartWithAddons = () => {
    if (!selectedProduct) return;

    const cartItem = {
      ...selectedProduct,
      quantity: productQuantity,
      selectedAddons
    };

    addToCart(cartItem);
    setSelectedProduct(null);
    setProductQuantity(1);
    setSelectedAddons([]);
  };

  const calculateProductTotal = () => {
    if (!selectedProduct) return 0;
    const basePrice = selectedProduct.basePrice * productQuantity;
    const addonsPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0) * productQuantity;
    return basePrice + addonsPrice;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(price);
  };

  // Quick add to cart (without customization)
  const handleQuickAddToCart = (product) => {
    const cartItem = {
      ...product,
      quantity: 1,
      selectedAddons: []
    };
    addToCart(cartItem);
  };

  const getMeasurementLabel = (type) => {
    const labels = {
      portion: 'per portion',
      kg: 'per kg',
      bunch: 'per bunch',
      tuber: 'per tuber'
    };
    return labels[type] || 'each';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vendor products...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching from V2 product system</p>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏪</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Vendor not found'}
          </h1>
          <p className="text-gray-600 mb-6">
            Unable to load vendor data. Please try again.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => fetchVendorData()}
              className="block w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700"
            >
              Try Again
            </button>
            <button 
              onClick={() => navigate(-1)}
              className="block w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-red-600 font-medium mb-4 hover:text-red-700"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </button>
          
          <div className="flex items-start gap-4">
            <img 
              src={vendor.image || '/placeholder-vendor.png'}
              alt={vendor.name}
              className="w-24 h-24 rounded-xl object-cover shadow-md"
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {vendor.businessName || vendor.name}
              </h1>
              <p className="text-gray-600 mb-2">{vendor.vendorType}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                {vendor.rating && (
                  <div className="flex items-center gap-1">
                    <Star size={16} fill="#FFD700" color="#FFD700" />
                    <span>{vendor.rating.toFixed(1)}</span>
                  </div>
                )}
                {vendor.deliveryTime && (
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span>{vendor.deliveryTime}</span>
                  </div>
                )}
                {vendor.deliveryFee && (
                  <span>{vendor.deliveryFee}</span>
                )}
              </div>
              
              {vendor.address && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin size={14} />
                  <span>{vendor.address}</span>
                </div>
              )}
            </div>
            
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                vendor.isOnline 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  vendor.isOnline ? 'bg-green-500' : 'bg-red-500'
                }`} />
                {vendor.isOnline ? 'Open' : 'Closed'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
            {products.length} available
          </span>
        </div>
        
        {products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products available</h3>
            <p className="text-gray-600 mb-6">
              This vendor hasn't added any products yet.
            </p>
            <button 
              onClick={() => navigate(-1)}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700"
            >
              Browse Other Vendors
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                <div className="relative">
                  <img 
                    src={product.imageUrl || '/placeholder-product.png'}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                  {product.addons && product.addons.length > 0 && (
                    <div className="absolute top-3 right-3 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                      +{product.addons.length} addon{product.addons.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-bold text-red-600">
                      {formatPrice(product.basePrice)}
                      <span className="text-sm text-gray-500 font-normal ml-1">
                        {getMeasurementLabel(product.measurementType)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleQuickAddToCart(product)}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={16} />
                      Add to Cart
                    </button>
                    
                    {product.addons && product.addons.length > 0 && (
                      <button
                        onClick={() => handleProductClick(product)}
                        className="px-4 py-2 border border-red-600 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
                      >
                        Add extras
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Product Customization Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Add extras — {selectedProduct.name}</h3>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <img 
                src={selectedProduct.imageUrl || '/placeholder-product.png'}
                alt={selectedProduct.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              
              <p className="text-gray-600 mb-4">{selectedProduct.description}</p>
              
              {/* Quantity Selector */}
              <div className="flex items-center justify-between mb-6">
                <span className="font-medium">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-medium">{productQuantity}</span>
                  <button
                    onClick={() => setProductQuantity(productQuantity + 1)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              
              {/* Addons */}
              {selectedProduct.addons && selectedProduct.addons.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Add-ons</h4>
                  <div className="space-y-2">
                    {selectedProduct.addons.map((addon) => (
                      <label key={addon.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAddons.some(a => a.id === addon.id)}
                          onChange={() => handleAddonToggle(addon)}
                          className="w-4 h-4 text-red-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{addon.name}</div>
                          {addon.description && (
                            <div className="text-sm text-gray-600">{addon.description}</div>
                          )}
                        </div>
                        <div className="font-medium text-red-600">
                          +{formatPrice(addon.price)}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Total and Add to Cart */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-xl font-bold text-red-600">
                    {formatPrice(calculateProductTotal())}
                  </span>
                </div>
                
                <button
                  onClick={handleAddToCartWithAddons}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  Add to Cart
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default VendorPage;