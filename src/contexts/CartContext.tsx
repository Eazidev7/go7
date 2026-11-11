import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the shape of a cart item
export interface CartItem {
  vendorId: string;
  productId: string;
  variantKey?: string; // Optional for products without variants
  title: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  options?: Record<string, string>; // For displaying options like "Size: Large, Color: Red"
}

// Define the shape of the cart context
interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (index: number, quantity: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  totalItems: number;
  subtotal: number;
  // Additional properties to match implementation
  cart?: CartItem[];
  addToCart: (item: any) => void;
}

// Create the context with a default value
const CartContext = createContext<CartContextType | undefined>(undefined);

// Custom hook for using the cart context
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

// Props for the CartProvider component
interface CartProviderProps {
  children: React.ReactNode;
}

// CartProvider component that will wrap the application
export function CartProvider({ children }: CartProviderProps) {
  // Initialize cart items from localStorage if available
  const [items, setItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('go7_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    console.log('🛒 CART CONTEXT: Items changed, saving to localStorage');
    console.log('🛒 CART CONTEXT: Items array:', items);
    console.log('🛒 CART CONTEXT: Items length:', items.length);
    localStorage.setItem('go7_cart', JSON.stringify(items));
  }, [items]);
  
  // Add an item to the cart
  const addItem = (newItem: CartItem) => {
    console.log('🛒 CART CONTEXT: addItem called with:', newItem);
    console.log('🛒 CART CONTEXT: newItem.productId:', newItem.productId);
    console.log('🛒 CART CONTEXT: newItem.price:', newItem.price);
    console.log('🛒 CART CONTEXT: newItem.quantity:', newItem.quantity);
    console.log('🛒 CART CONTEXT: newItem.title:', newItem.title);
    console.log('🛒 CART CONTEXT: Current items before add:', items);
    
    setItems(currentItems => {
      // Check if the item already exists in the cart
      const existingItemIndex = currentItems.findIndex(item => 
        item.productId === newItem.productId && 
        item.vendorId === newItem.vendorId &&
        item.variantKey === newItem.variantKey
      );
      
      console.log('🛒 CART CONTEXT: Existing item index:', existingItemIndex);
      
      if (existingItemIndex >= 0) {
        // If item exists, update its quantity
        const updatedItems = [...currentItems];
        const oldQuantity = updatedItems[existingItemIndex].quantity;
        updatedItems[existingItemIndex].quantity += newItem.quantity;
        console.log('🛒 CART CONTEXT: Updated existing item quantity from', oldQuantity, 'to', updatedItems[existingItemIndex].quantity);
        console.log('🛒 CART CONTEXT: Updated items array:', updatedItems);
        return updatedItems;
      } else {
        // Otherwise add as a new item
        const newItems = [...currentItems, newItem];
        console.log('🛒 CART CONTEXT: Added new item to cart');
        console.log('🛒 CART CONTEXT: New items array:', newItems);
        return newItems;
      }
    });
    
    // Open the cart when an item is added
    setIsCartOpen(true);
    console.log('🛒 CART CONTEXT: Cart opened');
  };
  
  // Update the quantity of an item
  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      // If quantity is 0 or negative, remove the item
      removeItem(index);
      return;
    }
    
    setItems(currentItems => {
      const updatedItems = [...currentItems];
      if (updatedItems[index]) {
        updatedItems[index].quantity = quantity;
      }
      return updatedItems;
    });
  };
  
  // Remove an item from the cart
  const removeItem = (index: number) => {
    setItems(currentItems => currentItems.filter((_, i) => i !== index));
  };
  
  // Clear all items from the cart
  const clearCart = () => {
    setItems([]);
  };
  
  // Open the cart
  const openCart = () => {
    setIsCartOpen(true);
  };
  
  // Close the cart
  const closeCart = () => {
    setIsCartOpen(false);
  };
  
  // Calculate the total number of items in the cart
  const totalItems = items.reduce((total, item) => {
    console.log('🛒 CART CONTEXT: Calculating totalItems - adding item:', item.title, 'quantity:', item.quantity);
    return total + item.quantity;
  }, 0);
  console.log('🛒 CART CONTEXT: Total items calculated:', totalItems);
  
  // Calculate the subtotal of all items in the cart
  const subtotal = items.reduce((total, item) => {
    const itemTotal = item.price * item.quantity;
    console.log('🛒 CART CONTEXT: Calculating subtotal - item:', item.title, 'price:', item.price, 'quantity:', item.quantity, 'itemTotal:', itemTotal);
    return total + itemTotal;
  }, 0);
  console.log('🛒 CART CONTEXT: Subtotal calculated:', subtotal);
  
  // The value to be provided to consumers
  const value = {
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    isCartOpen,
    openCart,
    closeCart,
    totalItems,
    subtotal,
    // Aliases for backward compatibility
    cart: items,
    addToCart: addItem
  };
  
  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
