import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  ABEOKUTA_NEIGHBORHOODS, 
  MAP_DEFAULT_CENTER, 
  MAP_DEFAULT_ZOOM,
  generateMapBounds
} from '../data/abeokutaNeighborhoods';
import { VendorService } from '../services/VendorService';
import { LIGHT_TILE_CONFIG } from '../utils/mapTileConfig';
import '../styles/NeighborhoodMap.css';
import { StarIcon, ClockIcon } from '@heroicons/react/24/solid';

// Fix for default markers in Leaflet with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const NeighborhoodMap = ({ businessType = 'restaurant' }) => {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Get business type title for display
  const getBusinessTypeTitle = () => {
    switch(businessType) {
      case 'restaurant':
        return 'Restaurants';
      case 'pharmacy':
        return 'Pharmacies';
      case 'grocery':
        return 'Grocery Stores';
      case 'errand':
        return 'Errand Services';
      default:
        return 'Vendors';
    }
  };
  
  // Initialize map when component mounts
  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current) {
      // Create the map
      const map = L.map(mapRef.current, {
        center: MAP_DEFAULT_CENTER,
        zoom: MAP_DEFAULT_ZOOM,
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true
      });
      
      // Add tile layer (Mapbox Light theme for clean appearance)
      const tileLayer = L.tileLayer(LIGHT_TILE_CONFIG.url.replace('{accessToken}', LIGHT_TILE_CONFIG.accessToken), {
        attribution: LIGHT_TILE_CONFIG.attribution,
        maxZoom: 19,
        tileSize: 512,
        zoomOffset: -1
      });
      tileLayer.addTo(map);
      
      // Fit map to show all neighborhoods
      const bounds = generateMapBounds();
      try {
        if (bounds && bounds.isValid ? bounds.isValid() : bounds) {
          map.fitBounds(bounds);
        }
      } catch (e) {
        console.warn('fitBounds error in NeighborhoodMap:', e);
      }
      
      // Store map instance
      leafletMapRef.current = map;
      
      // Add neighborhood markers
      addNeighborhoodMarkers(map);
    }
    
    // Cleanup on unmount
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markersRef.current = [];
      }
    };
  }, []);
  
  // Add clickable neighborhood markers to the map
  const addNeighborhoodMarkers = (map) => {
    console.log('Adding neighborhood markers...'); // Debug log
    
    ABEOKUTA_NEIGHBORHOODS.forEach(neighborhood => {
      console.log(`Adding marker for ${neighborhood.name} at ${neighborhood.coordinates}`); // Debug log
      
      // Create custom div icon for the neighborhood label
      const icon = L.divIcon({
        className: `map-label ${neighborhood.cssClass}`,
        html: `<div>${neighborhood.name}</div>`,
        iconSize: null, // Let CSS handle the size
        iconAnchor: [0, 0]
      });
      
      // Create marker
      const marker = L.marker(neighborhood.coordinates, { 
        icon: icon,
        riseOnHover: true
      }).addTo(map);
      
      // Add click handler with debug logging
      marker.on('click', () => {
        console.log(`Clicked ${neighborhood.name}`);
        handleNeighborhoodClick(neighborhood, marker);
      });
      
      // Store marker reference
      markersRef.current.push({
        id: neighborhood.id,
        marker: marker
      });
    });
    
    console.log(`Added ${markersRef.current.length} markers to map`); // Debug log
  };
  
  // Handle neighborhood selection
  const handleNeighborhoodClick = async (neighborhood, marker) => {
    // Reset all markers to inactive state
    markersRef.current.forEach(m => {
      const markerElement = m.marker.getElement();
      if (markerElement) {
        markerElement.classList.remove('label-active');
      }
    });
    
    // If clicking the same neighborhood, deselect it
    if (selectedNeighborhood === neighborhood.id) {
      setSelectedNeighborhood(null);
      setVendors([]);
      return;
    }
    
    // Set active state for clicked marker
    const markerElement = marker.getElement();
    if (markerElement) {
      markerElement.classList.add('label-active');
    }
    
    // Update selected neighborhood
    setSelectedNeighborhood(neighborhood.id);
    
    // Fetch vendors for the selected neighborhood
    fetchVendorsByNeighborhood(neighborhood.id);
    
    // Smoothly fly to selected neighborhood with animation
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo(neighborhood.coordinates, MAP_DEFAULT_ZOOM + 1, {
        animate: true,
        duration: 1.5,
        easeLinearity: 0.2
      });
    }
  };
  
  // Fetch vendors from the selected neighborhood
  const fetchVendorsByNeighborhood = async (neighborhoodId) => {
    setLoading(true);
    
    try {
      const vendorData = await VendorService.getVendorsByNeighborhood(neighborhoodId, businessType);
      setVendors(vendorData);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Random time generator for demo purposes (15-45 minutes)
  const getRandomDeliveryTime = () => {
    return Math.floor(Math.random() * 30) + 15;
  };
  
  // Random rating generator for demo purposes (3.5-5.0)
  const getRandomRating = () => {
    return (Math.random() * 1.5 + 3.5).toFixed(1);
  };
  
  return (
    <div className="neighborhood-map-container">
      <div className="map-vendor-container">
        <div className="map-section">
          <div className="neighborhood-map">
            <div 
              ref={mapRef}
              className="map-container"
            ></div>
          </div>
          <p className="map-instructions">
            📍 Click on any live location to order from vendors near you
          </p>
        </div>
        
        {selectedNeighborhood && (
          <div className="vendor-section">
            <h2 className="text-xl font-bold mb-4">
              {getBusinessTypeTitle()} in {
                ABEOKUTA_NEIGHBORHOODS.find(n => n.id === selectedNeighborhood)?.name
              }
            </h2>
            
            {loading ? (
              <div className="vendor-loading">
                <div className="loading-spinner"></div>
                <p>Loading vendors...</p>
              </div>
            ) : vendors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No vendors found in this area.</p>
                <p className="mt-2 text-sm">Try selecting a different neighborhood.</p>
              </div>
            ) : (
              <div className="vendor-grid">
                {vendors.map(vendor => (
                  <div key={vendor.id} className="vendor-card">
                    <div className="vendor-image">
                      <img 
                        src={vendor.imageUrl || getVendorPlaceholder()} 
                        alt={vendor.businessName || vendor.name}
                        onError={(e) => {
                          e.target.src = getVendorPlaceholder();
                        }}
                      />
                    </div>
                    <div className="vendor-info">
                      <h3 className="vendor-name">
                        {vendor.businessName || vendor.name}
                      </h3>
                      <p className="vendor-description">
                        {vendor.description || `${vendor.businessType} vendor in ${
                          ABEOKUTA_NEIGHBORHOODS.find(n => n.id === selectedNeighborhood)?.name
                        }`}
                      </p>
                      <div className="vendor-meta">
                        <div className="vendor-rating">
                          <StarIcon className="vendor-rating-star" />
                          <span className="rating-value">{vendor.rating || getRandomRating()}</span>
                        </div>
                        <div className="vendor-delivery">
                          <ClockIcon className="delivery-icon" />
                          <span className="delivery-time">{vendor.deliveryTime || getRandomDeliveryTime()} mins</span>
                        </div>
                        <div className="vendor-fee">
                          <span className="fee-label">Delivery:</span>
                          <span className="fee-value">₦{vendor.deliveryFee || '200'}</span>
                        </div>
                      </div>
                      <button className="order-button">
                        Order Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NeighborhoodMap;
