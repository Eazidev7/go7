// Leaflet Live Map Test
// This script tests if the Leaflet map is loading correctly

// Check for Leaflet presence
if (typeof L === 'undefined') {
  console.error('ERROR: Leaflet is not loaded!');
} else {
  console.log('SUCCESS: Leaflet is available, version ' + L.version);
}

// Check for map components
setTimeout(() => {
  // Look for map components on the page
  const mapElements = document.querySelectorAll('.leaflet-container');
  
  if (mapElements.length === 0) {
    console.error('ERROR: No Leaflet maps found on the page');
  } else {
    console.log(`SUCCESS: Found ${mapElements.length} Leaflet map(s) on the page`);
    
    // Check if maps have proper dimensions
    mapElements.forEach((mapEl, index) => {
      const width = mapEl.clientWidth;
      const height = mapEl.clientHeight;
      
      if (width === 0 || height === 0) {
        console.error(`ERROR: Map #${index + 1} has zero dimensions (${width}x${height})`);
      } else {
        console.log(`SUCCESS: Map #${index + 1} has proper dimensions (${width}x${height})`);
      }
      
      // Check for tile elements
      const tileElements = mapEl.querySelectorAll('.leaflet-tile');
      
      if (tileElements.length === 0) {
        console.warn(`WARNING: Map #${index + 1} has no tiles loaded`);
      } else {
        console.log(`SUCCESS: Map #${index + 1} has ${tileElements.length} tiles loaded`);
      }
      
      // Check for markers
      const markerElements = mapEl.querySelectorAll('.leaflet-marker-icon');
      
      if (markerElements.length === 0) {
        console.warn(`WARNING: Map #${index + 1} has no markers`);
      } else {
        console.log(`SUCCESS: Map #${index + 1} has ${markerElements.length} markers`);
      }
    });
  }
  
  // Check for preload links in head
  const preloadLinks = document.querySelectorAll('link[rel="preload"][href*="leaflet"]');
  
  if (preloadLinks.length > 0) {
    console.warn(`WARNING: Found ${preloadLinks.length} Leaflet preload links that may cause warnings`);
  } else {
    console.log('SUCCESS: No Leaflet preload links found');
  }
  
  // Report on console warnings
  if (window.consoleWarnings && window.consoleWarnings.length > 0) {
    const leafletWarnings = window.consoleWarnings.filter(w => 
      w.toLowerCase().includes('leaflet') || 
      w.toLowerCase().includes('preload')
    );
    
    if (leafletWarnings.length > 0) {
      console.warn(`WARNING: ${leafletWarnings.length} Leaflet-related console warnings detected`);
    } else {
      console.log('SUCCESS: No Leaflet-related console warnings detected');
    }
  }
}, 2000); // Give the map time to initialize

// Helper to track console warnings
if (!window.consoleWarnings) {
  window.consoleWarnings = [];
  const originalWarn = console.warn;
  console.warn = function() {
    window.consoleWarnings.push(Array.from(arguments).join(' '));
    originalWarn.apply(console, arguments);
  };
}