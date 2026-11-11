import React from "react";
import { useCartStore } from "../store/cartStore";
import { formatCurrency } from "../utils/currency";

export default function CheckoutBar() {
  const { getItemCount, getSubtotal, error, clearError } = useCartStore();
  const items = getItemCount();
  const subtotal = getSubtotal();

  if (items === 0) return null;

  return (
    <div style={{
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      background: "#fff",
      borderTop: "2px solid #f0f0f0",
      padding: "16px 20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: 998,
      boxShadow: "0 -2px 10px rgba(0,0,0,0.1)"
    }}>
      <div>
        <div style={{
          fontWeight: 600,
          fontSize: "16px",
          color: "#1a1a1a",
          marginBottom: 2
        }}>
          {items} {items === 1 ? 'item' : 'items'}
        </div>
        <div style={{
          color: "#E83A2E",
          fontSize: "18px",
          fontWeight: 700
        }}>
          {formatCurrency(subtotal)}
        </div>
      </div>
      <div>
        <button 
          style={{
            background: "#E83A2E",
            color: "#fff",
            padding: "14px 24px",
            border: "none",
            borderRadius: 8,
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(232, 58, 46, 0.2)",
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => e.target.style.background = "#d63384"}
          onMouseOut={(e) => e.target.style.background = "#E83A2E"}
          onClick={() => window.location.href = "/checkout"}
        >
          Checkout →
        </button>
      </div>
    </div>
  );
}