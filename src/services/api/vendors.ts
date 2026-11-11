/**
 * Vendor API Service
 * Following GO7 Backend Integration Guide - Section 2
 */

import { get, ApiResponse, PaginationParams, Pagination } from './client';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Vendor {
  id: string;
  name: string;
  type: 'restaurant' | 'pharmacy' | 'market';
  category: string;
  description: string;
  image: string;
  logo: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string; // "20-30 min"
  deliveryFee: number;
  minimumOrder: number;
  isOpen: boolean;
  isFeatured: boolean;
  tags: string[];
  address: {
    street: string;
    city: string;
    state: string;
    coordinates: { lat: number; lng: number };
  };
  operatingHours: {
    [day: string]: { open: string; close: string };
  };
}

export interface VendorListParams extends PaginationParams {
  type?: 'restaurant' | 'pharmacy' | 'market';
  category?: string;
  lat?: number;
  lng?: number;
}

export interface VendorListResponse {
  vendors: Vendor[];
  pagination: Pagination;
}

export interface VendorDetailsResponse {
  vendor: Vendor;
  menu?: MenuItem[];
  products?: Product[];
}

export interface MenuItem {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  image: string;
  price: number;
  originalPrice?: number;
  category: string;
  isAvailable: boolean;
  preparationTime: number;
  calories?: number;
  ingredients?: string[];
  allergens?: string[];
  tags: string[];
  addons?: Addon[];
  customizationOptions?: CustomizationOption[];
}

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  image: string;
  price: number;
  originalPrice?: number;
  category: string;
  isAvailable: boolean;
  stock?: number;
  tags: string[];
}

export interface Addon {
  id: string;
  name: string;
  options: AddonOption[];
  required: boolean;
  multiSelect: boolean;
  minSelect?: number;
  maxSelect?: number;
}

export interface AddonOption {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface CustomizationOption {
  id: string;
  name: string;
  type: 'select' | 'multi-select' | 'text';
  options?: string[];
  required: boolean;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  orderId: string;
  vendorId: string;
  rating: number;
  comment?: string;
  tags: string[];
  images?: string[];
  riderRating?: number;
  createdAt: string;
  vendorReply?: {
    message: string;
    repliedAt: string;
  };
}

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * Get all vendors
 * GET /api/vendors
 */
export async function getVendors(
  params?: VendorListParams
): Promise<ApiResponse<VendorListResponse>> {
  return get<VendorListResponse>('/vendors', params);
}

/**
 * Get single vendor by ID
 * GET /api/vendors/:id
 */
export async function getVendor(
  vendorId: string
): Promise<ApiResponse<VendorDetailsResponse>> {
  return get<VendorDetailsResponse>(`/vendors/${vendorId}`);
}

/**
 * Get trending vendors
 * GET /api/vendors/trending
 */
export async function getTrendingVendors(
  params?: PaginationParams
): Promise<ApiResponse<VendorListResponse>> {
  return get<VendorListResponse>('/vendors/trending', params);
}

/**
 * Get vendors by category
 * GET /api/vendors/category/:category
 */
export async function getVendorsByCategory(
  category: string,
  params?: PaginationParams
): Promise<ApiResponse<VendorListResponse>> {
  return get<VendorListResponse>(`/vendors/category/${category}`, params);
}

/**
 * Search vendors
 * GET /api/vendors/search
 */
export async function searchVendors(
  query: string,
  params?: VendorListParams
): Promise<ApiResponse<VendorListResponse>> {
  return get<VendorListResponse>('/vendors/search', { q: query, ...params });
}

/**
 * Get vendor reviews
 * GET /api/vendors/:id/reviews
 */
export async function getVendorReviews(
  vendorId: string,
  params?: PaginationParams
): Promise<ApiResponse<{ reviews: Review[]; pagination: Pagination }>> {
  return get(`/vendors/${vendorId}/reviews`, params);
}

/**
 * Get vendor operating hours
 * GET /api/vendors/:id/operating-hours
 */
export async function getVendorOperatingHours(
  vendorId: string
): Promise<ApiResponse<{ operatingHours: Vendor['operatingHours'] }>> {
  return get(`/vendors/${vendorId}/operating-hours`);
}
