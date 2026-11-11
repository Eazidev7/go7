import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Safe number conversion with fallbacks
const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? fallback : num;
};

// Safe quantity conversion (min 1)
const safeQty = (value) => {
  const qty = safeNumber(value, 1);
  return qty < 1 ? 1 : qty;
};

// Calculate line total for cart item
const calculateLineTotal = (item) => {
  const baseTotal = safeNumber(item.price) * safeQty(item.qty);
  const addonTotal = (item.addons || []).reduce((sum, addon) => {
    return sum + (safeNumber(addon.price) * safeQty(addon.qty));
  }, 0);
  
  const total = baseTotal + addonTotal;
  return safeNumber(total, 0);
};

// Validate and sanitize cart item
const sanitizeCartItem = (item) => {
  if (!item || typeof item !== 'object') {
    console.warn('Invalid cart item:', item);
    return null;
  }

  return {
    productId: String(item.productId || item.id || ''),
    vendorId: String(item.vendorId || ''),
    vendorName: String(item.vendorName || 'Unknown Vendor'),
    name: String(item.name || 'Unknown Product'),
    price: safeNumber(item.price),
    qty: safeQty(item.qty || 1),
    image: String(item.image || item.imageUrl || ''),
    addons: (item.addons || []).map(addon => ({
      addonId: String(addon.addonId || addon.id || ''),
      name: String(addon.name || 'Add-on'),
      price: safeNumber(addon.price),
      qty: safeQty(addon.qty || 1)
    })).filter(addon => addon.addonId)
  };
};

export const useCartStore = create(
  persist(
    (set, get) => ({
      // Cart state
      cart: [],
      vendorInfo: null,
      isVendorModalOpen: false,
      error: null,

      // Cart actions
      addToCart: (product, vendorId, addons = [], qty = 1) => {
        try {
          const state = get();
          
          // Sanitize input
          const sanitizedProduct = {
            ...product,
            vendorId: String(vendorId || product.vendorId || ''),
            qty: safeQty(qty),
            addons: (addons || []).map(addon => ({
              ...addon,
              price: safeNumber(addon.price),
              qty: safeQty(addon.qty || 1)
            }))
          };

          const cartItem = sanitizeCartItem(sanitizedProduct);
          
          if (!cartItem || !cartItem.productId || !cartItem.vendorId) {
            console.error('Invalid product data for cart:', product);
            set({ error: 'Invalid product data. Please try again.' });
            return false;
          }

          // Check single-vendor rule
          if (state.cart.length > 0 && state.vendorInfo?.vendorId !== cartItem.vendorId) {
            set({ 
              isVendorModalOpen: true,
              vendorInfo: {
                currentVendor: state.vendorInfo?.vendorName || 'Current Vendor',
                newVendor: cartItem.vendorName,
                newVendorId: cartItem.vendorId,
                pendingProduct: cartItem
              }
            });
            return false;
          }

          // Find existing item
          const existingItemIndex = state.cart.findIndex(item => 
            item.productId === cartItem.productId && 
            JSON.stringify(item.addons) === JSON.stringify(cartItem.addons)
          );

          let newCart;
          if (existingItemIndex >= 0) {
            // Update existing item
            newCart = [...state.cart];
            newCart[existingItemIndex] = {
              ...newCart[existingItemIndex],
              qty: safeQty(newCart[existingItemIndex].qty + cartItem.qty)
            };
          } else {
            // Add new item
            newCart = [...state.cart, cartItem];
          }

          set({ 
            cart: newCart,
            vendorInfo: {
              vendorId: cartItem.vendorId,
              vendorName: cartItem.vendorName
            },
            error: null
          });

          return true;
        } catch (error) {
          console.error('Error adding to cart:', error);
          set({ error: 'Failed to add item to cart.' });
          return false;
        }
      },

      removeFromCart: (productId) => {
        const state = get();
        const newCart = state.cart.filter(item => item.productId !== productId);
        
        set({ 
          cart: newCart,
          vendorInfo: newCart.length === 0 ? null : state.vendorInfo,
          error: null
        });
      },

      updateQty: (productId, newQty) => {
        const qty = safeQty(newQty);
        if (qty < 1) return;

        const state = get();
        const newCart = state.cart.map(item => 
          item.productId === productId 
            ? { ...item, qty }
            : item
        );

        set({ cart: newCart, error: null });
      },

      clearCart: () => {
        set({ 
          cart: [], 
          vendorInfo: null, 
          isVendorModalOpen: false,
          error: null 
        });
      },

      // Vendor modal actions
      confirmVendorSwitch: () => {
        const state = get();
        if (state.vendorInfo?.pendingProduct) {
          set({
            cart: [state.vendorInfo.pendingProduct],
            vendorInfo: {
              vendorId: state.vendorInfo.newVendorId,
              vendorName: state.vendorInfo.newVendor
            },
            isVendorModalOpen: false,
            error: null
          });
        }
      },

      cancelVendorSwitch: () => {
        set({ 
          isVendorModalOpen: false,
          vendorInfo: { ...get().vendorInfo, pendingProduct: null }
        });
      },

      // Computed values
      getSubtotal: () => {
        const state = get();
        return state.cart.reduce((sum, item) => {
          const itemTotal = safeNumber(item.price) * safeQty(item.qty);
          return sum + safeNumber(itemTotal, 0);
        }, 0);
      },

      getAddonTotal: () => {
        const state = get();
        return state.cart.reduce((sum, item) => {
          const addonSum = (item.addons || []).reduce((addonSum, addon) => {
            return addonSum + (safeNumber(addon.price) * safeQty(addon.qty));
          }, 0);
          return sum + safeNumber(addonSum, 0);
        }, 0);
      },

      getCartTotal: () => {
        const state = get();
        return safeNumber(state.getSubtotal() + state.getAddonTotal(), 0);
      },

      getCartVendor: () => {
        return get().vendorInfo;
      },

      getItemCount: () => {
        return get().cart.reduce((count, item) => count + safeQty(item.qty), 0);
      },

      // Error handling
      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'go7-cart-storage',
      partialize: (state) => ({ 
        cart: state.cart, 
        vendorInfo: state.vendorInfo 
      })
    }
  )
);