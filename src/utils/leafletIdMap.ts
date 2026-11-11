/**
 * Leaflet ID Map Initializer
 * 
 * This module provides a safe way to initialize and manage the Leaflet ID map
 * without directly modifying the imported Leaflet object.
 */

// Check if Leaflet is defined globally
const ensureLeafletIdMap = (): boolean => {
  if (typeof window === 'undefined' || typeof window.L === 'undefined') {
    console.warn('Leaflet not available in global scope');
    return false;
  }
  
  // Initialize the _leaflet_id_map property safely
  const leafletAny = window.L as any;
  if (typeof leafletAny._leaflet_id_map === 'undefined') {
    console.log('Initializing Leaflet ID map');
    leafletAny._leaflet_id_map = {};
  }
  
  return true;
};

// Add a utility to register a map in the id map
const registerMapInstance = (map: any): void => {
  if (!ensureLeafletIdMap() || !map || !map._leaflet_id) {
    return;
  }
  
  const leafletAny = window.L as any;
  if (map._leaflet_id && leafletAny._leaflet_id_map) {
    leafletAny._leaflet_id_map[map._leaflet_id] = map;
  }
};

export { ensureLeafletIdMap, registerMapInstance };