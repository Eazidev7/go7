import { httpsCallable } from "firebase/functions";
import { doc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { functions, db } from "../firebase.js";

// Cloud Function callable references
const assignRiderCallable = httpsCallable(functions, "assignRider");
const riderRespondCallable = httpsCallable(functions, "riderRespond");

/**
 * Create a new order and trigger auto-dispatch
 */
export async function createOrderAndAssign(payload) {
  const id = crypto.randomUUID();
  const orderRef = doc(db, "orders", id);
  await setDoc(orderRef, {
    ...payload,
    createdAt: serverTimestamp(),
    status: "pending",
    assignmentHistory: [],
  });
  const assign = httpsCallable(functions, "assignRider");
  const res = await assign({ orderId: id });
  return { orderId: id, result: res.data };
}

export async function riderAccept(orderId, riderId) {
  const fn = httpsCallable(functions, "riderRespond");
  return (await fn({ orderId, riderId, action: "accept" })).data;
}

export async function riderReject(orderId, riderId) {
  const fn = httpsCallable(functions, "riderRespond");
  return (await fn({ orderId, riderId, action: "reject" })).data;
}

/**
 * Create a new order and trigger auto-dispatch (legacy function)
 */
export async function createOrder(orderData) {
  try {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const orderRef = doc(db, "orders", orderId);
    
    const order = {
      ...orderData,
      id: orderId,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      assignmentHistory: []
    };
    
    await setDoc(orderRef, order);
    
    // Trigger auto-assignment
    const result = await assignRiderCallable({ orderId });
    
    return {
      success: true,
      orderId,
      assignment: result.data
    };
  } catch (error) {
    console.error("Error creating order:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Manually assign a rider to an order
 */
export async function assignRider(orderId) {
  try {
    const result = await assignRiderCallable({ orderId });
    return {
      success: result.data.ok,
      data: result.data
    };
  } catch (error) {
    console.error("Error assigning rider:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle rider response to assignment (accept/reject)
 */
export async function riderRespond(orderId, riderId, action) {
  try {
    const result = await riderRespondCallable({ 
      orderId, 
      riderId, 
      action 
    });
    
    return {
      success: result.data.ok,
      data: result.data
    };
  } catch (error) {
    console.error("Error processing rider response:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get order by ID with real-time updates
 */
export function subscribeToOrder(orderId, callback) {
  const orderRef = doc(db, "orders", orderId);
  
  return onSnapshot(orderRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({
        success: true,
        data: { id: snapshot.id, ...snapshot.data() }
      });
    } else {
      callback({
        success: false,
        error: "Order not found"
      });
    }
  }, (error) => {
    console.error("Error subscribing to order:", error);
    callback({
      success: false,
      error: error.message
    });
  });
}

/**
 * Helper function to format order status for display
 */
export function getOrderStatusDisplay(status) {
  const statusMap = {
    pending: "Waiting for Rider",
    assigning: "Finding Rider...",
    assigned: "Rider Assigned",
    en_route: "Rider En Route",
    picking_up: "Picking Up",
    delivering: "Delivering",
    completed: "Completed",
    cancelled: "Cancelled"
  };
  
  return statusMap[status] || status;
}

/**
 * Helper function to calculate order duration
 */
export function getOrderDuration(createdAt) {
  if (!createdAt) return "Unknown";
  
  const now = new Date();
  const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h ${diffMins % 60}m ago`;
}
