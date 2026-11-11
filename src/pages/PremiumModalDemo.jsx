import React, { useState } from 'react';
import PremiumAddonModal from '../components/PremiumAddonModal';

const PremiumModalDemo = () => {
  const [isModalOpen, setModalOpen] = useState(false);

  // Sample product data with rich addons
  const sampleProduct = {
    id: 'premium-demo-1',
    name: 'Jollof Rice Special',
    title: 'Jollof Rice Special',
    vendorName: 'Mama Cass Kitchen',
    rating: '4.8',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    price: 3500,
    basePrice: 3500,
    vendorId: 'mama-cass-123'
  };

  const sampleAddons = [
    {
      id: 'addon-1',
      name: 'Grilled Chicken',
      title: 'Grilled Chicken',
      price: 1500,
      unitLabel: 'piece',
      imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      category: 'protein',
      selectedQty: 0
    },
    {
      id: 'addon-2',
      name: 'Extra Plantain',
      title: 'Extra Plantain',
      price: 800,
      unitLabel: 'serving',
      imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      category: 'carbs',
      selectedQty: 0
    },
    {
      id: 'addon-3',
      name: 'Spicy Pepper Sauce',
      title: 'Spicy Pepper Sauce',
      price: 300,
      unitLabel: 'bottle',
      imageUrl: 'https://images.unsplash.com/photo-1583324113626-70df0f4deaab?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      category: 'spicy',
      selectedQty: 0
    },
    {
      id: 'addon-4',
      name: 'Fresh Coleslaw',
      title: 'Fresh Coleslaw',
      price: 600,
      unitLabel: 'serving',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      category: 'vegetable',
      selectedQty: 0
    },
    {
      id: 'addon-5',
      name: 'Cold Coke',
      title: 'Cold Coke',
      price: 400,
      unitLabel: 'bottle',
      imageUrl: 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      category: 'drinks',
      selectedQty: 0
    },
    {
      id: 'addon-6',
      name: 'Beef Chunks',
      title: 'Beef Chunks',
      price: 2000,
      unitLabel: 'portion',
      imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      category: 'protein',
      selectedQty: 0
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-8">
          🎨 Premium Add-On Modal Demo
        </h1>
        
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Experience the New Premium Modal
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Our new premium modal features rounded cards, beautiful thumbnails, 
              smooth animations, and an intuitive add-on selection interface with 
              real-time price calculation.
            </p>
            
            <button
              onClick={() => setModalOpen(true)}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              🚀 Open Premium Modal
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">✨ Features</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Soft shadows & rounded corners (28px)
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Thumbnail images for each add-on
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Interactive quantity controls
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Real-time total calculation
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Swipe-to-dismiss (mobile)
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Keyboard accessibility
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">🎯 Sample Add-Ons</h3>
            <div className="space-y-2 text-sm text-gray-600">
              {sampleAddons.map(addon => (
                <div key={addon.id} className="flex justify-between items-center py-1">
                  <span>{addon.title}</span>
                  <span className="font-semibold text-red-600">₦{addon.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Modal supports dark mode, high contrast, and reduced motion preferences</p>
        </div>
      </div>

      <PremiumAddonModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        product={sampleProduct}
        addons={sampleAddons}
        onAddToCart={() => {}}
      />
    </div>
  );
};

export default PremiumModalDemo;