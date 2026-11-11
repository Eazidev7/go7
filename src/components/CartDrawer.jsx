import React, { useState } from "react";
import { useCartStore } from "../store/cartStore";
import CartItem from "./CartItem";
import { formatCurrency } from "../utils/currency";

export default function CartDrawer() {
  const { cart: items, clearCart, getItemCount, getSubtotal, error, clearError } = useCartStore();
  const [open, setOpen] = useState(false);

  const itemCount = getItemCount();
  const subtotal = getSubtotal();

  return (
    <>
      {/* Cart Button - Fixed Position */}
      {itemCount > 0 && (
        <div style={{
          position: "fixed", 
          right: 20, 
          bottom: 100, 
          zIndex: 999
        }}>
          <button 
            onClick={() => setOpen(true)} 
            style={{
              padding: "12px 20px",
              borderRadius: 25,
              background: "#E83A2E",
              color: "#fff",
              border: "none",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(232, 58, 46, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => e.target.style.transform = "scale(1.05)"}
            onMouseOut={(e) => e.target.style.transform = "scale(1)"}
          >
            🛒 Cart ({itemCount})
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {open && (
        <>
          {/* Overlay */}
          <div 
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 1000
            }}
            onClick={() => setOpen(false)}
          />
          
          {/* Drawer */}
          <div style={{
            position: "fixed", 
            right: 0, 
            top: 0, 
            height: "100%", 
            width: Math.min(420, window.innerWidth * 0.9), 
            background: "#fff", 
            boxShadow: "-4px 0 20px rgba(0,0,0,0.15)", 
            zIndex: 1001, 
            display: "flex", 
            flexDirection: "column"
          }}>
            {/* Header */}
            <div style={{
              padding: 20, 
              borderBottom: "1px solid #f0f0f0", 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              backgroundColor: "#fafafa"
            }}>
              <h3 style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 600,
                color: "#1a1a1a"
              }}>
                Your Cart
              </h3>
              <div style={{display: "flex", gap: 8}}>
                <button 
                  onClick={() => { 
                    if (window.confirm("Clear all items from cart?")) {
                      clearCart(); 
                      setOpen(false);
                    }
                  }} 
                  style={{
                    background: "transparent",
                    border: "1px solid #ddd",
                    color: "#666",
                    padding: "8px 12px",
                    borderRadius: 4,
                    fontSize: "14px",
                    cursor: "pointer"
                  }}
                >
                  Clear
                </button>
                <button 
                  onClick={() => setOpen(false)}
                  style={{
                    background: "#E83A2E",
                    border: "none",
                    color: "#fff",
                    padding: "8px 12px",
                    borderRadius: 4,
                    fontSize: "14px",
                    cursor: "pointer"
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div style={{
                backgroundColor: "#fee",
                border: "1px solid #fcc",
                color: "#c33",
                padding: "12px 20px",
                margin: "0 20px",
                marginTop: 10,
                borderRadius: 4,
                fontSize: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span>{error}</span>
                <button
                  onClick={clearError}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#c33",
                    cursor: "pointer",
                    fontSize: "16px",
                    padding: "0 4px"
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {/* Cart Items */}
            <div style={{flex: 1, overflowY: "auto"}}>
              {items && items.length > 0 ? (
                items.map((it, idx) => (
                  <CartItem item={it} index={idx} key={`${it.id}-${idx}`} />
                ))
              ) : (
                <div style={{
                  padding: 40,
                  textAlign: "center",
                  color: "#666"
                }}>
                  <div style={{fontSize: "48px", marginBottom: 16}}>🛒</div>
                  <div style={{fontSize: "18px", marginBottom: 8}}>Your cart is empty</div>
                  <div style={{fontSize: "14px"}}>Add some delicious items to get started!</div>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div style={{
                padding: 20, 
                borderTop: "1px solid #f0f0f0",
                backgroundColor: "#fafafa"
              }}>
                <div style={{
                  display: "flex", 
                  justifyContent: "space-between", 
                  marginBottom: 16,
                  alignItems: "center"
                }}>
                  <div style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#1a1a1a"
                  }}>
                    Subtotal ({itemCount} items)
                  </div>
                  <div style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#E83A2E"
                  }}>
                    {formatCurrency(subtotal)}
                  </div>
                </div>

                <div style={{display: "flex", gap: 12}}>
                  <button 
                    style={{
                      flex: 1,
                      padding: "14px 20px",
                      border: "1px solid #E83A2E",
                      background: "transparent",
                      color: "#E83A2E",
                      borderRadius: 8,
                      fontSize: "16px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }} 
                    onClick={() => setOpen(false)}
                  >
                    Continue Shopping
                  </button>
                  <button 
                    style={{
                      flex: 1,
                      padding: "14px 20px",
                      background: "#E83A2E",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: "16px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }} 
                    onClick={() => { 
                      setOpen(false);
                      window.location.href = "/checkout"; 
                    }}
                  >
                    Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}