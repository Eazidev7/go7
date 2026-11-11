// 🚀 GO7 ORDER HISTORY COMPONENT — Live Updates (Nov 2025)
// Real-time order tracking with Firestore snapshots

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit
} from "firebase/firestore";
import { Package, Clock, CheckCircle, XCircle, Truck, ChevronRight, Droplet } from "lucide-react";
import "./OrderHistory.css";

export default function OrderHistory({ userId }) {
  const [orders, setOrders] = useState([]);
  const [fuelOrders, setFuelOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // all, active, completed
  const navigate = useNavigate();

  // Load regular orders
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ordersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          orderType: "order",
          ...doc.data()
        }));
        setOrders(ordersData);
        setLoading(false);
      },
      (error) => {
        console.error("❌ Error loading orders:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Load fuel/CNG orders
  useEffect(() => {
    if (!userId) return;

    const fuelRef = collection(db, "fuelOrders");
    const q = query(fuelRef, where("customerId", "==", userId), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const unit = data.fuelType === "cng" ? "KG" : "Litres";
          const fuelType = (data.fuelType || "fuel").toUpperCase();
          const status = data.status
            ? data.status.charAt(0).toUpperCase() + data.status.slice(1)
            : "Unknown";

          return {
            id: docSnap.id,
            orderId: data.orderRef || docSnap.id,
            orderType: "fuel",
            status,
            total: data.totalAmount || 0,
            createdAt: data.createdAt,
            items: [
              { name: `${fuelType} - ${data.volume || 0} ${unit}` }
            ]
          };
        });

        // Client-side sort since we can't orderBy a different field without an index
        data.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() || b.createdAt || 0) -
            (a.createdAt?.toMillis?.() || a.createdAt || 0)
        );
        setFuelOrders(data);
      },
      (error) => {
        console.error("❌ Error loading fuel orders:", error);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const allOrders = React.useMemo(() => {
    return [...orders, ...fuelOrders].sort(
      (a, b) =>
        (b.createdAt?.toMillis?.() || b.createdAt || 0) -
        (a.createdAt?.toMillis?.() || a.createdAt || 0)
    );
  }, [orders, fuelOrders]);

  // Filter orders based on active tab
  const filteredOrders = allOrders.filter((order) => {
    if (activeTab === "active") {
      return ["Requested", "Pending", "Assigned", "En Route"].includes(order.status);
    } else if (activeTab === "completed") {
      return ["Delivered", "Cancelled"].includes(order.status);
    }
    return true; // all
  });

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "Requested":
      case "Pending":
        return <Clock className="status-icon requested" size={18} />;
      case "Assigned":
        return <Package className="status-icon assigned" size={18} />;
      case "En Route":
        return <Truck className="status-icon enroute" size={18} />;
      case "Delivered":
        return <CheckCircle className="status-icon delivered" size={18} />;
      case "Cancelled":
        return <XCircle className="status-icon cancelled" size={18} />;
      default:
        return <Package className="status-icon" size={18} />;
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="order-history-loading">
        <div className="spinner"></div>
        <p>Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="order-history">
      <div className="order-history-header">
        <h2>My Orders</h2>
        <div className="order-tabs">
          <button
            className={`tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All ({allOrders.length})
          </button>
          <button
            className={`tab ${activeTab === "active" ? "active" : ""}`}
            onClick={() => setActiveTab("active")}
          >
            Active ({allOrders.filter(o => ["Requested", "Pending", "Assigned", "En Route"].includes(o.status)).length})
          </button>
          <button
            className={`tab ${activeTab === "completed" ? "active" : ""}`}
            onClick={() => setActiveTab("completed")}
          >
            Completed ({allOrders.filter(o => ["Delivered", "Cancelled"].includes(o.status)).length})
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="no-orders">
          <Package size={64} className="no-orders-icon" />
          <h3>No {activeTab === "all" ? "" : activeTab} orders yet</h3>
          <p>Your order history will appear here</p>
          <button
            className="go7-btn"
            onClick={() => navigate("/explore")}
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="order-card"
              onClick={() =>
                order.orderType === "fuel"
                  ? navigate(`/track/${order.id}`)
                  : navigate(`/smart-tracking/${order.orderId}`)
              }
            >
              <div className="order-card-header">
                <div className="order-id">
                  <span className="id-label">Order ID:</span>
                  <span className="id-value">#{order.orderId}</span>
                </div>
                <div className="order-time">{formatDate(order.createdAt)}</div>
              </div>

              <div className="order-card-body">
                <div className="order-items-preview">
                  {order.items && order.items.length > 0 && (
                    <>
                      {order.items[0].image && (
                        <img
                          src={order.items[0].image}
                          alt={order.items[0].name}
                          className="order-thumb"
                        />
                      )}
                      {order.orderType === "fuel" && (
                        <Droplet size={40} className="order-thumb p-2 text-blue-500" />
                      )}
                      <div className="order-items-text">
                        <p className="item-name">{order.items[0].name}</p>
                        {order.items.length > 1 && (
                          <p className="item-count">
                            +{order.items.length - 1} more item{order.items.length > 2 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="order-total">
                  <span className="total-label">Total</span>
                  <span className="total-value">₦{order.total?.toLocaleString() || 0}</span>
                </div>
              </div>

              <div className="order-card-footer">
                <div className="order-status">
                  {getStatusIcon(order.status)}
                  <span className={`status-text ${order.status?.toLowerCase().replace(" ", "-")}`}>
                    {order.status}
                  </span>
                </div>
                <button className="track-btn">
                  Track Order <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
