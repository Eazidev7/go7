import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DeliveryAreasMap = ({ onAreaSelect }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selectedArea, setSelectedArea] = useState(null);

  // All Abeokuta areas with coordinates and colors
  const neighborhoods = [
    { name: "Ibara", coords: [7.1548, 3.3425], color: "#FF6D00" },
    { name: "Kuto", coords: [7.1465, 3.3502], color: "#D50000" },
    { name: "Adigbe", coords: [7.1632, 3.3360], color: "#0097A7" },
    { name: "Sapon", coords: [7.1520, 3.3480], color: "#AA00FF" },
    { name: "Panseke", coords: [7.1678, 3.3523], color: "#00C853" },
    { name: "Ita-Oshin", coords: [7.1550, 3.3450], color: "#F50057" },
    { name: "Oke-Ilewo", coords: [7.1634, 3.3612], color: "#2962FF" },
    { name: "Isale-Igbehin", coords: [7.1500, 3.3400], color: "#FF9800" },
    { name: "Elega", coords: [7.1600, 3.3500], color: "#9C27B0" },
    { name: "Lafenwa", coords: [7.1700, 3.3600], color: "#4CAF50" },
    { name: "Ake", coords: [7.1450, 3.3350], color: "#607D8B" },
    { name: "Oke-Ijeun", coords: [7.1580, 3.3580], color: "#795548" },
  ];

  const handleAreaSelect = (areaName) => {
    setSelectedArea(areaName);
    if (onAreaSelect) onAreaSelect(areaName);
    
    // Find the area and fly to it on map
    const area = neighborhoods.find(n => n.name === areaName);
    if (area && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(area.coords, 15, { duration: 1.5 });
    }
  };

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize map
      const map = L.map(mapRef.current, {
        center: [7.1608, 3.3481],
        zoom: 13,
        zoomControl: false,
        scrollWheelZoom: true,
        dragging: true,
        attributionControl: false,
      });

      // Add road lines SVG overlay
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgElement.style.position = 'absolute';
      svgElement.style.top = '0';
      svgElement.style.left = '0';
      svgElement.style.width = '100%';
      svgElement.style.height = '100%';
      svgElement.style.pointerEvents = 'none';
      svgElement.style.zIndex = '1';
      
      svgElement.innerHTML = `
        <line x1="0" y1="30%" x2="100%" y2="30%" stroke="#f4cc84" stroke-width="3" opacity="0.7"/>
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#f4cc84" stroke-width="4" opacity="0.8"/>
        <line x1="0" y1="70%" x2="100%" y2="70%" stroke="#f4cc84" stroke-width="3" opacity="0.7"/>
        <line x1="25%" y1="0" x2="25%" y2="100%" stroke="#f4cc84" stroke-width="3" opacity="0.7"/>
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#f4cc84" stroke-width="4" opacity="0.8"/>
        <line x1="75%" y1="0" x2="75%" y2="100%" stroke="#f4cc84" stroke-width="3" opacity="0.7"/>
      `;
      
      mapRef.current.appendChild(svgElement);

      // Add neighborhood labels
      neighborhoods.forEach(n => {
        const label = L.divIcon({
          className: 'chowdeck-tiny',
          html: `<div class="tiny-label" style="background-color: ${n.color};">${n.name}</div>`,
          iconSize: [null, null],
          iconAnchor: [25, 12],
        });

        const marker = L.marker(n.coords, { 
          icon: label,
          zIndexOffset: 100 
        }).addTo(map);

        marker.on('click', () => {
          setSelectedArea(n.name);
          if (onAreaSelect) {
            onAreaSelect(n.name);
          }
        });
      });

      mapInstanceRef.current = map;

      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    }
  }, []);

  return (
    <div className="location-selector">
      <div className="location-header">
        <h1 className="location-title">Choose Your Area in Abeokuta</h1>
        <p className="location-subtitle">Select your area to find restaurants near you</p>
      </div>

      <div className="search-container">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" className="search-input" placeholder="Search Abeokuta areas..." />
        </div>
      </div>

      <div className="live-location-section">
        <button className="gps-button">
          <span className="gps-icon">📍</span>
          Use My Current Location
        </button>
        <p className="live-location-text">Click on any area to order from restaurants near you</p>
      </div>

      <div className="map-container">
        <div ref={mapRef} id="map" className="delivery-map" />
      </div>

      <div className="abeokuta-grid" id="abeokutaLocations">
        <div 
          className={`area-card ${selectedArea === 'Ibara' ? 'selected' : ''}`} 
          onClick={() => handleAreaSelect('Ibara')}
        >
          Ibara
        </div>
        <div 
          className={`area-card popular-area ${selectedArea === 'Kuto' ? 'selected' : ''}`} 
          onClick={() => handleAreaSelect('Kuto')}
        >
          Kuto
        </div>
        <div 
          className={`area-card ${selectedArea === 'Adigbe' ? 'selected' : ''}`} 
          onClick={() => handleAreaSelect('Adigbe')}
        >
          Adigbe
        </div>
        <div 
          className={`area-card popular-area ${selectedArea === 'Sapon' ? 'selected' : ''}`} 
          onClick={() => handleAreaSelect('Sapon')}
        >
          Sapon
        </div>
        <div 
          className={`area-card ${selectedArea === 'Panseke' ? 'selected' : ''}`} 
          onClick={() => handleAreaSelect('Panseke')}
        >
          Panseke
        </div>
        <div 
          className={`area-card ${selectedArea === 'Ita-Oshin' ? 'selected' : ''}`} 
          onClick={() => handleAreaSelect('Ita-Oshin')}
        >
          Ita-Oshin
        </div>
        <div 
          className={`area-card ${selectedArea === 'Oke-Ilewo' ? 'selected' : ''}`} 
          onClick={() => handleAreaSelect('Oke-Ilewo')}
        >
          Oke-Ilewo
        </div>
        <div 
          className={`area-card ${selectedArea === 'Isale-Igbehin' ? 'selected' : ''}`} 
          onClick={() => handleAreaSelect('Isale-Igbehin')}
        >
          Isale-Igbehin
        </div>
        <div 
          className={`area-card ${selectedArea === 'Elega' ? 'selected' : ''}`} 
          onClick={() => handleAreaSelect('Elega')}
        >
          Elega
        </div>
        <div 
          className={`area-card ${selectedArea === 'Lafenwa' ? 'selected' : ''}`} 
          onClick={() => handleAreaSelect('Lafenwa')}
        >
          Lafenwa
        </div>
        <div 
          className={`area-card ${selectedArea === 'Ake' ? 'selected' : ''}`} 
          onClick={() => handleAreaSelect('Ake')}
        >
          Ake
        </div>
        <div 
          className={`area-card ${selectedArea === 'Oke-Ijeun' ? 'selected' : ''}`} 
          onClick={() => handleAreaSelect('Oke-Ijeun')}
        >
          Oke-Ijeun
        </div>
      </div>
    </div>
  );
};

export default DeliveryAreasMap;