/**
 * Enhanced Sentry Configuration for GO7 Delivery Platform
 */
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Environment configuration
const environment = import.meta.env.VITE_ENV || 'development';
const isDevelopment = environment === 'development';
const isStaging = environment === 'staging';
const isProduction = environment === 'production';

// Sentry DSN 
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

/**
 * Initialize Sentry monitoring with improved performance and error tracking
 */
export const initSentry = () => {
  try {
    // Check for valid DSN
    if (!SENTRY_DSN || SENTRY_DSN === 'YOUR_SENTRY_DSN' || SENTRY_DSN.trim() === '') {
      console.log('🔧 Sentry: No valid DSN provided - using mock implementation');
      return;
    }

    // Build integrations array based on available modules
    const integrations = [];
    
    // Add BrowserTracing for performance monitoring
    integrations.push(new BrowserTracing({
      // Set sampling based on environment
      tracingOrigins: ['localhost', 'go7delivery.com', /^\//],
    }));
    
    // Add Replay integration if available
    try {
      integrations.push(new Sentry.Replay({
        // Configure session replay for critical errors
        maskAllText: true,
        blockAllMedia: true,
      }));
    } catch (error) {
      console.warn('Sentry Replay not available:', error.message);
    }
    
    // Initialize Sentry with available integrations
    Sentry.init({
      dsn: SENTRY_DSN,
      integrations,
      
      // Performance sampling rates
      tracesSampleRate: isProduction ? 0.2 : 1.0,
      replaysSessionSampleRate: isProduction ? 0.1 : 0.5,
      replaysOnErrorSampleRate: 1.0,
      
      // Set environment for better filtering
      environment,
      
      // Send release version when available
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',
      
      // Ignore some common errors
      ignoreErrors: [
        // Network errors that aren't actionable
        'Network request failed',
        'Failed to fetch',
        'NetworkError',
        'AbortError',
        // Third-party script errors we can't control
        /^Script error\.?$/,
        // User closed the page during load
        'cancel',
        'ECONNABORTED',
        // Maps specific errors to reduce noise
        'Leaflet',
        'Map container is already initialized',
      ],
      
      // Limit max breadcrumbs to not overload memory
      maxBreadcrumbs: 50,
      
      // Add context about the user's device
      beforeSend(event) {
        // Add additional context about the user's browser/device
        event.tags = {
          ...event.tags,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          device_type: getDeviceType(),
          // Add connection info when available
          connection_type: navigator.connection?.effectiveType || 'unknown',
        };
        return event;
      },
    });
    
    console.log(`✅ Sentry initialized for ${environment}`);
  } catch (error) {
    console.error('❌ Sentry initialization failed:', error);
  }
};

/**
 * Capture map loading error with detailed context
 */
export const captureMapError = (error, mapInfo = {}) => {
  if (!Sentry) return;
  
  Sentry.withScope((scope) => {
    scope.setTag('component', 'map');
    scope.setTag('map_type', mapInfo.type || 'tracking');
    scope.setContext('mapState', {
      center: mapInfo.center,
      zoom: mapInfo.zoom,
      markerCount: mapInfo.markerCount,
      tileProvider: mapInfo.tileProvider || 'mapbox',
      hasRoute: !!mapInfo.hasRoute,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      }
    });
    Sentry.captureException(error);
  });
};

/**
 * Track map performance metrics
 */
export const trackMapPerformance = (metrics = {}) => {
  if (!Sentry) return;
  
  Sentry.addBreadcrumb({
    category: 'map.performance',
    message: 'Map Performance Metrics',
    data: {
      loadTime: metrics.loadTime,
      renderTime: metrics.renderTime,
      tileLoadTime: metrics.tileLoadTime,
      markerCount: metrics.markerCount,
      initialLoadComplete: metrics.initialLoadComplete,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      }
    },
    level: 'info'
  });
};

/**
 * Helper to determine device type
 */
const getDeviceType = () => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

/**
 * Set tracking code for order tracking
 * @param {string} trackingCode - Order tracking code
 */
export const setTrackingCode = (trackingCode) => {
  if (!trackingCode) return;
  
  try {
    // Set user context with tracking code
    Sentry.setUser({
      tracking_code: trackingCode
    });
    
    // Add tracking code as tag
    Sentry.setTag('tracking_code', trackingCode);
    
    console.log(`🔍 Tracking code set: ${trackingCode}`);
  } catch (error) {
    console.warn('Failed to set tracking code:', error);
  }
};

export default {
  init: initSentry,
  captureMapError,
  trackMapPerformance,
  setTrackingCode
};
