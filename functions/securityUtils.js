/**
 * Backend Input Validation & Sanitization
 * Server-side security for Cloud Functions
 */

const functions = require('firebase-functions/v1');

/**
 * Sanitize string input
 */
function sanitizeString(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  // Remove HTML tags and special characters that could be dangerous
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML
    .replace(/[<>'"]/g, '') // Remove dangerous chars
    .trim()
    .substring(0, maxLength);
}

/**
 * Sanitize email
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  const clean = email.toLowerCase().trim();
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(clean) ? clean : '';
}

/**
 * Sanitize phone number
 */
function sanitizePhone(phone) {
  if (typeof phone !== 'string') return '';
  // Keep only digits and +
  let clean = phone.replace(/[^\d+]/g, '');
  // Ensure + only at start
  if (clean.includes('+')) {
    const parts = clean.split('+');
    clean = '+' + parts.filter(p => p).join('');
  }
  return clean;
}

/**
 * Sanitize number (price, quantity, etc)
 */
function sanitizeNumber(num, min = 0, max = 1000000) {
  const parsed = parseFloat(num);
  if (isNaN(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

/**
 * Sanitize quantity
 */
function sanitizeQuantity(qty) {
  const num = parseInt(qty);
  if (isNaN(num) || num < 1) return 1;
  if (num > 100) return 100;
  return num;
}

/**
 * Sanitize product data
 */
function sanitizeProductData(product) {
  if (!product || typeof product !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid product data');
  }

  return {
    name: sanitizeString(product.name, 200),
    description: sanitizeString(product.description, 1000),
    price: sanitizeNumber(product.price, 0, 10000000),
    basePrice: sanitizeNumber(product.basePrice || product.price, 0, 10000000),
    quantity: sanitizeQuantity(product.quantity || 1),
    available: Boolean(product.available),
    category: sanitizeString(product.category, 100),
    imageUrl: sanitizeString(product.imageUrl, 500),
    measurementType: sanitizeString(product.measurementType, 50)
  };
}

/**
 * Sanitize cart item
 */
function sanitizeCartItem(item) {
  if (!item || typeof item !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid cart item');
  }

  return {
    productId: sanitizeString(item.productId, 100),
    title: sanitizeString(item.title, 200),
    price: sanitizeNumber(item.price, 0, 10000000),
    quantity: sanitizeQuantity(item.quantity),
    vendorId: sanitizeString(item.vendorId, 100),
    imageUrl: sanitizeString(item.imageUrl, 500)
  };
}

/**
 * Sanitize order data
 */
function sanitizeOrderData(order) {
  if (!order || typeof order !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid order data');
  }

  return {
    customerName: sanitizeString(order.customerName, 100),
    customerPhone: sanitizePhone(order.customerPhone),
    customerEmail: sanitizeEmail(order.customerEmail),
    deliveryAddress: sanitizeString(order.deliveryAddress, 500),
    specialInstructions: sanitizeString(order.specialInstructions || '', 1000),
    items: Array.isArray(order.items) 
      ? order.items.map(sanitizeCartItem)
      : []
  };
}

/**
 * Validate authentication
 */
function requireAuth(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }
  return context.auth.uid;
}

/**
 * Validate admin role
 */
async function requireAdmin(context, firestore) {
  const uid = requireAuth(context);
  
  const userDoc = await firestore.collection('users').doc(uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin access required'
    );
  }
  
  return uid;
}

/**
 * Rate limiting using Firestore
 */
async function checkRateLimit(userId, action, firestore, maxRequests = 10, windowMs = 60000) {
  const rateLimitRef = firestore.collection('rate_limits').doc(`${userId}_${action}`);
  const rateLimitDoc = await rateLimitRef.get();
  
  const now = Date.now();
  
  if (!rateLimitDoc.exists) {
    // First request
    await rateLimitRef.set({
      count: 1,
      resetTime: now + windowMs,
      lastRequest: now
    });
    return true;
  }
  
  const data = rateLimitDoc.data();
  
  if (now > data.resetTime) {
    // Window expired, reset
    await rateLimitRef.set({
      count: 1,
      resetTime: now + windowMs,
      lastRequest: now
    });
    return true;
  }
  
  if (data.count >= maxRequests) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Rate limit exceeded. Try again in ${Math.ceil((data.resetTime - now) / 1000)} seconds`
    );
  }
  
  // Increment count
  await rateLimitRef.update({
    count: data.count + 1,
    lastRequest: now
  });
  
  return true;
}

/**
 * Validate and sanitize fare calculation data
 */
function sanitizeFareData(data) {
  if (!data || typeof data !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid fare data');
  }

  const distanceKm = sanitizeNumber(data.distanceKm, 0, 200);
  const durationMin = sanitizeNumber(data.durationMin, 0, 600);
  
  if (distanceKm === 0 || durationMin === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Distance and duration must be positive values'
    );
  }

  return {
    distanceKm,
    durationMin,
    clientFare: sanitizeNumber(data.clientFare, 0, 100000)
  };
}

module.exports = {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeNumber,
  sanitizeQuantity,
  sanitizeProductData,
  sanitizeCartItem,
  sanitizeOrderData,
  sanitizeFareData,
  requireAuth,
  requireAdmin,
  checkRateLimit
};
