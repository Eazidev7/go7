/* Script to fix Leaflet CSS preload warning */
console.log('[Leaflet Fix] Applying preload fixes for Leaflet CSS');

// Function to ensure preloaded resources are actually used
function ensurePreloadedResourcesUsed() {
  // Check if we need to fix Leaflet CSS preload warning
  const leafletCssLinks = document.querySelectorAll('link[href*="leaflet.css"]');
  if (leafletCssLinks.length > 0) {
    console.log('[Leaflet Fix] Found Leaflet CSS links, ensuring they are used');
    
    // Only keep one link element to avoid duplication
    if (leafletCssLinks.length > 1) {
      console.log('[Leaflet Fix] Multiple Leaflet CSS links found, removing duplicates');
      for (let i = 1; i < leafletCssLinks.length; i++) {
        leafletCssLinks[i].remove();
      }
    }
  }
  
  // Ensure preloaded marker resources are used
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    /* Fix for preloaded Leaflet resources */
    .leaflet-marker-preload-fix {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
      background-image: url('https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png');
      opacity: 0;
      visibility: hidden;
    }
    
    .leaflet-marker-shadow-preload-fix {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
      background-image: url('https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png');
      opacity: 0;
      visibility: hidden;
    }
  `;
  document.head.appendChild(styleElement);
  
  // Create hidden elements that use the preloaded resources
  const preloadFixDiv = document.createElement('div');
  preloadFixDiv.className = 'leaflet-marker-preload-fix';
  
  const shadowFixDiv = document.createElement('div');
  shadowFixDiv.className = 'leaflet-marker-shadow-preload-fix';
  
  // Add elements to the DOM
  document.body.appendChild(preloadFixDiv);
  document.body.appendChild(shadowFixDiv);
  
  console.log('[Leaflet Fix] Preload fixes applied');
}

// Apply fixes after the page loads
window.addEventListener('load', ensurePreloadedResourcesUsed);

// Export the function so it can be called manually if needed
export default ensurePreloadedResourcesUsed;
