import React, { useState, useEffect } from 'react';
import { PlusIcon, MinusIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

const AddOnCard = ({ addon, onAddToCart, onImageClick }) => {
  const getCategoryColor = (category) => {
    const colors = {
      protein: 'from-emerald-100 to-green-200 border-green-300',
      carbs: 'from-amber-100 to-yellow-200 border-yellow-300',
      spicy: 'from-red-100 to-rose-200 border-red-300',
      drinks: 'from-blue-100 to-cyan-200 border-blue-300',
      default: 'from-gray-100 to-gray-200 border-gray-300'
    };
    return colors[category] || colors.default;
  };

  const getCategoryBadgeColor = (category) => {
    const colors = {
      protein: 'bg-green-500 text-white',
      carbs: 'bg-yellow-500 text-white',
      spicy: 'bg-red-500 text-white',
      drinks: 'bg-blue-500 text-white',
      default: 'bg-gray-500 text-white'
    };
    return colors[category] || colors.default;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-gradient-to-r ${getCategoryColor(addon.category)} backdrop-blur-sm border rounded-2xl p-4 mb-3 shadow-lg hover:shadow-xl transition-all duration-300`}
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}
    >
      {/* Category Badge */}
      <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${getCategoryBadgeColor(addon.category)}`}>
        {addon.category}
      </div>

      <div className="flex items-center justify-between">
        {/* Left: Content */}
        <div className="flex-1 pr-4 pt-6">
          <h3 className="font-bold text-gray-900 text-lg mb-2">{addon.name}</h3>
          <p className="text-gray-600 text-sm mb-3 leading-relaxed">{addon.description}</p>
          
          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-gray-900">+ ₦{addon.price}</span>
            
            {/* Add Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAddToCart(addon)}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add
            </motion.button>
          </div>
        </div>

        {/* Right: Image */}
        <div className="flex-shrink-0">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
            onClick={() => onImageClick(addon)}
          >
            <img
              src={addon.images?.[0] || `/api/placeholder/150/150?text=${encodeURIComponent(addon.name)}`}
              alt={addon.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = `/api/placeholder/150/150?text=${encodeURIComponent(addon.name)}`;
              }}
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

const AddOnImageModal = ({ addon, isOpen, onClose }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === addon?.images?.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? addon?.images?.length - 1 : prev - 1
    );
  };

  if (!addon) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>

              {/* Image Carousel */}
              <div className="relative h-64">
                <img
                  src={addon.images?.[currentImageIndex] || `/api/placeholder/400/300?text=${encodeURIComponent(addon.name)}`}
                  alt={addon.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = `/api/placeholder/400/300?text=${encodeURIComponent(addon.name)}`;
                  }}
                />
                
                {/* Carousel Controls */}
                {addon.images?.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                    >
                      <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                    >
                      <ChevronRightIcon className="w-6 h-6" />
                    </button>
                    
                    {/* Dots Indicator */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                      {addon.images.map((_, index) => (
                        <button
                          key={index}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                          }`}
                          onClick={() => setCurrentImageIndex(index)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{addon.name}</h2>
              <p className="text-gray-600 mb-4">{addon.description}</p>
              
              {/* Nutrition Info */}
              {addon.nutrition && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Nutrition Info</h3>
                  <p className="text-sm text-gray-600">{addon.nutrition}</p>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-semibold text-gray-900">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <MinusIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="text-xl font-bold text-gray-900 w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <PlusIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Add {quantity} to Cart - ₦{(addon.price * quantity).toLocaleString()}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { AddOnCard, AddOnImageModal };