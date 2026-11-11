import React, { useState, useEffect } from 'react';
import { AddOnCard, AddOnImageModal } from '../components/addons/AddOnCard';
import StickyCartBar from '../components/addons/StickyCartBar';
import { ToastContainer, useToasts } from '../components/addons/ToastNotifications';
import { motion } from 'framer-motion';
import { FireIcon, SparklesIcon } from '@heroicons/react/24/solid';

const AddOnSystemDemo = () => {
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toasts, showSuccess, showError, showInfo, removeToast } = useToasts();

  // Mock add-on data
  const [addOns, setAddOns] = useState([
    {
      id: 1,
      name: 'Extra Chicken Breast',
      description: 'Premium grilled chicken breast, perfectly seasoned and tender',
      price: 2500,
      category: 'protein',
      images: ['/api/placeholder/300/300', '/api/placeholder/300/300'],
      nutrition: 'High protein, low fat. 25g protein per serving.'
    },
    {
      id: 2,
      name: 'Jollof Rice Upgrade',
      description: 'Our signature jollof rice with extra spices and vegetables',
      price: 1500,
      category: 'carbs',
      images: ['/api/placeholder/300/300'],
      nutrition: 'Carbohydrates with vitamins from mixed vegetables.'
    },
    {
      id: 3,
      name: 'Spicy Pepper Sauce',
      description: 'House-made scotch bonnet pepper sauce for the brave',
      price: 800,
      category: 'spicy',
      images: ['/api/placeholder/300/300', '/api/placeholder/300/300', '/api/placeholder/300/300'],
      nutrition: 'Contains capsaicin. Very spicy - handle with care!'
    },
    {
      id: 4,
      name: 'Fresh Zobo Drink',
      description: 'Refreshing hibiscus drink with natural fruits and spices',
      price: 1200,
      category: 'drinks',
      images: ['/api/placeholder/300/300'],
      nutrition: 'Rich in vitamin C and antioxidants.'
    }
  ]);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
      showInfo('Add-ons Loaded', 'Premium add-ons are now available!');
    }, 2000);
  }, []);

  const handleAddToCart = (addon) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === addon.id);
      if (existingItem) {
        showSuccess('Updated Cart', `${addon.name} quantity increased`);
        return prev.map(item =>
          item.id === addon.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        showSuccess('Added to Cart', `${addon.name} added successfully`);
        return [...prev, { ...addon, quantity: 1 }];
      }
    });
  };

  const handleUpdateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(id);
      return;
    }
    
    setCartItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveFromCart = (id) => {
    const item = cartItems.find(item => item.id === id);
    setCartItems(prev => prev.filter(item => item.id !== id));
    showError('Removed from Cart', `${item?.name} removed`);
  };

  const handleCheckout = () => {
    showInfo('Checkout', 'Redirecting to payment...');
    // Here you would integrate with payment system
  };

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const getCategoryEmoji = (category) => {
    const emojis = {
      protein: '🍗',
      carbs: '🍚',
      spicy: '🌶️',
      drinks: '🥤'
    };
    return emojis[category] || '🍽️';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600 font-medium">Loading premium add-ons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <SparklesIcon className="w-8 h-8" />
            <h1 className="text-2xl font-bold">GO7 Ultra-Premium Add-Ons</h1>
          </motion.div>
          <p className="opacity-90">Enhance your meal with our premium add-ons</p>
        </div>
      </div>

      {/* Category Pills */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {['protein', 'carbs', 'spicy', 'drinks'].map((category) => (
            <motion.div
              key={category}
              whileHover={{ scale: 1.05 }}
              className="flex-shrink-0 bg-white px-4 py-2 rounded-full shadow-md border border-gray-200 flex items-center gap-2"
            >
              <span className="text-lg">{getCategoryEmoji(category)}</span>
              <span className="font-medium text-gray-700 capitalize">{category}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add-ons Grid */}
      <div className="max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {addOns.map((addon, index) => (
            <motion.div
              key={addon.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <AddOnCard
                addon={addon}
                onAddToCart={handleAddToCart}
                onImageClick={setSelectedAddon}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Trending Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 px-6 py-3 rounded-full border border-orange-200">
            <FireIcon className="w-5 h-5" />
            <span className="font-semibold">Most Popular Add-ons</span>
          </div>
        </motion.div>
      </div>

      {/* Components */}
      <AddOnImageModal
        addon={selectedAddon}
        isOpen={!!selectedAddon}
        onClose={() => setSelectedAddon(null)}
      />

      <StickyCartBar
        cartItems={cartItems}
        total={total}
        onCheckout={handleCheckout}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemoveFromCart}
      />

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default AddOnSystemDemo;