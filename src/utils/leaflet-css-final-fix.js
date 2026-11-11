/**
 * Final fix for Leaflet preload issues
 * This script addresses all remaining Leaflet CSS preload warnings
 */

// First, check if there's any preload link for Leaflet resources and remove it
function removeLeafletPreloadLinks() {
  // Look for any preload links to leaflet.css or leaflet.js
  const preloadLinks = document.querySelectorAll('link[rel="preload"][href*="leaflet.css"], link[rel="preload"][href*="leaflet.js"]');
  
  if (preloadLinks.length > 0) {
    console.log('[Leaflet Fix] Found and removing', preloadLinks.length, 'Leaflet preload links');
    preloadLinks.forEach(link => link.remove());
    return true;
  }
  
  return false;
}

// Monitor for any dynamically added preload links
function setupPreloadMonitor() {
  // Create an observer to watch for dynamically added preload links
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeName === 'LINK' && 
              node.rel === 'preload' && 
              node.href && 
              (node.href.includes('leaflet.css') || node.href.includes('leaflet.js'))) {
            console.log('[Leaflet Fix] Caught dynamic Leaflet preload link, removing it');
            node.remove();
          }
        });
      }
    });
  });
  
  // Start observing the document head for changes
  observer.observe(document.head, { childList: true, subtree: true });
  
  return observer;
}

// Patch the mapTileConfig preloadMarkerResources function to prevent it from creating CSS preload links
function patchMapTileConfig() {
  try {
    // Only proceed if the module exists
    if (typeof window.mapTileConfig !== 'undefined' && 
        typeof window.mapTileConfig.preloadMarkerResources === 'function') {
      
      console.log('[Leaflet Fix] Patching mapTileConfig.preloadMarkerResources');
      
      // Store the original function
      const originalPreloadMarkerResources = window.mapTileConfig.preloadMarkerResources;
      
      // Replace with patched version
      window.mapTileConfig.preloadMarkerResources = function() {
        // Call original function
        originalPreloadMarkerResources();
        
        // Then clean up any preload links
        removeLeafletPreloadLinks();
      };
    }
  } catch (error) {
    console.error('[Leaflet Fix] Error patching mapTileConfig:', error);
  }
}

// Apply all fixes as soon as possible
function applyAllFixes() {
  console.log('[Leaflet Fix] Applying comprehensive Leaflet preload fixes');
  
  // First, remove any existing preload links
  const removed = removeLeafletPreloadLinks();
  if (removed) {
    console.log('[Leaflet Fix] Removed existing Leaflet preload links');
  }
  
  // Set up monitoring for future preload links
  const observer = setupPreloadMonitor();
  console.log('[Leaflet Fix] Set up monitoring for dynamic preload links');
  
  // Patch the map tile config if available
  patchMapTileConfig();
  
  // Return cleanup function
  return () => {
    observer.disconnect();
    console.log('[Leaflet Fix] Preload monitor disconnected');
  };
}

// Apply fixes immediately
const cleanup = applyAllFixes();

// Re-apply after window load to catch any late additions
window.addEventListener('load', () => {
  removeLeafletPreloadLinks();
});

// Export the fix functions
export {
  removeLeafletPreloadLinks,
  setupPreloadMonitor,
  patchMapTileConfig,
  applyAllFixes
};

export default applyAllFixes;