/**
 * Comprehensive Leaflet Fix
 * This script fixes issues with Leaflet map loading and preload warnings
 */

// Import all fixes
import { applyAllFixes } from './leaflet-css-final-fix';

// Execute when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Applying comprehensive Leaflet fixes...');
  
  // 1. Apply the preload link fixes
  applyAllFixes();
  
  // 2. Fix map container issues
  fixMapContainers();
  
  // 3. Check for proper CSS loading
  ensureLeafletStyles();
  
  console.log('All Leaflet fixes applied');
});

// Fix map container elements
function fixMapContainers() {
  // Look for map containers after a short delay to ensure they're in the DOM
  setTimeout(() => {
    const mapContainers = document.querySelectorAll('.map-wrap, .map-container, [id$="-map"]');
    if (mapContainers.length === 0) {
      console.log('No map containers found to fix');
      return;
    }
    
    console.log(`Found ${mapContainers.length} map containers to check`);
    
    mapContainers.forEach(container => {
      // Ensure the container has a defined height
      const computedStyle = window.getComputedStyle(container);
      if (computedStyle.height === '0px' || computedStyle.height === 'auto') {
        console.log(`Fixing height for map container: ${container.id || 'unnamed'}`);
        container.style.height = '300px';
      }
      
      // Find Leaflet container inside
      const leafletContainer = container.querySelector('.leaflet-container');
      if (leafletContainer) {
        // Ensure position is relative
        if (window.getComputedStyle(leafletContainer).position !== 'relative') {
          leafletContainer.style.position = 'relative';
        }
        
        // Force invalidate size on any Leaflet maps
        if (leafletContainer._leaflet_id) {
          const mapId = leafletContainer._leaflet_id;
          if (window.L && window.L.maps && window.L.maps[mapId]) {
            console.log(`Invalidating size for map: ${mapId}`);
            window.L.maps[mapId].invalidateSize();
          }
        }
      }
    });
  }, 500); // 500ms delay to ensure DOM is ready
}

// Ensure Leaflet CSS is properly loaded
function ensureLeafletStyles() {
  // Check if Leaflet CSS is loaded
  const hasLeafletCss = Array.from(document.styleSheets).some(sheet => {
    try {
      return sheet.href && sheet.href.includes('leaflet.css');
    } catch (e) {
      return false; // CORS issue with external stylesheet
    }
  });
  
  if (!hasLeafletCss) {
    console.warn('Leaflet CSS may not be properly loaded, adding it dynamically');
    
    // Add Leaflet CSS dynamically (not as preload)
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
}

// Export functionality for direct imports
export {
  fixMapContainers,
  ensureLeafletStyles
};

// Also export default function for use in module imports
export default function applyComprehensiveFixes() {
  applyAllFixes();
  fixMapContainers();
  ensureLeafletStyles();
  return 'Comprehensive Leaflet fixes applied';
}