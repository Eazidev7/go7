/**
 * Orders API Service
 * Following GO7 Backend Integration Guide - Section 5
 */

import { get, post, ApiResponse, PaginationParams, Pagination } from './client';
import { Order, OrderStatus } from './cart';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface OrdersParams extends PaginationParams {
  status?: 'active' | 'completed' | 'cancelled';
  type?: 'food' | 'pharmacy' | 'market' | 'courier' | 'gobuy';
}

export interface OrdersResponse {
  orders: Order[];
  pagination: Pagination;
}

export interface OrderTrackingResponse {
  order: Order;
  rider: {
    id: string;
    name: string;
    phone: string;
    avatar: string;
    currentLocation: { lat: number; lng: number };
  };
  timeline: {
    status: OrderStatus;
    timestamp: string;
    description: string;
  }[];
  estimatedArrival: string;
}

export interface RateOrderRequest {
  orderRating: number; // 1-5
  riderRating?: number; // 1-5
  comment?: string;
  tags?: string[];
}

export interface RateOrderResponse {
  message: string;
  coinsEarned: number;
}

export interface OrderReceipt {
  order: Order;
  breakdown: {
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    discount: number;
    total: number;
  };
  vendor: {
    name: string;
    address: string;
    phone: string;
  };
  timestamp: string;
}

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * Get all orders
 * GET /api/orders
 */
export async function getOrders(
  params?: OrdersParams
): Promise<ApiResponse<OrdersResponse>> {
  return get<OrdersResponse>('/orders', params);
}

/**
 * Get single order
 * GET /api/orders/:orderId
 */
export async function getOrder(
  orderId: string
): Promise<ApiResponse<Order>> {
  return get<Order>(`/orders/${orderId}`);
}

/**
 * Get active orders
 * GET /api/orders/active
 */
export async function getActiveOrders(): Promise<ApiResponse<OrdersResponse>> {
  return get<OrdersResponse>('/orders/active');
}

/**
 * Track order
 * GET /api/orders/:orderId/track
 */
export async function trackOrder(
  orderId: string
): Promise<ApiResponse<OrderTrackingResponse>> {
  return get<OrderTrackingResponse>(`/orders/${orderId}/track`);
}

/**
 * Cancel order
 * POST /api/orders/:orderId/cancel
 */
export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<ApiResponse<{ message: string }>> {
  return post(`/orders/${orderId}/cancel`, { reason });
}

/**
 * Rate order
 * POST /api/orders/:orderId/rate
 */
export async function rateOrder(
  orderId: string,
  data: RateOrderRequest
): Promise<ApiResponse<RateOrderResponse>> {
  return post<RateOrderResponse>(`/orders/${orderId}/rate`, data);
}

/**
 * Get order receipt
 * GET /api/orders/:orderId/receipt
 */
export async function getOrderReceipt(
  orderId: string
): Promise<ApiResponse<OrderReceipt>> {
  return get<OrderReceipt>(`/orders/${orderId}/receipt`);
}
