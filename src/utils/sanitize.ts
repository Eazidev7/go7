/**
 * Input Sanitization Utilities
 * Protects against XSS attacks and malicious input
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: []
  });
}

/**
 * Sanitize plain text (removes all HTML)
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}

/**
 * Sanitize user name
 */
export function sanitizeName(name: string): string {
  if (!name) return '';
  // Remove HTML, trim, limit length
  const clean = sanitizeText(name).trim();
  return clean.substring(0, 100);
}

/**
 * Sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  const clean = sanitizeText(email).trim().toLowerCase();
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(clean) ? clean : '';
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters except +
  const clean = phone.replace(/[^\d+]/g, '');
  // Ensure + is only at the start
  if (clean.includes('+')) {
    const parts = clean.split('+');
    return '+' + parts.filter(p => p).join('');
  }
  return clean;
}

/**
 * Sanitize address
 */
export function sanitizeAddress(address: string): string {
  if (!address) return '';
  const clean = sanitizeText(address).trim();
  return clean.substring(0, 500);
}

/**
 * Sanitize price/amount (ensure it's a valid number)
 */
export function sanitizeAmount(amount: any): number {
  const num = parseFloat(amount);
  if (isNaN(num) || num < 0) return 0;
  // Round to 2 decimal places
  return Math.round(num * 100) / 100;
}

/**
 * Sanitize quantity
 */
export function sanitizeQuantity(qty: any): number {
  const num = parseInt(qty);
  if (isNaN(num) || num < 1) return 1;
  if (num > 100) return 100; // Max quantity limit
  return num;
}

/**
 * Sanitize URL
 */
export function sanitizeURL(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize chat message
 */
export function sanitizeMessage(message: string): string {
  if (!message) return '';
  const clean = sanitizeText(message).trim();
  return clean.substring(0, 1000); // Max message length
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  const clean = sanitizeText(query).trim();
  return clean.substring(0, 100);
}

/**
 * Sanitize product data
 */
export interface SanitizedProductData {
  name: string;
  description: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export function sanitizeProductData(data: any): SanitizedProductData {
  return {
    name: sanitizeName(data.name || ''),
    description: sanitizeText(data.description || '').substring(0, 1000),
    price: sanitizeAmount(data.price),
    quantity: sanitizeQuantity(data.quantity),
    imageUrl: data.imageUrl ? sanitizeURL(data.imageUrl) : undefined
  };
}

/**
 * Sanitize order data
 */
export function sanitizeOrderData(data: any) {
  return {
    customerName: sanitizeName(data.customerName),
    customerPhone: sanitizePhone(data.customerPhone),
    customerEmail: sanitizeEmail(data.customerEmail),
    deliveryAddress: sanitizeAddress(data.deliveryAddress),
    specialInstructions: sanitizeMessage(data.specialInstructions || ''),
    items: Array.isArray(data.items) 
      ? data.items.map(sanitizeProductData)
      : []
  };
}

/**
 * Rate limiting helper - track requests per user
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(userId: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = requestCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset window
    requestCounts.set(userId, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  userLimit.count++;
  return true;
}

/**
 * Clear old rate limit entries (cleanup)
 */
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [userId, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(userId);
    }
  }
}

// Cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
