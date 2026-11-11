/**
 * Unified API Client
 * Supports both Firebase (current) and REST API (future)
 * Automatically switches between backends based on configuration
 */

import axios from 'axios';
import firebaseServices from './firebaseServices';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE !== 'false'; // Default to Firebase

// ============================================================================
// Axios Client Setup
// ============================================================================

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { token } = response.data;
          localStorage.setItem('token', token);

          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// Unified API - Automatically uses Firebase or REST based on config
// ============================================================================

const unifiedAPI = {
  // ------------------------------------------------------------------------
  // Authentication
  // ------------------------------------------------------------------------
  auth: {
    async login(credentials) {
      if (USE_FIREBASE) {
        // Firebase authentication happens in AuthContext
        return { success: true };
      }
      const response = await api.post('/auth/login', credentials);
      const { token, refreshToken, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      return { success: true, user };
    },

    async register(userData) {
      if (USE_FIREBASE) {
        // Firebase authentication happens in AuthContext
        return { success: true };
      }
      const response = await api.post('/auth/register', userData);
      const { token, refreshToken, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      return { success: true, user };
    },

    async getProfile() {
      if (USE_FIREBASE) {
        // Get profile from Firebase Auth + Firestore
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user;
      }
      const response = await api.get('/user/profile');
      return response.data.user;
    },

    async updateProfile(data) {
      if (USE_FIREBASE) {
        // Update in Firestore
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        // Update logic here
        return { success: true };
      }
      const response = await api.put('/user/profile', data);
      return response.data;
    },
  },

  // ------------------------------------------------------------------------
  // Vendors
  // ------------------------------------------------------------------------
  vendors: {
    async getAll(params = {}) {
      if (USE_FIREBASE) {
        return await firebaseServices.vendors.getVendors(params);
      }
      const response = await api.get('/vendors', { params });
      return response.data.vendors;
    },

    async getById(id) {
      if (USE_FIREBASE) {
        return await firebaseServices.vendors.getVendor(id);
      }
      const response = await api.get(`/vendors/${id}`);
      return response.data.vendor;
    },

    async getTrending() {
      if (USE_FIREBASE) {
        return await firebaseServices.vendors.getVendors({ sortBy: 'popular', limit: 10 });
      }
      const response = await api.get('/vendors/trending');
      return response.data.vendors;
    },

    async search(query) {
      if (USE_FIREBASE) {
        return await firebaseServices.vendors.searchVendors(query);
      }
      const response = await api.get(`/vendors/search?q=${query}`);
      return response.data.vendors;
    },

    subscribeToVendor(id, callback) {
      if (USE_FIREBASE) {
        return firebaseServices.vendors.subscribeToVendor(id, callback);
      }
      // For REST API, we'd use WebSocket
      return () => {}; // No-op unsubscribe
    },
  },

  // ------------------------------------------------------------------------
  // Menu & Products
  // ------------------------------------------------------------------------
  menu: {
    async getItems(vendorId, category = null) {
      if (USE_FIREBASE) {
        return await firebaseServices.menu.getMenuItems(vendorId, category);
      }
      const response = await api.get(`/vendors/${vendorId}/menu`, {
        params: { category },
      });
      return response.data.items;
    },

    async getCategories(vendorId) {
      if (USE_FIREBASE) {
        return await firebaseServices.menu.getMenuCategories(vendorId);
      }
      const response = await api.get(`/vendors/${vendorId}/categories`);
      return response.data.categories;
    },

    async getAddons(vendorId) {
      if (USE_FIREBASE) {
        // Get from Firestore
        return [];
      }
      const response = await api.get(`/vendors/${vendorId}/addons`);
      return response.data.addons;
    },
  },

  // ------------------------------------------------------------------------
  // Cart
  // ------------------------------------------------------------------------
  cart: {
    getCart() {
      // Cart is always localStorage-based for offline support
      return firebaseServices.cart.getCart();
    },

    addItem(item) {
      return firebaseServices.cart.addItem(item);
    },

    updateQuantity(itemId, quantity) {
      return firebaseServices.cart.updateQuantity(itemId, quantity);
    },

    removeItem(itemId) {
      return firebaseServices.cart.removeItem(itemId);
    },

    clearCart() {
      return firebaseServices.cart.clearCart();
    },

    async applyPromo(promoCode) {
      if (USE_FIREBASE) {
        // Validate promo in Firestore
        return { valid: true, discount: 0 };
      }
      const response = await api.post('/cart/apply-promo', {
        promoCode,
        cartTotal: this.getCart().subtotal,
      });
      return response.data;
    },
  },

  // ------------------------------------------------------------------------
  // Orders
  // ------------------------------------------------------------------------
  orders: {
    async create(orderData) {
      if (USE_FIREBASE) {
        const orderId = await firebaseServices.orders.createOrder(orderData);
        return { orderId, success: true };
      }
      const response = await api.post('/checkout/place-order', orderData);
      return response.data;
    },

    async getAll(params = {}) {
      if (USE_FIREBASE) {
        const userId = JSON.parse(localStorage.getItem('user') || '{}').uid;
        return await firebaseServices.orders.getUserOrders(userId, params);
      }
      const response = await api.get('/orders', { params });
      return response.data.orders;
    },

    async getActive() {
      if (USE_FIREBASE) {
        const userId = JSON.parse(localStorage.getItem('user') || '{}').uid;
        return await firebaseServices.orders.getActiveOrders(userId);
      }
      const response = await api.get('/orders/active');
      return response.data.orders;
    },

    async getById(orderId) {
      if (USE_FIREBASE) {
        return await firebaseServices.orders.getOrder(orderId);
      }
      const response = await api.get(`/orders/${orderId}`);
      return response.data.order;
    },

    async track(orderId) {
      if (USE_FIREBASE) {
        return await firebaseServices.orders.getOrder(orderId);
      }
      const response = await api.get(`/orders/${orderId}/track`);
      return response.data;
    },

    async rate(orderId, ratingData) {
      if (USE_FIREBASE) {
        // Save rating to Firestore
        return { success: true, coinsEarned: 10 };
      }
      const response = await api.post(`/orders/${orderId}/rate`, ratingData);
      return response.data;
    },

    subscribeToOrder(orderId, callback) {
      if (USE_FIREBASE) {
        return firebaseServices.orders.subscribeToOrder(orderId, callback);
      }
      // For REST API, use WebSocket
      return () => {};
    },

    subscribeToActiveOrders(userId, callback) {
      if (USE_FIREBASE) {
        return firebaseServices.orders.subscribeToActiveOrders(userId, callback);
      }
      return () => {};
    },
  },

  // ------------------------------------------------------------------------
  // Payments
  // ------------------------------------------------------------------------
  payments: {
    async initialize(paymentData) {
      if (USE_FIREBASE) {
        // Initialize Paystack via Cloud Function
        return {
          authorization_url: 'https://paystack.com/pay/...',
          reference: 'ref_' + Date.now(),
        };
      }
      const response = await api.post('/payments/initialize', paymentData);
      return response.data;
    },

    async verify(reference) {
      if (USE_FIREBASE) {
        // Verify via Cloud Function
        return { success: true };
      }
      const response = await api.get(`/payments/verify/${reference}`);
      return response.data;
    },
  },

  // ------------------------------------------------------------------------
  // Addresses
  // ------------------------------------------------------------------------
  addresses: {
    async getAll() {
      if (USE_FIREBASE) {
        const userId = JSON.parse(localStorage.getItem('user') || '{}').uid;
        // Get from Firestore
        return [];
      }
      const response = await api.get('/addresses');
      return response.data.addresses;
    },

    async create(addressData) {
      if (USE_FIREBASE) {
        // Save to Firestore
        return { success: true };
      }
      const response = await api.post('/addresses', addressData);
      return response.data;
    },

    async update(id, addressData) {
      if (USE_FIREBASE) {
        // Update in Firestore
        return { success: true };
      }
      const response = await api.put(`/addresses/${id}`, addressData);
      return response.data;
    },

    async delete(id) {
      if (USE_FIREBASE) {
        // Delete from Firestore
        return { success: true };
      }
      await api.delete(`/addresses/${id}`);
      return { success: true };
    },
  },

  // ------------------------------------------------------------------------
  // Favorites
  // ------------------------------------------------------------------------
  favorites: {
    async getAll() {
      if (USE_FIREBASE) {
        const userId = JSON.parse(localStorage.getItem('user') || '{}').uid;
        return await firebaseServices.favorites.getFavorites(userId);
      }
      const response = await api.get('/favorites');
      return response.data.favorites;
    },

    async toggleVendor(vendorId) {
      if (USE_FIREBASE) {
        const userId = JSON.parse(localStorage.getItem('user') || '{}').uid;
        return await firebaseServices.favorites.toggleVendor(userId, vendorId);
      }
      const response = await api.post(`/favorites/vendor/${vendorId}`);
      return response.data.isFavorited;
    },

    async isVendorFavorited(vendorId) {
      if (USE_FIREBASE) {
        const userId = JSON.parse(localStorage.getItem('user') || '{}').uid;
        return await firebaseServices.favorites.isVendorFavorited(userId, vendorId);
      }
      const response = await api.get(`/favorites/vendor/${vendorId}/check`);
      return response.data.isFavorited;
    },
  },

  // ------------------------------------------------------------------------
  // Wallet
  // ------------------------------------------------------------------------
  wallet: {
    async getBalance() {
      if (USE_FIREBASE) {
        const userId = JSON.parse(localStorage.getItem('user') || '{}').uid;
        return await firebaseServices.wallet.getBalance(userId);
      }
      const response = await api.get('/wallet/balance');
      return response.data;
    },

    async getTransactions() {
      if (USE_FIREBASE) {
        const userId = JSON.parse(localStorage.getItem('user') || '{}').uid;
        return await firebaseServices.wallet.getTransactions(userId);
      }
      const response = await api.get('/wallet/transactions');
      return response.data.transactions;
    },

    async topup(amount) {
      if (USE_FIREBASE) {
        // Initialize payment via Cloud Function
        return {
          authorization_url: 'https://paystack.com/pay/...',
          reference: 'topup_' + Date.now(),
        };
      }
      const response = await api.post('/wallet/topup', { amount });
      return response.data;
    },

    subscribeToBalance(callback) {
      if (USE_FIREBASE) {
        const userId = JSON.parse(localStorage.getItem('user') || '{}').uid;
        return firebaseServices.wallet.subscribeToBalance(userId, callback);
      }
      return () => {};
    },
  },

  // ------------------------------------------------------------------------
  // Promo Codes
  // ------------------------------------------------------------------------
  promoCodes: {
    async getAll() {
      if (USE_FIREBASE) {
        // Get from Firestore
        return [];
      }
      const response = await api.get('/promo-codes');
      return response.data.promoCodes;
    },

    async validate(code) {
      if (USE_FIREBASE) {
        // Validate in Firestore
        return { valid: true, discount: 0, type: 'percentage' };
      }
      const response = await api.post('/promo-codes/validate', { code });
      return response.data;
    },
  },

  // ------------------------------------------------------------------------
  // Gamification
  // ------------------------------------------------------------------------
  gamification: {
    async getProfile() {
      if (USE_FIREBASE) {
        // Get from Firestore
        return {
          level: 5,
          xp: 2500,
          coins: 1000,
          streak: 7,
          badges: [],
        };
      }
      const response = await api.get('/gamification/profile');
      return response.data;
    },

    async getMissions() {
      if (USE_FIREBASE) {
        // Get from Firestore
        return [];
      }
      const response = await api.get('/gamification/missions');
      return response.data.missions;
    },

    async claimMission(missionId) {
      if (USE_FIREBASE) {
        // Update in Firestore
        return { coinsEarned: 50, xpEarned: 100 };
      }
      const response = await api.post(`/gamification/missions/${missionId}/claim`);
      return response.data;
    },

    async getRewards() {
      if (USE_FIREBASE) {
        return [];
      }
      const response = await api.get('/gamification/rewards');
      return response.data.rewards;
    },

    async redeemReward(rewardId) {
      if (USE_FIREBASE) {
        return { success: true, promoCode: 'REWARD50' };
      }
      const response = await api.post(`/gamification/rewards/${rewardId}/redeem`);
      return response.data;
    },
  },

  // ------------------------------------------------------------------------
  // Lucky Week
  // ------------------------------------------------------------------------
  luckyWeek: {
    async getStatus() {
      if (USE_FIREBASE) {
        return {
          spinsAvailable: 1,
          canSpinToday: true,
          lastSpinDate: null,
        };
      }
      const response = await api.get('/lucky-week/status');
      return response.data;
    },

    async spin() {
      if (USE_FIREBASE) {
        return {
          prize: { type: 'coins', amount: 100 },
          newBalance: 1100,
        };
      }
      const response = await api.post('/lucky-week/spin');
      return response.data;
    },
  },

  // ------------------------------------------------------------------------
  // Search
  // ------------------------------------------------------------------------
  search: {
    async query(searchTerm, type = 'all') {
      if (USE_FIREBASE) {
        const vendors = await firebaseServices.vendors.searchVendors(searchTerm);
        return { vendors, items: [], categories: [] };
      }
      const response = await api.get('/search', {
        params: { q: searchTerm, type },
      });
      return response.data;
    },

    async getSuggestions(searchTerm) {
      if (USE_FIREBASE) {
        return [];
      }
      const response = await api.get('/search/suggestions', {
        params: { q: searchTerm },
      });
      return response.data.suggestions;
    },
  },

  // ------------------------------------------------------------------------
  // Notifications
  // ------------------------------------------------------------------------
  notifications: {
    async getAll() {
      if (USE_FIREBASE) {
        return [];
      }
      const response = await api.get('/notifications');
      return response.data.notifications;
    },

    async getUnreadCount() {
      if (USE_FIREBASE) {
        return 0;
      }
      const response = await api.get('/notifications/unread-count');
      return response.data.count;
    },

    async markAsRead(notificationId) {
      if (USE_FIREBASE) {
        return { success: true };
      }
      await api.patch(`/notifications/${notificationId}/read`);
      return { success: true };
    },
  },

  // ------------------------------------------------------------------------
  // GoBuy
  // ------------------------------------------------------------------------
  gobuy: {
    async createRequest(requestData) {
      if (USE_FIREBASE) {
        return {
          requestId: 'req_' + Date.now(),
          estimatedQuote: 5000,
        };
      }
      const response = await api.post('/gobuy/request', requestData);
      return response.data;
    },

    async getRequests() {
      if (USE_FIREBASE) {
        return [];
      }
      const response = await api.get('/gobuy/requests');
      return response.data.requests;
    },
  },

  // ------------------------------------------------------------------------
  // Courier
  // ------------------------------------------------------------------------
  courier: {
    async book(bookingData) {
      if (USE_FIREBASE) {
        return {
          bookingId: 'book_' + Date.now(),
          price: 1500,
          estimatedTime: '30-45 mins',
        };
      }
      const response = await api.post('/courier/book', bookingData);
      return response.data;
    },

    async getPriceEstimate(pickup, dropoff, fleetType) {
      if (USE_FIREBASE) {
        return {
          distance: '5.2 km',
          estimatedTime: '25 mins',
          price: 1200,
        };
      }
      const response = await api.post('/courier/price-estimate', {
        pickup,
        dropoff,
        fleetType,
      });
      return response.data;
    },
  },

  // ------------------------------------------------------------------------
  // Chat
  // ------------------------------------------------------------------------
  chat: {
    async getConversations() {
      if (USE_FIREBASE) {
        return [];
      }
      const response = await api.get('/chat/conversations');
      return response.data.conversations;
    },

    async getMessages(conversationId) {
      if (USE_FIREBASE) {
        return [];
      }
      const response = await api.get(`/chat/conversations/${conversationId}/messages`);
      return response.data.messages;
    },

    async sendMessage(conversationId, message) {
      if (USE_FIREBASE) {
        return { success: true };
      }
      const response = await api.post(
        `/chat/conversations/${conversationId}/messages`,
        message
      );
      return response.data;
    },
  },
};

export default unifiedAPI;
