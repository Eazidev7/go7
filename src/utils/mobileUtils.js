/**
 * Mobile detection and optimization utilities
 */

/**
 * Detect if the current device is a mobile device based on screen width or user agent
 * @param {number} breakpoint - Width threshold for mobile devices (default: 768px)
 * @returns {boolean} - True if the device is mobile
 */
export const isMobileDevice = (breakpoint = 768) => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') return false;
  
  // Check screen width first (responsive approach)
  const isMobileWidth = window.innerWidth < breakpoint;
  
  // Check user agent as fallback
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  return isMobileWidth || isMobileUA;
};

/**
 * Get the device type based on screen width
 * @returns {string} - 'mobile', 'tablet', or 'desktop'
 */
export const getDeviceType = () => {
  if (typeof window === 'undefined') return 'desktop'; // Default for SSR
  
  const width = window.innerWidth;
  
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

/**
 * Check if the device supports touch
 * @returns {boolean} - True if touch is supported
 */
export const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * Apply optimizations for mobile devices
 * @param {Object} mapInstance - Leaflet map instance
 */
export const optimizeMapForMobile = (mapInstance) => {
  if (!mapInstance || !isMobileDevice()) return;
  
  // Disable map interactions that might be problematic on mobile
  mapInstance.scrollWheelZoom.disable();
  
  // Enable touch zoom and drag for mobile
  mapInstance.touchZoom.enable();
  mapInstance.dragging.enable();
  
  // Disable double-click zoom (often causes accidental zooms on mobile)
  mapInstance.doubleClickZoom.disable();
};

/**
 * Add a utility class to the body element based on the device type
 * This allows for CSS targeting based on the device type
 */
export const addDeviceClassToBody = () => {
  if (typeof document === 'undefined') return;
  
  const deviceType = getDeviceType();
  
  // Remove any existing device classes
  document.body.classList.remove('is-mobile', 'is-tablet', 'is-desktop');
  
  // Add the appropriate class
  document.body.classList.add(`is-${deviceType}`);
  
  // Add touch class if needed
  if (isTouchDevice()) {
    document.body.classList.add('is-touch-device');
  } else {
    document.body.classList.remove('is-touch-device');
  }
};

/**
 * Apply touch-specific event handlers to map elements
 * @param {string} selector - CSS selector for map container
 */
export const enhanceTouchInteractions = (selector = '.mapShell') => {
  if (typeof document === 'undefined' || !isTouchDevice()) return;
  
  const elements = document.querySelectorAll(selector);
  
  elements.forEach(el => {
    // Add touch event listeners
    const addTouchedClass = () => el.classList.add('touched');
    const removeTouchedClass = () => {
      el.classList.add('touching');
      // Remove the touched class after animation completes
      setTimeout(() => {
        el.classList.remove('touched', 'touching');
      }, 300);
    };
    
    // Improve tap responsiveness
    el.addEventListener('touchstart', addTouchedClass, { passive: true });
    el.addEventListener('touchend', removeTouchedClass, { passive: true });
    
    // Add custom touch feedback for map markers
    const markers = el.querySelectorAll('.leaflet-marker-icon, .pillLabel');
    markers.forEach(marker => {
      marker.addEventListener('touchstart', (e) => {
        marker.classList.add('marker-touched');
        // Prevent double-tap zoom if this is a marker
        if (marker.classList.contains('leaflet-marker-icon')) {
          e.stopPropagation();
        }
      }, { passive: false });
      
      marker.addEventListener('touchend', () => {
        setTimeout(() => marker.classList.remove('marker-touched'), 300);
      }, { passive: true });
    });
  });
};

/**
 * Handle double-tap for zooming with more control
 * @param {Object} mapInstance - Leaflet map instance
 */
export const setupDoubleTapZoom = (mapInstance) => {
  if (!mapInstance || !isTouchDevice()) return;
  
  let lastTap = 0;
  let touchTimeout;
  
  const handleTap = (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    clearTimeout(touchTimeout);
    
    if (tapLength < 500 && tapLength > 0) {
      // Double tap detected - zoom in at the tapped location
      const point = mapInstance.containerPointToLatLng(
        L.point([e.containerPoint.x, e.containerPoint.y])
      );
      mapInstance.setView(point, mapInstance.getZoom() + 1);
      e.originalEvent.preventDefault();
    } else {
      // Single tap - set up detection for potential second tap
      touchTimeout = setTimeout(() => {
        // Single tap confirmed - do nothing special
      }, 500);
    }
    
    lastTap = currentTime;
  };
  
  // Add custom tap handler
  mapInstance.on('tap', handleTap);
  
  // Return cleanup function
  return () => mapInstance.off('tap', handleTap);
};

/**
 * Initialize mobile optimizations
 * Call this function in your app's entry point
 */
export const initMobileOptimizations = () => {
  addDeviceClassToBody();
  enhanceTouchInteractions();
  
  // Re-apply on resize
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      addDeviceClassToBody();
      enhanceTouchInteractions();
    });
    
    // Clean up on unmount
    return () => window.removeEventListener('resize', addDeviceClassToBody);
  }
};
