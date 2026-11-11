import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { Helmet } from 'react-helmet-async';
import FareDisplay from '../components/FareDisplay';
import { MapPin, Clock, Star, TrendingUp, Search, Filter } from 'lucide-react';

/**
 * 🍔 RESTAURANTS PAGE - Food Delivery Service
 * Service Type: 'restaurant'
 * Features:
 * - Browse nearby restaurants
 * - View menus and prices
 * - Dynamic delivery fee (flat ₦700 for ≤3km)
 * - Cart management
 * - Unified checkout integration
 */

const RestaurantsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userLocation, setUserLocation] = useState({ lat: 7.1475, lng: 3.3619 });
  const [cart, setCart] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  // Mock restaurants data (replace with Firebase query)
  const restaurants = [
    {
      id: 'rest1',
      name: 'Mama Put Restaurant',
      category: 'nigerian',
      rating: 4.5,
      deliveryTime: '20-30 min',
      location: { lat: 7.1550, lng: 3.3500 },
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
      menu: [
        { id: 1, name: 'Jollof Rice & Chicken', price: 2500, image: '' },
        { id: 2, name: 'Fried Rice', price: 2000, image: '' },
        { id: 3, name: 'Pounded Yam & Egusi', price: 3000, image: '' },
      ]
    },
    {
      id: 'rest2',
      name: 'Amala Spot',
      category: 'nigerian',
      rating: 4.8,
      deliveryTime: '15-25 min',
      location: { lat: 7.1600, lng: 3.3450 },
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
      menu: [
        { id: 4, name: 'Amala & Ewedu', price: 1500, image: '' },
        { id: 5, name: 'Gbegiri & Ewedu', price: 1800, image: '' },
      ]
    },
    {
      id: 'rest3',
      name: 'Pizza Palace',
      category: 'fast-food',
      rating: 4.2,
      deliveryTime: '25-35 min',
      location: { lat: 7.1480, lng: 3.3620 },
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
      menu: [
        { id: 6, name: 'Pepperoni Pizza', price: 4500, image: '' },
        { id: 7, name: 'Chicken Supreme', price: 5000, image: '' },
      ]
    },
  ];

  const categories = [
    { id: 'all', name: 'All', icon: '🍽️' },
    { id: 'nigerian', name: 'Nigerian', icon: '🍲' },
    { id: 'fast-food', name: 'Fast Food', icon: '🍔' },
    { id: 'chinese', name: 'Chinese', icon: '🥡' },
    { id: 'pizza', name: 'Pizza', icon: '🍕' },
  ];

  // Default delivery location (Abeokuta center). User can update via the location selector.

  const addToCart = (restaurant, item) => {
    setCart(prev => [...prev, { ...item, restaurantId: restaurant.id, restaurantName: restaurant.name }]);
    setSelectedRestaurant(restaurant);
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
  const cartCount = cart.length;

  const filteredRestaurants = restaurants.filter(r => 
    (selectedCategory === 'all' || r.category === selectedCategory) &&
    (searchQuery === '' || r.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCheckout = () => {
    if (!selectedRestaurant || cart.length === 0) return;
    
    navigate('/checkout', {
      state: {
        serviceType: 'restaurant',
        itemsTotal: cartTotal,
        items: cart,
        vendor: selectedRestaurant,
        pickup: selectedRestaurant.location,
        dropoff: userLocation
      }
    });
  };

  return (
    <>
      <Helmet>
        <title>Restaurants - Food Delivery | Go7</title>
        <meta name="description" content="Order food from your favorite restaurants in Abeokuta" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-6">
          <h1 className="text-2xl font-bold mb-2">🍔 Restaurants</h1>
          <p className="text-red-100">Delicious meals delivered to your doorstep</p>
          
          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restaurants..."
              className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-300"
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
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Restaurants List */}
        <div className="px-4 py-6 space-y-4">
          {filteredRestaurants.map(restaurant => (
            <div key={restaurant.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Restaurant Header */}
              <div className="relative">
                <img 
                  src={restaurant.image} 
                  alt={restaurant.name}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <Star className="text-yellow-500" size={16} fill="currentColor" />
                  {restaurant.rating}
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900">{restaurant.name}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {restaurant.deliveryTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    Nearby
                  </span>
                </div>

                {/* Menu Items */}
                <div className="mt-4 space-y-3">
                  {restaurant.menu.map(item => (
                    <div key={item.id} className="flex items-center justify-between border-t pt-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{item.name}</h4>
                        <p className="text-red-600 font-bold mt-1">₦{item.price.toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => addToCart(restaurant, item)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {filteredRestaurants.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No restaurants found</p>
            </div>
          )}
        </div>

        {/* Floating Cart Button */}
        {cartCount > 0 && (
          <div className="fixed bottom-20 left-0 right-0 px-4">
            <button
              onClick={handleCheckout}
              className="w-full bg-red-600 text-white py-4 rounded-xl shadow-lg flex items-center justify-between px-6 hover:bg-red-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="bg-white text-red-600 font-bold px-2 py-1 rounded">{cartCount}</span>
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

export default RestaurantsPage;
