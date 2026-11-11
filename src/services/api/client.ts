/**
 * API Client - HTTP Request Handler
 * Implements the backend integration guide specifications
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '2.4.1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

/**
 * Get default headers for API requests
 */
function getHeaders(customHeaders: HeadersInit = {}): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-App-Version': APP_VERSION,
    'X-Platform': 'web',
    ...customHeaders,
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Handle API response
 */
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired - try to refresh
      const refreshed = await refreshToken();
      if (!refreshed) {
        // Redirect to login or clear auth state
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    const error = isJson
      ? await response.json()
      : { message: response.statusText };

    return {
      success: false,
      error: error.message || error.error || 'An error occurred',
    };
  }

  const data = isJson ? await response.json() : null;
  return {
    success: true,
    data: data?.data || data,
    message: data?.message,
  };
}

/**
 * Refresh authentication token
 */
async function refreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (data.token && data.refreshToken) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
}

/**
 * Make a GET request
 */
export async function get<T = any>(
  endpoint: string,
  params?: Record<string, any>
): Promise<ApiResponse<T>> {
  try {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getHeaders(),
    });

    return handleResponse<T>(response);
  } catch (error) {
    console.error('GET request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Make a POST request
 */
export async function post<T = any>(
  endpoint: string,
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    return handleResponse<T>(response);
  } catch (error) {
    console.error('POST request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Make a PUT request
 */
export async function put<T = any>(
  endpoint: string,
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    return handleResponse<T>(response);
  } catch (error) {
    console.error('PUT request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Make a PATCH request
 */
export async function patch<T = any>(
  endpoint: string,
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    return handleResponse<T>(response);
  } catch (error) {
    console.error('PATCH request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Make a DELETE request
 */
export async function del<T = any>(
  endpoint: string
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    return handleResponse<T>(response);
  } catch (error) {
    console.error('DELETE request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Upload a file
 */
export async function upload<T = any>(
  endpoint: string,
  file: File,
  fieldName: string = 'file'
): Promise<ApiResponse<T>> {
  try {
    const formData = new FormData();
    formData.append(fieldName, file);

    const headers: HeadersInit = {
      'X-App-Version': APP_VERSION,
      'X-Platform': 'web',
    };

    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return handleResponse<T>(response);
  } catch (error) {
    console.error('Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

export default {
  get,
  post,
  put,
  patch,
  delete: del,
  upload,
};
