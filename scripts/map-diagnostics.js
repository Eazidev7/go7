/**
 * Map Diagnostics Script
 * 
 * This script helps diagnose and fix issues with Leaflet map rendering.
 * It runs after the page loads and checks for map elements, applies fixes,
 * and logs detailed information about the map containers.
 */

// Wait for page to fully load
window.addEventListener('load', function() {
  console.log('🔍 Map diagnostics script running...');
  
  // Function to check element dimensions and visibility
  function checkElement(element, label) {
    if (!element) {
      console.error(`❌ ${label} not found!`);
      return false;
    }
    
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    
    console.log(`📏 ${label} dimensions:`, {
      width: rect.width,
      height: rect.height,
      display: styles.display,
      visibility: styles.visibility,
      position: styles.position,
      zIndex: styles.zIndex,
      overflow: styles.overflow
    });
    
    // Check if the element has zero dimensions
    if (rect.width === 0 || rect.height === 0) {
      console.error(`❌ ${label} has zero dimensions!`);
      return false;
    }
    
    // Check if the element is hidden
    if (styles.display === 'none' || styles.visibility === 'hidden') {
      console.error(`❌ ${label} is hidden!`);
      return false;
    }
    
    console.log(`✅ ${label} appears to be properly rendered`);
    return true;
  }
  
  // Function to apply emergency fixes
  function applyFixes() {
    console.log('🔧 Applying emergency fixes to map elements...');
    
    // Fix map wrap
    document.querySelectorAll('.map-wrap').forEach(element => {
      element.style.height = 'auto';
      element.style.minHeight = '300px';
      element.style.display = 'block';
      element.style.position = 'relative';
      element.style.zIndex = '10';
      console.log('🔧 Fixed .map-wrap element');
    });
    
    // Fix map inner
    document.querySelectorAll('.map-inner').forEach(element => {
      element.style.height = '420px';
      element.style.width = '100%';
      element.style.display = 'block';
      element.style.position = 'relative';
      element.style.zIndex = '1';
      console.log('🔧 Fixed .map-inner element');
    });
    
    // Fix leaflet container
    document.querySelectorAll('.leaflet-container').forEach(element => {
      element.style.height = '100%';
      element.style.width = '100%';
      element.style.minHeight = '300px';
      element.style.position = 'relative';
      element.style.zIndex = '1';
      console.log('🔧 Fixed .leaflet-container element');
    });
  }
  
  // First check, 500ms after load
  setTimeout(function() {
    console.log('🔍 Running initial map element check...');
    
    const mapWrap = document.querySelector('.map-wrap');
    const mapInner = document.querySelector('.map-inner');
    const leafletContainer = document.querySelector('.leaflet-container');
    
    checkElement(mapWrap, 'Map wrap');
    checkElement(mapInner, 'Map inner');
    checkElement(leafletContainer, 'Leaflet container');
    
    // Apply fixes if needed
    if (!leafletContainer || 
        !checkElement(leafletContainer, 'Leaflet container')) {
      applyFixes();
      
      // Force window resize to trigger Leaflet's internal resize handler
      window.dispatchEvent(new Event('resize'));
      console.log('🔄 Triggered window resize event');
    }
  }, 500);
  
  // Second check, 2 seconds after load
  setTimeout(function() {
    console.log('🔍 Running follow-up map element check...');
    
    const leafletContainer = document.querySelector('.leaflet-container');
    
    if (!leafletContainer) {
      console.error('❌ Leaflet container still not found after fixes!');
      console.log('🔧 Applying more aggressive fixes...');
      
      // Try to initialize Leaflet manually if it exists
      if (window.L && typeof window.L.map === 'function') {
        const mapInner = document.querySelector('.map-inner');
        if (mapInner && !mapInner.hasAttribute('data-fixed')) {
          mapInner.setAttribute('data-fixed', 'true');
          mapInner.style.height = '420px';
          mapInner.style.width = '100%';
          
          // Try to force Leaflet to initialize
          try {
            const map = L.map(mapInner, {
              center: [7.1475, 3.3619],
              zoom: 12.5,
            });
            
            // Add a tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            
            console.log('✅ Manually initialized Leaflet map');
          } catch (error) {
            console.error('❌ Failed to manually initialize Leaflet:', error);
          }
        }
      }
    } else {
      checkElement(leafletContainer, 'Leaflet container (follow-up)');
      
      // Invalidate map size if Leaflet is available
      if (window.L && window.L.Map) {
        const maps = Object.values(L.Map._instances || {});
        console.log(`📊 Found ${maps.length} Leaflet map instances`);
        
        maps.forEach(function(map, index) {
          if (map && typeof map.invalidateSize === 'function') {
            map.invalidateSize(true);
            console.log(`✅ Invalidated size for map #${index + 1}`);
          }
        });
      }
    }
  }, 2000);
});