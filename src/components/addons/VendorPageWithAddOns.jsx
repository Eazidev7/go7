import React, { useState, useEffect } from 'react';
import { AddOnCard, AddOnImageModal } from '../components/addons/AddOnCard';
import StickyCartBar from '../components/addons/StickyCartBar';
import { ToastContainer, useToasts } from '../components/addons/ToastNotifications';
import { motion } from 'framer-motion';
import { SparklesIcon, PlusIcon } from '@heroicons/react/24/solid';

const VendorPageWithAddOns = ({ vendorData }) => {
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [showAddOns, setShowAddOns] = useState(true);
  const { toasts, showSuccess, showError, removeToast } = useToasts();

  // Mock fetch add-ons for this vendor
  useEffect(() => {
    // Simulate fetching add-ons from Firebase based on vendor ID
    const mockAddOns = [
      {
        id: 1,
        vendorId: vendorData?.id,
        name: 'Extra Chicken Breast',
        description: 'Premium grilled chicken breast, perfectly seasoned',
        price: 2500,
        category: 'protein',
        images: ['/api/placeholder/300/300'],
        active: true
      },
      {
        id: 2,
        vendorId: vendorData?.id,
        name: 'Spicy Pepper Sauce',
        description: 'House-made scotch bonnet pepper sauce',
        price: 800,
        category: 'spicy',
        images: ['/api/placeholder/300/300'],
        active: true
      }
    ];
    setAddOns(mockAddOns);
  }, [vendorData?.id]);

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
    showSuccess('Checkout', 'Add-ons added to your main order!');
    // Here you would add the add-ons to the main order
  };

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (!addOns.length) return null;

  return (
    <div className="mt-8">
      {/* Add-ons Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <SparklesIcon className="w-6 h-6 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-900">Premium Add-ons</h2>
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
            {addOns.length} Available
          </span>
        </div>
        <button
          onClick={() => setShowAddOns(!showAddOns)}
          className="text-red-600 hover:text-red-800 transition-colors font-medium flex items-center gap-2"
        >
          {showAddOns ? 'Hide' : 'Show'} Add-ons
          <PlusIcon className={`w-4 h-4 transition-transform ${showAddOns ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {/* Add-ons List */}
      {showAddOns && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4 mb-8"
        >
          {addOns
            .filter(addon => addon.active)
            .map((addon, index) => (
              <motion.div
                key={addon.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
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
      )}

      {/* Premium Badge */}
      <div className="flex justify-center mb-6">
        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 px-6 py-2 rounded-full border border-orange-200 flex items-center gap-2">
          <SparklesIcon className="w-4 h-4" />
          <span className="font-medium">Enhanced dining experience</span>
        </div>
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

export default VendorPageWithAddOns;