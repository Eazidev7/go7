/**
 * 🛠️ GO7 MEAL BUILDER INTEGRATION (React + Firebase)
 * Description:
 * Modern meal builder with per-unit pricing (plate/spoon/wrap),
 * dynamic add-ons, and smooth animations.
 * 
 * Technologies: React + Firebase Firestore + Tailwind + Framer Motion
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase/config";
import { collection, doc, getDoc, addDoc } from "firebase/firestore";
import { Plus, Minus, ShoppingCart, Check, X } from "lucide-react";

export default function MealBuilder({ vendorId, mealId, userId, onClose }) {
  const [meal, setMeal] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [total, setTotal] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch meal from Firestore
  useEffect(() => {
    const fetchMeal = async () => {
      try {
        setLoading(true);
        const mealRef = doc(db, "vendors", vendorId, "menus", mealId);
        const snap = await getDoc(mealRef);
        if (snap.exists()) {
          setMeal({ id: snap.id, ...snap.data() });
        }
      } catch (error) {
        console.error("❌ Error fetching meal:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMeal();
  }, [vendorId, mealId]);

  // ✅ Handle Add-on Selection
  const toggleAddOn = (addon) => {
    const exists = selectedAddOns.find(a => a.name === addon.name);
    if (exists) {
      setSelectedAddOns(selectedAddOns.filter(a => a.name !== addon.name));
    } else {
      setSelectedAddOns([...selectedAddOns, { ...addon, qty: 1 }]);
    }
  };

  // ✅ Handle Add-on Quantity Change
  const adjustAddonQty = (addonName, delta) => {
    setSelectedAddOns(selectedAddOns.map(a => {
      if (a.name === addonName) {
        return { ...a, qty: Math.max(1, a.qty + delta) };
      }
      return a;
    }));
  };

  // ✅ Calculate Total
  useEffect(() => {
    if (!meal) return;
    const baseTotal = meal.basePrice * quantity;
    const addonTotal = selectedAddOns.reduce(
      (sum, a) => sum + a.price * a.qty,
      0
    );
    setTotal(baseTotal + addonTotal);
  }, [meal, quantity, selectedAddOns]);

  // ✅ Add to Cart
  const addToCart = async () => {
    try {
      setIsAdding(true);
      await addDoc(collection(db, "users", userId, "cart"), {
        vendorId,
        mealId,
        mealName: meal.name,
        quantity,
        basePrice: meal.basePrice,
        unitLabel: meal.unitLabel,
        addOns: selectedAddOns,
        total,
        timestamp: new Date()
      });
      
      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onClose) onClose();
      }, 1500);
    } catch (error) {
      console.error("❌ Error adding to cart:", error);
      alert("Failed to add to cart. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading meal...</p>
        </div>
      </div>
    );
  }

  if (!meal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Meal not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <motion.div 
        className="bg-white sticky top-0 z-10 shadow-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Add Extras</h1>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <X size={24} className="text-gray-600" />
            </button>
          )}
        </div>
      </motion.div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Meal Header */}
        <motion.div 
          className="bg-white rounded-2xl p-6 shadow-sm mb-4"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{meal.name}</h2>
          <p className="text-3xl font-bold text-red-500 mb-4">
            ₦{meal.basePrice.toLocaleString()} 
            <span className="text-base text-gray-500 font-normal"> / {meal.unitLabel}</span>
          </p>
          {meal.description && (
            <p className="text-gray-600">{meal.description}</p>
          )}
        </motion.div>

        {/* Quantity Selector */}
        <motion.div 
          className="bg-white rounded-2xl p-6 shadow-sm mb-4"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quantity</h3>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">
              {quantity} {meal.unitLabel}{quantity > 1 ? "s" : ""}
            </span>
            <div className="flex items-center space-x-3">
              <motion.button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
                whileTap={{ scale: 0.9 }}
              >
                <Minus size={20} className="text-gray-700" />
              </motion.button>
              <span className="text-xl font-bold text-gray-900 w-12 text-center">{quantity}</span>
              <motion.button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition"
                whileTap={{ scale: 0.9 }}
              >
                <Plus size={20} className="text-white" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Add-ons Section */}
        {meal.addOns && meal.addOns.length > 0 && (
          <motion.div 
            className="bg-white rounded-2xl p-6 shadow-sm mb-4"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add-ons</h3>
            <div className="space-y-3">
              {meal.addOns.map((addon, i) => {
                const isSelected = selectedAddOns.find(a => a.name === addon.name);
                return (
                  <motion.div
                    key={i}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition ${
                      isSelected 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleAddOn(addon)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900">{addon.name}</span>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                            >
                              <Check size={14} className="text-white" />
                            </motion.div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          ₦{addon.price.toLocaleString()} / {addon.unitLabel || "piece"}
                        </p>
                      </div>
                    </div>

                    {/* Quantity Controls for Selected Add-on */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div 
                          className="flex items-center justify-end space-x-3 mt-3 pt-3 border-t border-gray-200"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-sm text-gray-600">Quantity:</span>
                          <motion.button 
                            onClick={() => adjustAddonQty(addon.name, -1)}
                            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
                            whileTap={{ scale: 0.9 }}
                          >
                            <Minus size={16} className="text-gray-700" />
                          </motion.button>
                          <span className="text-lg font-semibold text-gray-900 w-8 text-center">
                            {isSelected.qty}
                          </span>
                          <motion.button 
                            onClick={() => adjustAddonQty(addon.name, 1)}
                            className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
                            whileTap={{ scale: 0.9 }}
                          >
                            <Plus size={16} className="text-white" />
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Order Summary */}
        <motion.div 
          className="bg-white rounded-2xl p-6 shadow-sm"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>{meal.name} ({quantity} {meal.unitLabel}{quantity > 1 ? 's' : ''})</span>
              <span>₦{(meal.basePrice * quantity).toLocaleString()}</span>
            </div>
            {selectedAddOns.map((addon, i) => (
              <div key={i} className="flex justify-between text-gray-600 text-sm">
                <span>{addon.name} (×{addon.qty})</span>
                <span>₦{(addon.price * addon.qty).toLocaleString()}</span>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xl font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-red-500">₦{total.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sticky Bottom Bar */}
      <motion.div 
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-20"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">₦{total.toLocaleString()}</p>
          </div>
          <motion.button 
            onClick={addToCart}
            disabled={isAdding || showSuccess}
            className={`px-8 py-4 rounded-xl font-semibold text-white flex items-center space-x-2 transition ${
              showSuccess 
                ? 'bg-green-500' 
                : isAdding 
                ? 'bg-gray-400' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
            whileTap={{ scale: showSuccess ? 1 : 0.95 }}
          >
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center space-x-2"
                >
                  <Check size={20} />
                  <span>Added!</span>
                </motion.div>
              ) : isAdding ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center space-x-2"
                >
                  <ShoppingCart size={20} />
                  <span>Add to Cart</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * 🧩 Example Firestore Structure
 * /vendors/{vendorId}/menus/{mealId}
 * {
 *   name: "Jollof Rice",
 *   basePrice: 300,
 *   unitLabel: "spoon",
 *   description: "Delicious Nigerian-style jollof rice",
 *   addOns: [
 *     { name: "Meat", price: 1000, unitLabel: "piece" },
 *     { name: "Fish", price: 800, unitLabel: "piece" },
 *     { name: "Plantain", price: 300, unitLabel: "portion" }
 *   ]
 * }
 */
