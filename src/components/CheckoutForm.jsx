import React, { useState } from "react";
import { ref, push, set, remove, onValue } from "firebase/database";
import { database } from "../config/firebase";
import Swal from "sweetalert2";

const CheckoutForm = ({ vendorId, total, onClose }) => {
  const [customer, setCustomer] = useState({ name: "", contact: "", address: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Get cart items
    const cartRef = ref(database, `/carts/${vendorId}/items`);
    let cartItems = [];
    await new Promise((resolve) => {
      onValue(cartRef, (snapshot) => {
        const data = snapshot.val() || {};
        cartItems = Object.entries(data).map(([id, item]) => ({ id, ...item }));
        resolve();
      }, { onlyOnce: true });
    });
    // Create order
    const orderRef = push(ref(database, `/orders`));
    const orderId = orderRef.key;
    await set(orderRef, {
      vendorId,
      items: cartItems,
      customer,
      total,
      status: "pending",
      createdAt: Date.now(),
      pickup: `/vendors/${vendorId}`
    });
    // Clear cart
    await remove(ref(database, `/carts/${vendorId}`));
    // Trigger assignment (simulate Cloud Function)
    window.assignNearestRider(orderId);
    setLoading(false);
    Swal.fire({
      icon: "success",
      title: "Order placed successfully 🚴‍♂️",
      text: "A rider will be assigned shortly!",
      confirmButtonColor: "#E53935"
    });
    onClose();
  };

  return (
    <form className="checkout-form" onSubmit={handleSubmit}>
      <h4>Checkout</h4>
      <input name="name" placeholder="Customer Name" value={customer.name} onChange={handleChange} required />
      <input name="contact" placeholder="Contact" value={customer.contact} onChange={handleChange} required />
      <input name="address" placeholder="Dropoff Address" value={customer.address} onChange={handleChange} required />
      <div className="checkout-total">Grand Total: ₦{total}</div>
      <button type="submit" disabled={loading} className="place-order-btn">
        {loading ? "Placing Order..." : "Place Order"}
      </button>
    </form>
  );
};

export default CheckoutForm;
