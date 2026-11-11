// src/components/StyledDeliveryMap.jsx
/**
 * Enhanced Delivery Areas Map with Styled Themes
 * Integrates styled-map-package with professional theming
 */

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import useStyledMap, { useResponsiveMap } from '../hooks/useStyledMap';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Theme controller component
const MapThemeController = ({ map, getMapContainerStyle }) => {
  useEffect(() => {
    if (map && getMapContainerStyle) {
      const container = map.getContainer();
      const style = getMapContainerStyle();

      Object.assign(container.style, style);
    }
  }, [map, getMapContainerStyle]);

  return null;
};

// Styled tile layer component
const StyledTileLayer = ({ currentTheme, styledMapInstance }) => {
  const map = useMap();
  const [tileUrl, setTileUrl] = useState(null);

  useEffect(() => {
    if (styledMapInstance && map) {
      // Get styled tile URL based on theme
      const baseUrl = 'https://api.maptiler.com/maps/{style}/256/{z}/{x}/{y}.png?key={accessToken}';
      let style = '019996dd-306b-7019-acc5-de8469c0388d'; // Default to custom Go7 style

      switch (currentTheme) {
        case 'chowdeck':
          style = '019996dd-306b-7019-acc5-de8469c0388d'; // Custom Go7 style
          break;
        case 'dark':
          style = 'dark-v2';
          break;
        case 'modern':
          style = '019996dd-306b-7019-acc5-de8469c0388d'; // Custom Go7 style
          break;
        default:
          style = '019996dd-306b-7019-acc5-de8469c0388d'; // Custom Go7 style
      }

      const styledUrl = baseUrl.replace('{style}', style);
      setTileUrl(styledUrl);
    }
  }, [currentTheme, styledMapInstance, map]);

  if (!tileUrl) return null;

  return (
    <TileLayer
      url={tileUrl}
      attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      maxZoom={18}
      opacity={currentTheme === 'chowdeck' ? 0.7 : 1}
    />
  );
};

const StyledDeliveryMap = () => {
  const {
    currentTheme,
    switchTheme,
    toggleDarkMode,
    getMapContainerStyle,
    getLabelStyle,
    availableThemes,
    themeInfo,
    isLoading,
    styledMapInstance
  } = useStyledMap('chowdeck');

  const { screenSize, isMobile } = useResponsiveMap();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const mapRef = useRef();

  // Abeokuta delivery areas with coordinates
  const deliveryAreas = [
    { id: 1, name: 'Ake', lat: 7.1475, lng: 3.3619, popular: true },
    { id: 2, name: 'Ijaye', lat: 7.1567, lng: 3.3483, popular: false },
    { id: 3, name: 'Isabo', lat: 7.1532, lng: 3.3698, popular: true },
    { id: 4, name: 'Itoku', lat: 7.1489, lng: 3.3445, popular: false },
    { id: 5, name: 'Kuto', lat: 7.1398, lng: 3.3421, popular: true },
    { id: 6, name: 'Lafenwa', lat: 7.1723, lng: 3.3612, popular: false },
    { id: 7, name: 'Mokola', lat: 7.1634, lng: 3.3756, popular: false },
    { id: 8, name: 'Olomore', lat: 7.1289, lng: 3.3387, popular: true },
    { id: 9, name: 'Panseke', lat: 7.1445, lng: 3.3523, popular: false },
    { id: 10, name: 'Sapon', lat: 7.1512, lng: 3.3634, popular: false },
    { id: 11, name: 'Sodeke', lat: 7.1398, lng: 3.3587, popular: true },
    { id: 12, name: 'Totoro', lat: 7.1667, lng: 3.3445, popular: false }
  ];

  // Get user location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);

          if (mapRef.current) {
            mapRef.current.setView([location.lat, location.lng], 14);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          alert('Unable to get your location. Please enable location services.');
        }
      );
    }
  };

  // Handle area selection
  const handleAreaSelect = (area) => {
    setSelectedLocation(area);
    if (mapRef.current) {
      mapRef.current.setView([area.lat, area.lng], 15);
    }
  };

  return (
    <div className="styled-delivery-map-container">
      {/* Theme Controls */}
      <div className="theme-controls">
        <div className="theme-selector">
          <label>Theme:</label>
          <select
            value={currentTheme}
            onChange={(e) => switchTheme(e.target.value)}
            disabled={isLoading}
          >
            {availableThemes.map(theme => (
              <option key={theme} value={theme}>
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <button
          className="dark-mode-toggle"
          onClick={toggleDarkMode}
          title="Toggle Dark Mode"
        >
          {themeInfo.isDark ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Location Header */}
      <div className="location-header">
        <div className="location-info">
          <h2>Choose Your Delivery Location</h2>
          <p>Select from our available delivery areas in Abeokuta</p>
        </div>
        <button
          className="gps-button"
          onClick={getUserLocation}
          title="Use My Location"
        >
          📍 Use GPS
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search for your area..."
          className="location-search"
        />
        <button className="search-button">🔍</button>
      </div>

      {/* Map Container */}
      <div className="map-wrapper">
        <MapContainer
          center={[7.1475, 3.3619]}
          zoom={13}
          ref={mapRef}
          className={`styled-map-${currentTheme}`}
          style={{
            height: isMobile ? '300px' : '400px',
            width: '100%',
            ...getMapContainerStyle()
          }}
        >
          <StyledTileLayer
            currentTheme={currentTheme}
            styledMapInstance={styledMapInstance}
          />

          <MapThemeController
            map={mapRef.current}
            getMapContainerStyle={getMapContainerStyle}
          />

          {/* User location marker */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]}>
              <Popup>Your current location</Popup>
            </Marker>
          )}

          {/* Delivery area markers */}
          {deliveryAreas.map(area => (
            <Marker
              key={area.id}
              position={[area.lat, area.lng]}
              eventHandlers={{
                click: () => handleAreaSelect(area)
              }}
            >
              <Popup>
                <div className="area-popup">
                  <h3>{area.name}</h3>
                  {area.popular && <span className="popular-badge">Popular</span>}
                  <button
                    className="select-area-btn"
                    onClick={() => handleAreaSelect(area)}
                  >
                    Select This Area
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {isLoading && (
          <div className="map-loading-overlay">
            <div className="loading-spinner">🔄</div>
            <p>Switching theme...</p>
          </div>
        )}
      </div>

      {/* Popular Areas Grid */}
      <div className="popular-areas">
        <h3>Popular Areas</h3>
        <div className="areas-grid">
          {deliveryAreas
            .filter(area => area.popular)
            .map(area => (
              <div
                key={area.id}
                className={`area-card ${selectedLocation?.id === area.id ? 'selected' : ''}`}
                onClick={() => handleAreaSelect(area)}
                style={getLabelStyle(area.name)}
              >
                <span className="area-name">{area.name}</span>
                <span className="popular-indicator">⭐</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* All Areas List */}
      <div className="all-areas">
        <h3>All Delivery Areas</h3>
        <div className="areas-list">
          {deliveryAreas.map(area => (
            <div
              key={area.id}
              className={`area-item ${selectedLocation?.id === area.id ? 'selected' : ''}`}
              onClick={() => handleAreaSelect(area)}
            >
              <span className="area-name">{area.name}</span>
              {area.popular && <span className="popular-badge">Popular</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="selected-location">
          <h3>Selected Location: {selectedLocation.name}</h3>
          <button className="confirm-location-btn">
            Confirm & Continue
          </button>
        </div>
      )}
    </div>
  );
};

export default StyledDeliveryMap;