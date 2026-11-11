/**
 * Authentication API Service
 * Following GO7 Backend Integration Guide - Section 1
 */

import { get, post, put, patch, del, ApiResponse } from './client';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  referralCode: string;
  level?: number;
  coins?: number;
  points?: number;
  paystackAccountNumber?: string;
  createdAt: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  referralCode?: string;
}

export interface LoginRequest {
  email: string; // or phone
  password: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * Register a new user
 * POST /api/auth/register
 */
export async function register(
  data: RegisterRequest
): Promise<ApiResponse<AuthResponse>> {
  const response = await post<AuthResponse>('/auth/register', data);
  
  // Store tokens if successful
  if (response.success && response.data) {
    localStorage.setItem('authToken', response.data.token);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  
  return response;
}

/**
 * Login an existing user
 * POST /api/auth/login
 */
export async function login(
  data: LoginRequest
): Promise<ApiResponse<AuthResponse>> {
  const response = await post<AuthResponse>('/auth/login', data);
  
  // Store tokens if successful
  if (response.success && response.data) {
    localStorage.setItem('authToken', response.data.token);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  
  return response;
}

/**
 * Logout current user
 * POST /api/auth/logout
 */
export async function logout(): Promise<ApiResponse<void>> {
  const response = await post<void>('/auth/logout');
  
  // Clear local storage
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  
  return response;
}

/**
 * Refresh authentication token
 * POST /api/auth/refresh-token
 */
export async function refreshToken(
  refreshToken: string
): Promise<ApiResponse<AuthTokens>> {
  const response = await post<AuthTokens>('/auth/refresh-token', { refreshToken });
  
  if (response.success && response.data) {
    localStorage.setItem('authToken', response.data.token);
    localStorage.setItem('refreshToken', response.data.refreshToken);
  }
  
  return response;
}

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(
  email: string
): Promise<ApiResponse<{ message: string }>> {
  return post('/auth/forgot-password', { email });
}

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<ApiResponse<{ message: string }>> {
  return post('/auth/reset-password', { token, newPassword });
}

/**
 * Verify email address
 * POST /api/auth/verify-email
 */
export async function verifyEmail(
  token: string
): Promise<ApiResponse<{ message: string }>> {
  return post('/auth/verify-email', { token });
}

/**
 * Verify phone number
 * POST /api/auth/verify-phone
 */
export async function verifyPhone(
  code: string
): Promise<ApiResponse<{ message: string }>> {
  return post('/auth/verify-phone', { code });
}

/**
 * Resend OTP code
 * POST /api/auth/resend-otp
 */
export async function resendOtp(
  phone: string
): Promise<ApiResponse<{ message: string }>> {
  return post('/auth/resend-otp', { phone });
}

/**
 * Get current user profile
 * GET /api/user/profile
 */
export async function getProfile(): Promise<ApiResponse<User>> {
  const response = await get<User>('/user/profile');
  
  if (response.success && response.data) {
    localStorage.setItem('user', JSON.stringify(response.data));
  }
  
  return response;
}

/**
 * Update user profile
 * PUT /api/user/profile
 */
export async function updateProfile(
  data: UpdateProfileRequest
): Promise<ApiResponse<User>> {
  const response = await put<User>('/user/profile', data);
  
  if (response.success && response.data) {
    localStorage.setItem('user', JSON.stringify(response.data));
  }
  
  return response;
}

/**
 * Update user avatar
 * PATCH /api/user/avatar
 */
export async function updateAvatar(
  avatar: string
): Promise<ApiResponse<User>> {
  const response = await patch<User>('/user/avatar', { avatar });
  
  if (response.success && response.data) {
    localStorage.setItem('user', JSON.stringify(response.data));
  }
  
  return response;
}

/**
 * Delete user account
 * DELETE /api/user/account
 */
export async function deleteAccount(): Promise<ApiResponse<{ message: string }>> {
  const response = await del<{ message: string }>('/user/account');
  
  if (response.success) {
    localStorage.clear();
  }
  
  return response;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('authToken');
}

/**
 * Get current user from local storage
 */
export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Clear authentication state
 */
export function clearAuth(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}
