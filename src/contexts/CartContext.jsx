import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthContext } from './AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

// Data sanitization helpers
const sanitizeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? fallback : num;
};

const sanitizeItem = (item) => {
  if (!item || typeof item !== 'object') {
    console.warn('Invalid item provided to cart:', item);
    return null;
  }

  return {
    id: item.id || '',
    name: item.name || 'Unknown Item',
    vendorId: item.vendorId || '',
    vendorName: item.vendorName || '',
    imageUrl: item.imageUrl || item.image || '',
    price: sanitizeNumber(item.price, 0),
    quantity: sanitizeNumber(item.quantity || item.qty, 1),
    options: item.options || {},
    optionPrices: item.optionPrices || {},
    totalPrice: sanitizeNumber(item.totalPrice, 0)
  };
};

const sanitizeCartItems = (items) => {
  if (!Array.isArray(items)) return [];
  
  return items
    .map(sanitizeItem)
    .filter(item => item !== null && item.id);
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVendorConflict, setShowVendorConflict] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  
  const { currentUser } = useAuthContext();

  const getCartUid = () => auth.currentUser?.uid || currentUser?.uid || null;

  const saveCartDoc = async (uid, items) => {
    if (!uid || !auth.currentUser || auth.currentUser.uid !== uid) {
      return;
    }
    await setDoc(
      doc(db, 'carts', uid),
      {
        userId: uid,
        items,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  };
  
  // Load cart from localStorage or Firestore when component mounts or user changes
  useEffect(() => {
    const loadCart = async () => {
      setLoading(true);
      
      try {
        if (currentUser) {
          const uid = getCartUid();
          if (!uid) {
            const localCart = localStorage.getItem('go7Cart');
            if (localCart) {
              const parsedCart = JSON.parse(localCart);
              setCartItems(sanitizeCartItems(parsedCart));
            } else {
              setCartItems([]);
            }
            return;
          }

          // Logged in user - fetch from Firestore
          const cartDoc = await getDoc(doc(db, 'carts', uid));
          
          if (cartDoc.exists()) {
            const cartData = cartDoc.data();
            const sanitizedItems = sanitizeCartItems(cartData.items || []);
            setCartItems(sanitizedItems);
          } else {
            // No cart in Firestore, check localStorage
            const localCart = localStorage.getItem('go7Cart');
            
            if (localCart) {
              const parsedCart = JSON.parse(localCart);
              const sanitizedItems = sanitizeCartItems(parsedCart);
              setCartItems(sanitizedItems);
              
              // Save local cart to Firestore
              await saveCartDoc(uid, parsedCart);
            } else {
              setCartItems([]);
            }
          }
        } else {
          // Guest user - load from localStorage
          const localCart = localStorage.getItem('go7Cart');
          if (localCart) {
            const parsedCart = JSON.parse(localCart);
            const sanitizedItems = sanitizeCartItems(parsedCart);
            setCartItems(sanitizedItems);
          } else {
            setCartItems([]);
          }
        }
      } catch (error) {
        console.error('Error loading cart:', error);
        setError('Failed to load cart. Please refresh the page.');
        
        // Fallback to localStorage
        const localCart = localStorage.getItem('go7Cart');
        if (localCart) {
          try {
            const parsedCart = JSON.parse(localCart);
            const sanitizedItems = sanitizeCartItems(parsedCart);
            setCartItems(sanitizedItems);
          } catch (parseError) {
            console.error('Error parsing local cart:', parseError);
            setCartItems([]);
          }
        } else {
          setCartItems([]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadCart();
  }, [currentUser]);
  
  // Update cart totals when items change
  useEffect(() => {
    // Clear any previous errors when cart updates successfully
    setError(null);
    
    const newTotal = cartItems.reduce((sum, item) => {
      const itemTotal = sanitizeNumber(item.totalPrice) * sanitizeNumber(item.quantity, 1);
      return sum + sanitizeNumber(itemTotal, 0);
    }, 0);
    
    const newCount = cartItems.reduce((count, item) => {
      return count + sanitizeNumber(item.quantity, 1);
    }, 0);
    
    setCartTotal(newTotal);
    setCartCount(newCount);
    
    // Save to localStorage
    localStorage.setItem('go7Cart', JSON.stringify(cartItems));
    
    // Save to Firestore if user is logged in
    if (currentUser) {
      const uid = getCartUid();
      if (!uid) return;

      const saveToFirestore = async () => {
        try {
          await saveCartDoc(uid, cartItems);
        } catch (error) {
          if (error?.code === 'permission-denied') {
            console.warn('Cart sync skipped: Firebase auth not ready or rules blocked write');
            return;
          }
          console.error('Error saving cart to Firestore:', error);
        }
      };
      
      saveToFirestore();
    }
  }, [cartItems, currentUser]);
  
  // Add an item to cart with vendor validation
  const addToCart = (product) => {
    try {
      const sanitizedProduct = sanitizeItem(product);
      
      if (!sanitizedProduct || !sanitizedProduct.id) {
        console.error('Invalid product provided to addToCart:', product);
        setError('Invalid item. Please try again.');
        return;
      }

      // Check for vendor conflict
      if (cartItems.length > 0 && cartItems[0].vendorId !== sanitizedProduct.vendorId) {
        setConflictData({
          currentVendor: cartItems[0].vendorName,
          newVendor: sanitizedProduct.vendorName,
          newProduct: sanitizedProduct
        });
        setShowVendorConflict(true);
        return;
      }
      
      // Check if product already exists in cart
      const existingItemIndex = cartItems.findIndex(item => 
        item.id === sanitizedProduct.id && 
        JSON.stringify(item.options || {}) === JSON.stringify(sanitizedProduct.options || {})
      );
      
      if (existingItemIndex !== -1) {
        // Update existing item quantity
        const updatedCart = [...cartItems];
        const newQuantity = sanitizeNumber(updatedCart[existingItemIndex].quantity, 1) + 
                           sanitizeNumber(sanitizedProduct.quantity, 1);
        
        updatedCart[existingItemIndex].quantity = newQuantity;
        updatedCart[existingItemIndex].totalPrice = calculateItemTotal(updatedCart[existingItemIndex]);
        
        setCartItems(updatedCart);
      } else {
        // Add new item with calculated total
        const newItem = {
          ...sanitizedProduct,
          totalPrice: calculateItemTotal(sanitizedProduct)
        };
        
        setCartItems(prevItems => [...prevItems, newItem]);
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      setError('Failed to add item to cart.');
    }
  };

  // Force add to cart (clear existing and add new vendor)
  const forceAddToCart = (product) => {
    clearCart();
    addToCart(product);
    setShowVendorConflict(false);
    setConflictData(null);
  };

  // Dismiss vendor conflict modal
  const dismissVendorConflict = () => {
    setShowVendorConflict(false);
    setConflictData(null);
  };
  
  // Update item quantity
  const updateQuantity = (index, newQuantity) => {
    try {
      const sanitizedQty = sanitizeNumber(newQuantity, 1);
      
      if (sanitizedQty < 1) return;
      if (index < 0 || index >= cartItems.length) return;
      
      const updatedCart = [...cartItems];
      updatedCart[index].quantity = sanitizedQty;
      updatedCart[index].totalPrice = calculateItemTotal(updatedCart[index]);
      
      setCartItems(updatedCart);
    } catch (error) {
      console.error('Error updating quantity:', error);
      setError('Failed to update quantity.');
    }
  };
  
  // Remove item from cart
  const removeItem = (index) => {
    setCartItems(prevItems => prevItems.filter((_, i) => i !== index));
  };
  
  // Clear entire cart
  const clearCart = () => {
    setCartItems([]);
  };
  
  // Calculate total price for an item (including options) with safe math
  const calculateItemTotal = (item) => {
    if (!item) return 0;
    
    const basePrice = sanitizeNumber(item.price, 0);
    const quantity = sanitizeNumber(item.quantity, 1);
    
    let optionPrice = 0;
    
    // Add option price adjustments safely
    if (item.options && typeof item.options === 'object') {
      Object.keys(item.options).forEach(optionName => {
        if (item.optionPrices && item.optionPrices[optionName]) {
          const price = sanitizeNumber(item.optionPrices[optionName], 0);
          optionPrice += price;
        }
      });
    }
    
    const total = (basePrice + optionPrice) * quantity;
    return sanitizeNumber(total, 0);
  };
  
  // Check if cart has items from multiple vendors
  const hasMultipleVendors = () => {
    const vendorIds = new Set(cartItems.map(item => item.vendorId));
    return vendorIds.size > 1;
  };
  
  // Group items by vendor
  const itemsByVendor = () => {
    return cartItems.reduce((grouped, item) => {
      if (!grouped[item.vendorId]) {
        grouped[item.vendorId] = {
          vendorId: item.vendorId,
          vendorName: item.vendorName,
          items: []
        };
      }
      
      grouped[item.vendorId].items.push(item);
      return grouped;
    }, {});
  };
  
  // Helper methods for compatibility with new cart components
  const getItemCount = () => sanitizeNumber(cartCount, 0);
  
  const getSubtotal = () => {
    if (!Array.isArray(cartItems)) return 0;
    
    return cartItems.reduce((sum, item) => {
      const itemPrice = sanitizeNumber(item.price, 0);
      const itemQuantity = sanitizeNumber(item.quantity, 1);
      
      // Calculate base line total
      const baseTotal = itemPrice * itemQuantity;
      
      // Add option prices
      let optionTotal = 0;
      if (item.options && item.optionPrices && typeof item.optionPrices === 'object') {
        optionTotal = Object.values(item.optionPrices).reduce((optSum, price) => {
          return optSum + sanitizeNumber(price, 0);
        }, 0) * itemQuantity;
      }
      
      const lineTotal = sanitizeNumber(baseTotal + optionTotal, 0);
      return sum + lineTotal;
    }, 0);
  };
  const items = cartItems; // Alias for compatibility
  
  // Helper methods for cart management by index
  const updateQtyByIndex = (index, qty) => {
    if (cartItems[index]) {
      updateQuantity(cartItems[index].id, qty);
    }
  };
  
  const removeByIndex = (index) => {
    if (cartItems[index]) {
      removeItem(cartItems[index].id);
    }
  };
  
  // Clear error function
  const clearError = () => setError(null);
  
  // Get current vendor info
  const getCurrentVendor = () => {
    if (cartItems.length === 0) return null;
    return {
      id: cartItems[0].vendorId,
      name: cartItems[0].vendorName
    };
  };

  // Context value
  const value = {
    cartItems,
    cartTotal,
    cartCount,
    loading,
    error,
    showVendorConflict,
    conflictData,
    clearError,
    addToCart,
    forceAddToCart,
    dismissVendorConflict,
    updateQuantity,
    removeItem,
    clearCart,
    hasMultipleVendors,
    itemsByVendor,
    getCurrentVendor,
    // New methods for cart component compatibility
    items,
    getItemCount,
    getSubtotal,
    updateQtyByIndex,
    removeByIndex
  };
  
  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;