/**
 * React Hooks for Firebase Services
 * Easy-to-use hooks for real-time data and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseServices from './firebaseServices';

// ============================================================================
// Vendors Hooks
// ============================================================================

/**
 * Hook to fetch vendors with filters
 */
export function useVendors(filters = {}) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await firebaseServices.vendors.getVendors(filters);
        setVendors(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [JSON.stringify(filters)]);

  return { vendors, loading, error };
}

/**
 * Hook to get single vendor with real-time updates
 */
export function useVendor(vendorId) {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vendorId) return;

    setLoading(true);
    const unsubscribe = firebaseServices.vendors.subscribeToVendor(
      vendorId,
      (data) => {
        setVendor(data);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [vendorId]);

  return { vendor, loading, error };
}

/**
 * Hook to search vendors
 */
export function useVendorSearch() {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (searchTerm) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const data = await firebaseServices.vendors.searchVendors(searchTerm);
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  return { results, searching, search };
}

// ============================================================================
// Menu Hooks
// ============================================================================

/**
 * Hook to get menu items for a vendor
 */
export function useMenu(vendorId, category = null) {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vendorId) return;

    const fetchMenu = async () => {
      setLoading(true);
      try {
        const [items, cats] = await Promise.all([
          firebaseServices.menu.getMenuItems(vendorId, category),
          firebaseServices.menu.getMenuCategories(vendorId)
        ]);
        setMenuItems(items);
        setCategories(cats);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [vendorId, category]);

  return { menuItems, categories, loading, error };
}

// ============================================================================
// Cart Hooks
// ============================================================================

/**
 * Hook for cart management
 */
export function useCart() {
  const [cart, setCart] = useState(firebaseServices.cart.getCart());

  const addItem = useCallback((item) => {
    try {
      const updatedCart = firebaseServices.cart.addItem(item);
      setCart(updatedCart);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const updateQuantity = useCallback((itemId, quantity) => {
    const updatedCart = firebaseServices.cart.updateQuantity(itemId, quantity);
    setCart(updatedCart);
  }, []);

  const removeItem = useCallback((itemId) => {
    const updatedCart = firebaseServices.cart.removeItem(itemId);
    setCart(updatedCart);
  }, []);

  const clearCart = useCallback(() => {
    const updatedCart = firebaseServices.cart.clearCart();
    setCart(updatedCart);
  }, []);

  // Listen for storage changes (multi-tab sync)
  useEffect(() => {
    const handleStorageChange = () => {
      setCart(firebaseServices.cart.getCart());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    cart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: cart.subtotal
  };
}

// ============================================================================
// Orders Hooks
// ============================================================================

/**
 * Hook to get user orders
 */
export function useOrders(filters = {}) {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const data = await firebaseServices.orders.getUserOrders(
          currentUser.uid,
          filters
        );
        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser?.uid, JSON.stringify(filters)]);

  return { orders, loading, error };
}

/**
 * Hook for active orders with real-time updates
 */
export function useActiveOrders() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    const unsubscribe = firebaseServices.orders.subscribeToActiveOrders(
      currentUser.uid,
      (data) => {
        setOrders(data);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser?.uid]);

  return { orders, loading };
}

/**
 * Hook for tracking a single order with real-time updates
 */
export function useOrderTracking(orderId) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    setLoading(true);
    const unsubscribe = firebaseServices.orders.subscribeToOrder(
      orderId,
      (data) => {
        setOrder(data);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [orderId]);

  return { order, loading };
}

// ============================================================================
// Wallet Hooks
// ============================================================================

/**
 * Hook for wallet balance with real-time updates
 */
export function useWallet() {
  const { currentUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    
    // Subscribe to balance
    const unsubscribe = firebaseServices.wallet.subscribeToBalance(
      currentUser.uid,
      (data) => {
        setBalance(data.balance || 0);
        setLoading(false);
      }
    );

    // Fetch transactions
    firebaseServices.wallet.getTransactions(currentUser.uid)
      .then(setTransactions)
      .catch(console.error);

    return unsubscribe;
  }, [currentUser?.uid]);

  return { balance, transactions, loading };
}

// ============================================================================
// Favorites Hooks
// ============================================================================

/**
 * Hook for managing favorites
 */
export function useFavorites() {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState({ vendors: [], items: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchFavorites = async () => {
      try {
        const data = await firebaseServices.favorites.getFavorites(currentUser.uid);
        setFavorites(data);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [currentUser?.uid]);

  const toggleVendor = useCallback(async (vendorId) => {
    if (!currentUser?.uid) return;

    try {
      const isFavorited = await firebaseServices.favorites.toggleVendor(
        currentUser.uid,
        vendorId
      );

      // Update local state
      setFavorites(prev => ({
        ...prev,
        vendors: isFavorited
          ? [...prev.vendors, vendorId]
          : prev.vendors.filter(id => id !== vendorId)
      }));

      return isFavorited;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return null;
    }
  }, [currentUser?.uid]);

  const isVendorFavorited = useCallback((vendorId) => {
    return favorites.vendors?.includes(vendorId) || false;
  }, [favorites.vendors]);

  return {
    favorites,
    loading,
    toggleVendor,
    isVendorFavorited
  };
}

// ============================================================================
// Utility Hook - Debounce
// ============================================================================

/**
 * Hook for debounced values (useful for search)
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
