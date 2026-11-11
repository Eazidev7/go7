import React, { useState } from 'react';
import { ShoppingBagIcon, MinusIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

const StickyCartBar = ({ cartItems, total, onCheckout, onUpdateQuantity, onRemove }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const itemCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  if (itemCount === 0) return null;

  return (
    <>
      {/* Overlay when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Sticky Cart Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        {/* Expanded Cart Items */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-white border-t border-gray-200 shadow-2xl max-h-96 overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Your Add-ons</h3>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Cart Items */}
                <div className="space-y-3">
                  {cartItems?.map((item, index) => (
                    <motion.div
                      key={`${item.id}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      {/* Item Info */}
                      <div className="flex items-center gap-3 flex-1">
                        <img
                          src={item.images?.[0] || `/api/placeholder/60/60?text=${encodeURIComponent(item.name)}`}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover"
                          onError={(e) => {
                            e.target.src = `/api/placeholder/60/60?text=${encodeURIComponent(item.name)}`;
                          }}
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm">{item.name}</h4>
                          <p className="text-gray-500 text-xs">₦{item.price}</p>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                        >
                          <MinusIcon className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="font-semibold text-gray-900 w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                        >
                          <PlusIcon className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => onRemove(item.id)}
                          className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Cart Bar */}
        <div
          className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 shadow-2xl cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'rgba(220, 38, 38, 0.95)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="flex items-center justify-between">
            {/* Left: Cart Info */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBagIcon className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 bg-white text-red-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              </div>
              <div>
                <p className="font-semibold">{itemCount} Add-on{itemCount !== 1 ? 's' : ''}</p>
                <p className="text-sm opacity-90">Tap to view details</p>
              </div>
            </div>

            {/* Right: Total & Checkout */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-lg font-bold">₦{total?.toLocaleString()}</p>
                <p className="text-xs opacity-90">Total</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckout();
                }}
                className="bg-white text-red-600 px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Checkout
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default StickyCartBar;