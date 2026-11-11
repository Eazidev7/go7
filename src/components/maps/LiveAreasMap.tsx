import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as L from 'leaflet';
import { isTouchDevice } from '../../utils/mobileUtils';
import { waitForLeaflet, isLeafletLoaded } from '../../utils/leafletPreloader';
import { ensureLeafletIdMap, registerMapInstance } from '../../utils/leafletIdMap';
// Leaflet CSS is already imported in main.jsx
import './map.css';
import './touch-map.css';
import './go7-3d-badges.css';
import '../../styles/reliable-map.css';
import '../../styles/map-indicators.css';
import '../../styles/motion.css';
import type { BadgeOffset } from './badgeUtils';
import { 
  getBadgeColor, 
  getCategoryIcon, 
  wouldBadgesCollide, 
  doElementsOverlap, 
  getOverlapAmount, 
  isOutOfBounds 
} from './badgeUtils';

// Export the ref type for the component
export interface LiveAreasMapRef {
  refreshSize: () => void;
}

// Fix for default markers in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Abeokuta areas data
interface AreaData {
  name: string;
  coords: [number, number];
  color: string;
  category: string;
  clusterId?: number;
}

const ABEOKUTA_AREAS: AreaData[] = [
  { name: "Kuto", coords: [7.1410, 3.3540], color: "green", category: "residential" },
  { name: "Panseke", coords: [7.1450, 3.3430], color: "red", category: "popular" },
  { name: "Ibara", coords: [7.1500, 3.3470], color: "red", category: "popular" },
  { name: "Oke-Ilewo", coords: [7.1600, 3.3490], color: "red", category: "popular" },
  { name: "Ijemo", coords: [7.1600, 3.3450], color: "green", category: "residential" },
  { name: "Totoro", coords: [7.1620, 3.3330], color: "orange", category: "busy" },
  { name: "Lafenwa", coords: [7.1720, 3.3490], color: "orange", category: "busy" },
  { name: "Omida", coords: [7.1590, 3.3550], color: "green", category: "residential" },
  { name: "Adatan", coords: [7.1430, 3.3650], color: "pink", category: "market" },
  { name: "Kemta", coords: [7.1300, 3.3550], color: "green", category: "residential" },
  { name: "Asero", coords: [7.1670, 3.3680], color: "green", category: "residential" },
  { name: "Sapon", coords: [7.1530, 3.3530], color: "pink", category: "market" },
  { name: "Ake", coords: [7.1510, 3.3600], color: "pink", category: "market" },
  { name: "Itoku", coords: [7.1450, 3.3580], color: "pink", category: "market" },
  { name: "Isabo", coords: [7.1470, 3.3480], color: "green", category: "residential" },
  { name: "Idi-Aba", coords: [7.1460, 3.3300], color: "green", category: "residential" },
  { name: "Quarry Rd", coords: [7.1680, 3.3520], color: "orange", category: "busy" },
  { name: "Ita-Eko", coords: [7.1610, 3.3560], color: "pink", category: "market" },
  { name: "Olomore", coords: [7.1970, 3.3470], color: "green", category: "residential" },
  { name: "Obantoko", coords: [7.1170, 3.3680], color: "green", category: "residential" },
  { name: "FUNAAB", coords: [7.2460, 3.4390], color: "blue", category: "education" },
  { name: "Camp (FUNAAB)", coords: [7.2440, 3.4440], color: "blue", category: "education" }
];

// Map configuration
const MAP_CONFIG = {
  center: [7.1475, 3.3619] as [number, number], // Abeokuta
  zoom: 12.5,
  minZoom: 10,
  maxZoom: 18
};

// Map Tiler API key
const MAP_TILER_KEY = 'nRGZ9lGblbV9lFK2KclL';

// Available tile URLs for fallback
const TILE_URLS = [
  // Primary tile source - more stylized map to make badges pop
  `https://api.maptiler.com/maps/pastel/{z}/{x}/{y}.png?key=${MAP_TILER_KEY}`,
  // Fallback sources if the primary fails
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png'
];

interface LiveAreasMapProps {
  onSelect?: (areaName: string) => void;
}

const LiveAreasMap = forwardRef<LiveAreasMapRef, LiveAreasMapProps>(({ onSelect }, ref) => {
  // Refs
  const mapRef = useRef<L.Map | null>(null);
  const mapRefDiv = useRef<HTMLDivElement | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const initTimeoutRef = useRef<number | null>(null);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [tileError, setTileError] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [badgeOffsets, setBadgeOffsets] = useState<Record<string, BadgeOffset>>({});
  
  // Reference to track all badge DOM elements
  const badgeRefs = useRef<Record<string, HTMLElement | null>>({});
  
  // Debounce function for handling resize/zoom events
  const debounce = useCallback((fn: Function, ms = 80) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return function (...args: any[]) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), ms);
    };
  }, []);

  // Calculate badge offsets to prevent overlaps and edge clipping
  const calculateBadgeOffsets = useCallback(() => {
    if (!mapRef.current || !mapRefDiv.current) return;
    
    const mapRect = mapRefDiv.current.getBoundingClientRect();
    const newOffsets: Record<string, BadgeOffset> = {};
    
    // Convert badge refs to an array for processing
    const badgeEntries = Object.entries(badgeRefs.current)
      .filter(([_, el]) => el !== null) as [string, HTMLElement][];
    
    if (badgeEntries.length === 0) return;
    
    // Sort by y-position to handle offsets more logically (top to bottom)
    badgeEntries.sort((a, b) => {
      const rectA = a[1].getBoundingClientRect();
      const rectB = b[1].getBoundingClientRect();
      return rectA.top - rectB.top;
    });
    
    // Process each badge
    for (let i = 0; i < badgeEntries.length; i++) {
      const [areaName, element] = badgeEntries[i];
      const rect = element.getBoundingClientRect();
      let offsetY = 0;
      let edgeAdjustX = 0;
      let needsConnector = false;
      let connectorDirection: 'upward' | 'downward' = 'downward';
      
      // First check for edge clipping
      // Left edge
      if (rect.left < mapRect.left + 6) {
        edgeAdjustX = mapRect.left + 6 - rect.left;
      }
      // Right edge
      else if (rect.right > mapRect.right - 6) {
        edgeAdjustX = mapRect.right - 6 - rect.right;
      }
      
      // Create a temporary offset badge for collision checking
      const tempOffsetBadge = {
        ...rect,
        left: rect.left + edgeAdjustX,
        right: rect.right + edgeAdjustX
      };
      
      // Check collisions with already processed badges
      for (let j = 0; j < i; j++) {
        const [prevAreaName, prevElement] = badgeEntries[j];
        const prevRect = prevElement.getBoundingClientRect();
        const prevOffset = newOffsets[prevAreaName] || { 
          offsetY: 0, 
          edgeAdjustX: 0, 
          needsConnector: false, 
          connectorDirection: 'downward' 
        };
        
        // Create adjusted rect for the previous badge with its offsets
        const adjustedPrevRect = {
          ...prevRect,
          top: prevRect.top + prevOffset.offsetY,
          bottom: prevRect.bottom + prevOffset.offsetY,
          left: prevRect.left + prevOffset.edgeAdjustX,
          right: prevRect.right + prevOffset.edgeAdjustX
        };
        
        // Check if badges overlap
        if (doElementsOverlap(tempOffsetBadge, adjustedPrevRect, -5)) {
          // Determine direction to push
          // Check if we're closer to the bottom of the map
          const isInBottomHalf = rect.top > mapRect.top + (mapRect.height / 2);
          
          // If in bottom half, push up; otherwise push down
          if (isInBottomHalf) {
            offsetY = -14; // Push up
            connectorDirection = 'downward';
          } else {
            offsetY = 14; // Push down
            connectorDirection = 'upward';
          }
          
          // Update temp badge for further collision checks
          tempOffsetBadge.top += offsetY;
          tempOffsetBadge.bottom += offsetY;
          
          // Check if this adjustment fixes the overlap
          if (doElementsOverlap(tempOffsetBadge, adjustedPrevRect, -5)) {
            // If still overlapping, push further
            if (isInBottomHalf) {
              offsetY -= 10; // Push up more
            } else {
              offsetY += 10; // Push down more
            }
            tempOffsetBadge.top = rect.top + offsetY;
            tempOffsetBadge.bottom = rect.bottom + offsetY;
          }
          
          needsConnector = Math.abs(offsetY) >= 10;
        }
      }
      
      // Final edge clipping check after collision adjustments
      // Top edge
      if (rect.top + offsetY < mapRect.top + 6) {
        offsetY = mapRect.top + 6 - rect.top;
        needsConnector = true;
        connectorDirection = 'upward';
      }
      // Bottom edge
      else if (rect.bottom + offsetY > mapRect.bottom - 6) {
        offsetY = mapRect.bottom - 6 - rect.bottom;
        needsConnector = true;
        connectorDirection = 'downward';
      }
      
      // Store the calculated offsets if there are any
      if (offsetY !== 0 || edgeAdjustX !== 0) {
        newOffsets[areaName] = {
          offsetY,
          edgeAdjustX,
          needsConnector: Math.abs(offsetY) >= 10,
          connectorDirection
        };
      }
    }
    
    // Update state with new offsets
    setBadgeOffsets(newOffsets);
  }, []);
  
  // Debounced version of the calculation function
  const debouncedCalculateOffsets = useCallback(
    debounce(calculateBadgeOffsets, 80), 
    [calculateBadgeOffsets, debounce]
  );
  
  // Function to invalidate map size
  const invalidateSize = useCallback(() => {
    if (mapRef.current) {
      console.log('Manually invalidating map size');
      mapRef.current.invalidateSize(true);
      // Recalculate badge offsets after invalidating size
      setTimeout(calculateBadgeOffsets, 100);
    }
  }, [calculateBadgeOffsets]);

  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    refreshSize: invalidateSize
  }));

  // Function to retry loading tiles
  const retryTiles = useCallback(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    
    setTileError(false);
    
    // Try with alternative tile source
    const nextIndex = Math.floor(Math.random() * TILE_URLS.length);
    
    mapRef.current.removeLayer(tileLayerRef.current);
    
    const newTileLayer = L.tileLayer(TILE_URLS[nextIndex], {
      maxZoom: MAP_CONFIG.maxZoom,
      attribution: TILE_URLS[nextIndex].includes('maptiler') ? 
        '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' :
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    
    newTileLayer.on('tileerror', () => {
      console.warn('Tile loading error detected');
      setTileError(true);
    });
    
    newTileLayer.addTo(mapRef.current);
    tileLayerRef.current = newTileLayer;
  }, []);

  // Initialize map once
  useEffect(() => {
    // Clear any existing timeout to prevent memory leaks
    if (initTimeoutRef.current) {
      window.clearTimeout(initTimeoutRef.current);
    }

    if (!mapRefDiv.current || mapRef.current) return;

    console.log('Initializing LiveAreasMap');
    console.log('mapRefDiv element exists:', !!mapRefDiv.current);
    
    // Wait for Leaflet to load before initializing map
    waitForLeaflet().then(() => {
      if (!mapRefDiv.current || mapRef.current) return;
      
      console.log('✅ Leaflet loaded, initializing map');
      
      // Set explicit dimensions immediately
      if (mapRefDiv.current) {
        mapRefDiv.current.style.height = '420px';
        mapRefDiv.current.style.width = '100%';
        mapRefDiv.current.style.display = 'block';
        mapRefDiv.current.style.minHeight = '300px';
        mapRefDiv.current.style.position = 'relative';
      }
    
    // Force a layout reflow
    if (mapRefDiv.current) {
      const rect = mapRefDiv.current.getBoundingClientRect();
      console.log('Initial mapRefDiv dimensions:', rect);
    }
    
    // Delay map initialization to ensure DOM has been updated
    initTimeoutRef.current = window.setTimeout(() => {
      if (!mapRefDiv.current) return;
      
      // Check dimensions again
      const rect = mapRefDiv.current.getBoundingClientRect();
      console.log('mapRefDiv dimensions after timeout:', rect);
      
      if (rect.width === 0 || rect.height === 0) {
        console.warn('Map container still has zero dimensions. Forcing explicit dimensions...');
        mapRefDiv.current.style.height = '420px';
        mapRefDiv.current.style.width = '100%';
        mapRefDiv.current.style.position = 'relative';
        mapRefDiv.current.style.display = 'block';
        mapRefDiv.current.style.visibility = 'visible';
        
        // Force another layout reflow
        const newRect = mapRefDiv.current.getBoundingClientRect();
        console.log('Updated mapRefDiv dimensions:', newRect);
      }

      try {
        // Create map
        const map = L.map(mapRefDiv.current, {
          center: MAP_CONFIG.center,
          zoom: MAP_CONFIG.zoom,
          zoomControl: false,
          attributionControl: false,
          preferCanvas: true,
        });

        console.log('Map instance created:', !!map);
        mapRef.current = map;
        
        // Ensure L._leaflet_id_map is properly initialized
        ensureLeafletIdMap();
        
        // Ensure map is properly registered in _leaflet_id_map
        if (map && (map as any)._leaflet_id) {
          console.log('Ensuring map is registered in _leaflet_id_map');
          registerMapInstance(map);
        }

        // Try primary tile source first
        const tiles = L.tileLayer(TILE_URLS[0], {
          maxZoom: MAP_CONFIG.maxZoom,
          attribution: ''
        });

        // Handle tile errors
        tiles.on('tileerror', () => {
          console.warn('Tile loading error detected');
          setTileError(true);
        });

        tiles.addTo(map);
        tileLayerRef.current = tiles;

        // Add area markers
        const markerBounds = L.latLngBounds([]);
        const markerPositions: Array<{ position: [number, number], area: typeof ABEOKUTA_AREAS[0], offset: number }> = [];
        
        // First pass: collect positions and check for collisions
        ABEOKUTA_AREAS.forEach(area => {
          // Add marker position to bounds
          markerBounds.extend(area.coords as [number, number]);
          
          // Check for collisions with existing markers
          let verticalOffset = 0;
          
          if (mapRef.current) {
            // Check collisions with existing markers
            for (const marker of markerPositions) {
              if (wouldBadgesCollide(area.coords as [number, number], marker.position, mapRef.current)) {
                // Offset this marker vertically
                verticalOffset = 16; // px
                break;
              }
            }
          }
          
          // Store marker position with offset info
          markerPositions.push({
            position: area.coords as [number, number],
            area,
            offset: verticalOffset
          });
        });
        
        // Second pass: find clusters (3+ overlapping markers)
        const clusters: Record<string, Array<typeof ABEOKUTA_AREAS[0]>> = {};
        let clusterCount = 0;
        
        if (mapRef.current) {
          for (let i = 0; i < markerPositions.length; i++) {
            const current = markerPositions[i];
            
            // Skip already processed markers
            if (current.area.clusterId) continue;
            
            let overlapping = 0;
            const overlappingMarkers = [current.area];
            
            // Count overlapping markers
            for (let j = i + 1; j < markerPositions.length; j++) {
              if (wouldBadgesCollide(current.position, markerPositions[j].position, mapRef.current, 5)) {
                overlapping++;
                overlappingMarkers.push(markerPositions[j].area);
                markerPositions[j].area.clusterId = clusterCount + 1;
              }
            }
            
            // If 3+ markers overlap, create a cluster
            if (overlapping >= 2) {
              current.area.clusterId = clusterCount + 1;
              clusters[clusterCount + 1] = overlappingMarkers;
              clusterCount++;
            }
          }
        }
        
        // Third pass: create actual markers
        markerPositions.forEach(({ position, area, offset }) => {
          // Skip if this marker is part of a cluster and not the primary one
          if (area.clusterId && clusters[area.clusterId] && clusters[area.clusterId][0] !== area) {
            return;
          }
          
          // Create the 3D badge marker
          const create3DBadgeIcon = (area: typeof ABEOKUTA_AREAS[0], isCluster = false) => {
            const badgeColor = getBadgeColor(area);
            const categoryIcon = getCategoryIcon(area.category);
            const badgeId = `badge-${area.name.replace(/\s+/g, '-').toLowerCase()}`;
            
            // Get any offset for this badge (if already calculated)
            const offset = badgeOffsets[area.name] || { 
              offsetY: 0, 
              edgeAdjustX: 0,
              needsConnector: false,
              connectorDirection: 'downward' as const
            };
            
            // Generate CSS style for offsets
            const offsetStyle = offset.offsetY !== 0 || offset.edgeAdjustX !== 0 
              ? `style="--offset-y: ${offset.offsetY}px; --edge-adjust-x: ${offset.edgeAdjustX}px;"` 
              : '';
            
            // Generate HTML for cluster or single badge
            let html = '';
            if (isCluster) {
              // Cluster badge
              const clusterMarkers = clusters[area.clusterId || 0];
              const mainArea = clusterMarkers[0];
              const extras = clusterMarkers.length - 1;
              
              html = `
                <div class="go7BadgeLabel go7BadgeCluster animate-fade-in chip-motion" id="${badgeId}" tabindex="0" role="button" 
                     aria-label="Select area: ${mainArea.name} and ${extras} more areas, delivery available"
                     aria-description="Press Enter or Space to filter by this area cluster" ${offsetStyle}>
                  <div class="go7BadgeContent">
                    <span class="go7BadgeDot" aria-hidden="true"></span>
                    <span>${mainArea.name} +${extras}</span>
                  </div>
                </div>
              `;
            } else {
              // Single badge
              html = `
                <div class="go7BadgeLabel ${badgeColor} animate-fade-in chip-motion" id="${badgeId}" tabindex="0" role="button" 
                     aria-label="Select area: ${area.name}, delivery available"
                     aria-description="Press Enter or Space to filter vendors and markets in ${area.name}" ${offsetStyle}>
                  <div class="go7BadgeContent">
                    <span class="go7BadgeDot" aria-hidden="true"></span>
                    <span class="go7BadgeIcon" aria-hidden="true">${categoryIcon}</span>
                    <span>${area.name}</span>
                  </div>
                </div>
              `;
            }
            
            // Add connector line if needed from offset calculations
            if (offset.needsConnector) {
              const connectorHeight = Math.abs(offset.offsetY);
              const connectorClass = offset.connectorDirection === 'upward' ? 'upward' : 'downward';
              html += `<div class="go7BadgeConnector ${connectorClass}" style="height: ${connectorHeight}px;"></div>`;
            }
            
            return L.divIcon({
              className: `go7Badge ${badgeColor}`,
              html: html,
              iconSize: [120, 36],
              iconAnchor: [60, 18] // Fixed anchor point for consistency
            });
          };
          
          // Create the marker with our 3D badge icon
          const marker = L.marker(position, {
            icon: create3DBadgeIcon(area, !!area.clusterId && clusters[area.clusterId || 0].length >= 3),
            title: area.name,
            alt: `${area.name} area marker`
          });
          
          // Add popup with just the name
          marker.bindPopup(`<b>${area.name}</b>`);
          
          // Add click handler
          marker.on('click', () => {
            setSelectedArea(area.name);
            if (onSelect) onSelect(area.name);
          });
          
          marker.addTo(map);
          markersRef.current.push(marker);
        });
        
        // Fit the map to the bounds of all markers with uneven padding
        try {
          if (markerBounds && markerBounds.isValid()) {
            map.fitBounds(markerBounds, {
              padding: [120, 80],
              maxZoom: 13
            });
          }
        } catch (e) {
          console.warn('fitBounds error in LiveAreasMap:', e);
        }
        
        // Set up the badge ref collection after markers are added
        // Use a setTimeout to ensure DOM has been updated with marker elements
        setTimeout(() => {
          // Clear any previous badge refs
          badgeRefs.current = {};
          
          // Find all badge elements and store them by area name
          // Also apply staggered fade-in animation delays (max 6 items, 60ms stagger)
          ABEOKUTA_AREAS.forEach((area, index) => {
            const badgeId = `badge-${area.name.replace(/\s+/g, '-').toLowerCase()}`;
            const badgeElement = document.getElementById(badgeId);
            if (badgeElement) {
              badgeRefs.current[area.name] = badgeElement;
              
              // Apply staggered animation delay (60ms per item, max 6 delays)
              const staggerDelay = Math.min(index * 60, 6 * 60);
              badgeElement.style.animationDelay = `${staggerDelay}ms`;
              
              // Add keyboard event listeners for accessibility
              badgeElement.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  badgeElement.click();
                }
              });
              
              // Ensure element is focusable
              if (!badgeElement.hasAttribute('tabindex')) {
                badgeElement.setAttribute('tabindex', '0');
              }
            }
          });
          
          // Calculate initial badge offsets
          calculateBadgeOffsets();
        }, 200);
        
        // Set up event listeners for recalculating offsets
        map.on('moveend', debouncedCalculateOffsets);
        map.on('zoomend', debouncedCalculateOffsets);
        window.addEventListener('resize', debouncedCalculateOffsets);
        
        // Observe DOM mutations that might affect badge positioning
        const observer = new MutationObserver(debouncedCalculateOffsets);
        if (mapRefDiv.current) {
          observer.observe(mapRefDiv.current, { 
            childList: true, 
            subtree: true, 
            attributes: true 
          });
        }

        // Ensure size after mount with multiple attempts for reliability
        const attemptInvalidateSize = (attempt = 1) => {
          if (mapRef.current) {
            console.log(`Invalidating map size (attempt ${attempt})`);
            mapRef.current.invalidateSize(true);
            
            // For initial load, we need multiple attempts
            if (attempt < 3) {
              setTimeout(() => attemptInvalidateSize(attempt + 1), 200 * attempt);
            }
            
            if (attempt === 3) {
              setIsLoading(false);
            }
          }
        };
        
        // Start attempting to invalidate size
        requestAnimationFrame(() => {
          attemptInvalidateSize();
        });

        // Handle container visibility (if in a collapsed tab/accordion)
        if (typeof ResizeObserver !== 'undefined') {
          const ro = new ResizeObserver(() => {
            if (mapRef.current) mapRef.current.invalidateSize(true);
          });
          if (mapRefDiv.current) ro.observe(mapRefDiv.current);
          resizeObserverRef.current = ro;
        }

        // Optional: reflow on window resize
        const onResize = () => {
          if (mapRef.current) mapRef.current.invalidateSize(true);
        };
        window.addEventListener('resize', onResize);

        // Cleanup
        return () => {
          window.removeEventListener('resize', onResize);
          window.removeEventListener('resize', debouncedCalculateOffsets);
          
          if (mapRef.current) {
            mapRef.current.off('moveend', debouncedCalculateOffsets);
            mapRef.current.off('zoomend', debouncedCalculateOffsets);
          }
          
          if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
          
          // Disconnect mutation observer if it exists
          if (typeof observer !== 'undefined') {
            observer.disconnect();
          }
          
          // Clear markers
          markersRef.current.forEach(marker => {
            marker.remove();
          });
          markersRef.current = [];
          
          // Remove map
          if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
          }
          tileLayerRef.current = null;
          
          // Clear timeout
          if (initTimeoutRef.current) {
            window.clearTimeout(initTimeoutRef.current);
            initTimeoutRef.current = null;
          }
          
          // Clear badge refs
          badgeRefs.current = {};
        };
      } catch (error) {
        console.error('Error initializing map:', error);
        setIsLoading(false);
        setTileError(true);
      }
    }, 100); // Short delay to ensure DOM is ready
    
    }).catch((error: any) => {
      console.error('❌ Failed to load Leaflet:', error);
      setIsLoading(false);
      setTileError(true);
    });
    
    return () => {
      if (initTimeoutRef.current) {
        window.clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs once

  // Add touch optimization
  useEffect(() => {
    if (!mapRef.current || !isTouchDevice()) return;
    
    const mapElement = mapRefDiv.current;
    if (!mapElement) return;
    
    // Add touch-specific classes
    mapElement.classList.add('touch-optimized');
    
    // Add touch feedback
    const handleTouchStart = () => {
      mapElement.classList.add('touching');
    };
    
    const handleTouchEnd = () => {
      mapElement.classList.remove('touching');
      // Small delay to prevent ghost clicks
      setTimeout(() => {
        mapElement.classList.remove('touch-active');
      }, 300);
    };
    
    mapElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    mapElement.addEventListener('touchend', handleTouchEnd, { passive: true });
    mapElement.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    
    return () => {
      mapElement.removeEventListener('touchstart', handleTouchStart);
      mapElement.removeEventListener('touchend', handleTouchEnd);
      mapElement.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  // Render loading skeleton when map is initializing
  if (isLoading) {
    console.log('Rendering map loading skeleton');
    return (
      <div className="map-wrap">
        <div className="map-inner skeleton-loading">
          <div className="map-loading-indicator">
            <div className="spinner"></div>
            <div className="loading-text">Loading map...</div>
          </div>
        </div>
      </div>
    );
  }

  console.log('Rendering actual map component');
  return (
    <div className="map-wrap" style={{ height: 'auto', minHeight: '300px' }}>
      <div 
        id="live-areas-map" 
        className="map-inner" 
        ref={mapRefDiv}
        style={{ height: '420px', width: '100%' }}
      >
        {tileError && (
          <div className="map-error-overlay">
            <div className="error-message">
              <p>Map tiles could not be loaded.</p>
              <button 
                onClick={retryTiles}
                className="retry-button"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
      {selectedArea && (
        <div className="selected-area-info">
          Selected: {selectedArea}
        </div>
      )}
    </div>
  );
});

export default LiveAreasMap;