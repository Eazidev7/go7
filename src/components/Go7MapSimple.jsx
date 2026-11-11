// src/components/Go7MapSimple.jsx
/**
 * Simplified Go7 Map Component for debugging
 */

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Simple custom icons using the uploaded images
const createSimpleIcon = (iconUrl, size = [40, 40]) => {
  return L.icon({
    iconUrl: iconUrl,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -32],
  });
};

const Go7MapSimple = ({ height = '400px' }) => {
  // Abeokuta coordinates
  const pickup = [7.1475, 3.3619];
  const dropoff = [7.1532, 3.3698];
  const landmark = [7.1567, 3.3483];

  console.log('Go7MapSimple rendering...');

  // Create icons
  const bagIcon = createSimpleIcon('/bag-icon.jpg', [40, 40]);
  const shopIcon = createSimpleIcon('/shop-icon.jpg', [40, 40]);
  const riderIcon = createSimpleIcon('/rider-icon.jpg', [50, 50]);
  const landmarkIcon = createSimpleIcon('/olumo-rock-icon.jpg', [45, 45]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Simplified Go7 Map - Debug Version</h2>

      <div style={{
        height: height,
        width: '100%',
        border: '2px solid #FF6B35',
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#fef7ed'
      }}>
        <MapContainer
          center={[7.1504, 3.3659]} // Center between pickup and dropoff
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          className="go7-simple-map"
        >
          {/* MapTiler tiles - Custom Go7 style */}
          <TileLayer
            url="https://api.maptiler.com/maps/019996dd-306b-7019-acc5-de8469c0388d/{z}/{x}/{y}.png?key=nRGZ9lGblbV9lFK2KclL"
            attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a>'
            opacity={0.8}
          />

          {/* Pickup marker */}
          <Marker position={pickup} icon={bagIcon}>
            <Popup>
              <strong>Pickup Location</strong><br />
              Ake, Abeokuta
            </Popup>
          </Marker>

          {/* Dropoff marker */}
          <Marker position={dropoff} icon={shopIcon}>
            <Popup>
              <strong>Dropoff Location</strong><br />
              Isabo, Abeokuta
            </Popup>
          </Marker>

          {/* Rider marker */}
          <Marker position={[7.1490, 3.3640]} icon={riderIcon}>
            <Popup>
              <strong>Rider Location</strong><br />
              Akeem on the way!
            </Popup>
          </Marker>

          {/* Landmark marker */}
          <Marker position={landmark} icon={landmarkIcon}>
            <Popup>
              <strong>Olumo Rock</strong><br />
              Historic landmark
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      <div style={{ marginTop: '20px', background: '#f3f4f6', padding: '15px', borderRadius: '8px' }}>
        <h3>Debug Information:</h3>
        <ul>
          <li><strong>Icons loaded:</strong> bag-icon.jpg, shop-icon.jpg, rider-icon.jpg, olumo-rock-icon.jpg</li>
          <li><strong>Locations:</strong> Pickup (Ake), Dropoff (Isabo), Landmark (Olumo Rock)</li>
          <li><strong>Map tiles:</strong> MapTiler basic-v2 with API key</li>
          <li><strong>Container:</strong> {height} height with cream background</li>
        </ul>
      </div>
    </div>
  );
};

export default Go7MapSimple;