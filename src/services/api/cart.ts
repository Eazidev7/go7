/**
 * Cart & Checkout API Service
 * Following GO7 Backend Integration Guide - Section 4
 */

import { get, post, put, del, ApiResponse } from './client';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CartItem {
  id: string;
  itemId: string;
  vendorId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  selectedAddons?: {
    addonId: string;
    addonName: string;
    options: {
      id: string;
      name: string;
      price: number;
    }[];
  }[];
  customizationNote?: string;
  totalPrice: number;
}

export interface CartResponse {
  cart: CartItem[];
  subtotal: number;
  itemCount: number;
}

export interface AddToCartRequest {
  vendorId: string;
  itemId: string;
  quantity: number;
  selectedAddons?: {
    addonId: string;
    optionIds: string[];
  }[];
  customizationNote?: string;
}

export interface UpdateCartRequest {
  itemId: string;
  quantity: number;
}

export interface PromoCodeRequest {
  promoCode: string;
  cartTotal: number;
}

export interface PromoCodeResponse {
  discount: number;
  newTotal: number;
  promoDetails: {
    code: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  };
}

export interface CheckoutRequest {
  vendorId: string;
  items: CartItem[];
  deliveryAddress: {
    id: string;
    street: string;
    city: string;
    state: string;
    coordinates: { lat: number; lng: number };
    instructions?: string;
  };
  paymentMethod: 'card' | 'wallet' | 'cash';
  promoCode?: string;
  deliveryNote?: string;
}

export interface CheckoutResponse {
  order: Order;
  paymentUrl?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  vendorId: string;
  vendorName: string;
  vendorImage: string;
  type: 'food' | 'pharmacy' | 'market' | 'courier' | 'gobuy';
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
  deliveryAddress: Address;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  deliveryTime?: string;
  rider?: Rider;
  tracking?: {
    currentLocation: { lat: number; lng: number };
    estimatedArrival: string;
    distance: number;
  };
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'on_the_way'
  | 'nearby'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  name: string;
  image: string;
  quantity: number;
  price: number;
  addons?: string[];
  totalPrice: number;
}

export interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  coordinates: { lat: number; lng: number };
  instructions?: string;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  rating: number;
  vehicleType: string;
  vehicleNumber: string;
}

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * Add item to cart
 * POST /api/cart/add
 */
export async function addToCart(
  data: AddToCartRequest
): Promise<ApiResponse<CartResponse>> {
  return post<CartResponse>('/cart/add', data);
}

/**
 * Update cart item quantity
 * PUT /api/cart/update
 */
export async function updateCart(
  data: UpdateCartRequest
): Promise<ApiResponse<CartResponse>> {
  return put<CartResponse>('/cart/update', data);
}

/**
 * Remove item from cart
 * DELETE /api/cart/remove/:itemId
 */
export async function removeFromCart(
  itemId: string
): Promise<ApiResponse<CartResponse>> {
  return del<CartResponse>(`/cart/remove/${itemId}`);
}

/**
 * Clear entire cart
 * DELETE /api/cart/clear
 */
export async function clearCart(): Promise<ApiResponse<{ message: string }>> {
  return del('/cart/clear');
}

/**
 * Get current cart
 * GET /api/cart
 */
export async function getCart(): Promise<ApiResponse<CartResponse>> {
  return get<CartResponse>('/cart');
}

/**
 * Apply promo code
 * POST /api/cart/apply-promo
 */
export async function applyPromoCode(
  data: PromoCodeRequest
): Promise<ApiResponse<PromoCodeResponse>> {
  return post<PromoCodeResponse>('/cart/apply-promo', data);
}

/**
 * Validate checkout
 * POST /api/checkout/validate
 */
export async function validateCheckout(
  data: CheckoutRequest
): Promise<ApiResponse<{ valid: boolean; errors?: string[] }>> {
  return post('/checkout/validate', data);
}

/**
 * Place order
 * POST /api/checkout/place-order
 */
export async function placeOrder(
  data: CheckoutRequest
): Promise<ApiResponse<CheckoutResponse>> {
  return post<CheckoutResponse>('/checkout/place-order', data);
}
