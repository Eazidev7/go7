/**
 * Optimized Firebase Services
 * Wraps Firebase operations with better error handling and caching
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ============================================================================
// Vendors Service (Optimized)
// ============================================================================

export const vendorService = {
  /**
   * Get all vendors with optional filters
   */
  async getVendors(filters = {}) {
    try {
      const vendorsRef = collection(db, 'vendors');
      let q = query(vendorsRef);

      // Apply filters
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }
      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }
      if (filters.isOpen !== undefined) {
        q = query(q, where('isOpen', '==', filters.isOpen));
      }

      // Apply ordering and limit
      q = query(q, orderBy('rating', 'desc'));
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching vendors:', error);
      throw error;
    }
  },

  /**
   * Get single vendor by ID
   */
  async getVendor(vendorId) {
    try {
      const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
      if (!vendorDoc.exists()) {
        throw new Error('Vendor not found');
      }
      return { id: vendorDoc.id, ...vendorDoc.data() };
    } catch (error) {
      console.error('Error fetching vendor:', error);
      throw error;
    }
  },

  /**
   * Search vendors
   */
  async searchVendors(searchTerm) {
    try {
      const vendorsRef = collection(db, 'vendors');
      const snapshot = await getDocs(vendorsRef);
      
      const searchLower = searchTerm.toLowerCase();
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(vendor => 
          vendor.name?.toLowerCase().includes(searchLower) ||
          vendor.category?.toLowerCase().includes(searchLower) ||
          vendor.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        );
    } catch (error) {
      console.error('Error searching vendors:', error);
      throw error;
    }
  },

  /**
   * Subscribe to vendor updates (real-time)
   */
  subscribeToVendor(vendorId, callback) {
    const vendorRef = doc(db, 'vendors', vendorId);
    return onSnapshot(vendorRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() });
      }
    });
  }
};

// ============================================================================
// Menu Service (Optimized)
// ============================================================================

export const menuService = {
  /**
   * Get menu items for a vendor
   */
  async getMenuItems(vendorId, category = null) {
    try {
      const menuRef = collection(db, 'vendors', vendorId, 'menu');
      let q = query(menuRef, where('isAvailable', '==', true));
      
      if (category) {
        q = query(q, where('category', '==', category));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching menu:', error);
      throw error;
    }
  },

  /**
   * Get menu categories for a vendor
   */
  async getMenuCategories(vendorId) {
    try {
      const menuRef = collection(db, 'vendors', vendorId, 'menu');
      const snapshot = await getDocs(menuRef);
      
      const categories = new Set();
      snapshot.docs.forEach(doc => {
        const category = doc.data().category;
        if (category) categories.add(category);
      });
      
      return Array.from(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  /**
   * Get single menu item
   */
  async getMenuItem(vendorId, itemId) {
    try {
      const itemDoc = await getDoc(doc(db, 'vendors', vendorId, 'menu', itemId));
      if (!itemDoc.exists()) {
        throw new Error('Menu item not found');
      }
      return { id: itemDoc.id, ...itemDoc.data() };
    } catch (error) {
      console.error('Error fetching menu item:', error);
      throw error;
    }
  }
};

// ============================================================================
// Orders Service (Optimized)
// ============================================================================

export const orderService = {
  /**
   * Create new order
   */
  async createOrder(orderData) {
    try {
      const orderRef = doc(collection(db, 'orders'));
      const order = {
        ...orderData,
        orderNumber: `GO7${Date.now().toString().slice(-8)}`,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(orderRef, order);
      return { id: orderRef.id, ...order };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  /**
   * Get user orders
   */
  async getUserOrders(userId, filters = {}) {
    try {
      let q = query(
        collection(db, 'orders'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  /**
   * Get active orders (real-time)
   */
  subscribeToActiveOrders(userId, callback) {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      where('status', 'in', ['pending', 'confirmed', 'preparing', 'on_the_way'])
    );

    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(orders);
    });
  },

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, additionalData = {}) {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status,
        ...additionalData,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  },

  /**
   * Subscribe to single order (real-time tracking)
   */
  subscribeToOrder(orderId, callback) {
    const orderRef = doc(db, 'orders', orderId);
    return onSnapshot(orderRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() });
      }
    });
  }
};

// ============================================================================
// Cart Service (Optimized with Local Storage)
// ============================================================================

const CART_STORAGE_KEY = 'go7_cart';

export const cartService = {
  /**
   * Get cart from localStorage
   */
  getCart() {
    try {
      const cart = localStorage.getItem(CART_STORAGE_KEY);
      return cart ? JSON.parse(cart) : { items: [], subtotal: 0, vendorId: null };
    } catch (error) {
      console.error('Error getting cart:', error);
      return { items: [], subtotal: 0, vendorId: null };
    }
  },

  /**
   * Save cart to localStorage
   */
  saveCart(cart) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  },

  /**
   * Add item to cart
   */
  addItem(item) {
    const cart = this.getCart();
    
    // Check if adding from different vendor
    if (cart.vendorId && cart.vendorId !== item.vendorId) {
      throw new Error('Cannot add items from different vendors. Clear cart first.');
    }

    const existingItemIndex = cart.items.findIndex(
      i => i.id === item.id && JSON.stringify(i.selectedAddons) === JSON.stringify(item.selectedAddons)
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += item.quantity;
    } else {
      cart.items.push(item);
    }

    cart.vendorId = item.vendorId;
    cart.subtotal = this.calculateSubtotal(cart.items);
    
    this.saveCart(cart);
    return cart;
  },

  /**
   * Update item quantity
   */
  updateQuantity(itemId, quantity) {
    const cart = this.getCart();
    const item = cart.items.find(i => i.id === itemId);
    
    if (item) {
      if (quantity <= 0) {
        cart.items = cart.items.filter(i => i.id !== itemId);
      } else {
        item.quantity = quantity;
      }
      
      cart.subtotal = this.calculateSubtotal(cart.items);
      this.saveCart(cart);
    }
    
    return cart;
  },

  /**
   * Remove item from cart
   */
  removeItem(itemId) {
    const cart = this.getCart();
    cart.items = cart.items.filter(i => i.id !== itemId);
    
    if (cart.items.length === 0) {
      cart.vendorId = null;
    }
    
    cart.subtotal = this.calculateSubtotal(cart.items);
    this.saveCart(cart);
    
    return cart;
  },

  /**
   * Clear entire cart
   */
  clearCart() {
    const emptyCart = { items: [], subtotal: 0, vendorId: null };
    this.saveCart(emptyCart);
    return emptyCart;
  },

  /**
   * Calculate cart subtotal
   */
  calculateSubtotal(items) {
    return items.reduce((total, item) => {
      let itemTotal = item.price * item.quantity;
      
      // Add addon prices
      if (item.selectedAddons) {
        item.selectedAddons.forEach(addon => {
          addon.options.forEach(option => {
            itemTotal += option.price * item.quantity;
          });
        });
      }
      
      return total + itemTotal;
    }, 0);
  }
};

// ============================================================================
// Wallet Service (Optimized)
// ============================================================================

export const walletService = {
  /**
   * Get wallet balance
   */
  async getBalance(userId) {
    try {
      const walletDoc = await getDoc(doc(db, 'wallets', userId));
      if (!walletDoc.exists()) {
        // Create wallet if doesn't exist
        await setDoc(doc(db, 'wallets', userId), {
          balance: 0,
          currency: 'NGN',
          createdAt: Timestamp.now()
        });
        return { balance: 0, currency: 'NGN' };
      }
      return walletDoc.data();
    } catch (error) {
      console.error('Error fetching wallet:', error);
      throw error;
    }
  },

  /**
   * Subscribe to wallet balance (real-time)
   */
  subscribeToBalance(userId, callback) {
    const walletRef = doc(db, 'wallets', userId);
    return onSnapshot(walletRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });
  },

  /**
   * Get wallet transactions
   */
  async getTransactions(userId, limitCount = 20) {
    try {
      const q = query(
        collection(db, 'wallets', userId, 'transactions'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }
};

// ============================================================================
// Favorites Service
// ============================================================================

export const favoritesService = {
  /**
   * Get user favorites
   */
  async getFavorites(userId) {
    try {
      const favoritesDoc = await getDoc(doc(db, 'favorites', userId));
      if (!favoritesDoc.exists()) {
        return { vendors: [], items: [] };
      }
      return favoritesDoc.data();
    } catch (error) {
      console.error('Error fetching favorites:', error);
      throw error;
    }
  },

  /**
   * Toggle vendor favorite
   */
  async toggleVendor(userId, vendorId) {
    try {
      const favoritesRef = doc(db, 'favorites', userId);
      const favoritesDoc = await getDoc(favoritesRef);
      
      let vendors = [];
      if (favoritesDoc.exists()) {
        vendors = favoritesDoc.data().vendors || [];
      }

      const index = vendors.indexOf(vendorId);
      if (index > -1) {
        vendors.splice(index, 1);
      } else {
        vendors.push(vendorId);
      }

      await setDoc(favoritesRef, { vendors }, { merge: true });
      return vendors.includes(vendorId);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  },

  /**
   * Check if vendor is favorited
   */
  async isVendorFavorited(userId, vendorId) {
    try {
      const favorites = await this.getFavorites(userId);
      return favorites.vendors?.includes(vendorId) || false;
    } catch (error) {
      return false;
    }
  }
};

// Export all services
export default {
  vendors: vendorService,
  menu: menuService,
  orders: orderService,
  cart: cartService,
  wallet: walletService,
  favorites: favoritesService
};
