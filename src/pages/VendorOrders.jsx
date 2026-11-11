import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../config/firebase";
import CartModal from "../components/CartModal";

const VendorOrders = ({ vendorId }) => {
  const [items, setItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const itemsRef = ref(database, `/vendors/${vendorId}/items`);
    onValue(itemsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setItems(Object.entries(data).map(([id, item]) => ({ id, ...item })));
    });
  }, [vendorId]);

  return (
    <div className="vendor-orders-container">
      <h2>Vendor Product List</h2>
      <div className="item-list">
        {items.map((item) => (
          <div key={item.id} className="item-card">
            <div className="item-info">
              <span className="item-name">{item.name}</span>
              <span className="item-price">₦{item.price}</span>
            </div>
            <button className="add-to-cart-btn" onClick={() => window.addToCart(vendorId, item)}>
              Add to Cart
            </button>
          </div>
        ))}
      </div>
      <button className="cart-float-btn" onClick={() => setCartOpen(true)}>
        🛒 <span className="cart-badge">{window.getCartCount(vendorId)}</span>
      </button>
      {cartOpen && <CartModal vendorId={vendorId} onClose={() => setCartOpen(false)} />}
    </div>
  );
};

export default VendorOrders;
