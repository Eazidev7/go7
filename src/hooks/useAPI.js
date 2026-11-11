/**
 * Unified API Hooks
 * Works with both Firebase and REST API backends
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import unifiedAPI from '../services/unifiedAPI';
import { toast } from 'react-hot-toast';

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
        const data = await unifiedAPI.vendors.getAll(filters);
        setVendors(data);
      } catch (err) {
        setError(err.message);
        toast.error('Failed to load vendors');
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [JSON.stringify(filters)]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await unifiedAPI.vendors.getAll(filters);
      setVendors(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  return { vendors, loading, error, refresh };
}

/**
 * Hook to get trending vendors
 */
export function useTrendingVendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await unifiedAPI.vendors.getTrending();
        setVendors(data);
      } catch (error) {
        console.error('Failed to load trending vendors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  return { vendors, loading };
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

    const fetchVendor = async () => {
      setLoading(true);
      try {
        const data = await unifiedAPI.vendors.getById(vendorId);
        setVendor(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();

    // Subscribe to real-time updates
    const unsubscribe = unifiedAPI.vendors.subscribeToVendor(
      vendorId,
      (data) => setVendor(data)
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
      const data = await unifiedAPI.vendors.search(searchTerm);
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
          unifiedAPI.menu.getItems(vendorId, category),
          unifiedAPI.menu.getCategories(vendorId)
        ]);
        setMenuItems(items);
        setCategories(cats);
      } catch (err) {
        setError(err.message);
        toast.error('Failed to load menu');
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
 * Hook for cart management (localStorage-based for offline support)
 */
export function useCart() {
  const [cart, setCart] = useState(unifiedAPI.cart.getCart());
  const [applyingPromo, setApplyingPromo] = useState(false);

  const addItem = useCallback((item) => {
    try {
      const updatedCart = unifiedAPI.cart.addItem(item);
      setCart(updatedCart);
      toast.success('Added to cart');
      return { success: true };
    } catch (error) {
      toast.error(error.message);
      return { success: false, error: error.message };
    }
  }, []);

  const updateQuantity = useCallback((itemId, quantity) => {
    const updatedCart = unifiedAPI.cart.updateQuantity(itemId, quantity);
    setCart(updatedCart);
  }, []);

  const removeItem = useCallback((itemId) => {
    const updatedCart = unifiedAPI.cart.removeItem(itemId);
    setCart(updatedCart);
    toast.success('Removed from cart');
  }, []);

  const clearCart = useCallback(() => {
    const updatedCart = unifiedAPI.cart.clearCart();
    setCart(updatedCart);
  }, []);

  const applyPromo = useCallback(async (promoCode) => {
    setApplyingPromo(true);
    try {
      const result = await unifiedAPI.cart.applyPromo(promoCode);
      if (result.valid) {
        toast.success(`Promo applied! ₦${result.discount} off`);
        return result;
      } else {
        toast.error('Invalid promo code');
        return null;
      }
    } catch (error) {
      toast.error('Failed to apply promo');
      return null;
    } finally {
      setApplyingPromo(false);
    }
  }, []);

  // Listen for storage changes (multi-tab sync)
  useEffect(() => {
    const handleStorageChange = () => {
      setCart(unifiedAPI.cart.getCart());
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
    applyPromo,
    applyingPromo,
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const data = await unifiedAPI.orders.getAll(filters);
        setOrders(data);
      } catch (err) {
        setError(err.message);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [JSON.stringify(filters)]);

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

    const fetchOrders = async () => {
      try {
        const data = await unifiedAPI.orders.getActive();
        setOrders(data);
      } catch (error) {
        console.error('Failed to load active orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // Subscribe to real-time updates
    const unsubscribe = unifiedAPI.orders.subscribeToActiveOrders(
      currentUser.uid,
      (data) => setOrders(data)
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

    const fetchOrder = async () => {
      try {
        const data = await unifiedAPI.orders.track(orderId);
        setOrder(data);
      } catch (error) {
        console.error('Failed to load order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Subscribe to real-time updates
    const unsubscribe = unifiedAPI.orders.subscribeToOrder(
      orderId,
      (data) => setOrder(data)
    );

    return unsubscribe;
  }, [orderId]);

  return { order, loading };
}

/**
 * Hook to place an order
 */
export function usePlaceOrder() {
  const [placing, setPlacing] = useState(false);
  const { clearCart } = useCart();

  const placeOrder = useCallback(async (orderData) => {
    setPlacing(true);
    try {
      const result = await unifiedAPI.orders.create(orderData);
      
      if (result.paymentUrl) {
        // Redirect to payment
        window.location.href = result.paymentUrl;
      } else {
        // Order placed successfully
        clearCart();
        toast.success('Order placed successfully!');
        return result;
      }
    } catch (error) {
      toast.error('Failed to place order');
      throw error;
    } finally {
      setPlacing(false);
    }
  }, [clearCart]);

  return { placeOrder, placing };
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
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchWallet = async () => {
      try {
        const [balanceData, transactionsData] = await Promise.all([
          unifiedAPI.wallet.getBalance(),
          unifiedAPI.wallet.getTransactions()
        ]);
        setBalance(balanceData.balance || 0);
        setTransactions(transactionsData);
      } catch (error) {
        console.error('Failed to load wallet:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWallet();

    // Subscribe to balance updates
    const unsubscribe = unifiedAPI.wallet.subscribeToBalance((data) => {
      setBalance(data.balance || 0);
    });

    return unsubscribe;
  }, [currentUser?.uid]);

  const topup = useCallback(async (amount) => {
    try {
      const result = await unifiedAPI.wallet.topup(amount);
      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      }
      return result;
    } catch (error) {
      toast.error('Failed to initiate top-up');
      throw error;
    }
  }, []);

  return { balance, transactions, loading, topup };
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
        const data = await unifiedAPI.favorites.getAll();
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
    if (!currentUser?.uid) {
      toast.error('Please login to save favorites');
      return;
    }

    try {
      const isFavorited = await unifiedAPI.favorites.toggleVendor(vendorId);

      // Update local state
      setFavorites(prev => ({
        ...prev,
        vendors: isFavorited
          ? [...prev.vendors, vendorId]
          : prev.vendors.filter(id => id !== vendorId)
      }));

      toast.success(isFavorited ? 'Added to favorites' : 'Removed from favorites');
      return isFavorited;
    } catch (error) {
      toast.error('Failed to update favorites');
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
// Search Hook
// ============================================================================

/**
 * Hook for global search
 */
export function useSearch() {
  const [results, setResults] = useState({ vendors: [], items: [], categories: [] });
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (query, type = 'all') => {
    if (!query.trim()) {
      setResults({ vendors: [], items: [], categories: [] });
      return;
    }

    setSearching(true);
    try {
      const data = await unifiedAPI.search.query(query, type);
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  return { results, searching, search };
}

// ============================================================================
// Addresses Hook
// ============================================================================

/**
 * Hook for managing addresses
 */
export function useAddresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const data = await unifiedAPI.addresses.getAll();
        setAddresses(data);
      } catch (error) {
        console.error('Failed to load addresses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, []);

  const addAddress = useCallback(async (addressData) => {
    try {
      await unifiedAPI.addresses.create(addressData);
      const updated = await unifiedAPI.addresses.getAll();
      setAddresses(updated);
      toast.success('Address added');
    } catch (error) {
      toast.error('Failed to add address');
    }
  }, []);

  const updateAddress = useCallback(async (id, addressData) => {
    try {
      await unifiedAPI.addresses.update(id, addressData);
      const updated = await unifiedAPI.addresses.getAll();
      setAddresses(updated);
      toast.success('Address updated');
    } catch (error) {
      toast.error('Failed to update address');
    }
  }, []);

  const deleteAddress = useCallback(async (id) => {
    try {
      await unifiedAPI.addresses.delete(id);
      setAddresses(prev => prev.filter(addr => addr.id !== id));
      toast.success('Address deleted');
    } catch (error) {
      toast.error('Failed to delete address');
    }
  }, []);

  return { addresses, loading, addAddress, updateAddress, deleteAddress };
}

// ============================================================================
// Gamification Hook
// ============================================================================

/**
 * Hook for gamification features
 */
export function useGamification() {
  const [profile, setProfile] = useState(null);
  const [missions, setMissions] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGamification = async () => {
      try {
        const [profileData, missionsData, rewardsData] = await Promise.all([
          unifiedAPI.gamification.getProfile(),
          unifiedAPI.gamification.getMissions(),
          unifiedAPI.gamification.getRewards()
        ]);
        setProfile(profileData);
        setMissions(missionsData);
        setRewards(rewardsData);
      } catch (error) {
        console.error('Failed to load gamification:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGamification();
  }, []);

  const claimMission = useCallback(async (missionId) => {
    try {
      const result = await unifiedAPI.gamification.claimMission(missionId);
      toast.success(`Earned ${result.coinsEarned} coins!`);
      
      // Refresh data
      const [profileData, missionsData] = await Promise.all([
        unifiedAPI.gamification.getProfile(),
        unifiedAPI.gamification.getMissions()
      ]);
      setProfile(profileData);
      setMissions(missionsData);
      
      return result;
    } catch (error) {
      toast.error('Failed to claim mission');
    }
  }, []);

  const redeemReward = useCallback(async (rewardId) => {
    try {
      const result = await unifiedAPI.gamification.redeemReward(rewardId);
      toast.success('Reward redeemed!');
      
      // Refresh data
      const profileData = await unifiedAPI.gamification.getProfile();
      setProfile(profileData);
      
      return result;
    } catch (error) {
      toast.error('Failed to redeem reward');
    }
  }, []);

  return { profile, missions, rewards, loading, claimMission, redeemReward };
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
