/**
 * API Services Index
 * Central export point for all API services
 * Following GO7 Backend Integration Guide
 */

// Core HTTP client
export * from './client';

// Authentication & User Management (Section 1)
export * as authApi from './auth';

// Vendor Management (Section 2)
export * as vendorsApi from './vendors';

// Menu & Products (Section 3)
export * as menuApi from './menu';

// Cart & Checkout (Section 4)
export * as cartApi from './cart';

// Orders & Tracking (Section 5)
export * as ordersApi from './orders';

// WebSocket & Real-time (Sections 6 & 7)
export * as websocketApi from './websocket';

// Additional Features (Sections 9-15, 17-19)
export * as featuresApi from './features';

// Gamification & Rewards (Sections 12 & 13)
export * as gamificationApi from './gamification';

// Re-export commonly used types
export type { ApiResponse, Pagination, PaginationParams } from './client';
export type { User, AuthResponse, RegisterRequest, LoginRequest } from './auth';
export type { Vendor, MenuItem, Product, Review } from './vendors';
export type { CartItem, Order, OrderStatus } from './cart';
export type { Address, PromoCode, Notification } from './features';
export type { GamificationProfile, Mission, Badge, Reward } from './gamification';
