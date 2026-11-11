// Utility functions for vendor cart logic
import { ref, set, remove, onValue, push } from "firebase/database";
import { database } from "../config/firebase";

export function addToCart(vendorId, item) {
  const itemRef = ref(database, `/carts/${vendorId}/items/${item.id}`);
  set(itemRef, item);
}

export function removeFromCart(vendorId, itemId) {
  const itemRef = ref(database, `/carts/${vendorId}/items/${itemId}`);
  remove(itemRef);
}

export function getCartCount(vendorId) {
  // This is a sync stub; real usage should use state/hooks
  let count = 0;
  // For demo, fallback to localStorage if offline
  try {
    const cart = JSON.parse(localStorage.getItem(`go7-cart-${vendorId}`) || "{}");
    count = Object.keys(cart).length;
  } catch {}
  return count;
}

export async function calculateTotal(vendorId) {
  const cartRef = ref(database, `/carts/${vendorId}/items`);
  return new Promise((resolve) => {
    onValue(cartRef, (snapshot) => {
      const data = snapshot.val() || {};
      const total = Object.values(data).reduce((sum, item) => sum + (item.price || 0), 0);
      resolve(total);
    }, { onlyOnce: true });
  });
}

export async function createOrderFromCart(vendorId, customerDetails) {
  const cartRef = ref(database, `/carts/${vendorId}/items`);
  let cartItems = [];
  await new Promise((resolve) => {
    onValue(cartRef, (snapshot) => {
      const data = snapshot.val() || {};
      cartItems = Object.entries(data).map(([id, item]) => ({ id, ...item }));
      resolve();
    }, { onlyOnce: true });
  });
  const orderRef = push(ref(database, `/orders`));
  const orderId = orderRef.key;
  await set(orderRef, {
    vendorId,
    items: cartItems,
    customer: customerDetails,
    status: "pending",
    createdAt: Date.now(),
    pickup: `/vendors/${vendorId}`
  });
  await remove(ref(database, `/carts/${vendorId}`));
  // Simulate Cloud Function
  window.assignNearestRider(orderId);
  return orderId;
}
