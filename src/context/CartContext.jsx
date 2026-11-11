import React, { createContext, useContext, useEffect, useReducer } from "react";

const CartStateContext = createContext();
const CartDispatchContext = createContext();

const LOCAL_KEY = "go7_cart_v1";

function cartReducer(state, action) {
  switch (action.type) {
    case "INITIALIZE":
      return action.payload || { items: [] };
    case "ADD_ITEM": {
      const item = action.payload; // { id, name, price, qty, addons: [] , vendorId, ...}
      // normalize addons: array of {id, name, price, qty}
      const foundIndex = state.items.findIndex(
        (i) =>
          i.id === item.id &&
          JSON.stringify(i.addons || []) === JSON.stringify(item.addons || [])
      );
      let newItems = [...state.items];
      if (foundIndex > -1) {
        // increment qty
        newItems[foundIndex].qty += item.qty || 1;
      } else {
        newItems.push({
          ...item,
          qty: item.qty || 1,
        });
      }
      return { ...state, items: newItems };
    }
    case "UPDATE_QTY": {
      const { cartIndex, qty } = action.payload;
      const newItems = state.items.map((it, idx) =>
        idx === cartIndex ? { ...it, qty: Math.max(1, qty) } : it
      );
      return { ...state, items: newItems };
    }
    case "SET_QTY_BY_PRODUCT": {
      const { productId, addonsKey, qty } = action.payload;
      const idx = state.items.findIndex(
        (i) =>
          i.id === productId &&
          JSON.stringify(i.addons || []) === JSON.stringify(addonsKey || [])
      );
      if (idx === -1) return state;
      const newItems = [...state.items];
      newItems[idx].qty = Math.max(1, qty);
      return { ...state, items: newItems };
    }
    case "REMOVE_ITEM": {
      const { index } = action.payload;
      const newItems = state.items.filter((_, i) => i !== index);
      return { ...state, items: newItems };
    }
    case "REMOVE_BY_MATCH": {
      // payload: { id, addonsKey }
      const { id, addonsKey } = action.payload;
      const newItems = state.items.filter(
        (it) =>
          !(it.id === id && JSON.stringify(it.addons || []) === JSON.stringify(addonsKey || []))
      );
      return { ...state, items: newItems };
    }
    case "CLEAR_CART":
      return { items: [] };
    default:
      throw new Error(`Unknown action ${action.type}`);
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // init from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        dispatch({ type: "INITIALIZE", payload: parsed });
      }
    } catch (e) {
      console.warn("Cart init err", e);
    }
  }, []);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Cart persist err", e);
    }
  }, [state]);

  return (
    <CartStateContext.Provider value={state}>
      <CartDispatchContext.Provider value={dispatch}>
        {children}
      </CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}

// hooks
export function useCartState() {
  const ctx = useContext(CartStateContext);
  if (ctx === undefined) throw new Error("useCartState must be used inside CartProvider");
  return ctx;
}
export function useCartDispatch() {
  const ctx = useContext(CartDispatchContext);
  if (ctx === undefined) throw new Error("useCartDispatch must be used inside CartProvider");
  return ctx;
}

// helper API to be used by components
export function useCart() {
  const state = useCartState();
  const dispatch = useCartDispatch();

  function addToCart(product) {
    // product: { id, name, price, qty, addons: [{id,name,price,qty}] , vendorId, vendorName }
    dispatch({ type: "ADD_ITEM", payload: product });
  }

  function updateQtyByIndex(index, qty) {
    dispatch({ type: "UPDATE_QTY", payload: { cartIndex: index, qty } });
  }

  function setQtyByProduct(productId, addonsKey, qty) {
    dispatch({ type: "SET_QTY_BY_PRODUCT", payload: { productId, addonsKey, qty } });
  }

  function removeByIndex(index) {
    dispatch({ type: "REMOVE_ITEM", payload: { index } });
  }

  function removeByMatch(id, addonsKey) {
    dispatch({ type: "REMOVE_BY_MATCH", payload: { id, addonsKey } });
  }

  function clearCart() {
    dispatch({ type: "CLEAR_CART" });
  }

  function getItemCount() {
    return state.items.reduce((s, i) => s + i.qty, 0);
  }

  function getSubtotal() {
    return state.items.reduce((s, item) => {
      const addonsTotal = (item.addons || []).reduce((a, ad) => a + (ad.price || 0) * (ad.qty || 1), 0);
      return s + (item.price || 0) * item.qty + addonsTotal * item.qty;
    }, 0);
  }

  return {
    items: state.items,
    addToCart,
    updateQtyByIndex,
    setQtyByProduct,
    removeByIndex,
    removeByMatch,
    clearCart,
    getItemCount,
    getSubtotal,
  };
}