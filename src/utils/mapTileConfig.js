/**
 * Map tile configuration for Go7 Delivery app
 * Provides optimized tile settings for different map types
 */

// Mapbox access token - use your public token here, not the secret token
const MAPBOX_ACCESS_TOKEN = "YOUR_MAPBOX_TOKEN";

// Set to true to use Mapbox tiles, false to use OpenStreetMap tiles
const USE_MAPBOX = true; // You can toggle this based on your preference

// Optimized light style configuration
export const LIGHT_TILE_CONFIG = USE_MAPBOX ? {
  // Using light-v10 style with reduced detail for better performance
  url: "https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/{z}/{x}/{y}?access_token={accessToken}",
  attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>',
  accessToken: MAPBOX_ACCESS_TOKEN,
  tileSize: 512,
  zoomOffset: -1,
  // Performance optimizations
  detectRetina: true,
  crossOrigin: true,
  updateWhenIdle: true,
  updateWhenZooming: false, // Don't update tiles during zoom for better performance
  keepBuffer: 2, // Keep nearby tiles in memory
  maxZoom: 18,
  minZoom: 12
} : {
  // Fallback to OpenStreetMap if Mapbox token is invalid
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  tileSize: 256,
  // Performance optimizations
  detectRetina: false,
  crossOrigin: true,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 2,
  maxZoom: 18,
  minZoom: 12
};

// Even more simplified style for tracking view (fewer labels, roads only)
export const TRACKING_TILE_CONFIG = USE_MAPBOX ? {
  // Using streets-v11 style with minimal detail for better performance
  url: "https://api.mapbox.com/styles/v1/mapbox/navigation-day-v1/tiles/{z}/{x}/{y}?access_token={accessToken}",
  attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>',
  accessToken: MAPBOX_ACCESS_TOKEN,
  tileSize: 512,
  zoomOffset: -1,
  // Performance optimizations
  detectRetina: true,
  crossOrigin: true,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 2,
  maxZoom: 18,
  minZoom: 12
} : {
  // Fallback to OpenStreetMap if Mapbox token is invalid
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  tileSize: 256,
  // Performance optimizations
  detectRetina: false,
  crossOrigin: true,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 2,
  maxZoom: 18,
  minZoom: 12
};

// Default Abeokuta map bounds to constrain map view
export const ABEOKUTA_BOUNDS = [
  [7.0475, 3.2619],
  [7.2475, 3.4619]
];

// Default Abeokuta center coordinates
export const ABEOKUTA_CENTER = [7.1475, 3.3619];

/**
 * Preload common map tiles for better performance
 * Can be called on app startup or before user navigates to map
 */
export const preloadCommonMapTiles = () => {
  // Preload the most common zoom level tile for Abeokuta center
  const preloadTileUrl = USE_MAPBOX
    ? `https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/13/3227/3276?access_token=${MAPBOX_ACCESS_TOKEN}`
    : `https://a.tile.openstreetmap.org/13/3227/3276.png`;
  
  // Create a new image to preload the tile
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = preloadTileUrl;
  
  console.log('Preloading map tiles for Abeokuta region...');
};

/**
 * Preload all marker resources with proper resource hints
 * This ensures markers load instantly when the map is displayed
 */
export const preloadMarkerResources = () => {
  const leafletVersion = '1.9.4';
  const markerResources = [
    { url: `https://unpkg.com/leaflet@${leafletVersion}/dist/images/marker-icon.png`, as: 'image' },
    { url: `https://unpkg.com/leaflet@${leafletVersion}/dist/images/marker-icon-2x.png`, as: 'image' },
    { url: `https://unpkg.com/leaflet@${leafletVersion}/dist/images/marker-shadow.png`, as: 'image' }
  ];
  
  // For each resource, create both a preload link and an actual IMG element
  markerResources.forEach(resource => {
    // Skip any leaflet CSS resources to avoid preload warnings
    if (resource.url.includes('leaflet.css')) {
      console.log('Skipping Leaflet CSS preload to avoid warnings');
      return;
    }
    
    // Check if this resource is already preloaded
    const existingLink = document.querySelector(`link[href="${resource.url}"]`);
    if (!existingLink) {
      // Create and add the preload link with matching crossorigin attribute
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = resource.as;
      link.href = resource.url;
      link.crossOrigin = 'anonymous';  // Ensure this matches the image request
      document.head.appendChild(link);
    }
    
    // Create an actual image element to load the resource (this prevents the warning)
    const img = new Image();
    img.crossOrigin = 'anonymous';  // Ensure this matches the preload request
    img.src = resource.url;
    img.style.position = 'absolute';
    img.style.width = '0';
    img.style.height = '0';
    img.style.opacity = '0';
    img.style.visibility = 'hidden';
    img.setAttribute('aria-hidden', 'true');
    img.setAttribute('alt', '');
    
    // Append to body to ensure it's actually loaded
    document.body.appendChild(img);
  });
};

/**
 * Helper to handle map tile loading errors
 */
export const handleMapTileError = (error) => {
  console.error('Map tile loading error:', error);
  // Optionally track with Sentry
  // import { captureMapError } from '../utils/sentryEnhanced';
  // captureMapError(error, { type: 'tileLoad' });
};

export default {
  LIGHT_TILE_CONFIG,
  TRACKING_TILE_CONFIG,
  ABEOKUTA_BOUNDS,
  ABEOKUTA_CENTER,
  preloadCommonMapTiles,
  preloadMarkerResources,
  handleMapTileError
};
