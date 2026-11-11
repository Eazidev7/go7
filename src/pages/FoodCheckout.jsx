/*
🔥 GO7 FOOD CHECKOUT + PAYMENT INTEGRATION — NOV 2025
Unified checkout for food/vendor orders from Explore page
Supports: Wallet & Paystack payments
*/

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuthContext } from "../contexts/AuthContext";
import { useLocation } from "../contexts/LocationContext";
import { db } from "../config/firebase";
import { serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { Wallet, CreditCard, ShoppingBag, ArrowLeft, Check, MapPin, Navigation } from "lucide-react";
import Swal from "sweetalert2";
import { submitCommerceOrder } from "../services/commerceOrderClient";
import { buildFoodOrderPricing } from "../utils/orderPricing";
import { useDeliveryPricing } from "../hooks/useDeliveryPricing";
import { subscribeToUnifiedWalletBalance } from "../utils/walletBalance";
import { payForDeliveryWithWallet } from "../services/customerWalletService";
import "./FoodCheckout.css";

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

export default function FoodCheckout() {
  const { cartItems, clearCart, cartTotal } = useCart();
  const { user } = useAuthContext();
  const { activeAddress, savedAddresses, selectAddress, getCurrentLocation, isLoading: locationLoading } = useLocation();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [processing, setProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  // Calculate total with add-ons
  const calculateTotal = () => {
    return cartItems.reduce((acc, item) => {
      const basePrice = item.price * item.quantity;
      const addonsPrice = item.addons?.reduce((sum, addon) => sum + addon.price, 0) * item.quantity || 0;
      return acc + basePrice + addonsPrice;
    }, 0);
  };

  const itemTotal = calculateTotal();
  // Canonical delivery pricing: returns legacy ₦500 until new pricing config is enabled.
  const { getFee } = useDeliveryPricing(db);
  const deliveryFee = getFee({ orderType: "FOOD", subtotal: itemTotal, distanceKm: 0 });
  const orderPricing = buildFoodOrderPricing({ itemTotal, deliveryFee });
  const grandTotal = orderPricing.grandTotal;

  // Load wallet balance (canonical wallets + legacy users.walletBalance)
  useEffect(() => {
    if (!user?.uid) {
      setWalletBalance(0);
      return undefined;
    }
    return subscribeToUnifiedWalletBalance(user.uid, setWalletBalance);
  }, [user?.uid]);

  // Load user info and set address from LocationContext
  useEffect(() => {
    const loadUserInfo = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setPhoneNumber(userData.phone || user.phoneNumber || "");
          // Use active address from LocationContext if available
          if (activeAddress && activeAddress.address) {
            setDeliveryAddress(activeAddress.address);
          } else if (userData.address) {
            setDeliveryAddress(userData.address);
          }
        }
      } catch (error) {
        console.error("Error loading user info:", error);
      }
    };

    loadUserInfo();
  }, [user, activeAddress]);

  // Handle GPS location
  const handleUseCurrentLocation = async () => {
    try {
      const coords = await getCurrentLocation();
      
      // Use reverse geocoding to get address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`
      );
      const data = await response.json();
      
      if (data.display_name) {
        setDeliveryAddress(data.display_name);
        Swal.fire({
          icon: "success",
          title: "Location Set",
          text: "Current location address updated",
          confirmButtonColor: "#e0001b",
          timer: 2000
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Location Error",
        text: error.message || "Could not get your current location",
        confirmButtonColor: "#e0001b"
      });
    }
  };

  // Handle saved address selection
  const handleSelectSavedAddress = async (address) => {
    await selectAddress(address);
    setDeliveryAddress(address.address);
    setShowAddressPicker(false);
    
    Swal.fire({
      icon: "success",
      title: "Address Selected",
      text: `Using ${address.name}`,
      confirmButtonColor: "#e0001b",
      timer: 2000
    });
  };

  const handlePayment = async () => {
    if (!user) {
      Swal.fire({
        icon: "warning",
        title: "Please Login",
        text: "You need to be logged in to place an order",
        confirmButtonColor: "#e0001b"
      });
      navigate("/login");
      return;
    }

    if (cartItems.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Empty Cart",
        text: "Your cart is empty. Add items before checking out.",
        confirmButtonColor: "#e0001b"
      });
      return;
    }

    if (!deliveryAddress.trim()) {
      Swal.fire({
        icon: "error",
        title: "Delivery Address Required",
        text: "Please enter your delivery address",
        confirmButtonColor: "#e0001b"
      });
      return;
    }

    if (!phoneNumber.trim()) {
      Swal.fire({
        icon: "error",
        title: "Phone Number Required",
        text: "Please enter your phone number",
        confirmButtonColor: "#e0001b"
      });
      return;
    }

    setProcessing(true);

    try {
      if (paymentMethod === "wallet") {
        await handleWalletPayment();
      } else if (paymentMethod === "paystack") {
        await handlePaystackPayment();
      }
    } catch (err) {
      console.error("Payment error:", err);
      Swal.fire({
        icon: "error",
        title: "Payment Failed",
        text: err.message || "Error completing payment. Please try again.",
        confirmButtonColor: "#e0001b"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleWalletPayment = async () => {
    if (walletBalance < grandTotal) {
      Swal.fire({
        icon: "error",
        title: "Insufficient Balance",
        text: `Your wallet balance (₦${walletBalance.toLocaleString()}) is less than the total amount (₦${grandTotal.toLocaleString()})`,
        confirmButtonColor: "#e0001b"
      });
      setProcessing(false);
      return;
    }

    // Create server-side (client writes to /orders are denied by rules),
    // then debit the AUTHORITATIVE amount, then mark paid.
    const order = await createOrder("wallet");
    const orderId = order.orderId;
    const amountToPay = order.amountToPay;
    try {
      await payForDeliveryWithWallet(
        user.uid,
        orderId,
        amountToPay,
        `Food order ${orderId}`
      );
      await updateOrderPaymentStatus(orderId, "paid");
    } catch (debitError) {
      await updateOrderPaymentStatus(orderId, "failed").catch(() => {});
      throw debitError;
    }

    clearCart();
    navigate("/order-success", {
      state: {
        order: {
          id: orderId,
          total: amountToPay,
          paymentMethod: "Wallet"
        }
      }
    });
  };

  const handlePaystackPayment = async () => {
    if (!window.PaystackPop || !PAYSTACK_PUBLIC_KEY) {
      Swal.fire({
        icon: "error",
        title: "Payment Error",
        text: "Paystack is not configured. Please contact support.",
        confirmButtonColor: "#e0001b"
      });
      setProcessing(false);
      return;
    }

    // Create the order server-side first — the server returns the
    // authoritative amountToPay that Paystack must charge.
    const order = await createOrder("paystack");
    const orderId = order.orderId;
    const amountToPay = order.amountToPay;

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: Math.round(amountToPay * 100), // Convert to kobo
      currency: "NGN",
      ref: `GO7-${Date.now()}-${user.uid.substring(0, 6)}`,
      metadata: {
        paymentType: 'service_payment',
        userId: user?.uid,
        serviceType: 'food_order',
        orderId
      },
      callback: async function (response) {
        console.log("✅ Paystack payment success:", response.reference);

        await updateDoc(doc(db, "orders", orderId), {
          paymentStatus: "paid",
          paymentReference: response.reference,
          updatedAt: serverTimestamp(),
        }).catch(() => {});

        clearCart();
        navigate("/order-success", {
          state: {
            order: {
              id: orderId,
              total: amountToPay,
              paymentMethod: "Paystack Card"
            }
          }
        });
        setProcessing(false);
      },
      onClose: function () {
        console.log("❌ Paystack payment cancelled");
        setProcessing(false);
      },
    });

    handler.openIframe();
  };

  // Delivery coordinates are required by the server for fee computation.
  // Prefer the selected/saved address pin; fall back to forward-geocoding the
  // typed address so checkout still works when the customer typed it manually.
  const resolveDeliveryCoords = async () => {
    const c = activeAddress?.coordinates || activeAddress;
    const lat = Number(c?.lat ?? c?.latitude);
    const lng = Number(c?.lng ?? c?.lon ?? c?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001)) {
      return { lat, lng };
    }
    const q = deliveryAddress.trim();
    if (q) {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
        );
        const arr = await r.json();
        if (Array.isArray(arr) && arr[0]) {
          return { lat: Number(arr[0].lat), lng: Number(arr[0].lon) };
        }
      } catch (e) { /* fall through to error */ }
    }
    return null;
  };

  // Orders are created ONLY via the createCommerceOrder callable — client
  // writes to /orders are denied by Firestore rules. Returns the
  // server-authoritative orderId + amountToPay that payment must charge.
  const createOrder = async (paymentMethod) => {
    const destinationCoords = await resolveDeliveryCoords();
    if (!destinationCoords) {
      throw new Error("Set your delivery location with GPS or a saved address so we can calculate the delivery fee.");
    }

    // Send cart lines + each paid add-on as its own line so the server
    // subtotal matches the displayed item total.
    const items = [];
    cartItems.forEach((item) => {
      items.push({
        productId: item.id,
        vendorId: item.vendorId,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
      });
      (item.addons || []).forEach((a, i) => {
        items.push({
          productId: `${item.id}__addon_${i}`,
          vendorId: item.vendorId,
          quantity: item.quantity,
          price: a.price,
          name: `${item.name} + ${a.name}`,
        });
      });
    });

    const res = await submitCommerceOrder({
      orderType: "FOOD",
      items,
      vendorId: cartItems[0]?.vendorId,
      customer: {
        name: user.displayName || "Go7 User",
        phone: phoneNumber,
        email: user.email || "",
      },
      destinationCoords,
      paymentMethod,
      deliveryAddress,
      deliveryNotes,
      deliveryFee, // client preview fee — server validates within tolerance
    });

    return {
      orderId: res.orderId,
      amountToPay: Number(res.amountToPay ?? res.grandTotal),
    };
  };

  const updateOrderPaymentStatus = async (orderId, paymentStatus) => {
    if (!orderId) return;
    await updateDoc(doc(db, "orders", orderId), {
      paymentStatus,
      updatedAt: serverTimestamp(),
    });
  };

  if (!user) {
    return (
      <div className="food-checkout-container">
        <div className="checkout-error">
          <h2>Please Login</h2>
          <p>You need to be logged in to checkout</p>
          <button onClick={() => navigate("/login")} className="go7-btn">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="food-checkout-container">
      <div className="checkout-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={20} />
        </button>
        <h1>Checkout</h1>
      </div>

      <div className="checkout-content">
        {/* Order Summary */}
        <div className="checkout-section">
          <h2><ShoppingBag size={20} /> Order Summary</h2>
          <div className="order-items">
            {cartItems.map((item, index) => (
              <div key={index} className="order-item">
                <img src={item.image} alt={item.name} />
                <div className="item-details">
                  <h4>{item.name}</h4>
                  <p className="vendor-name">{item.vendorName}</p>
                  {item.addons && item.addons.length > 0 && (
                    <div className="item-addons">
                      {item.addons.map((addon, idx) => (
                        <span key={idx} className="addon-tag">
                          + {addon.name} (₦{addon.price.toLocaleString()})
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="item-qty">Qty: {item.quantity}</p>
                </div>
                <div className="item-price">
                  ₦{((item.price + (item.addons?.reduce((sum, a) => sum + a.price, 0) || 0)) * item.quantity).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="order-totals">
            <div className="total-row">
              <span>Item Total:</span>
              <span>₦{itemTotal.toLocaleString()}</span>
            </div>
            <div className="total-row">
              <span>Delivery Fee:</span>
              <span>₦{deliveryFee.toLocaleString()}</span>
            </div>
            <div className="total-row">
              <span>Platform Fee (10%):</span>
              <span>₦{orderPricing.platformFee.toLocaleString()}</span>
            </div>
            <div className="total-row grand-total">
              <span>Grand Total:</span>
              <span>₦{grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="checkout-section">
          <h2>Delivery Information</h2>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="08012345678"
            />
          </div>
          <div className="form-group">
            <label>Delivery Address</label>
            <div className="address-controls">
              <button 
                type="button"
                onClick={() => setShowAddressPicker(!showAddressPicker)}
                className="address-btn saved-addresses-btn"
              >
                <MapPin size={16} />
                Saved Addresses
              </button>
              <button 
                type="button"
                onClick={handleUseCurrentLocation}
                className="address-btn gps-btn"
                disabled={locationLoading}
              >
                <Navigation size={16} />
                {locationLoading ? "Getting Location..." : "Use Current Location"}
              </button>
            </div>

            {showAddressPicker && savedAddresses.length > 0 && (
              <div className="saved-addresses-list">
                {savedAddresses.map((addr) => (
                  <div 
                    key={addr.id} 
                    className={`saved-address-item ${activeAddress?.id === addr.id ? 'active' : ''}`}
                    onClick={() => handleSelectSavedAddress(addr)}
                  >
                    <span className="address-icon">{addr.icon || '📍'}</span>
                    <div className="address-info">
                      <strong>{addr.name}</strong>
                      <p>{addr.address}</p>
                    </div>
                    {activeAddress?.id === addr.id && <Check size={18} className="check-icon" />}
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter your full delivery address"
              rows="3"
            />
          </div>
          <div className="form-group">
            <label>Delivery Notes (Optional)</label>
            <textarea
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Any special instructions for the rider"
              rows="2"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="checkout-section">
          <h2>Payment Method</h2>
          <div className="payment-methods">
            <label className={`payment-option ${paymentMethod === "wallet" ? "active" : ""}`}>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "wallet"}
                onChange={() => setPaymentMethod("wallet")}
              />
              <div className="payment-info">
                <Wallet size={24} />
                <div>
                  <h4>Go7 Wallet</h4>
                  <p>Balance: ₦{walletBalance.toLocaleString()}</p>
                </div>
              </div>
              {paymentMethod === "wallet" && <Check size={20} className="check-icon" />}
            </label>

            <label className={`payment-option ${paymentMethod === "paystack" ? "active" : ""}`}>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "paystack"}
                onChange={() => setPaymentMethod("paystack")}
              />
              <div className="payment-info">
                <CreditCard size={24} />
                <div>
                  <h4>Pay with Card</h4>
                  <p>Debit/Credit Card via Paystack</p>
                </div>
              </div>
              {paymentMethod === "paystack" && <Check size={20} className="check-icon" />}
            </label>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          className="confirm-payment-btn"
          onClick={handlePayment}
          disabled={processing}
        >
          {processing ? "Processing..." : `Pay ₦${grandTotal.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}
