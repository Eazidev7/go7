// src/utils/styledMapConfig.js
/**
 * Styled Map Configuration for Go7 Delivery App
 * Integrates styled-map-package with Mapbox, Maptiler, and OSRM
 */

// TEMPORARILY COMMENTED - styled-map-package has Node.js dependencies incompatible with browser
// import { StyledMapPackage } from 'styled-map-package';
// import styledMap from 'styled-map';

// Mock StyledMapPackage for browser compatibility
const StyledMapPackage = {
  create: () => ({ style: {}, config: {} }),
  applyTheme: (map, theme) => {} // Silently skip - not available in browser
};

const styledMap = (config) => {
  // Silently return config - styled-map not available in browser
  return config;
};

// Styled map configuration for different themes
export const mapThemes = {
  // Chowdeck-style theme (current)
  chowdeck: {
    background: '#f2ead0',
    roads: {
      major: '#f4cc84',
      minor: '#f0d898',
      highway: '#e6b800'
    },
    labels: {
      background: 'rgba(255, 255, 255, 0.9)',
      text: '#1a1a1a',
      border: '2px solid white'
    },
    pins: {
      shadow: '0 2px 8px rgba(0,0,0,0.15)',
      hover: '0 4px 12px rgba(0,0,0,0.25)'
    }
  },

  // Dark theme for night mode
  dark: {
    background: '#1a1a1a',
    roads: {
      major: '#404040',
      minor: '#333333',
      highway: '#555555'
    },
    labels: {
      background: 'rgba(40, 40, 40, 0.9)',
      text: '#ffffff',
      border: '2px solid #666666'
    },
    pins: {
      shadow: '0 2px 8px rgba(0,0,0,0.5)',
      hover: '0 4px 12px rgba(0,0,0,0.7)'
    }
  },

  // Light/modern theme
  modern: {
    background: '#f8f9fa',
    roads: {
      major: '#e9ecef',
      minor: '#f1f3f4',
      highway: '#dee2e6'
    },
    labels: {
      background: 'rgba(255, 255, 255, 0.95)',
      text: '#212529',
      border: '1px solid #e9ecef'
    },
    pins: {
      shadow: '0 2px 6px rgba(0,0,0,0.1)',
      hover: '0 4px 10px rgba(0,0,0,0.15)'
    }
  }
};

// Styled map utilities using styled-map package
export const styledMapUtils = {
  // Apply theme-based styling
  applyTheme: styledMap({
    chowdeck: mapThemes.chowdeck,
    dark: mapThemes.dark,
    modern: mapThemes.modern,
    default: mapThemes.chowdeck
  }),

  // Dynamic color mapping for neighborhoods
  neighborhoodColors: styledMap({
    'Camp': '#FF6D00',
    'Kuto': '#D50000',
    'Ibara': '#0097A7',
    'Panseke': '#AA00FF',
    'Adigbe': '#00C853',
    'Oke-Ilewo': '#F50057',
    'Asero': '#2962FF',
    'Sapon': '#FF9800',
    'default': '#FF6B35'
  }),

  // Responsive sizing
  responsiveSize: styledMap({
    mobile: '12px',
    tablet: '14px',
    desktop: '16px',
    default: '14px'
  })
};

// Create styled map package for offline usage
export class Go7StyledMapPackage {
  constructor(theme = 'chowdeck') {
    this.theme = theme;
    this.currentTheme = mapThemes[theme] || mapThemes.chowdeck;
  }

  // Generate map style configuration
  generateStyle() {
    return {
      version: 8,
      name: `Go7 ${this.theme} Style`,
      sources: {
        'go7-tiles': {
          type: 'raster',
          tiles: [
            // Use custom Go7 MapTiler style
            `https://api.maptiler.com/maps/019996dd-306b-7019-acc5-de8469c0388d/{z}/{x}/{y}.png?key=nRGZ9lGblbV9lFK2KclL`
          ],
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: {
            'background-color': this.currentTheme.background
          }
        },
        {
          id: 'go7-tiles-layer',
          type: 'raster',
          source: 'go7-tiles',
          paint: {
            'raster-opacity': 0.8
          }
        }
      ]
    };
  }

  // Apply custom CSS filters for theme
  getThemeFilter() {
    switch (this.theme) {
      case 'chowdeck':
        return 'sepia(0.8) saturate(0.2) hue-rotate(15deg) brightness(1.3) contrast(0.6)';
      case 'dark':
        return 'invert(1) contrast(1.2) brightness(0.8)';
      case 'modern':
        return 'saturate(0.8) brightness(1.1) contrast(0.9)';
      default:
        return 'none';
    }
  }

  // Switch theme dynamically
  setTheme(newTheme) {
    if (mapThemes[newTheme]) {
      this.theme = newTheme;
      this.currentTheme = mapThemes[newTheme];
      return this.generateStyle();
    }
    return null;
  }
}

// Integration with existing OSRM routing
export const styledRoutingConfig = {
  // Style route lines based on theme
  getRouteStyle(theme = 'chowdeck') {
    const themeConfig = mapThemes[theme];
    return {
      color: theme === 'dark' ? '#ffffff' : '#e50914',
      weight: 4,
      opacity: 0.8,
      dashArray: theme === 'chowdeck' ? [12, 20] : null,
      className: `route-${theme}`
    };
  },

  // Style delivery markers
  getMarkerStyle(theme = 'chowdeck', type = 'pickup') {
    const themeConfig = mapThemes[theme];
    return {
      backgroundColor: type === 'pickup' ? '#00C853' : '#e50914',
      borderColor: themeConfig.labels.border,
      boxShadow: themeConfig.pins.shadow,
      color: themeConfig.labels.text
    };
  }
};

// Export default configuration
export default {
  themes: mapThemes,
  utils: styledMapUtils,
  StyledMapPackage: Go7StyledMapPackage,
  routing: styledRoutingConfig
};