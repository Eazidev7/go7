/**
 * Menu & Products API Service
 * Following GO7 Backend Integration Guide - Section 3
 */

import { get, ApiResponse, PaginationParams } from './client';
import { MenuItem, Product, Addon } from './vendors';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface MenuResponse {
  categories: string[];
  items: MenuItem[];
}

export interface ProductsResponse {
  categories: string[];
  products: Product[];
}

export interface AddonsResponse {
  addons: Addon[];
}

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * Get vendor menu
 * GET /api/vendors/:vendorId/menu
 */
export async function getVendorMenu(
  vendorId: string,
  category?: string
): Promise<ApiResponse<MenuResponse>> {
  const params = category ? { category } : undefined;
  return get<MenuResponse>(`/vendors/${vendorId}/menu`, params);
}

/**
 * Get menu categories
 * GET /api/vendors/:vendorId/menu/categories
 */
export async function getMenuCategories(
  vendorId: string
): Promise<ApiResponse<{ categories: string[] }>> {
  return get(`/vendors/${vendorId}/menu/categories`);
}

/**
 * Get single menu item
 * GET /api/vendors/:vendorId/menu/items/:itemId
 */
export async function getMenuItem(
  vendorId: string,
  itemId: string
): Promise<ApiResponse<MenuItem>> {
  return get<MenuItem>(`/vendors/${vendorId}/menu/items/${itemId}`);
}

/**
 * Get vendor addons
 * GET /api/vendors/:vendorId/addons
 */
export async function getVendorAddons(
  vendorId: string
): Promise<ApiResponse<AddonsResponse>> {
  return get<AddonsResponse>(`/vendors/${vendorId}/addons`);
}

/**
 * Get vendor products (for pharmacy/market)
 * GET /api/vendors/:vendorId/products
 */
export async function getVendorProducts(
  vendorId: string,
  params?: PaginationParams & { category?: string }
): Promise<ApiResponse<ProductsResponse>> {
  return get<ProductsResponse>(`/vendors/${vendorId}/products`, params);
}

/**
 * Get single product
 * GET /api/products/:productId
 */
export async function getProduct(
  productId: string
): Promise<ApiResponse<Product>> {
  return get<Product>(`/products/${productId}`);
}
