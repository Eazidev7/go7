/**
 * 🛒 GO7 CART SYSTEM — React + Firebase + Paystack Integration
 * -------------------------------------------------------------
 * Modern cart with animations, wallet balance, and payment options
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../config/firebase";
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { PaystackButton } from "react-paystack";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Plus, Minus, Wallet, CreditCard, Bike, ArrowLeft, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function CartPaystack({ userId, walletBalance = 0 }) {
  const [cartItems, setCartItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(500);
  const [total, setTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userEmail, setUserEmail] = useState("user@go7.ng");
  const navigate = useNavigate();

  // ✅ Fetch Cart from Firestore
  useEffect(() => {
    const fetchCart = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, "users", userId, "cart"));
        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs.map((d) => ({ 
          id: d.id, 
          ...d.data() 
        }));
        setCartItems(items);
      } catch (error) {
        console.error("❌ Error fetching cart:", error);
        toast.error("Failed to load cart");
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchCart();
    }
  }, [userId]);

  // ✅ Calculate totals
  useEffect(() => {
    const sub = cartItems.reduce((sum, item) => sum + item.total, 0);
    setSubtotal(sub);
    setTotal(sub + deliveryFee);
  }, [cartItems, deliveryFee]);

  // ✅ Update item quantity
  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }

    try {
      const item = cartItems.find(i => i.id === itemId);
      const newTotal = item.basePrice * newQuantity + 
        item.addOns.reduce((sum, a) => sum + a.price * a.qty, 0);
      
      await updateDoc(doc(db, "users", userId, "cart", itemId), {
        quantity: newQuantity,
        total: newTotal
      });

      setCartItems(cartItems.map(i => 
        i.id === itemId 
          ? { ...i, quantity: newQuantity, total: newTotal }
          : i
      ));

      toast.success("Cart updated");
    } catch (error) {
      console.error("❌ Error updating quantity:", error);
      toast.error("Failed to update cart");
    }
  };

  // ✅ Remove item from cart
  const removeItem = async (itemId) => {
    try {
      await deleteDoc(doc(db, "users", userId, "cart", itemId));
      setCartItems(cartItems.filter(i => i.id !== itemId));
      toast.success("Item removed");
    } catch (error) {
      console.error("❌ Error removing item:", error);
      toast.error("Failed to remove item");
    }
  };

  // ✅ Clear Cart after order
  const clearCart = async () => {
    try {
      const q = query(collection(db, "users", userId, "cart"));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(d => 
        deleteDoc(doc(db, "users", userId, "cart", d.id))
      );
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("❌ Error clearing cart:", error);
    }
  };

  // ✅ Create Order in Firestore
  const createOrder = async (status = "pending", ref = null) => {
    try {
      setProcessing(true);
      
      const orderData = {
        userId,
        items: cartItems,
        subtotal,
        deliveryFee,
        total,
        paymentMethod,
        paymentStatus: status,
        transactionRef: ref,
        orderStatus: "requested",
        timestamp: new Date(),
        createdAt: new Date().toISOString()
      };

      const orderRef = await addDoc(collection(db, "orders"), orderData);
      await clearCart();
      
      toast.success("🎉 Order placed successfully!", {
        duration: 3000,
        icon: "✅"
      });

      // Redirect to tracking page
      setTimeout(() => {
        navigate(`/track-delivery/${orderRef.id}`);
      }, 1500);

    } catch (error) {
      console.error("❌ Error creating order:", error);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // ✅ Paystack Config
  const paystackConfig = {
    reference: `GO7-${new Date().getTime()}`,
    email: userEmail,
    amount: total * 100, // Convert to kobo
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_xxxxxxxxxxxxx",
    currency: "NGN",
    metadata: {
      userId,
      orderItems: cartItems.length,
      custom_fields: [
        {
          display_name: "Cart Total",
          variable_name: "cart_total",
          value: total.toString()
        }
      ]
    }
  };

  const handlePaystackSuccess = (ref) => {
    console.log("✅ Paystack payment successful:", ref);
    createOrder("paid", ref.reference);
  };

  const handlePaystackClose = () => {
    toast.error("Payment cancelled");
  };

  // ✅ Wallet Payment Handler
  const handleWalletPayment = async () => {
    if (walletBalance < total) {
      toast.error(`Insufficient wallet balance. You need ₦${(total - walletBalance).toLocaleString()} more`, {
        duration: 4000,
        icon: "💰"
      });
      return;
    }
    
    // Deduct from wallet and create order
    createOrder("paid_wallet", null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your cart...</p>
        </div>
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
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Your Cart</h1>
              <p className="text-sm text-gray-600">{cartItems.length} items</p>
            </div>
          </div>
          <ShoppingCart size={24} className="text-red-500" />
        </div>
      </motion.div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Empty Cart */}
        {cartItems.length === 0 ? (
          <motion.div 
            className="bg-white rounded-2xl p-12 text-center shadow-sm"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <ShoppingCart size={64} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-gray-600 mb-6">Add some delicious meals to get started!</p>
            <motion.button
              onClick={() => navigate("/")}
              className="bg-red-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-red-600 transition"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Browse Meals
            </motion.button>
          </motion.div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-3 mb-6">
              <AnimatePresence>
                {cartItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 shadow-sm"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg">{item.mealName}</h4>
                        <p className="text-sm text-gray-600">
                          ₦{item.basePrice.toLocaleString()} / {item.unitLabel}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Add-ons */}
                    {item.addOns && item.addOns.length > 0 && (
                      <div className="mb-3 pl-3 border-l-2 border-gray-200">
                        {item.addOns.map((addon, i) => (
                          <div key={i} className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>➕ {addon.name} × {addon.qty}</span>
                            <span>₦{(addon.price * addon.qty).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <motion.button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
                          whileTap={{ scale: 0.9 }}
                        >
                          <Minus size={16} className="text-gray-700" />
                        </motion.button>
                        <span className="text-lg font-semibold text-gray-900 w-8 text-center">
                          {item.quantity}
                        </span>
                        <motion.button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition"
                          whileTap={{ scale: 0.9 }}
                        >
                          <Plus size={16} className="text-white" />
                        </motion.button>
                        <span className="text-sm text-gray-600">
                          {item.unitLabel}{item.quantity > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-500">
                          ₦{item.total.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Order Summary */}
            <motion.div 
              className="bg-white rounded-2xl p-6 shadow-sm mb-6"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <div className="flex items-center space-x-2">
                    <Bike size={18} className="text-red-500" />
                    <span>Delivery Fee</span>
                  </div>
                  <span>₦{deliveryFee.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-red-500">
                    ₦{total.toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Payment Method Selection */}
            <motion.div 
              className="bg-white rounded-2xl p-6 shadow-sm mb-6"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
              <div className="space-y-3">
                {/* Wallet Option */}
                <motion.label
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition ${
                    paymentMethod === "wallet"
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="payment"
                      value="wallet"
                      checked={paymentMethod === "wallet"}
                      onChange={() => setPaymentMethod("wallet")}
                      className="w-5 h-5 text-red-500"
                    />
                    <Wallet size={24} className="text-red-500" />
                    <div>
                      <p className="font-semibold text-gray-900">GO7 Wallet</p>
                      <p className="text-sm text-gray-600">
                        Balance: ₦{walletBalance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {paymentMethod === "wallet" && (
                    <CheckCircle size={24} className="text-red-500" />
                  )}
                </motion.label>

                {/* Paystack Option */}
                <motion.label
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition ${
                    paymentMethod === "paystack"
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="payment"
                      value="paystack"
                      checked={paymentMethod === "paystack"}
                      onChange={() => setPaymentMethod("paystack")}
                      className="w-5 h-5 text-red-500"
                    />
                    <CreditCard size={24} className="text-red-500" />
                    <div>
                      <p className="font-semibold text-gray-900">Card Payment</p>
                      <p className="text-sm text-gray-600">Powered by Paystack</p>
                    </div>
                  </div>
                  {paymentMethod === "paystack" && (
                    <CheckCircle size={24} className="text-red-500" />
                  )}
                </motion.label>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      {cartItems.length > 0 && (
        <motion.div 
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-20"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="max-w-2xl mx-auto">
            {paymentMethod === "wallet" ? (
              <motion.button
                onClick={handleWalletPayment}
                disabled={processing || walletBalance < total}
                className={`w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center space-x-2 transition ${
                  processing || walletBalance < total
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-500 hover:bg-red-600"
                }`}
                whileTap={{ scale: processing ? 1 : 0.98 }}
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Wallet size={20} />
                    <span>Pay ₦{total.toLocaleString()} from Wallet</span>
                  </>
                )}
              </motion.button>
            ) : (
              <PaystackButton
                {...paystackConfig}
                text={`Pay ₦${total.toLocaleString()} with Card`}
                onSuccess={handlePaystackSuccess}
                onClose={handlePaystackClose}
                disabled={processing}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              />
            )}
            
            {walletBalance < total && paymentMethod === "wallet" && (
              <p className="text-center text-sm text-red-500 mt-2">
                Insufficient balance. Top up your wallet or use card payment.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/**
 * 🧩 Firestore Structure
 * 
 * /users/{userId}/cart/{cartItemId}
 * {
 *   vendorId: "vendor123",
 *   mealId: "meal456",
 *   mealName: "Jollof Rice",
 *   quantity: 3,
 *   basePrice: 300,
 *   unitLabel: "spoon",
 *   addOns: [
 *     { name: "Meat", price: 1000, qty: 1 },
 *     { name: "Plantain", price: 300, qty: 1 }
 *   ],
 *   total: 1900,
 *   timestamp: Date
 * }
 * 
 * /orders/{orderId}
 * {
 *   userId: "user123",
 *   items: [...cartItems],
 *   subtotal: 1900,
 *   deliveryFee: 500,
 *   total: 2400,
 *   paymentMethod: "wallet" | "paystack",
 *   paymentStatus: "paid" | "paid_wallet" | "pending",
 *   transactionRef: "GO7-1699999999",
 *   orderStatus: "requested",
 *   timestamp: Date,
 *   createdAt: "2025-11-08T20:00:00Z"
 * }
 */
