// Go7 Rider Orders Page - Real Delivery Management System
// Production-ready Firestore integration with status updates

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { useNotification } from "../../contexts/NotificationContext";
import { createDemoRiderOrders } from "../../utils/riderDemoData";
import "./Orders.css";

export default function RiderOrders({ riderId = "RIDER001" }) {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active"); // active, completed, all

  useEffect(() => {
    console.log('🏍️ Setting up real-time orders listener for rider:', riderId);
    
    try {
      const q = query(
        collection(db, "orders"), 
        where("riderId", "==", riderId),
        orderBy("createdAt", "desc")
      );
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const ordersList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log('📦 Orders updated:', ordersList.length, 'total orders');
          setOrders(ordersList);
          setLoading(false);

          // Notify rider of new assignments
          if (ordersList.length > 0 && !loading) {
            const newOrders = ordersList.filter(order => 
              order.status === "assigned" && 
              Date.now() - order.createdAt < 120000 // Within last 2 minutes
            );
            
            if (newOrders.length > 0) {
              notify(`🚚 ${newOrders.length} new delivery assignment${newOrders.length > 1 ? 's' : ''}!`, "success");
            }
          }
        },
        (error) => {
          console.error('❌ Firestore listener error:', error);
          notify('Connection error - orders may not be up to date', 'error');
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('❌ Failed to setup orders listener:', error);
      setLoading(false);
      notify('Failed to load orders', 'error');
    }
  }, [riderId, notify, loading]);

  // Filter orders by tab with improved logic
  const filteredOrders = orders.filter(order => {
    if (activeTab === "active") {
      return ["assigned", "picked_up", "delivering"].includes(order.status);
    } else if (activeTab === "completed") {
      return order.status === "delivered";
    } else {
      return true; // "all" tab shows everything
    }
  });

  const getOrderStats = () => {
    const activeCount = orders.filter(o => ["assigned", "picked_up", "delivering"].includes(o.status)).length;
    const completedCount = orders.filter(o => o.status === "delivered").length;
    const todayEarnings = orders
      .filter(o => o.status === "delivered" && isToday(o.completedAt))
      .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    
    return { activeCount, completedCount, todayEarnings };
  };

  const isToday = (timestamp) => {
    if (!timestamp) return false;
    const today = new Date();
    const date = new Date(timestamp);
    return date.toDateString() === today.toDateString();
  };

  const getStatusColor = (status) => {
    const colors = {
      assigned: "#e61e25", // Go7 red for new assignments
      picked_up: "#3b82f6", // blue for picked up
      delivering: "#f59e0b", // orange for in transit
      delivered: "#10b981", // green for completed
      cancelled: "#ef4444" // red for cancelled
    };
    return colors[status] || "#6b7280";
  };

  const getStatusIcon = (status) => {
    const icons = {
      assigned: "📋",
      picked_up: "📦", 
      delivering: "�",
      delivered: "✅",
      cancelled: "❌"
    };
    return icons[status] || "�";
  };

  const getStatusText = (status) => {
    const texts = {
      assigned: "New Assignment",
      picked_up: "Picked Up",
      delivering: "Delivering", 
      delivered: "Delivered",
      cancelled: "Cancelled"
    };
    return texts[status] || status;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleOrderClick = (orderId) => {
    navigate(`/rider/order/${orderId}`);
  };

  const handleLoadDemoData = async () => {
    try {
      notify('🚀 Creating demo rider orders...', 'info');
      const result = await createDemoRiderOrders();
      
      if (result.success) {
        notify(`✅ Created ${result.count} demo orders for testing!`, 'success');
      } else {
        notify('❌ Failed to create demo orders', 'error');
      }
    } catch (error) {
      console.error('Demo data error:', error);
      notify('❌ Error creating demo orders', 'error');
    }
  };

  if (loading) {
    return (
      <div className="rider-orders">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your deliveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rider-orders">
      {/* Header */}
      <div className="orders-header">
        <div className="header-content">
          <h1>🛵 My Deliveries</h1>
          <div className="stats">
            <span className="active-count">
              {orders.filter(o => ["assigned", "picked_up", "delivering"].includes(o.status)).length} Active
            </span>
            <span className="completed-count">
              {orders.filter(o => o.status === "delivered").length} Completed
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === "active" ? "active" : ""}`}
          onClick={() => setActiveTab("active")}
        >
          🚚 Active Orders
        </button>
        <button 
          className={`tab-btn ${activeTab === "completed" ? "active" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          ✅ Completed
        </button>
      </div>

      {/* Orders List */}
      <div className="orders-list">
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {activeTab === "active" ? "🛵" : "✅"}
            </div>
            <h3>
              {activeTab === "active" 
                ? "No Active Deliveries" 
                : "No Completed Deliveries"
              }
            </h3>
            <p>
              {activeTab === "active" 
                ? "New orders will appear here when assigned to you." 
                : "Your completed deliveries will appear here."
              }
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div 
              key={order.id} 
              className="order-card" 
              onClick={() => handleOrderClick(order.id)}
            >
              <div className="order-header">
                <div className="order-id">
                  <span className="status-icon">{getStatusIcon(order.status)}</span>
                  <strong>#{order.id.slice(-6)}</strong>
                </div>
                <div 
                  className="status-badge" 
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {order.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>

              <div className="order-details">
                <div className="location-info">
                  <div className="pickup-info">
                    <span className="location-icon">📍</span>
                    <div>
                      <p className="location-label">Pickup</p>
                      <p className="location-address">{order.pickup || order.restaurant?.name}</p>
                    </div>
                  </div>
                  
                  <div className="route-line">
                    <div className="route-dots"></div>
                  </div>

                  <div className="dropoff-info">
                    <span className="location-icon">🏁</span>
                    <div>
                      <p className="location-label">Drop-off</p>
                      <p className="location-address">{order.drop || order.customer?.address}</p>
                    </div>
                  </div>
                </div>

                {order.customer && (
                  <div className="customer-info">
                    <span className="customer-icon">👤</span>
                    <div>
                      <p className="customer-name">{order.customer.name}</p>
                      <p className="customer-phone">{order.customer.phone}</p>
                    </div>
                  </div>
                )}

                <div className="order-meta">
                  <div className="time-info">
                    <span>⏰ {formatTime(order.createdAt)}</span>
                  </div>
                  {order.totalAmount && (
                    <div className="amount-info">
                      <span>💰 ₦{order.totalAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="order-actions">
                <span className="tap-hint">Tap to manage →</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions Footer */}
      {filteredOrders.length > 0 && activeTab === "active" && (
        <div className="quick-actions">
          <p>💡 <strong>Tip:</strong> Tap any order to update delivery status</p>
        </div>
      )}
    </div>
  );
}