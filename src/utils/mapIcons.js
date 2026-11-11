// src/utils/mapIcons.js
/**
 * Map Icons Generator - Creates SVG-based PNG placeholders for Go7 Map
 * Generates bag, shop, rider, and landmark icons as data URLs
 */

// Use actual image files for map icons
export const createMapIcons = () => {
  
  // Use the uploaded professional cartoon icons
  const bagIcon = '/bag-icon.jpg';           // Orange bag for pickup
  const shopIcon = '/shop-icon.jpg';         // Blue shop with red awning for dropoff  
  const riderIcon = '/rider-icon.jpg';       // Orange scooter with rider for animation
  const landmarkIcon = '/olumo-rock-icon.jpg'; // Olumo Rock landmark

  return {
    bagIcon,
    shopIcon,
    riderIcon,
    landmarkIcon
  };
};

// Convert image URL to Leaflet icon
export const createLeafletIcon = (imageUrl, size = [32, 32], anchor = [16, 32]) => {
  return L.icon({
    iconUrl: imageUrl,
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, -32],
    shadowUrl: null,
    className: 'go7-custom-marker' // Add CSS class for styling
  });
};

// Preset icon configurations for the professional cartoon icons
export const mapIconConfigs = {
  pickup: {
    size: [40, 40],    // Larger size for better visibility
    anchor: [20, 40]   // Bottom center anchor
  },
  dropoff: {
    size: [40, 40],    // Larger size for better visibility
    anchor: [20, 40]   // Bottom center anchor
  },
  rider: {
    size: [50, 50],    // Larger animated rider
    anchor: [25, 45]   // Slightly off-bottom for scooter wheels
  },
  landmark: {
    size: [45, 45],    // Slightly larger landmark
    anchor: [22, 45]   // Bottom center anchor
  }
};