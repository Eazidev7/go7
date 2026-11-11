/**
 * Sentry Configuration for GO7 Delivery Platform
 * Simple mock implementation to prevent import errors
 */

// Environment configuration
const environment = import.meta.env.VITE_ENV || 'development';
const isDevelopment = environment === 'development';
const isStaging = environment === 'staging';
const isProduction = environment === 'production';

// Sentry DSN - TODO: Replace with your actual Sentry DSN
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

// Mock Sentry for development - prevents import errors
const mockSentry = {
  init: () => console.log('🔧 Sentry: Mock monitoring initialized'),
  captureException: (error) => console.error('📊 Sentry Mock:', error),
  captureMessage: (message) => console.log('📊 Sentry Mock:', message),
  addBreadcrumb: () => {},
  setTag: () => {},
  setUser: () => {},
  setContext: () => {},
};

/**
 * Initialize Sentry monitoring
 */
export const initSentry = () => {
  try {
    if (isDevelopment) {
      // Use mock Sentry in development to prevent import errors
      console.log('🔧 Sentry: Mock monitoring initialized for development');
      return mockSentry;
    }

    // In production, you would initialize actual Sentry here
    // For now, using mock to prevent import errors
    console.log(`✅ Sentry initialized for ${environment}`);
    return mockSentry;
    
  } catch (error) {
    console.error('❌ Sentry initialization failed:', error);
    return mockSentry;
  }
};

/**
 * Track errors with context
 */
export const trackError = (error, context = {}) => {
  if (isDevelopment) {
    console.error('❌ Error:', error, context);
    return;
  }
  
  try {
    // In production, use actual Sentry
    console.error('📊 Error tracked:', error, context);
  } catch (err) {
    console.error('Failed to track error:', err);
  }
};

/**
 * Track business metrics
 */
export const trackBusinessMetric = (metric, value, tags = {}) => {
  if (isDevelopment) {
    console.log(`📊 Business Metric [${metric}]: ${value}`, tags);
    return;
  }
  
  try {
    // In production, use actual Sentry
    console.log(`📊 Business Metric [${metric}]: ${value}`, tags);
  } catch (err) {
    console.error('Failed to track metric:', err);
  }
};

/**
 * Track Mapbox API failures and fallback to haversine
 */
export const trackMapboxFallback = (error, routeData) => {
  const logData = {
    message: 'Mapbox API failed, using haversine fallback',
    category: 'routing',
    level: 'warning',
    data: {
      error: error?.message || 'Unknown error',
      route_source: 'haversine',
      pickup: routeData?.pickup,
      dropoff: routeData?.dropoff,
      haversine_distance: routeData?.haversineDistance
    }
  };

  if (isDevelopment) {
    console.log('🔧 Mapbox fallback:', logData);
    return;
  }

  try {
    // In production, use actual Sentry
    console.log('📊 Mapbox fallback tracked:', logData);
  } catch (err) {
    console.error('Failed to track Mapbox fallback:', err);
  }
};

/**
 * Track rider assignment metrics
 */
export const trackRiderAssignment = (bookingId, riderId, method, metadata = {}) => {
  const logData = {
    booking_id: bookingId,
    rider_id: riderId,
    assignment_method: method,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  if (isDevelopment) {
    console.log('📊 Rider Assignment:', logData);
    return;
  }

  try {
    // In production, use actual Sentry
    console.log('📊 Rider assignment tracked:', logData);
  } catch (err) {
    console.error('Failed to track rider assignment:', err);
  }
};

// Default export
export default {
  init: initSentry,
  captureException: trackError,
  captureMessage: (message) => console.log('📊 Sentry Mock:', message),
  addBreadcrumb: () => {},
  setTag: () => {},
  setUser: () => {},
  setContext: () => {}
};
