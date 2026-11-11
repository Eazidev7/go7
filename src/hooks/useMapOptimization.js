import { useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Custom hook for optimizing map performance
 * Handles map instance management and prevents unnecessary re-renders
 */
export const useMapOptimization = (initialCenter, initialZoom) => {
  const mapInstanceRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Stable map options that don't change
  const stableMapOptions = useMemo(() => ({
    center: initialCenter || [7.1475, 3.3619],
    zoom: initialZoom || 13,
    scrollWheelZoom: false,
    zoomControl: true,
    attributionControl: false,
    preferCanvas: true,
    zoomAnimation: true,
    updateWhenIdle: true,
    updateWhenZooming: false,
    maxBounds: [[7.0475, 3.2619], [7.2475, 3.4619]], // Abeokuta bounds
    minZoom: 12,
    maxZoom: 18
  }), [initialCenter, initialZoom]);

  // Set map instance
  const setMapInstance = useCallback((map) => {
    if (map && !isInitializedRef.current) {
      mapInstanceRef.current = map;
      isInitializedRef.current = true;

      // Add performance optimizations
      if (map.options) {
        map.options.updateWhenIdle = true;
        map.options.updateWhenZooming = false;
      }

      // Disable scroll wheel zoom by default (can be enabled by user)
      if (map.scrollWheelZoom) {
        map.scrollWheelZoom.disable();
      }
    }
  }, []);

  // Get current map instance
  const getMapInstance = useCallback(() => {
    return mapInstanceRef.current;
  }, []);

  // Toggle scroll wheel zoom
  const toggleScrollWheelZoom = useCallback(() => {
    const map = mapInstanceRef.current;
    if (map && map.scrollWheelZoom) {
      const isEnabled = map.scrollWheelZoom.enabled();
      if (isEnabled) {
        map.scrollWheelZoom.disable();
      } else {
        map.scrollWheelZoom.enable();
      }
      return !isEnabled;
    }
    return false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mapInstanceRef.current = null;
      isInitializedRef.current = false;
    };
  }, []);

  return {
    mapOptions: stableMapOptions,
    setMapInstance,
    getMapInstance,
    toggleScrollWheelZoom,
    isInitialized: isInitializedRef.current
  };
};

/**
 * Hook for managing marker data with memoization
 */
export const useOptimizedMarkers = (areas, activeField) => {
  // Memoize areas to prevent unnecessary re-renders
  const memoizedAreas = useMemo(() => {
    if (!Array.isArray(areas)) return [];
    
    // Sort areas for consistent rendering order
    return [...areas].sort((a, b) => a.id - b.id);
  }, [areas]);

  // Memoize marker click handler
  const createMarkerClickHandler = useCallback((onAreaClick) => {
    return (area) => {
      console.log(`Map area clicked: ${area.name} (active field: ${activeField})`);
      onAreaClick(area);
    };
  }, [activeField]);

  return {
    memoizedAreas,
    createMarkerClickHandler
  };
};

/**
 * Hook for preloading map resources
 */
export const useMapPreloading = () => {
  useEffect(() => {
    // Don't preload Leaflet CSS - it should be imported in main.jsx
    const preloadLeafletCSS = () => {
      // CSS is now imported directly in main.jsx
      console.log('[Map] Leaflet CSS already imported in main.jsx');
    };

    // Preload map tiles for Abeokuta area
    const preloadMapTiles = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const { preloadAbeokutaTiles } = await import('../utils/mapCaching');
          await preloadAbeokutaTiles();
        } catch (error) {
          console.warn('Failed to preload map tiles:', error);
        }
      }
    };

    preloadLeafletCSS();
    preloadMapTiles();
  }, []);
};

/**
 * Hook for handling map visibility (Intersection Observer)
 * Only loads map when it's about to become visible
 */
export const useMapVisibility = (threshold = 0.1) => {
  const elementRef = useRef(null);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !('IntersectionObserver' in window)) {
      isVisibleRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isVisibleRef.current) {
          isVisibleRef.current = true;
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return {
    ref: elementRef,
    isVisible: isVisibleRef.current
  };
};

/**
 * Hook for debouncing map operations
 */
export const useMapDebounce = (callback, delay = 300) => {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};
