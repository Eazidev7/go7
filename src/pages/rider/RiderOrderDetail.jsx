// Go7 Rider Order Detail Page - Status Update Management
// Real-time Firestore sync with notification triggers

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { useNotification } from "../../contexts/NotificationContext";
import "./OrderDetail.css";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotification();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    console.log('📦 Loading order details for:', id);
    
    // Real-time listener for order updates
    const orderRef = doc(db, "orders", id);
    const unsubscribe = onSnapshot(orderRef, 
      (doc) => {
        if (doc.exists()) {
          const orderData = { id: doc.id, ...doc.data() };
          console.log('📦 Order data received:', orderData);
          setOrder(orderData);
        } else {
          console.error('❌ Order not found');
          notify('❌ Order not found', 'error');
          navigate('/rider/orders');
        }
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error loading order:', error);
        notify('❌ Failed to load order details', 'error');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [id, notify, navigate]);

  const updateStatus = async (newStatus) => {
    if (updating) return;
    
    setUpdating(true);
    
    try {
      const orderRef = doc(db, "orders", id);
      const updateData = {
        status: newStatus,
        updatedAt: Date.now(),
        [`${newStatus}At`]: Date.now() // Track specific status timestamps
      };

      console.log('🔄 Updating order status:', { id, newStatus });
      
      await updateDoc(orderRef, updateData);
      
      // Show success notification
      const statusMessages = {
        picked_up: '📦 Order marked as picked up!',
        delivering: '🚚 Delivery started!',
        delivered: '✅ Order completed successfully!'
      };
      
      notify(statusMessages[newStatus] || `Status updated to ${newStatus}`, 'success');
      
      // Navigate back to orders list if delivered
      if (newStatus === 'delivered') {
        setTimeout(() => {
          navigate('/rider/orders');
        }, 1500);
      }
      
    } catch (error) {
      console.error('❌ Error updating status:', error);
      notify('❌ Failed to update order status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "assigned": return "#fbbf24";
      case "picked_up": return "#3b82f6";
      case "delivering": return "#f59e0b";
      case "delivered": return "#10b981";
      default: return "#6b7280";
    }
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

  const formatTime = (timestamp) => {
    if (!timestamp) return "Not set";
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCallCustomer = () => {
    if (order?.customer?.phone) {
      window.location.href = `tel:${order.customer.phone}`;
    } else {
      notify('📞 Customer phone not available', 'warning');
    }
  };

  const handleNavigate = () => {
    const pickup = order?.pickup || order?.restaurant?.address;
    const dropoff = order?.drop || order?.customer?.address;
    
    if (pickup && dropoff) {
      const url = `https://www.google.com/maps/dir/${encodeURIComponent(pickup)}/${encodeURIComponent(dropoff)}`;
      window.open(url, '_blank');
    } else {
      notify('📍 Address information not complete', 'warning');
    }
  };

  if (loading) {
    return (
      <div className="order-detail">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-detail">
        <div className="error-state">
          <h3>❌ Order Not Found</h3>
          <p>This order may have been cancelled or removed.</p>
          <button onClick={() => navigate('/rider/orders')}>
            ← Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const nextActions = getNextActions(order.status);

  return (
    <div className="order-detail">
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/rider/orders')}>
          ← Back
        </button>
        <div className="order-info">
          <h1>Order #{order.id.slice(-6)}</h1>
          <div 
            className="status-badge large" 
            style={{ backgroundColor: getStatusColor(order.status) }}
          >
            {order.status.replace('_', ' ').toUpperCase()}
          </div>
        </div>
      </div>

      {/* Order Timeline */}
      <div className="order-timeline">
        <h3>📋 Order Timeline</h3>
        <div className="timeline-items">
          <div className={`timeline-item ${order.status !== 'assigned' ? 'completed' : 'active'}`}>
            <div className="timeline-icon">📋</div>
            <div className="timeline-content">
              <p className="timeline-status">Order Assigned</p>
              <p className="timeline-time">{formatTime(order.createdAt)}</p>
            </div>
          </div>
          
          <div className={`timeline-item ${['picked_up', 'delivering', 'delivered'].includes(order.status) ? 'completed' : order.status === 'assigned' ? 'next' : 'pending'}`}>
            <div className="timeline-icon">📦</div>
            <div className="timeline-content">
              <p className="timeline-status">Picked Up</p>
              <p className="timeline-time">{formatTime(order.picked_upAt)}</p>
            </div>
          </div>
          
          <div className={`timeline-item ${['delivering', 'delivered'].includes(order.status) ? 'completed' : order.status === 'picked_up' ? 'next' : 'pending'}`}>
            <div className="timeline-icon">🚚</div>
            <div className="timeline-content">
              <p className="timeline-status">Out for Delivery</p>
              <p className="timeline-time">{formatTime(order.deliveringAt)}</p>
            </div>
          </div>
          
          <div className={`timeline-item ${order.status === 'delivered' ? 'completed' : order.status === 'delivering' ? 'next' : 'pending'}`}>
            <div className="timeline-icon">✅</div>
            <div className="timeline-content">
              <p className="timeline-status">Delivered</p>
              <p className="timeline-time">{formatTime(order.deliveredAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Location Information */}
      <div className="location-card">
        <h3>📍 Delivery Route</h3>
        
        <div className="location-details">
          <div className="pickup-section">
            <div className="location-header">
              <span className="location-icon pickup">📍</span>
              <h4>Pickup Location</h4>
            </div>
            <p className="address">{order.pickup || order.restaurant?.name}</p>
            {order.restaurant?.address && (
              <p className="sub-address">{order.restaurant.address}</p>
            )}
          </div>

          <div className="route-connector">
            <div className="route-line"></div>
            <div className="route-arrow">↓</div>
          </div>

          <div className="dropoff-section">
            <div className="location-header">
              <span className="location-icon dropoff">🏁</span>
              <h4>Drop-off Location</h4>
            </div>
            <p className="address">{order.drop || order.customer?.address}</p>
          </div>
        </div>

        <button className="navigate-btn" onClick={handleNavigate}>
          🗺️ Open in Maps
        </button>
      </div>

      {/* Customer Information */}
      {order.customer && (
        <div className="customer-card">
          <h3>👤 Customer Details</h3>
          <div className="customer-info">
            <div className="customer-details">
              <p className="customer-name">{order.customer.name}</p>
              <p className="customer-phone">{order.customer.phone}</p>
              {order.customer.notes && (
                <div className="customer-notes">
                  <p><strong>Special Instructions:</strong></p>
                  <p>{order.customer.notes}</p>
                </div>
              )}
            </div>
            <button className="call-btn" onClick={handleCallCustomer}>
              📞 Call
            </button>
          </div>
        </div>
      )}

      {/* Order Items */}
      {order.items && order.items.length > 0 && (
        <div className="items-card">
          <h3>🛍️ Order Items</h3>
          <div className="items-list">
            {order.items.map((item, index) => (
              <div key={index} className="item-row">
                <span className="item-name">{item.name}</span>
                <span className="item-quantity">x{item.quantity}</span>
                <span className="item-price">₦{item.price?.toLocaleString()}</span>
              </div>
            ))}
          </div>
          {order.totalAmount && (
            <div className="total-amount">
              <strong>Total: ₦{order.totalAmount.toLocaleString()}</strong>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {nextActions.length > 0 && (
        <div className="action-buttons">
          <h3>🎯 Next Actions</h3>
          {nextActions.map((action) => (
            <button
              key={action.status}
              className={`action-btn ${updating ? 'updating' : ''}`}
              style={{ backgroundColor: action.color }}
              onClick={() => updateStatus(action.status)}
              disabled={updating}
            >
              {updating ? '🔄 Updating...' : action.label}
            </button>
          ))}
        </div>
      )}

      {/* Completed State */}
      {order.status === 'delivered' && (
        <div className="completion-message">
          <h3>🎉 Delivery Completed!</h3>
          <p>Great job! The order has been successfully delivered.</p>
          <button onClick={() => navigate('/rider/orders')}>
            ← Back to Orders
          </button>
        </div>
      )}
    </div>
  );
}