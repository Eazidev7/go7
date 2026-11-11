/**
 * Enhanced Map preloader component for Go7 delivery app
 * Preloads map-related scripts and assets when component comes into view or on hover
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { queryClient } from '../../utils/reactQueryInit';
import { prefetchServiceAreas, prefetchPricingConfig } from '../../hooks/useQueries';
import { preloadCommonMapTiles, preloadMarkerResources } from '../../utils/mapTileConfig';
import { trackMapPerformance } from '../../utils/sentryEnhanced';

/**
 * Component that intelligently preloads map-related resources
 * when it comes into view, on hover, or based on scroll direction
 */
const EnhancedMapPreloader = ({ 
  children, 
  onPreload, 
  threshold = 0.1, 
  preloadDistance = 300, // px from viewport when scrolling
  priority = 'medium' // low, medium, high
}) => {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasPreloaded, setHasPreloaded] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const startTimeRef = useRef(null);

  // Set priority level for preloading resources
  const priorityLevel = {
    low: { delay: 500, timeout: 10000 },
    medium: { delay: 200, timeout: 5000 },
    high: { delay: 0, timeout: 3000 }
  }[priority] || { delay: 200, timeout: 5000 };

  // Enhanced function to preload map resources with performance tracking
  const preloadMapResources = useCallback(async () => {
    if (hasPreloaded || isPreloading) return;
    
    setIsPreloading(true);
    startTimeRef.current = performance.now();
    
    try {
      // Skip Leaflet CSS preloading - it's already imported in main.jsx
      console.log('Leaflet CSS already imported in main.jsx - skipping preload');
      
      // 2. Preload common map tiles
      preloadCommonMapTiles();
      
      // 3. Preload marker images with correct resource hints
      preloadMarkerResources();
      
      // 4. Add small delay for non-high priority preloads
      if (priorityLevel.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, priorityLevel.delay));
      }
      
      // 5. Prefetch data that will be needed for the map
      await Promise.all([
        prefetchServiceAreas(queryClient),
        prefetchPricingConfig(queryClient)
      ]);
      
      // 5. Dynamic import react-leaflet components that will be needed
      const imports = [];
      
      // Only import these if they're not already loaded
      if (!window.__leafletComponentsLoaded) {
        imports.push(
          import('react-leaflet').then(module => {
            window.__leafletComponentsLoaded = true;
            return module;
          })
        );
      }
      
      // Wait for all imports with timeout
      const importPromise = Promise.all(imports);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Import timeout')), priorityLevel.timeout)
      );
      
      await Promise.race([importPromise, timeoutPromise]).catch(err => {
        console.warn('Map component preload timed out, will load on demand', err);
      });
      
      // Track performance metrics
      const loadTime = performance.now() - startTimeRef.current;
      trackMapPerformance({ 
        loadTime,
        preloadType: isHovered ? 'hover' : (isVisible ? 'visible' : 'scroll'),
        priority
      });
      
      setHasPreloaded(true);
      onPreload?.();
    } catch (error) {
      console.error('Error preloading map resources:', error);
    } finally {
      setIsPreloading(false);
    }
  }, [hasPreloaded, isPreloading, isHovered, isVisible, onPreload, priority, priorityLevel]);

  // Set up intersection observer for visibility detection
  useEffect(() => {
    if (!containerRef.current) return;

    // Create observer with configured threshold
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        
        // If element is visible and hasn't been preloaded yet, preload resources
        if (entry.isIntersecting && !hasPreloaded && !isPreloading) {
          preloadMapResources();
        }
      },
      { 
        threshold,
        rootMargin: `${preloadDistance}px` // Start loading before element is visible
      }
    );

    observer.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [hasPreloaded, isPreloading, preloadMapResources, preloadDistance, threshold]);

  // Preload on hover with debounce
  useEffect(() => {
    if (isHovered && !hasPreloaded && !isPreloading) {
      const timer = setTimeout(() => {
        preloadMapResources();
      }, 100); // Small debounce to prevent accidental hover triggers
      
      return () => clearTimeout(timer);
    }
  }, [isHovered, hasPreloaded, isPreloading, preloadMapResources]);

  // Monitor scroll direction to preload when user is scrolling toward the map
  useEffect(() => {
    if (hasPreloaded || isPreloading) return;
    
    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      const scrollingDown = window.scrollY > lastScrollY;
      const mapPosition = containerRef.current?.getBoundingClientRect();
      
      // If scrolling down and map is within preloadDistance below viewport
      if (scrollingDown && 
          mapPosition && 
          mapPosition.top > 0 && 
          mapPosition.top < window.innerHeight + preloadDistance) {
        preloadMapResources();
      }
      
      lastScrollY = window.scrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasPreloaded, isPreloading, preloadDistance, preloadMapResources]);

  return (
    <div 
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="map-preloader"
      data-preloaded={hasPreloaded}
      data-preloading={isPreloading}
    >
      {/* Hidden elements to ensure preloaded resources are used */}
      <div className="leaflet-marker-preload-fix" aria-hidden="true"></div>
      <div className="leaflet-marker-shadow-preload-fix" aria-hidden="true"></div>
      <div className="leaflet-marker-retina-preload-fix" aria-hidden="true"></div>
      
      {children}
    </div>
  );
};

export default EnhancedMapPreloader;
