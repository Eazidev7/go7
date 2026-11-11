/**
 * Map preloader component for Go7 delivery app
 * Preloads map-related scripts and assets when component comes into view or on hover
 */

import React, { useEffect, useRef, useState } from 'react';
import { queryClient } from '../../utils/reactQueryInit';
import { prefetchServiceAreas } from '../../hooks/hooks/useQueries';
import { preloadMarkerResources } from '../../utils/mapTileConfig';

/**
 * Component that preloads map-related scripts and assets
 * when it comes into view or on hover
 */
const MapPreloader = ({ children, onPreload, threshold = 0.1 }) => {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasPreloaded, setHasPreloaded] = useState(false);

  // Function to preload map resources
  const preloadMapResources = async () => {
    if (hasPreloaded) return;
    
    console.log('Preloading map resources...');
    
    try {
      // Skip Leaflet CSS preloading - it's already imported in main.jsx
      console.log('Leaflet CSS already imported in main.jsx - skipping preload');
      
      // 2. Don't preload Leaflet JS directly - it should be loaded by the application
      // The preload warning occurs because the script isn't used immediately
      console.log('Skipping Leaflet JS preload to avoid warnings - will be loaded when needed');
      
      // 3. Preload marker icons properly
      preloadMarkerResources();
      
      // 4. Preload first map tile
      const img = new Image();
      img.src = `https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/12/1075/1539?access_token=YOUR_MAPBOX_TOKEN`;
      
      // 4. Prefetch service areas data
      await prefetchServiceAreas(queryClient);
      
      // 5. Import react-leaflet dynamically
      import('react-leaflet').catch(err => console.error('Error preloading react-leaflet:', err));
      
      setHasPreloaded(true);
      onPreload?.();
    } catch (error) {
      console.error('Error preloading map resources:', error);
    }
  };

  // Set up intersection observer for visibility detection
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        
        if (entry.isIntersecting && !hasPreloaded) {
          preloadMapResources();
        }
      },
      { threshold }
    );

    observer.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [hasPreloaded, threshold]);

  // Preload on hover
  useEffect(() => {
    if (isHovered && !hasPreloaded) {
      preloadMapResources();
    }
  }, [isHovered, hasPreloaded]);

  return (
    <div 
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="map-preloader"
    >
      {children}
    </div>
  );
};

export default MapPreloader;
