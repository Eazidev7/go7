/**
 * 🛍️ CUSTOMER MARKETPLACE - Browse All Vendor Products
 * 
 * This is the main customer-facing marketplace where users can:
 * - Browse products from ALL vendors
 * - Search across all vendor products
 * - Filter by categories
 * - Add to cart and checkout
 * - View vendor details for each product
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { Helmet } from 'react-helmet-async';
import { 
  ShoppingBag, 
  Search, 
  Star, 
  TrendingUp, 
  Package, 
  Clock,
  Filter,
  Grid,
  List,
  MapPin,
  Plus,
  Minus
} from 'lucide-react';
import {
  getTrendingVendors,
  getPopularProducts,
  getProductsByCategory,
  searchProductsGlobally
} from '../services/customerProductServiceV2';

const CustomerMarketplace = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  
  // State management
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [cart, setCart] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Categories
  const categories = [
    { id: 'all', name: 'All Products', icon: '🛍️' },
    { id: 'food', name: 'Food & Drinks', icon: '🍔' },
    { id: 'groceries', name: 'Groceries', icon: '🥬' },
    { id: 'fashion', name: 'Fashion', icon: '👗' },
    { id: 'electronics', name: 'Electronics', icon: '📱' },
    { id: 'health', name: 'Health & Beauty', icon: '💊' },
    { id: 'home', name: 'Home & Garden', icon: '🏠' },
    { id: 'books', name: 'Books & Media', icon: '📚' },
    { id: 'sports', name: 'Sports & Fitness', icon: '⚽' }
  ];

  // Load initial data
  useEffect(() => {
    loadMarketplaceData();
  }, [selectedCategory]);

  // Search handler
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      handleSearch();
    } else if (searchQuery.trim().length === 0) {
      loadMarketplaceData();
    }
  }, [searchQuery]);

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      
      if (selectedCategory === 'all') {
        // Load trending vendors and popular products
        const [vendorsResult, popularProducts] = await Promise.all([
          getTrendingVendors(20),
          getPopularProducts(50)
        ]);
        
        setVendors(vendorsResult.vendors);
        setProducts(popularProducts);
      } else {
        // Load products by category
        const categoryProducts = await getProductsByCategory(selectedCategory, 50);
        setProducts(categoryProducts);
        
        // Extract unique vendors from products
        const uniqueVendors = categoryProducts.reduce((acc, product) => {
          if (!acc.find(v => v.id === product.vendor.id)) {
            acc.push(product.vendor);
          }
          return acc;
        }, []);
        setVendors(uniqueVendors);
      }
    } catch (error) {
      console.error('Error loading marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const searchResults = await searchProductsGlobally(
        searchQuery, 
        selectedCategory === 'all' ? undefined : selectedCategory,
        50
      );
      setProducts(searchResults);
      
      // Extract unique vendors from search results
      const uniqueVendors = searchResults.reduce((acc, product) => {
        if (!acc.find(v => v.id === product.vendor.id)) {
          acc.push(product.vendor);
        }
        return acc;
      }, []);
      setVendors(uniqueVendors);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(prev => prev.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart(prev => [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || '',
        vendor: product.vendor,
        quantity: 1
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    navigate('/checkout', {
      state: {
        items: cart,
        total: cartTotal,
        serviceType: 'marketplace'
      }
    });
  };

  const goToVendorPage = (vendorId) => {
    navigate(`/vendor/${vendorId}`);
  };

  return (
    <>
      <Helmet>
        <title>Marketplace - Shop All Vendors | Go7</title>
        <meta name="description" content="Browse and shop products from all vendors in Abeokuta. Food, groceries, fashion, electronics and more." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-6">
          <h1 className="text-2xl font-bold mb-2">🛍️ Go7 Marketplace</h1>
          <p className="text-blue-100">Shop from all vendors in one place</p>
          
          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products across all vendors..."
              className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Stats */}
          <div className="mt-4 flex justify-between text-sm text-blue-100">
            <span>{vendors.length} Active Vendors</span>
            <span>{products.length} Products Available</span>
          </div>
        </div>

        {/* Categories & View Controls */}
        <div className="bg-white px-4 py-3 border-b">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800">Browse Categories</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading products...</span>
          </div>
        )}

        {/* Products Grid/List */}
        {!loading && (
          <div className="px-4 py-6">
            {products.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No products found</h3>
                <p className="text-gray-500">Try changing your search or category filter</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' 
                : 'space-y-4'
              }>
                {products.map(product => {
                  const inCart = cart.find(item => item.id === product.id);
                  
                  return (
                    <div 
                      key={product.id} 
                      className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
                        viewMode === 'list' ? 'flex' : ''
                      }`}
                    >
                      {/* Product Image */}
                      <div className={`relative ${viewMode === 'list' ? 'w-32 h-32' : 'aspect-square'}`}>
                        <img 
                          src={product.images?.[0] || '/api/placeholder/200/200'} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-full text-xs font-semibold">
                          ₦{product.price.toLocaleString()}
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                        <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h4>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                        
                        {/* Vendor Info */}
                        <div 
                          onClick={() => goToVendorPage(product.vendor.id)}
                          className="flex items-center gap-2 mb-3 cursor-pointer hover:text-blue-600 transition-colors"
                        >
                          <img 
                            src={product.vendor.profileImage || '/api/placeholder/24/24'} 
                            alt={product.vendor.businessName || product.vendor.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{product.vendor.businessName || product.vendor.name}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Star className="text-yellow-500" size={12} fill="currentColor" />
                              <span>{product.vendor.rating}</span>
                              <Clock size={12} />
                              <span>{product.vendor.deliveryTime}</span>
                            </div>
                          </div>
                        </div>

                        {/* Add to Cart */}
                        {inCart ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                                className="bg-gray-200 text-gray-700 w-8 h-8 rounded-full font-bold hover:bg-gray-300 flex items-center justify-center"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="font-bold w-8 text-center">{inCart.quantity}</span>
                              <button
                                onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                                className="bg-blue-600 text-white w-8 h-8 rounded-full font-bold hover:bg-blue-700 flex items-center justify-center"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                            <span className="text-sm font-semibold text-blue-600">
                              ₦{(inCart.quantity * product.price).toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                          >
                            Add to Cart
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Floating Cart Button */}
        {cartCount > 0 && (
          <div className="fixed bottom-20 left-0 right-0 px-4 z-50">
            <button
              onClick={handleCheckout}
              className="w-full bg-blue-600 text-white py-4 rounded-xl shadow-lg flex items-center justify-between px-6 hover:bg-blue-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="bg-white text-blue-600 font-bold px-3 py-1 rounded-full">{cartCount}</span>
                View Cart
              </span>
              <span className="font-bold">₦{cartTotal.toLocaleString()}</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CustomerMarketplace;