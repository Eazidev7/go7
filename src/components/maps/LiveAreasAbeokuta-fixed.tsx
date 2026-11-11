import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import './live-areas-abeokuta.css';
import { ensureLeafletIdMap, registerMapInstance } from '../../utils/leafletIdMap';

interface LiveAreasAbeokutaProps {
  onSelect?: (areaName: string) => void;
}

// MapTiler API key
const MAP_TILER_KEY = 'nRGZ9lGblbV9lFK2KclL';

// Service areas data for Abeokuta - Updated with delivery zones
const ABEOKUTA_AREAS = [
  { name: "Panseke", lat: 7.1516, lng: 3.3467, variant: "red", color: "#F94144" },
  { name: "Omida", lat: 7.1455, lng: 3.3562, variant: "yellow", color: "#F9C74F" },
  { name: "Oke-Ilewo", lat: 7.1461, lng: 3.3524, variant: "green", color: "#90BE6D" },
  { name: "Adigbe", lat: 7.1490, lng: 3.3411, variant: "blue", color: "#577590" },
  { name: "Kuto", lat: 7.1315, lng: 3.3622, variant: "orange", color: "#F3722C" },
  { name: "Lafenwa", lat: 7.1588, lng: 3.3784, variant: "teal", color: "#277DA1" }
];

// Available tile URLs - OpenStreetMap first for reliability
const TILE_URLS = [
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
  `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${MAP_TILER_KEY}`
];

// Fix for default Leaflet markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPC9zdmc+',
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPC9zdmc+',
  shadowUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDEiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCA0MSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPC9zdmc+',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const LiveAreasAbeokuta: React.FC<LiveAreasAbeokutaProps> = ({ onSelect }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    // Ensure single initialization and avoid React strict mode issues
    if (mapRef.current) return;

    const initializeMap = () => {
      const container = mapContainerRef.current;
      if (!container) {
        console.error('❌ Map container ref is null');
        return;
      }

      // CRITICAL: Set container dimensions BEFORE checking or initializing
      container.style.height = '500px';
      container.style.width = '100%';
      container.style.display = 'block';
      container.style.minHeight = '500px';
      container.style.position = 'relative';

      // Verify container has proper dimensions
      const rect = container.getBoundingClientRect();
      console.log('📐 Container size check:', {
        width: rect.width,
        height: rect.height,
        offsetWidth: container.offsetWidth,
        offsetHeight: container.offsetHeight
      });

      // Only proceed if container has non-zero dimensions
      if (container.offsetHeight === 0 || container.offsetWidth === 0) {
        console.error('❌ Container has 0px dimensions, retrying...');
        setTimeout(initializeMap, 100);
        return;
      }

      try {
        console.log('✅ Initializing map with proper container');
        
        // Create map instance
        const map = L.map(container, {
          center: [7.1557, 3.3494], // Abeokuta center
          zoom: 13,
          zoomControl: true,
          attributionControl: true
        });

        mapRef.current = map;

        // Add tile layer with error handling
        const tileLayer = L.tileLayer(TILE_URLS[0], {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        });

        tileLayer.on('tileerror', (e: any) => {
          console.warn('🔴 Tile loading error:', e.tile?.src);
          setTileError(true);
        });

        tileLayer.on('tileload', () => {
          setTileError(false);
        });

        tileLayer.addTo(map);

        // Add area markers and zone boundaries
        ABEOKUTA_AREAS.forEach((area) => {
          // Create zone boundary (approximate bounds based on coordinates)
          const zoneBounds: [[number, number], [number, number]] = [
            [area.lat + 0.005, area.lng + 0.005], // Northeast
            [area.lat - 0.005, area.lng - 0.005]  // Southwest
          ];
          
          const zoneBoundary = L.rectangle(zoneBounds, {
            color: area.color,
            fillColor: area.color,
            fillOpacity: 0.15,
            weight: 2,
            opacity: 0.6
          }).addTo(map);
          
          // Create pill marker
          const pillIcon = L.divIcon({
            className: 'pill-marker',
            html: `<div class="pill-label pill-${area.variant}" style="background-color: ${area.color}; color: white;">${area.name}</div>`,
            iconSize: [80, 30],
            iconAnchor: [40, 15]
          });

          const marker = L.marker([area.lat, area.lng], { icon: pillIcon });
          
          // Click handlers for both marker and zone
          const handleClick = () => {
            setSelectedArea(area.name);
            if (onSelect) onSelect(area.name);
            map.setView([area.lat, area.lng], 15); // Zoom to selected area
          };
          
          marker.on('click', handleClick);
          zoneBoundary.on('click', handleClick);

          marker.addTo(map);
        });

        // Force size recognition
        setTimeout(() => {
          map.invalidateSize();
          console.log('✅ Map initialized successfully');
        }, 100);

        // Register map instance
        ensureLeafletIdMap();
        if ((map as any)._leaflet_id) {
          registerMapInstance(map);
        }

      } catch (error) {
        console.error('❌ Error initializing map:', error);
      }
    };

    // Start initialization after DOM is ready
    const timeout = setTimeout(initializeMap, 100);

    return () => {
      clearTimeout(timeout);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onSelect]);

  return (
    <div className="live-areas-card">
      <div 
        ref={mapContainerRef}
        className="map-container"
        style={{
          height: '500px',
          width: '100%',
          minHeight: '500px',
          display: 'block',
          position: 'relative'
        }}
      />
      {tileError && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: '#ff4444',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          Map tiles loading...
        </div>
      )}
    </div>
  );
};

export default LiveAreasAbeokuta;