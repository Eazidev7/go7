// 🚀 GO7 ORDER UTILITIES — FULL INTEGRATION (Nov 2025)
// Handles: Order creation, status updates, and Firestore operations

import { db } from "../config/firebase";
import {
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  getDoc
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

/**
 * 🔥 Create Order in Firestore
 * Structure: /orders/{orderId} (flat structure for easier querying by all parties)
 * 
 * @param {Object} orderData - Complete order information
 * @returns {Promise<Object>} - Order reference with ID
 */
export const createOrder = async (orderData) => {
  try {
    // Generate unique order ID
    const orderId = "GO7-" + uuidv4().slice(0, 8).toUpperCase();
    
    // Create order document with generated ID
    const orderRef = doc(db, "orders", orderId);
    
    const fullOrderData = {
      orderId,
      ...orderData,
      status: "Requested", // Initial status
      statusHistory: [
        {
          status: "Requested",
          timestamp: new Date(),
          note: "Order placed successfully"
        }
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(orderRef, fullOrderData);
    
    console.log("✅ Order created:", orderId);
    return { id: orderId, ...fullOrderData };
  } catch (error) {
    console.error("❌ Error creating order:", error);
    throw error;
  }
};

/**
 * 🔄 Update Order Status
 * Updates order status and adds to status history
 * 
 * @param {string} orderId - Order ID
 * @param {string} newStatus - New status (Requested, Assigned, En Route, Delivered, Cancelled)
 * @param {string} note - Optional note for status change
 * @param {Object} additionalData - Additional data to update (e.g., riderId, riderName)
 */
export const updateOrderStatus = async (orderId, newStatus, note = "", additionalData = {}) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      throw new Error("Order not found");
    }
    
    const currentOrder = orderSnap.data();
    const statusHistory = currentOrder.statusHistory || [];
    
    // Add new status to history
    statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      note: note || `Order status updated to ${newStatus}`
    });
    
    await updateDoc(orderRef, {
      status: newStatus,
      statusHistory,
      updatedAt: serverTimestamp(),
      ...additionalData
    });
    
    console.log(`✅ Order ${orderId} status updated to ${newStatus}`);
    return true;
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    throw error;
  }
};

/**
 * 📍 Assign Rider to Order
 * 
 * @param {string} orderId - Order ID
 * @param {Object} riderData - Rider information { riderId, riderName, riderPhone }
 */
export const assignRiderToOrder = async (orderId, riderData) => {
  try {
    await updateOrderStatus(
      orderId, 
      "Assigned", 
      `Rider ${riderData.riderName} assigned to order`,
      {
        riderId: riderData.riderId,
        riderName: riderData.riderName,
        riderPhone: riderData.riderPhone,
        assignedAt: serverTimestamp()
      }
    );
    
    console.log(`✅ Rider ${riderData.riderName} assigned to order ${orderId}`);
    return true;
  } catch (error) {
    console.error("❌ Error assigning rider:", error);
    throw error;
  }
};

/**
 * 🚚 Mark Order as En Route
 * 
 * @param {string} orderId - Order ID
 */
export const markOrderEnRoute = async (orderId) => {
  try {
    await updateOrderStatus(
      orderId,
      "En Route",
      "Order is on the way to delivery address"
    );
    
    console.log(`✅ Order ${orderId} marked as En Route`);
    return true;
  } catch (error) {
    console.error("❌ Error marking order en route:", error);
    throw error;
  }
};

/**
 * ✅ Mark Order as Delivered
 * 
 * @param {string} orderId - Order ID
 * @param {string} deliveryNote - Optional delivery confirmation note
 */
export const markOrderDelivered = async (orderId, deliveryNote = "") => {
  try {
    await updateOrderStatus(
      orderId,
      "Delivered",
      deliveryNote || "Order delivered successfully",
      {
        deliveredAt: serverTimestamp()
      }
    );
    
    console.log(`✅ Order ${orderId} marked as Delivered`);
    return true;
  } catch (error) {
    console.error("❌ Error marking order delivered:", error);
    throw error;
  }
};

/**
 * ❌ Cancel Order
 * 
 * @param {string} orderId - Order ID
 * @param {string} reason - Cancellation reason
 */
export const cancelOrder = async (orderId, reason = "") => {
  try {
    await updateOrderStatus(
      orderId,
      "Cancelled",
      reason || "Order cancelled by user",
      {
        cancelledAt: serverTimestamp()
      }
    );
    
    console.log(`✅ Order ${orderId} cancelled`);
    return true;
  } catch (error) {
    console.error("❌ Error cancelling order:", error);
    throw error;
  }
};

/**
 * 📊 Get Order Statistics for User
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Order stats
 */
export const getUserOrderStats = async (userId) => {
  try {
    // This would typically use Cloud Functions for better performance
    // For now, we'll calculate on client side
    
    return {
      totalOrders: 0,
      activeOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0
    };
  } catch (error) {
    console.error("❌ Error getting order stats:", error);
    return null;
  }
};
