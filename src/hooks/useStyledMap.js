// src/hooks/useStyledMap.js
/**
 * React Hook for Styled Maps Integration
 * Provides theme switching and styled map utilities
 */

import { useState, useEffect, useCallback } from 'react';
import { Go7StyledMapPackage, mapThemes, styledMapUtils } from '../utils/styledMapConfig';

export const useStyledMap = (initialTheme = 'chowdeck') => {
  const [currentTheme, setCurrentTheme] = useState(initialTheme);
  const [styledMapInstance, setStyledMapInstance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize styled map package
  useEffect(() => {
    const instance = new Go7StyledMapPackage(currentTheme);
    setStyledMapInstance(instance);
  }, [currentTheme]);

  // Switch theme function
  const switchTheme = useCallback((newTheme) => {
    if (mapThemes[newTheme] && styledMapInstance) {
      setIsLoading(true);
      setCurrentTheme(newTheme);
      const newStyle = styledMapInstance.setTheme(newTheme);
      
      // Simulate loading time for smooth transition
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
      
      return newStyle;
    }
  }, [styledMapInstance]);

  // Get current theme configuration
  const getThemeConfig = useCallback(() => {
    return mapThemes[currentTheme] || mapThemes.chowdeck;
  }, [currentTheme]);

  // Get styled CSS for map container
  const getMapContainerStyle = useCallback(() => {
    if (!styledMapInstance) return {};
    
    const themeConfig = getThemeConfig();
    return {
      backgroundColor: themeConfig.background,
      filter: styledMapInstance.getThemeFilter(),
      transition: 'all 0.3s ease-in-out'
    };
  }, [styledMapInstance, getThemeConfig]);

  // Get styled props for neighborhood labels
  const getLabelStyle = useCallback((neighborhoodName) => {
    const themeConfig = getThemeConfig();
    const color = styledMapUtils.neighborhoodColors({ theme: neighborhoodName }) || '#FF6B35';
    
    return {
      backgroundColor: color,
      color: themeConfig.labels.text,
      border: themeConfig.labels.border,
      boxShadow: themeConfig.pins.shadow,
      borderRadius: '6px',
      padding: '4px 8px',
      fontSize: '11px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      '&:hover': {
        boxShadow: themeConfig.pins.hover,
        transform: 'scale(1.05) translateY(-1px)'
      }
    };
  }, [getThemeConfig]);

  // Get route styling for OSRM integration
  const getRouteStyle = useCallback((routeType = 'delivery') => {
    if (!styledMapInstance) return {};
    
    const themeConfig = getThemeConfig();
    return {
      color: routeType === 'delivery' ? '#e50914' : themeConfig.roads.major,
      weight: 4,
      opacity: 0.8,
      dashArray: currentTheme === 'chowdeck' ? [12, 20] : null,
      className: `route-${currentTheme}-${routeType}`
    };
  }, [styledMapInstance, getThemeConfig, currentTheme]);

  // Auto-detect user preference (dark/light mode)
  const detectSystemTheme = useCallback(() => {
    if (typeof window !== 'undefined') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDarkMode ? 'dark' : 'modern';
    }
    return 'chowdeck';
  }, []);

  // Toggle between light and dark themes
  const toggleDarkMode = useCallback(() => {
    const newTheme = currentTheme === 'dark' ? 'chowdeck' : 'dark';
    switchTheme(newTheme);
  }, [currentTheme, switchTheme]);

  return {
    // State
    currentTheme,
    isLoading,
    styledMapInstance,
    
    // Theme management
    switchTheme,
    toggleDarkMode,
    detectSystemTheme,
    
    // Style getters
    getThemeConfig,
    getMapContainerStyle,
    getLabelStyle,
    getRouteStyle,
    
    // Available themes
    availableThemes: Object.keys(mapThemes),
    
    // Theme info
    themeInfo: {
      name: currentTheme,
      config: getThemeConfig(),
      isDark: currentTheme === 'dark'
    }
  };
};

// Hook for responsive map sizing
export const useResponsiveMap = () => {
  const [screenSize, setScreenSize] = useState('desktop');
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 480) {
        setScreenSize('mobile');
      } else if (width < 768) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const getResponsiveSize = useCallback((property) => {
    return styledMapUtils.responsiveSize({ theme: screenSize }) || '14px';
  }, [screenSize]);
  
  return {
    screenSize,
    getResponsiveSize,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop'
  };
};

export default useStyledMap;