import React, { useState, useEffect } from "react";
import { useCartStore } from "../store/cartStore";
import { formatCurrency } from "../utils/currency";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { calculateDeliveryFeeSplit } from '../utils/deliveryFeeSplit';
import { buildFoodOrderPricing } from '../utils/orderPricing';
import { useDeliveryPricing } from '../hooks/useDeliveryPricing';

export default function Checkout() {
  const { cart: items, getItemCount, getSubtotal, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });

  const itemCount = getItemCount();
  const subtotal = getSubtotal();
  // Canonical delivery pricing: returns legacy ₦500 until new pricing config is enabled.
  const { getFee } = useDeliveryPricing(db);
  const deliveryFee = getFee({ orderType: 'FOOD', subtotal, distanceKm: 0 });
  const orderPricing = buildFoodOrderPricing({ itemTotal: subtotal, deliveryFee });
  const total = orderPricing.grandTotal;

  useEffect(() => {
    if (itemCount === 0 && !orderSuccess) {
      // Redirect if cart is empty
      window.location.href = "/";
    }
  }, [itemCount, orderSuccess]);

  const handleInputChange = (field, value) => {
    setUserInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    
    if (!userInfo.name || !userInfo.email || !userInfo.phone || !userInfo.address) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      // Create order object
      const orderData = {
        userId: "guest", // Replace with actual user ID if logged in
        userEmail: userInfo.email,
        userName: userInfo.name,
        userPhone: userInfo.phone,
        deliveryAddress: userInfo.address,
        createdAt: serverTimestamp(),
        status: "pending",
        total,
        subtotal,
        itemTotal: subtotal,
        deliveryFee,
        platformFee: orderPricing.platformFee,
        grandTotal: total,
        feeBreakdown: orderPricing.feeBreakdown,
        orderType: 'food',
        ...calculateDeliveryFeeSplit(deliveryFee),
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: item.quantity,
          vendorId: item.vendorId,
          vendorName: item.vendorName,
          imageUrl: item.imageUrl,
          addons: item.options ? Object.entries(item.options).map(([key, value]) => ({ name: key, value })) : []
        })),
        payment: {
          provider: "cash", // Can be updated to "paystack" when payment is integrated
          paid: false,
          ref: null
        }
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, "orders"), orderData);
      
      console.log("Order created with ID: ", docRef.id);
      
      // Clear cart and show success
      clearCart();
      setOrderSuccess(true);
      
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Failed to create order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess) {
    return (
      <div style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "40px 20px",
        textAlign: "center"
      }}>
        <div style={{fontSize: "64px", marginBottom: 20}}>🎉</div>
        <h2 style={{color: "#E83A2E", marginBottom: 16}}>Order Placed Successfully!</h2>
        <p style={{color: "#666", marginBottom: 32}}>
          Thank you for your order. We'll contact you soon with delivery details.
        </p>
        <button
          onClick={() => window.location.href = "/"}
          style={{
            background: "#E83A2E",
            color: "#fff",
            padding: "12px 24px",
            border: "none",
            borderRadius: 8,
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: "800px",
      margin: "0 auto",
      padding: "20px",
      paddingBottom: "100px"
    }}>
      <h1 style={{
        fontSize: "28px",
        fontWeight: 700,
        color: "#1a1a1a",
        marginBottom: 32
      }}>
        Checkout
      </h1>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 400px",
        gap: 32
      }}>
        {/* Order Form */}
        <div>
          <h3 style={{marginBottom: 20}}>Delivery Information</h3>
          <form onSubmit={handleSubmitOrder} style={{display: "flex", flexDirection: "column", gap: 16}}>
            <div>
              <label style={{display: "block", marginBottom: 8, fontWeight: 600}}>
                Full Name *
              </label>
              <input
                type="text"
                value={userInfo.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: "16px"
                }}
                required
              />
            </div>

            <div>
              <label style={{display: "block", marginBottom: 8, fontWeight: 600}}>
                Email Address *
              </label>
              <input
                type="email"
                value={userInfo.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: "16px"
                }}
                required
              />
            </div>

            <div>
              <label style={{display: "block", marginBottom: 8, fontWeight: 600}}>
                Phone Number *
              </label>
              <input
                type="tel"
                value={userInfo.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: "16px"
                }}
                required
              />
            </div>

            <div>
              <label style={{display: "block", marginBottom: 8, fontWeight: 600}}>
                Delivery Address *
              </label>
              <textarea
                value={userInfo.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: "16px",
                  resize: "vertical"
                }}
                placeholder="Enter your full delivery address"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? "#ccc" : "#E83A2E",
                color: "#fff",
                padding: "16px 24px",
                border: "none",
                borderRadius: 8,
                fontSize: "18px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: 16
              }}
            >
              {loading ? "Placing Order..." : `Place Order - ${formatCurrency(total)}`}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div>
          <div style={{
            background: "#f8f9fa",
            padding: 24,
            borderRadius: 12,
            border: "1px solid #e9ecef"
          }}>
            <h3 style={{marginBottom: 20}}>Order Summary</h3>
            
            {/* Items */}
            <div style={{marginBottom: 20}}>
              {items.map((item, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  paddingBottom: 12,
                  borderBottom: idx < items.length - 1 ? "1px solid #dee2e6" : "none"
                }}>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 600, marginBottom: 4}}>
                      {item.name} x{item.quantity}
                    </div>
                    <div style={{fontSize: 14, color: "#666"}}>
                      {item.vendorName}
                    </div>
                    {item.options && Object.keys(item.options).length > 0 && (
                      <div style={{fontSize: 12, color: "#888", fontStyle: "italic"}}>
                        + {Object.entries(item.options).map(([key, value]) => `${key}: ${value}`).join(", ")}
                      </div>
                    )}
                  </div>
                  <div style={{fontWeight: 600, color: "#E83A2E"}}>
                    {formatCurrency(item.totalPrice || ((item.price + (item.options ? Object.values(item.optionPrices || {}).reduce((sum, price) => sum + price, 0) : 0)) * item.quantity))}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{borderTop: "1px solid #dee2e6", paddingTop: 16}}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8
              }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 16
              }}>
                <span>Delivery Fee:</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8
              }}>
                <span>Platform Fee (10%):</span>
                <span>{formatCurrency(orderPricing.platformFee)}</span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 18,
                fontWeight: 700,
                color: "#E83A2E",
                borderTop: "2px solid #E83A2E",
                paddingTop: 16
              }}>
                <span>Grand Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}