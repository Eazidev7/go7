import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import './map.css';
import './map-fix.css';

/**
 * Simple map component that should load reliably
 */
const SimpleMap = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // If map is already initialized or container doesn't exist, do nothing
    if (mapRef.current || !mapContainerRef.current) return;

    try {
      // Initialize the map
      const map = L.map(mapContainerRef.current, {
        center: [7.155, 3.345], // Abeokuta coordinates
        zoom: 12,
        zoomControl: true,
        attributionControl: true
      });

      mapRef.current = map;

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
      }).addTo(map);

      // Add a sample marker
      L.marker([7.155, 3.345])
        .addTo(map)
        .bindPopup('Abeokuta, Nigeria')
        .openPopup();

      // Force map to refresh after a short delay
      setTimeout(() => {
        map.invalidateSize();
      }, 300);

    } catch (error) {
      console.error('Error initializing map:', error);
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="mapShell">
      <div ref={mapContainerRef} className="mapContainer"></div>
    </div>
  );
};

export default SimpleMap;