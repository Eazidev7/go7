/**
 * Additional Services API
 * Following GO7 Backend Integration Guide - Sections 9-13, 17-19
 */

import { get, post, put, del, ApiResponse, PaginationParams, Pagination } from './client';

// ============================================================================
// Addresses (Section 9)
// ============================================================================

export interface Address {
  id: string;
  userId: string;
  label: string; // "Home", "Work", "School"
  street: string;
  building?: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  instructions?: string;
  isDefault: boolean;
  createdAt: string;
}

export async function getAddresses(): Promise<ApiResponse<Address[]>> {
  return get<Address[]>('/addresses');
}

export async function createAddress(data: Omit<Address, 'id' | 'userId' | 'createdAt'>): Promise<ApiResponse<Address>> {
  return post<Address>('/addresses', data);
}

export async function updateAddress(id: string, data: Partial<Address>): Promise<ApiResponse<Address>> {
  return put<Address>(`/addresses/${id}`, data);
}

export async function deleteAddress(id: string): Promise<ApiResponse<{ message: string }>> {
  return del(`/addresses/${id}`);
}

export async function setDefaultAddress(id: string): Promise<ApiResponse<Address>> {
  return post<Address>(`/addresses/${id}/set-default`);
}

// ============================================================================
// Favorites (Section 10)
// ============================================================================

export interface FavoritesResponse {
  vendors: {
    id: string;
    vendor: any; // Vendor type from vendors.ts
    addedAt: string;
  }[];
  items: {
    id: string;
    item: any; // MenuItem type from vendors.ts
    vendor: any;
    addedAt: string;
  }[];
}

export async function getFavorites(): Promise<ApiResponse<FavoritesResponse>> {
  return get<FavoritesResponse>('/favorites');
}

export async function addVendorToFavorites(vendorId: string): Promise<ApiResponse<{ message: string }>> {
  return post(`/favorites/vendor/${vendorId}`);
}

export async function removeVendorFromFavorites(vendorId: string): Promise<ApiResponse<{ message: string }>> {
  return del(`/favorites/vendor/${vendorId}`);
}

export async function addItemToFavorites(itemId: string): Promise<ApiResponse<{ message: string }>> {
  return post(`/favorites/item/${itemId}`);
}

export async function removeItemFromFavorites(itemId: string): Promise<ApiResponse<{ message: string }>> {
  return del(`/favorites/item/${itemId}`);
}

// ============================================================================
// Promo Codes (Section 11)
// ============================================================================

export interface PromoCode {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  userLimit: number;
  applicableFor: 'all' | 'food' | 'pharmacy' | 'market' | 'courier';
  isActive: boolean;
}

export async function getPromoCodes(): Promise<ApiResponse<PromoCode[]>> {
  return get<PromoCode[]>('/promo-codes');
}

export async function validatePromoCode(code: string): Promise<ApiResponse<PromoCode>> {
  return post<PromoCode>('/promo-codes/validate', { code });
}

export async function applyPromoCode(code: string, cartTotal: number): Promise<ApiResponse<any>> {
  return post('/promo-codes/apply', { code, cartTotal });
}

export async function getUserPromoUsage(): Promise<ApiResponse<any>> {
  return get('/promo-codes/user-usage');
}

// ============================================================================
// Wallet (Section 17)
// ============================================================================

export interface WalletBalance {
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  category: 'order' | 'topup' | 'refund' | 'reward' | 'withdrawal';
  amount: number;
  balance: number;
  description: string;
  reference?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export async function getWalletBalance(): Promise<ApiResponse<WalletBalance>> {
  return get<WalletBalance>('/wallet/balance');
}

export async function topUpWallet(amount: number): Promise<ApiResponse<{ paymentUrl: string }>> {
  return post('/wallet/topup', { amount });
}

export async function withdrawFromWallet(amount: number, bankDetails: any): Promise<ApiResponse<{ message: string }>> {
  return post('/wallet/withdraw', { amount, bankDetails });
}

export async function getWalletTransactions(params?: PaginationParams): Promise<ApiResponse<{ transactions: Transaction[]; pagination: Pagination }>> {
  return get('/wallet/transactions', params);
}

// ============================================================================
// GoBuy Service (Section 18)
// ============================================================================

export interface GoBuyRequest {
  id: string;
  userId: string;
  items: {
    name: string;
    description?: string;
    quantity: number;
    preferredBrand?: string;
    estimatedPrice?: number;
  }[];
  store?: string;
  deliveryAddress: Address;
  urgency: 'normal' | 'urgent';
  status: 'pending' | 'quoted' | 'accepted' | 'shopping' | 'on_the_way' | 'delivered';
  quote?: {
    itemsTotal: number;
    serviceFee: number;
    deliveryFee: number;
    total: number;
    estimatedTime: string;
  };
  shopper?: {
    id: string;
    name: string;
    phone: string;
    avatar: string;
  };
  createdAt: string;
}

export async function createGoBuyRequest(data: {
  items: GoBuyRequest['items'];
  store?: string;
  deliveryAddress: Address;
  urgency: 'normal' | 'urgent';
}): Promise<ApiResponse<GoBuyRequest>> {
  return post<GoBuyRequest>('/gobuy/request', data);
}

export async function getGoBuyRequests(params?: PaginationParams): Promise<ApiResponse<{ requests: GoBuyRequest[]; pagination: Pagination }>> {
  return get('/gobuy/requests', params);
}

export async function getGoBuyRequest(id: string): Promise<ApiResponse<GoBuyRequest>> {
  return get<GoBuyRequest>(`/gobuy/requests/${id}`);
}

export async function acceptGoBuyQuote(id: string): Promise<ApiResponse<{ message: string }>> {
  return put(`/gobuy/requests/${id}/accept-quote`);
}

export async function cancelGoBuyRequest(id: string, reason?: string): Promise<ApiResponse<{ message: string }>> {
  return post(`/gobuy/requests/${id}/cancel`, { reason });
}

// ============================================================================
// Courier Service (Section 19)
// ============================================================================

export type CourierStatus = 'pending' | 'driver_assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';

export interface CourierBooking {
  id: string;
  userId: string;
  type: 'document' | 'parcel' | 'package';
  fleetType: 'bike' | 'car' | 'van';
  pickup: {
    address: Address;
    contactName: string;
    contactPhone: string;
    notes?: string;
  };
  dropoff: {
    address: Address;
    contactName: string;
    contactPhone: string;
    notes?: string;
  };
  package: {
    description: string;
    weight?: number;
    value?: number;
    fragile: boolean;
  };
  status: CourierStatus;
  price: number;
  distance: number;
  estimatedTime: string;
  rider?: {
    id: string;
    name: string;
    phone: string;
    avatar: string;
    rating: number;
  };
  createdAt: string;
}

export async function estimateCourierPrice(data: {
  pickupLocation: { lat: number; lng: number };
  dropoffLocation: { lat: number; lng: number };
  fleetType: 'bike' | 'car' | 'van';
}): Promise<ApiResponse<{ price: number; distance: number; estimatedTime: string }>> {
  return post('/courier/price-estimate', data);
}

export async function bookCourier(data: Omit<CourierBooking, 'id' | 'userId' | 'status' | 'createdAt'>): Promise<ApiResponse<CourierBooking>> {
  return post<CourierBooking>('/courier/book', data);
}

export async function getCourierBookings(params?: PaginationParams): Promise<ApiResponse<{ bookings: CourierBooking[]; pagination: Pagination }>> {
  return get('/courier/bookings', params);
}

export async function getCourierBooking(id: string): Promise<ApiResponse<CourierBooking>> {
  return get<CourierBooking>(`/courier/bookings/${id}`);
}

export async function cancelCourierBooking(id: string, reason?: string): Promise<ApiResponse<{ message: string }>> {
  return post(`/courier/bookings/${id}/cancel`, { reason });
}

// ============================================================================
// Search (Section 14)
// ============================================================================

export interface SearchParams {
  q: string;
  type?: 'all' | 'vendors' | 'items' | 'products';
}

export interface SearchResponse {
  vendors: any[];
  items: any[];
  categories: string[];
  total: number;
}

export async function search(params: SearchParams): Promise<ApiResponse<SearchResponse>> {
  return get<SearchResponse>('/search', params);
}

export async function getSearchSuggestions(query: string): Promise<ApiResponse<string[]>> {
  return get<string[]>('/search/suggestions', { q: query });
}

export async function getPopularSearches(): Promise<ApiResponse<string[]>> {
  return get<string[]>('/search/popular');
}

export async function getRecentSearches(): Promise<ApiResponse<string[]>> {
  return get<string[]>('/search/recent');
}

// ============================================================================
// Notifications (Section 15)
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export async function getNotifications(params?: PaginationParams): Promise<ApiResponse<{ notifications: Notification[]; pagination: Pagination }>> {
  return get('/notifications', params);
}

export async function getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
  return get('/notifications/unread-count');
}

export async function markNotificationRead(id: string): Promise<ApiResponse<{ message: string }>> {
  return post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<ApiResponse<{ message: string }>> {
  return post('/notifications/mark-all-read');
}

export async function deleteNotification(id: string): Promise<ApiResponse<{ message: string }>> {
  return del(`/notifications/${id}`);
}

export async function getNotificationSettings(): Promise<ApiResponse<any>> {
  return get('/notifications/settings');
}

export async function updateNotificationSettings(settings: any): Promise<ApiResponse<any>> {
  return put('/notifications/settings', settings);
}

export async function registerDeviceForNotifications(data: {
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
}): Promise<ApiResponse<{ message: string }>> {
  return post('/notifications/register-device', data);
}
