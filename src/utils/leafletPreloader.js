/**
 * Simple Leaflet Preloader
 * Ensures Leaflet is available before components try to use it
 */

let leafletLoaded = false;
let loadingPromise = null;

// Function to check if Leaflet is available
export function isLeafletLoaded() {
  return typeof window !== 'undefined' && window.L && leafletLoaded;
}

// Function to wait for Leaflet to load
export function waitForLeaflet() {
  if (isLeafletLoaded()) {
    return Promise.resolve();
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise((resolve, reject) => {
    // Check if Leaflet is already available
    if (window.L) {
      leafletLoaded = true;
      resolve();
      return;
    }

    // Import Leaflet dynamically
    import('leaflet').then(() => {
      leafletLoaded = true;
      console.log('✅ Leaflet loaded successfully');
      resolve();
    }).catch((error) => {
      console.error('❌ Failed to load Leaflet:', error);
      reject(error);
    });
  });

  return loadingPromise;
}

// Initialize Leaflet on module load
if (typeof window !== 'undefined') {
  waitForLeaflet().catch(console.error);
}