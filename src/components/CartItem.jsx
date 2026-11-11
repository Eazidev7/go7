import React from "react";
import { useCartStore } from "../store/cartStore";
import { formatCurrency } from "../utils/currency";

export default function CartItem({ item, index }) {
  const { updateQty, removeFromCart } = useCartStore();

  const itemTotal = item.totalPrice || ((item.price + (item.options ? Object.values(item.optionPrices || {}).reduce((sum, price) => sum + price, 0) : 0)) * (item.quantity || 1));

  return (
    <div className="cart-item" style={{
      display: "flex", 
      gap: 12, 
      padding: 16, 
      borderBottom: "1px solid #f0f0f0",
      backgroundColor: "#fff"
    }}>
      <img 
        src={item.imageUrl || "/placeholder.png"} 
        alt={item.name} 
        style={{
          width: 72,
          height: 72,
          objectFit: "cover",
          borderRadius: 8,
          backgroundColor: "#f5f5f5"
        }}
        onError={(e) => {
          e.target.src = "/placeholder-food.jpg";
        }}
      />
      <div style={{flex: 1}}>
        <div style={{
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "flex-start"
        }}>
          <div style={{flex: 1, paddingRight: 12}}>
            <div style={{
              fontWeight: 600,
              fontSize: "16px",
              color: "#1a1a1a",
              marginBottom: 4
            }}>
              {item.name}
            </div>
            <div style={{
              fontSize: 13, 
              color: "#666",
              marginBottom: 6
            }}>
              {item.vendorName || item.vendorId}
            </div>
            {item.options && Object.keys(item.options).length > 0 && (
              <div style={{
                marginTop: 6, 
                fontSize: 13, 
                color: "#444",
                fontStyle: "italic"
              }}>
                Options: {Object.entries(item.options).map(([key, value]) => `${key}: ${value}`).join(", ")}
              </div>
            )}
          </div>

          <div style={{textAlign: "right"}}>
            <div style={{
              fontWeight: 700,
              fontSize: "16px",
              color: "#E83A2E"
            }}>
              {formatCurrency(itemTotal)}
            </div>
          </div>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center", 
          gap: 12, 
          marginTop: 12,
          justifyContent: "space-between"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid #e0e0e0",
            borderRadius: 6,
            backgroundColor: "#fff"
          }}>
            <button 
              onClick={() => updateQty(item.productId, Math.max(1, (item.quantity || 1) - 1))}
              style={{
                width: 32,
                height: 32,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: "600",
                color: "#E83A2E"
              }}
            >
              -
            </button>
            <div style={{
              padding: "0 12px",
              fontWeight: 600,
              minWidth: "32px",
              textAlign: "center"
            }}>
              {item.quantity || 1}
            </div>
            <button 
              onClick={() => updateQty(item.productId, (item.quantity || 1) + 1))
              style={{
                width: 32,
                height: 32,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: "600",
                color: "#E83A2E"
              }}
            >
              +
            </button>
          </div>
          
          <button 
            style={{
              background: "transparent",
              border: "1px solid #ff4757",
              color: "#ff4757",
              padding: "6px 12px",
              borderRadius: 4,
              fontSize: "13px",
              cursor: "pointer",
              fontWeight: 500
            }} 
            onClick={() => removeFromCart(item.productId)}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}