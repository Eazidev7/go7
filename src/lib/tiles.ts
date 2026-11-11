import * as L from 'leaflet';

// Extend the ImportMeta interface to include env
declare global {
  interface ImportMeta {
    env: {
      VITE_MAPBOX_TOKEN?: string;
      [key: string]: any;
    };
  }
}

/**
 * Gets the default tile layer for Leaflet maps
 * Uses Mapbox if VITE_MAPBOX_TOKEN is available, otherwise falls back to OpenStreetMap
 * @param map - The Leaflet map instance (not used but kept for API consistency)
 * @returns L.TileLayer configured with appropriate tile source
 */
export function getDefaultTileLayer(map?: L.Map): L.TileLayer {
  // Check if Mapbox token is available
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  
  // Debug logging for development
  if (import.meta.env.DEV) {
    if (mapboxToken) {
      console.log('🗺️ Tiles: Using Mapbox tiles with token');
    } else {
      console.warn('🗺️ Tiles: Mapbox token missing; falling back to OSM');
    }
  }
  
  if (mapboxToken) {
    // Use Mapbox tiles with minimal flat style
    return L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={token}', {
      attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      tileSize: 512,
      maxZoom: 18,
      zoomOffset: -1,
      id: 'mapbox/light-v11', // Use light style instead of streets for minimal look
      token: mapboxToken
    } as any);
  } else {
    // Fallback to OpenStreetMap with minimal styling
    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    });
  }
}
