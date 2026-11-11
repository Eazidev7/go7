// Map Debug Utility
// This script helps diagnose map loading issues on the Home page

// Run this function in the browser console to diagnose map issues
window.debugMaps = function() {
  console.group("Map Debugging");
  
  // Check Leaflet availability
  console.log("1. Leaflet Library Check");
  if (typeof L === 'undefined') {
    console.error("❌ Leaflet library is not loaded");
  } else {
    console.log("✅ Leaflet is available (version " + L.version + ")");
  }
  
  // Check for map containers
  console.log("\n2. Map Container Check");
  const mapContainers = document.querySelectorAll('.map-wrap, .map-inner, [id$="-map"]');
  console.log(`Found ${mapContainers.length} map containers`);
  
  mapContainers.forEach((container, index) => {
    const id = container.id || `unnamed-container-${index}`;
    const rect = container.getBoundingClientRect();
    console.log(`Container ${index+1}: ${id}`, {
      width: rect.width, 
      height: rect.height,
      visible: rect.width > 0 && rect.height > 0,
      inViewport: rect.top < window.innerHeight && rect.bottom > 0,
      classes: Array.from(container.classList),
      computedDisplay: window.getComputedStyle(container).display,
      computedVisibility: window.getComputedStyle(container).visibility,
      childrenCount: container.children.length
    });
  });
  
  // Check for Leaflet components
  console.log("\n3. Leaflet Component Check");
  const leafletContainers = document.querySelectorAll('.leaflet-container');
  
  if (leafletContainers.length === 0) {
    console.error("❌ No Leaflet map instances found in the DOM");
  } else {
    console.log(`✅ Found ${leafletContainers.length} Leaflet map instances`);
    
    leafletContainers.forEach((leafletContainer, index) => {
      const rect = leafletContainer.getBoundingClientRect();
      console.log(`Leaflet instance ${index+1}:`, {
        width: rect.width, 
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0,
        hasMapPane: !!leafletContainer.querySelector('.leaflet-map-pane'),
        hasTileLayer: !!leafletContainer.querySelector('.leaflet-tile-container'),
        hasTiles: leafletContainer.querySelectorAll('.leaflet-tile').length > 0,
        hasMarkers: leafletContainer.querySelectorAll('.leaflet-marker-icon').length > 0
      });
    });
  }
  
  // Check for CSS issues
  console.log("\n4. CSS and Style Check");
  const styleSheets = Array.from(document.styleSheets);
  const leafletCssLoaded = styleSheets.some(sheet => {
    try {
      return sheet.href && sheet.href.includes('leaflet.css');
    } catch (e) {
      return false; // CORS issues with external stylesheets
    }
  });
  
  if (leafletCssLoaded) {
    console.log("✅ Leaflet CSS is loaded");
  } else {
    console.error("❌ Leaflet CSS not detected");
  }
  
  // Check z-index issues
  const mapWrap = document.querySelector('.map-wrap');
  if (mapWrap) {
    const parentElements = [];
    let currentNode = mapWrap.parentNode;
    
    while (currentNode) {
      if (currentNode.nodeType === 1) { // Element node
        const computedStyle = window.getComputedStyle(currentNode);
        if (computedStyle.position !== 'static' || 
            computedStyle.zIndex !== 'auto' || 
            computedStyle.overflow !== 'visible') {
          parentElements.push({
            tagName: currentNode.tagName,
            id: currentNode.id,
            classes: Array.from(currentNode.classList),
            position: computedStyle.position,
            zIndex: computedStyle.zIndex,
            overflow: computedStyle.overflow
          });
        }
      }
      currentNode = currentNode.parentNode;
    }
    
    if (parentElements.length > 0) {
      console.log("⚠️ Potential parent elements affecting map:", parentElements);
    } else {
      console.log("✅ No parent elements found that might cause z-index issues");
    }
  }
  
  // Try to fix any issues
  console.log("\n5. Attempting Auto-fixes");
  
  // Fix for map containers with zero height
  let fixedIssues = 0;
  mapContainers.forEach(container => {
    const rect = container.getBoundingClientRect();
    if (rect.height === 0 || rect.width === 0) {
      console.log(`Fixing zero dimensions for container: ${container.id || 'unnamed'}`);
      container.style.height = '300px';
      container.style.display = 'block';
      fixedIssues++;
    }
  });
  
  // Fix for Leaflet CSS not loaded
  if (!leafletCssLoaded) {
    console.log("Adding Leaflet CSS dynamically");
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    fixedIssues++;
  }
  
  // Try to force map invalidation
  if (typeof L !== 'undefined' && L.map) {
    const leafletContainers = document.querySelectorAll('.leaflet-container');
    if (leafletContainers.length > 0) {
      console.log("Attempting to invalidate existing maps");
      
      leafletContainers.forEach(container => {
        // Force invalidation by changing dimensions slightly
        const originalHeight = container.style.height;
        container.style.height = (parseInt(originalHeight) + 1) + 'px';
        
        // Try to access the map instance
        if (container._leaflet_id && L.map && L.map._instances) {
          const mapInstance = L.map._instances[container._leaflet_id];
          if (mapInstance && typeof mapInstance.invalidateSize === 'function') {
            console.log("Calling invalidateSize on map instance");
            mapInstance.invalidateSize(true);
            fixedIssues++;
          }
        }
        
        // Restore original height
        setTimeout(() => {
          container.style.height = originalHeight;
        }, 100);
      });
    }
  }
  
  if (fixedIssues > 0) {
    console.log(`Applied ${fixedIssues} auto-fixes. Refresh the page to see if they worked.`);
  } else {
    console.log("No auto-fixes were applied");
  }
  
  console.groupEnd();
  
  return "Map debugging complete. Check console for results.";
};

// Add a button to the page for easy access
if (document.readyState === "complete" || document.readyState === "interactive") {
  addDebugButton();
} else {
  document.addEventListener("DOMContentLoaded", addDebugButton);
}

function addDebugButton() {
  if (process.env.NODE_ENV !== 'development') return;
  
  // Create debug button
  const button = document.createElement('button');
  button.textContent = '🔍 Debug Maps';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    background-color: #E53935;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  
  button.addEventListener('click', () => {
    window.debugMaps();
  });
  
  document.body.appendChild(button);
}

// Auto-run debug on load in development
if (process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    if (typeof L === 'undefined' || document.querySelectorAll('.leaflet-container').length === 0) {
      console.warn("Map Debug: Leaflet map may not be loading properly. Run window.debugMaps() for diagnostics.");
    }
  }, 3000);
}

export function debugMap() {
  return window.debugMaps();
}

export default { debugMap };