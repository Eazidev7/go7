import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import './live-areas-abeokuta.css';
import { ensureLeafletIdMap, registerMapInstance } from '../../utils/leafletIdMap';

interface LiveAreasAbeokutaProps {
  onSelect?: (areaName: string) => void;
}

// Service areas data for Abeokuta
const ABEOKUTA_AREAS = [
  { name: "Panseke",    lat: 7.1482, lng: 3.3399, variant: "orange" },
  { name: "Kuto",       lat: 7.1405, lng: 3.3514, variant: "blue"   },
  { name: "Ibara",      lat: 7.1599, lng: 3.3537, variant: "green"  },
  { name: "Oke-Ilewo",  lat: 7.1557, lng: 3.3494, variant: "mint"   },
  { name: "Lafenwa",    lat: 7.1715, lng: 3.3384, variant: "yellow" },
  { name: "Ijemo",      lat: 7.1608, lng: 3.3416, variant: "violet" },
  { name: "Adatan",     lat: 7.1531, lng: 3.3303, variant: "pink"   },
  { name: "Kemta",      lat: 7.1328, lng: 3.3438, variant: "green"  },
  { name: "Obantoko",   lat: 7.1553, lng: 3.2816, variant: "orange" },
  { name: "Omida",      lat: 7.1577, lng: 3.3452, variant: "mint"   },
  { name: "Totoro",     lat: 7.1762, lng: 3.3470, variant: "yellow" },
  { name: "FUNAAB",     lat: 7.2426, lng: 3.4421, variant: "blue"   },
  { name: "Camp",       lat: 7.2215, lng: 3.4429, variant: "violet" }
];

// Map Tiler API key
const MAP_TILER_KEY = 'nRGZ9lGblbV9lFK2KclL';

// Available tile URLs - Fixed order for better fallback
const TILE_URLS = [
  // Primary fallback without API key (most reliable)
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  // Secondary fallback
  'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
  // MapTiler as last option (may have API key issues)
  `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${MAP_TILER_KEY}`
];

// Fix for default Leaflet markers - comprehensive fix
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Set proper marker icons to avoid 404 errors
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPC9zdmc+',
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPC9zdmc+',
  shadowUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDEiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCA0MSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPC9zdmc+',
});

const LiveAreasAbeokuta: React.FC<LiveAreasAbeokutaProps> = ({ onSelect }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [tileError, setTileError] = useState(false);
  
  // Test tile server accessibility
  const testTileServer = async (url: string): Promise<boolean> => {
    try {
      // Test a specific tile (zoom 10, x: 512, y: 512)
      const testUrl = url.replace('{z}', '10').replace('{x}', '512').replace('{y}', '512').replace('{s}', 'a');
      const response = await fetch(testUrl, { method: 'HEAD' });
      console.log(`🌐 Tile server test for ${url}:`, response.status);
      return response.ok;
    } catch (error) {
      console.warn(`❌ Tile server test failed for ${url}:`, error);
      return false;
    }
  };
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    // Set explicit dimensions to avoid the zero-size issue
    if (mapContainerRef.current) {
      mapContainerRef.current.style.height = '380px';
      mapContainerRef.current.style.width = '100%';
      mapContainerRef.current.style.minHeight = '380px';
      mapContainerRef.current.style.display = 'block';
    }
    
    // Create the map with a slight delay to ensure DOM is ready
    const initTimeout = setTimeout(() => {
      if (!mapContainerRef.current) return;
      
      try {
        console.log('Initializing LiveAreasAbeokuta map');
        
        // Test tile servers before initializing map
        console.log('🔍 Testing tile server accessibility...');
        for (let i = 0; i < TILE_URLS.length; i++) {
          testTileServer(TILE_URLS[i]);
        }
        
        // Enhanced error tracking for debugging
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        
        const enhancedError = (...args: any[]) => {
          if (args.some(arg => typeof arg === 'string' && (arg.includes('leaflet') || arg.includes('map') || arg.includes('tile')))) {
            console.log('🔍 Map-related error detected:', ...args);
          }
          originalConsoleError.apply(console, args);
        };
        enhancedError.originalMethod = originalConsoleError;
        
        const enhancedWarn = (...args: any[]) => {
          if (args.some(arg => typeof arg === 'string' && (arg.includes('leaflet') || arg.includes('map') || arg.includes('tile')))) {
            console.log('🔍 Map-related warning detected:', ...args);
          }
          originalConsoleWarn.apply(console, args);
        };
        enhancedWarn.originalMethod = originalConsoleWarn;
        
        console.error = enhancedError;
        console.warn = enhancedWarn;
        
        // Force Leaflet to recognize proper container size
        const container = mapContainerRef.current;
        container.style.height = '380px';
        
        // Initialize the map
        const map = L.map(container, {
          zoomControl: false,
          attributionControl: true,
          scrollWheelZoom: false, // Disable scroll zoom for better UX
          dragging: true,
          preferCanvas: true // Better performance
        } as L.MapOptions);
        
        mapRef.current = map;
        
        // Create a bounds object to fit all areas
        const bounds = L.latLngBounds(ABEOKUTA_AREAS.map(area => [area.lat, area.lng]));
        
        // Fit the map to these bounds with padding
        map.fitBounds(bounds, {
          padding: [70, 70], // 70px padding as requested
          maxZoom: 13
        });
        
        // Add tile layer with error handling
        const tileLayer = L.tileLayer(TILE_URLS[0], {
          maxZoom: 18,
          attribution: TILE_URLS[0].includes('maptiler') ? 
            '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' :
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // Transparent 1x1 pixel
        });
        
        // Handle tile loading errors
        tileLayer.on('tileerror', (e: any) => {
          console.warn('Tile loading error detected:', e);
          console.log('🔍 Tile error details:', {
            url: e.tile?.src || 'unknown',
            coords: e.coords,
            error: e.error || 'Network error'
          });
          setTileError(true);
        });
        
        tileLayer.on('tileload', () => {
          // Reset error state when tiles load successfully
          setTileError(false);
        });
        
        tileLayer.addTo(map);
        
        // Add area markers as pills
        ABEOKUTA_AREAS.forEach(area => {
          // Create a custom pill marker
          const pillIcon = L.divIcon({
            className: `pill-marker pill-${area.variant}`,
            html: `<div class="pill-label">${area.name}</div>`,
            iconSize: [120, 30], // Increase size to accommodate the orange dot
            iconAnchor: [60, 15] // Center the anchor
          });
          
          // Add marker
          const marker = L.marker([area.lat, area.lng], {
            icon: pillIcon,
            title: area.name,
            alt: `${area.name} area marker`
          });
          
          // Add click handler
          marker.on('click', () => {
            setSelectedArea(area.name);
            if (onSelect) onSelect(area.name);
          });
          
          marker.addTo(map);
        });
        
        // Force a map size invalidation after a moment to ensure correct rendering
        setTimeout(() => {
          map.invalidateSize(true);
        }, 500);
        
        // Ensure L._leaflet_id_map is properly initialized
        ensureLeafletIdMap();
        
        // Ensure map is properly registered in _leaflet_id_map
        if (map && (map as any)._leaflet_id) {
          registerMapInstance(map);
          console.log('Ensuring map is registered in _leaflet_id_map');
        }
        
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }, 300);
    
    // Cleanup on unmount
    return () => {
      clearTimeout(initTimeout);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      
      // Restore original console methods if they were overridden
      const currentError = console.error as any;
      const currentWarn = console.warn as any;
      if (currentError.originalMethod) {
        console.error = currentError.originalMethod;
      }
      if (currentWarn.originalMethod) {
        console.warn = currentWarn.originalMethod;
      }
    };
  }, []);
  
  // Function to retry loading tiles
  const retryTiles = () => {
    if (!mapRef.current) return;
    
    setTileError(false);
    
    // Try with alternative tile source
    const nextIndex = Math.floor(Math.random() * TILE_URLS.length);
    
    // Remove existing tile layers
    mapRef.current.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current?.removeLayer(layer);
      }
    });
    
    // Add new tile layer
    const newTileLayer = L.tileLayer(TILE_URLS[nextIndex], {
      maxZoom: 18,
      attribution: TILE_URLS[nextIndex].includes('maptiler') ? 
        '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' :
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    
    // Handle tile errors for the new layer
    newTileLayer.on('tileerror', (e: any) => {
      console.warn('Tile loading error detected in retry layer');
      console.log('🔍 Retry tile error details:', {
        url: e.tile?.src || 'unknown',
        coords: e.coords,
        retryAttempt: nextIndex,
        availableUrls: TILE_URLS.length
      });
      setTileError(true);
    });
    
    newTileLayer.addTo(mapRef.current);
  };
  
  return (
    <div className="live-areas-card">
      <div className="map-container" ref={mapContainerRef}>
        {tileError && (
          <div className="tile-error-overlay">
            <button className="retry-button" onClick={retryTiles}>
              Refresh map tiles
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveAreasAbeokuta;