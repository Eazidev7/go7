// Go7 Rider Order Detail - Real Status Update System
// Production Firestore integration with FCM notifications and Live Route Tracking

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useNotification } from "../../contexts/NotificationContext";
import MapTracking from "../../components/MapTracking";
import "./OrderDetail.css";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotification();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        console.log('📋 Loading order details for:', id);
        const docRef = doc(db, "orders", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() });
          console.log('✅ Order loaded:', docSnap.data());
        } else {
          console.error('❌ Order not found:', id);
          notify('Order not found', 'error');
          navigate('/rider/orders');
        }
      } catch (error) {
        console.error('❌ Error loading order:', error);
        notify('Failed to load order details', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrder();
    }
  }, [id, navigate, notify]);

  const updateOrderStatus = async (newStatus) => {
    if (!order || updating) return;

    setUpdating(true);
    
    try {
      console.log('🔄 Updating order status to:', newStatus);
      
      const docRef = doc(db, "orders", order.id);
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        [`${newStatus}At`]: serverTimestamp()
      };

      await updateDoc(docRef, updateData);
      
      setOrder(prev => ({
        ...prev,
        status: newStatus,
        updatedAt: Date.now(),
        [`${newStatus}At`]: Date.now()
      }));

      const statusMessages = {
        picked_up: "📦 Order marked as picked up!",
        delivering: "🚚 Started delivery to customer!",
        delivered: "✅ Order completed successfully!"
      };

      notify(statusMessages[newStatus] || `Status updated to ${newStatus}`, 'success');
      
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      notify('Failed to update order status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      assigned: "#e61e25",
      picked_up: "#3b82f6", 
      delivering: "#f59e0b",
      delivered: "#10b981",
      cancelled: "#ef4444"
    };
    return colors[status] || "#6b7280";
  };

  const getNextActions = (currentStatus) => {
    switch (currentStatus) {
      case "assigned":
        return [{ status: "picked_up", label: "📦 Mark as Picked Up", color: "#3b82f6" }];
      case "picked_up":
        return [{ status: "delivering", label: "🚚 Start Delivery", color: "#f59e0b" }];
      case "delivering":
        return [{ status: "delivered", label: "✅ Mark as Delivered", color: "#10b981" }];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="order-detail-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-detail-container">
        <div className="error-state">
          <h3>❌ Order Not Found</h3>
          <button onClick={() => navigate('/rider/orders')} className="go-back-btn">
            ← Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const nextActions = getNextActions(order.status);

  return (
    <div className="order-detail-container">
      <div className="order-header">
        <button onClick={() => navigate('/rider/orders')} className="back-btn">
          ← Back
        </button>
        <h1>Order #{order.id.slice(-8).toUpperCase()}</h1>
        <div 
          className="status-badge"
          style={{ backgroundColor: getStatusColor(order.status) }}
        >
          {order.status.replace('_', ' ').toUpperCase()}
        </div>
      </div>

      <div className="delivery-info">
        <div className="info-section">
          <h3>📍 Pickup Location</h3>
          <div className="location-card">
            <div className="location-icon">🏪</div>
            <div className="location-details">
              <span className="location-name">{order.restaurantName || "Restaurant"}</span>
              <span className="location-address">{order.pickup || "Pickup address"}</span>
            </div>
          </div>
        </div>

        <div className="route-indicator">
          <div className="route-line"></div>
        </div>

        <div className="info-section">
          <h3>🎯 Drop-off Location</h3>
          <div className="location-card">
            <div className="location-icon">🏠</div>
            <div className="location-details">
              <span className="location-name">{order.customerName || "Customer"}</span>
              <span className="location-address">{order.dropoff || order.drop || "Delivery address"}</span>
              {order.customerPhone && (
                <a href={`tel:${order.customerPhone}`} className="phone-link">
                  📞 {order.customerPhone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Route Tracking - Only show when order is accepted or in transit */}
      {(order.status === 'accepted' || order.status === 'picked_up' || order.status === 'in_transit') && (
        <div className="live-tracking-section">
          <h3>🗺️ Live Route Tracking</h3>
          <MapTracking
            orderId={order.id}
            riderId={order.riderId || order.rider?.id}
            pickup={order.pickupCoords || { lat: 6.5244, lng: 3.3792 }}
            dropoff={order.dropoffCoords || { lat: 6.5344, lng: 3.3892 }}
            showETA={true}
            height="400px"
            className="order-map"
          />
        </div>
      )}

      {order.items && order.items.length > 0 && (
        <div className="order-items">
          <h3>🛍️ Order Items</h3>
          <div className="items-list">
            {order.items.map((item, index) => (
              <div key={index} className="item-row">
                <span className="item-quantity">{item.quantity}x</span>
                <span className="item-name">{item.name}</span>
                <span className="item-price">${item.price}</span>
              </div>
            ))}
          </div>
          <div className="order-total">
            <strong>Total: ${order.total || "0.00"}</strong>
          </div>
        </div>
      )}

      {nextActions.length > 0 && (
        <div className="action-section">
          <h3>⚡ Next Actions</h3>
          <div className="action-buttons">
            {nextActions.map((action) => (
              <button
                key={action.status}
                className="action-btn"
                style={{ backgroundColor: action.color }}
                onClick={() => updateOrderStatus(action.status)}
                disabled={updating}
              >
                {updating ? "Updating..." : action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {order.status === "delivered" && (
        <div className="completion-message">
          <div className="success-icon">🎉</div>
          <h3>Order Completed Successfully!</h3>
          <p>Great job! The customer has received their order.</p>
        </div>
      )}

      <div className="emergency-section">
        <h3>🆘 Need Help?</h3>
        <div className="emergency-buttons">
          <a href="tel:+1234567890" className="emergency-btn">
            📞 Call Support
          </a>
          <button 
            className="emergency-btn" 
            onClick={() => notify('Support chat feature coming soon!', 'info')}
          >
            💬 Chat Support
          </button>
        </div>
      </div>
    </div>
  );
}