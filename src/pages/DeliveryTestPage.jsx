import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useDelivery } from '../contexts/DeliveryContext';
import SmartCheckout from '../components/SmartCheckout';
import DeliveryInfo from '../components/DeliveryInfo';

const DeliveryTestPage = () => {
  const navigate = useNavigate();
  const { addToCart, cart } = useCart();
  const { updateSelectedVendor } = useDelivery();

  // Sample vendor for testing
  const testVendor = {
    id: 1,
    name: 'Tasty Bites Test',
    coordinates: {
      lat: 7.3986,
      lng: 3.9093
    },
    image: '/burger-hero.png'
  };

  // Sample menu items
  const testItems = [
    {
      id: 1,
      name: 'Classic Burger',
      price: 2500,
      description: 'Juicy beef patty with lettuce, tomato, and cheese'
    },
    {
      id: 2,
      name: 'Chicken Wings (6pcs)',
      price: 3000,
      description: 'Crispy fried chicken wings with spicy sauce'
    },
    {
      id: 3,
      name: 'French Fries',
      price: 1500,
      description: 'Golden crispy fries with seasoning'
    },
    {
      id: 4,
      name: 'Milkshake',
      price: 2000,
      description: 'Creamy vanilla milkshake'
    }
  ];

  const handleAddToCart = (item) => {
    addToCart(item);
    // Set this vendor as selected when adding items
    updateSelectedVendor(testVendor);
  };

  const handleCheckout = (orderData) => {
    console.log('🛒 Proceeding to checkout with:', orderData);
    alert(`Order Total: ₦${orderData.total.toLocaleString()}\nDelivery Fee: ₦${orderData.deliveryFee.toLocaleString()}\nETA: ${orderData.deliveryInfo.eta?.formattedETA || 'N/A'}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Delivery Test</h1>
          <div className="flex items-center gap-2 text-[#E50914]">
            <ShoppingCart className="w-5 h-5" />
            <span className="font-semibold">{cart.length}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Menu Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{testVendor.name}</h2>
            <p className="text-gray-600 mb-4">Test restaurant for delivery calculations</p>
            
            {/* Delivery Info for this vendor */}
            <DeliveryInfo vendor={testVendor} showDetailed={false} className="mb-4" />
          </div>

          {/* Menu Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Menu Items</h3>
            <div className="space-y-4">
              {testItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-[#E50914] transition-colors">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    <p className="text-lg font-bold text-[#E50914] mt-2">₦{item.price.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="bg-[#E50914] text-white px-4 py-2 rounded-lg hover:bg-[#CC0812] transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Checkout Section */}
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <SmartCheckout onProceed={handleCheckout} />
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-6xl mx-auto p-4 mt-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">🧪 Testing Instructions:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>1. Select a delivery address using the header selector</li>
            <li>2. Add items to cart - delivery fee will calculate automatically</li>
            <li>3. Watch how delivery fee and ETA change based on your address</li>
            <li>4. Try different addresses to see radius restrictions</li>
            <li>5. Add ₦5000+ worth of items to see free delivery</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DeliveryTestPage;