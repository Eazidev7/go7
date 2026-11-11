/**
 * Map Fix Script
 * 
 * This script helps ensure that Leaflet maps properly render by forcing
 * a resize event after the page has fully loaded.
 */

// Run after the page loads
window.addEventListener('load', function() {
  console.log('Map fix script running...');
  
  // Set a timer to give everything a chance to initialize
  setTimeout(function() {
    // Find all Leaflet map instances
    const mapElements = document.querySelectorAll('.leaflet-container');
    console.log('Found', mapElements.length, 'map elements');
    
    if (mapElements.length > 0) {
      // Trigger a window resize event to force Leaflet maps to recalculate dimensions
      window.dispatchEvent(new Event('resize'));
      console.log('Triggered resize event for maps');
      
      // Force map containers to have explicit height
      document.querySelectorAll('.map-inner').forEach(function(mapInner) {
        mapInner.style.height = '420px';
        mapInner.style.display = 'block';
        console.log('Applied explicit height to map container');
      });
      
      // Additional check for Leaflet's internal invalidateSize method
      if (window.L && window.L.Map) {
        const maps = Object.values(L.Map._instances || {});
        console.log('Found', maps.length, 'Leaflet map instances');
        
        maps.forEach(function(map) {
          if (map && typeof map.invalidateSize === 'function') {
            map.invalidateSize(true);
            console.log('Invalidated map size for a Leaflet instance');
          }
        });
      }
    }
  }, 1000); // Wait 1 second after load
});

// Also run when tab visibility changes (useful for mobile or tab switching)
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) {
    console.log('Page became visible, refreshing maps...');
    // Trigger window resize to help maps recalculate
    window.dispatchEvent(new Event('resize'));
  }
});