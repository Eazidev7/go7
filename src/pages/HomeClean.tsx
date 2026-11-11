
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import LiveAreasMap from '../components/maps/LiveAreasMap';
import Hero from '../components/Hero';

// Mock data with error handling - using dynamic import instead of require
let mockData: any = {};
try {
  // Use static fallback data instead of dynamic require
  mockData = {
    vendors: [],
    categories: [],
    // Add default mock data structure here
  };
} catch (error) {
  console.warn('Mock data not found, using fallback data:', (error as Error).message);
}

const Home = () => {
  const navigate = useNavigate();
  const [distance, setDistance] = useState(5);
  const [deliveryType, setDeliveryType] = useState('standard');

  // Fallback data
  const foodVendors = mockData.foodVendors || [
    { id: 1, name: "Mama's Kitchen", rating: 4.8, image: "/burger-hero.png", cuisine: "Nigerian" },
    { id: 2, name: "Fresh Mart", rating: 4.6, image: "/burger-hero.png", cuisine: "Groceries" },
    { id: 3, name: "Spice Corner", rating: 4.9, image: "/burger-hero.png", cuisine: "Indian" },
    { id: 4, name: "Pizza Palace", rating: 4.7, image: "/burger-hero.png", cuisine: "Italian" },
  ];

  const localMarkets = mockData.localMarkets || [
    { id: 'oke-ado', name: 'Oke Ado Market', image: '/burger-hero.png', priceFrom: 500 },
    { id: 'lafunwa', name: 'Lafunwa Market', image: '/burger-hero.png', priceFrom: 300 },
    { id: 'kuto', name: 'Kuto Market', image: '/burger-hero.png', priceFrom: 400 },
    { id: 'itoku', name: 'Itoku Market', image: '/burger-hero.png', priceFrom: 350 },
  ];

  const calculateFare = () => {
    const baseFare = 500;
    const distanceFare = distance * 80;
    const typeFare = deliveryType === 'express' ? 200 : 0;
    return baseFare + distanceFare + typeFare;
  };

  // Food Vendors Section Component
  const FoodVendorsSection = () => (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">🍔 Popular Food Vendors</h2>
          <p className="text-gray-600">Order from your favorite local restaurants</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {foodVendors.map((vendor: any) => (
            <div key={vendor.id} className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
              <img 
                src={vendor.image} 
                alt={vendor.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">{vendor.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{vendor.cuisine}</p>
                <div className="flex items-center mb-4">
                  <span className="text-yellow-500">⭐</span>
                  <span className="text-gray-600 ml-1 text-sm">{vendor.rating}</span>
                </div>
                <button 
                  onClick={() => navigate('/book')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  style={{ backgroundColor: '#E5362D' }}
                >
                  Order Food
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // Local Markets Section Component
  const LocalMarketsSection = () => (
    <section className="py-16" style={{ backgroundColor: '#FFF4F2' }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">🏪 Local Markets</h2>
          <p className="text-gray-600">Shop from local markets with delivery</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {localMarkets.map((market: any) => (
            <div key={market.id} className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
              <img 
                src={market.image} 
                alt={market.name}
                className="w-full h-32 object-cover"
              />
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{market.name}</h3>
                <p className="text-green-600 font-medium mb-4">From ₦{market.priceFrom.toLocaleString()}</p>
                <button 
                  onClick={() => navigate('/book')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Shop Now
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-8 text-center">
            <div className="text-4xl mb-4">🚚</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Courier Delivery</h3>
            <p className="text-gray-600">Fast and reliable delivery service for all your needs</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-8 text-center">
            <div className="text-4xl mb-4">🔋</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Powerbank & Station Rentals</h3>
            <p className="text-gray-600">Rent powerbanks and charging stations on demand</p>
          </div>
        </div>
      </div>
    </section>
  );

  // Pricing & Fare Calculator Section Component
  const PricingAndFareSection = () => (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">💰 Pricing & Fare Calculator</h2>
          <p className="text-gray-600">Choose your delivery option and calculate fare</p>
        </div>
        
        {/* Delivery Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-8 text-center hover:shadow-md transition-shadow duration-300">
            <div className="text-4xl mb-4">🚴‍♂️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Standard Delivery</h3>
            <p className="text-gray-600 mb-4">2-3 hours delivery time</p>
            <p className="text-2xl font-bold" style={{ color: '#E5362D' }}>₦500+</p>
            <p className="text-sm text-gray-500">Base rate</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-8 text-center hover:shadow-md transition-shadow duration-300">
            <div className="text-4xl mb-4">🏍️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Express Delivery</h3>
            <p className="text-gray-600 mb-4">30-60 minutes delivery</p>
            <p className="text-2xl font-bold" style={{ color: '#E5362D' }}>₦700+</p>
            <p className="text-sm text-gray-500">+₦200 surcharge</p>
          </div>
        </div>

        {/* Fare Calculator */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Calculate Your Fare</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distance: {distance}km
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={distance}
                  onChange={(e) => setDistance(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: '#E5362D' }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1km</span>
                  <span>50km</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Type
                </label>
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="standard">Standard (2-3 hours)</option>
                  <option value="express">Express (+₦200)</option>
                </select>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold mb-2" style={{ color: '#E5362D' }}>
                ₦{calculateFare().toLocaleString()}
              </div>
              <p className="text-gray-600 mb-6">Estimated delivery cost</p>
              <button 
                onClick={() => navigate('/book')}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200"
                style={{ backgroundColor: '#E5362D' }}
              >
                Book Delivery Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>GO7 Delivery - Fast & Reliable Delivery Service</title>
        <meta name="description" content="GO7 offers fast, reliable delivery services across Nigeria. Order food, shop markets, and get your items delivered quickly." />
      </Helmet>

      {/* Hero Section */}
      <Hero 
        title="Fast & Reliable Delivery" 
        description="Order food, shop markets, and get your items delivered quickly across Nigeria"
      />

      {/* Live Areas Map */}
      <div className="map-container" style={{ height: '420px', width: '100%', margin: '20px 0' }}>
        {LiveAreasMap && <LiveAreasMap />}
      </div>

      {/* Food Vendors Section */}
      <FoodVendorsSection />

      {/* Local Markets Section */}
      <LocalMarketsSection />

      {/* Pricing & Fare Calculator Section */}
      <PricingAndFareSection />
    </div>
  );
};

export default Home;
