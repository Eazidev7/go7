import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { Helmet } from 'react-helmet-async';
import { ShoppingBag, Search, Star, TrendingUp, Package, Clock, Loader2 } from 'lucide-react';
import { getTrendingVendors, getVendorProductsForCustomer, searchProductsGlobally } from '../services/customerProductServiceV2';

/**
 * 🛍️ SHOPS PAGE - Retail Shopping Service
 * Service Type: 'vendor'
 * Features:
 * - Browse local shops and vendors
 * - Product categories (fashion, electronics, home, etc.)
 * - Cart management
 * - Dynamic delivery pricing
 * - Unified checkout integration
 */

const ShopsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userLocation, setUserLocation] = useState({ lat: 7.1475, lng: 3.3619 });
  const [cart, setCart] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  
  // Real vendor data from Firebase
  const [vendors, setVendors] = useState([]);
  const [vendorProducts, setVendorProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);

  const categories = [
    { id: 'all', name: 'All Shops', icon: '🏪' },
    { id: 'food', name: 'Food', icon: '🍽️' },
    { id: 'fashion', name: 'Fashion', icon: '👗' },
    { id: 'electronics', name: 'Electronics', icon: '📱' },
    { id: 'home', name: 'Home & Garden', icon: '🏠' },
    { id: 'beauty', name: 'Beauty & Health', icon: '💄' },
    { id: 'grocery', name: 'Grocery', icon: '🛒' }
  ];

  // Fetch vendors and their products
  useEffect(() => {
    const fetchVendorsAndProducts = async () => {
      try {
        setLoading(true);
        
        // Get trending vendors (those with active products)
        const { vendors: trendingVendors } = await getTrendingVendors(50);
        setVendors(trendingVendors);

        // Fetch products for each vendor
        const productsData = {};
        for (const vendor of trendingVendors) {
          try {
            const products = await getVendorProductsForCustomer(vendor.id, undefined, 20);
            productsData[vendor.id] = products;
          } catch (error) {
            console.error(`Error fetching products for vendor ${vendor.id}:`, error);
            productsData[vendor.id] = [];
          }
        }
        
        setVendorProducts(productsData);
      } catch (error) {
        console.error('Error fetching vendors and products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorsAndProducts();
  }, []);

  // Default delivery location (Abeokuta center). User can update via the location selector.

  // Handle search
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim()) {
        try {
          const results = await searchProductsGlobally(searchQuery, selectedCategory !== 'all' ? selectedCategory : undefined, 50);
          setSearchResults(results);
        } catch (error) {
          console.error('Error searching products:', error);
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedCategory]);

  const addToCart = (vendor, product) => {
    setCart(prev => [...prev, { 
      ...product, 
      vendorId: vendor.id, 
      vendorName: vendor.businessName || vendor.name,
      quantity: 1
    }]);
    setSelectedShop(vendor);
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

  // Filter vendors based on category and search
  const filteredVendors = vendors.filter(vendor => {
    const matchesCategory = selectedCategory === 'all' || vendor.categories.includes(selectedCategory);
    const matchesSearch = searchQuery === '' || vendor.name.toLowerCase().includes(searchQuery.toLowerCase());
    const hasProducts = vendorProducts[vendor.id] && vendorProducts[vendor.id].length > 0;
    
    return matchesCategory && matchesSearch && hasProducts;
  });

  const handleCheckout = () => {
    if (!selectedShop || cart.length === 0) return;
    
    // Calculate distance for delivery fee
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.asin(Math.sqrt(a));
      return R * c;
    };

    const shopLocation = {
      lat: selectedShop.location.coordinates.latitude,
      lng: selectedShop.location.coordinates.longitude
    };

    const distance = userLocation 
      ? calculateDistance(shopLocation.lat, shopLocation.lng, userLocation.lat, userLocation.lng)
      : 0;
    
    navigate('/checkout', {
      state: {
        serviceType: 'vendor',
        itemsTotal: cartTotal,
        items: cart,
        vendor: selectedShop,
        pickup: shopLocation,
        dropoff: userLocation
      }
    });
  };

  return (
    <>
      <Helmet>
        <title>Shops - Retail Shopping | Go7</title>
        <meta name="description" content="Shop from local vendors and get items delivered in Abeokuta" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-6">
          <h1 className="text-2xl font-bold mb-2">🛍️ Shops</h1>
          <p className="text-purple-100">Shop local, delivered fast</p>
          
          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shops and products..."
              className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white px-4 py-3 overflow-x-auto">
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-purple-600 text-white'
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
            <Loader2 className="animate-spin text-purple-600" size={32} />
            <span className="ml-2 text-gray-600">Loading vendors...</span>
          </div>
        )}

        {/* Search Results */}
        {!loading && searchQuery && searchResults.length > 0 && (
          <div className="px-4 py-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Search Results for "{searchQuery}"
            </h2>
            <div className="space-y-3">
              {searchResults.map(product => {
                const inCart = cart.find(item => item.id === product.id);
                
                return (
                  <div key={`${product.vendor.id}-${product.id}`} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{product.vendor.businessName || product.vendor.name}</p>
                        <p className="text-purple-600 font-bold mt-1">₦{product.price.toLocaleString()}</p>
                        {product.stockQuantity !== undefined && (
                          <p className="text-xs text-gray-500 mt-1">
                            <Package size={12} className="inline mr-1" />
                            {product.stockQuantity} in stock
                          </p>
                        )}
                      </div>
                      
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                            className="bg-gray-200 text-gray-700 w-8 h-8 rounded-full font-bold hover:bg-gray-300"
                          >
                            -
                          </button>
                          <span className="font-bold w-8 text-center">{inCart.quantity}</span>
                          <button
                            onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                            className="bg-purple-600 text-white w-8 h-8 rounded-full font-bold hover:bg-purple-700"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product.vendor, product)}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vendors List */}
        {!loading && (!searchQuery || searchResults.length === 0) && (
          <div className="px-4 py-6 space-y-4">
            {filteredVendors.map(vendor => {
              const products = vendorProducts[vendor.id] || [];
              
              return (
                <div key={vendor.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Vendor Header */}
                  <div className="relative">
                    <img 
                      src={vendor.profileImage || 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'} 
                      alt={vendor.name}
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Star className="text-yellow-500" size={16} fill="currentColor" />
                      {vendor.rating}
                    </div>
                    {!vendor.isOnline && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                        Offline
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900">{vendor.businessName || vendor.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {vendor.deliveryTime}
                      </span>
                      <span>₦{vendor.deliveryFee} delivery</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{vendor.location.address}</p>

                    {/* Products */}
                    <div className="mt-4 space-y-3">
                      {products.slice(0, 5).map(product => {
                        const inCart = cart.find(item => item.id === product.id);
                        
                        return (
                          <div key={product.id} className="flex items-center justify-between border-t pt-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{product.name}</h4>
                              <p className="text-purple-600 font-bold mt-1">₦{product.price.toLocaleString()}</p>
                              {product.stockQuantity !== undefined && (
                                <p className="text-xs text-gray-500 mt-1">
                                  <Package size={12} className="inline mr-1" />
                                  {product.stockQuantity} in stock
                                </p>
                              )}
                            </div>
                            
                            {inCart ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                                  className="bg-gray-200 text-gray-700 w-8 h-8 rounded-full font-bold hover:bg-gray-300"
                                >
                                  -
                                </button>
                                <span className="font-bold w-8 text-center">{inCart.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                                  className="bg-purple-600 text-white w-8 h-8 rounded-full font-bold hover:bg-purple-700"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(vendor, product)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                                disabled={!vendor.isOnline}
                              >
                                Add
                              </button>
                            )}
                          </div>
                        );
                      })}
                      
                      {products.length > 5 && (
                        <div className="text-center pt-2">
                          <p className="text-sm text-gray-500">
                            +{products.length - 5} more products
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {!loading && filteredVendors.length === 0 && !searchQuery && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No vendors found</p>
                <p className="text-gray-400 text-sm mt-1">Try selecting a different category</p>
              </div>
            )}

            {!loading && searchQuery && searchResults.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No products found for "{searchQuery}"</p>
                <p className="text-gray-400 text-sm mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}

        {/* Floating Cart Button */}
        {cartCount > 0 && (
          <div className="fixed bottom-20 left-0 right-0 px-4">
            <button
              onClick={handleCheckout}
              className="w-full bg-purple-600 text-white py-4 rounded-xl shadow-lg flex items-center justify-between px-6 hover:bg-purple-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="bg-white text-purple-600 font-bold px-2 py-1 rounded">{cartCount}</span>
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

export default ShopsPage;
