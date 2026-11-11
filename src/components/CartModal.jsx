import React, { useEffect, useState } from "react";
import { ref, onValue, remove } from "firebase/database";
import { database } from "../config/firebase";
import CheckoutForm from "./CheckoutForm";

const CartModal = ({ vendorId, onClose }) => {
  const [cartItems, setCartItems] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const cartRef = ref(database, `/carts/${vendorId}/items`);
    onValue(cartRef, (snapshot) => {
      const data = snapshot.val() || {};
      const items = Object.entries(data).map(([id, item]) => ({ id, ...item }));
      setCartItems(items);
      setTotal(items.reduce((sum, item) => sum + (item.price || 0), 0));
    });
  }, [vendorId]);

  return (
    <div className="cart-modal-overlay">
      <div className="cart-modal">
        <h3>Your Cart</h3>
        <ul>
          {cartItems.map((item) => (
            <li key={item.id} className="cart-item">
              <span>{item.name}</span>
              <span>₦{item.price}</span>
              <button onClick={() => window.removeFromCart(vendorId, item.id)}>Remove</button>
            </li>
          ))}
        </ul>
        <div className="cart-total">Total: ₦{total}</div>
        <button className="checkout-btn" onClick={() => setShowCheckout(true)}>
          Checkout
        </button>
        <button className="close-cart-btn" onClick={onClose}>Close</button>
        {showCheckout && <CheckoutForm vendorId={vendorId} total={total} onClose={onClose} />}
      </div>
    </div>
  );
};

export default CartModal;
