/*
🎉 GO7 ORDER SUCCESS SCREEN — NOV 2025
Purpose:
After payment (wallet or Paystack), user lands here.
Shows order confirmation, success animation, total summary, and "Track Delivery" button.
*/

import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useCart } from '../contexts/CartContext';
import "./OrderSuccess.css";

const OrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();
  const [order, setOrder] = useState(null);
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    // Get order data from navigation state
    if (location.state?.order) {
      setOrder(location.state.order);
    }
    if (location.state?.orderData) {
      setOrderData(location.state.orderData);
      // Clear cart after successful order
      clearCart();
      // Clear rider note
      sessionStorage.removeItem('go7_rider_note');
    }
  }, [location.state, clearCart]);

  return (
    <div className="order-success">
      <div className="success-anim">
        <CheckCircle size={120} color="#4CAF50" strokeWidth={2} />
      </div>

      <h2>Order Confirmed 🎉</h2>
      <p className="desc">
        Your order has been successfully placed and is now being processed.
      </p>

      <div className="summary">
        <p>
          <strong>Order ID:</strong> {orderData?.orderId || order?.id || "GO7-" + Math.floor(Math.random() * 99999)}
        </p>
        <p>
          <strong>Total Paid:</strong> ₦{(orderData?.totalAmount || order?.total || 0).toLocaleString()}
        </p>
        <p>
          <strong>Payment:</strong> {(orderData?.paymentMethod || order?.paymentMethod) === "wallet" ? "Wallet" : "Card"}
        </p>
        {orderData?.vendorName && (
          <p>
            <strong>Restaurant:</strong> {orderData.vendorName}
          </p>
        )}
        {orderData?.deliveryAddress && (
          <p>
            <strong>Delivery to:</strong> {orderData.deliveryAddress.label} - {orderData.deliveryAddress.street}
          </p>
        )}
        {orderData?.giftDetails?.enabled && (
          <p>
            <strong>🎁 Gift for:</strong> {orderData.giftDetails.receiverName}
          </p>
        )}
      </div>

      <div className="delivery-estimate">
        <h4>🚚 Estimated Delivery Time</h4>
        <p className="delivery-time">
          {new Date(Date.now() + (40 * 60 * 1000)).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
        <p>We'll notify you when your order is on the way</p>
      </div>

      <div className="action-buttons">
        <button
          className="go7-btn track-btn"
          onClick={() => navigate("/orders/" + (orderData?.orderId || order?.id || "sample-order-id"))}
        >
          🚴 Track Your Order
        </button>
        
        <button
          className="go7-btn-secondary"
          onClick={() => navigate("/explore")}
        >
          Continue Shopping
        </button>
      </div>

      <button className="go7-btn home-btn" onClick={() => navigate("/")}>
        🏠 Back to Home
      </button>
    </div>
  );
};

export default OrderSuccess;
