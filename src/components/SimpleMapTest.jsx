// src/components/SimpleMapTest.jsx
/**
 * Simple test component to debug map visibility issues
 */

import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const SimpleMapTest = () => {
  console.log('SimpleMapTest rendering...');

  return (
    <div style={{ padding: '20px' }}>
      <h1>Simple Map Test</h1>
      <p>Testing basic Leaflet map rendering...</p>

      <div style={{
        height: '400px',
        width: '100%',
        border: '2px solid red',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <MapContainer
          center={[7.1475, 3.3619]} // Abeokuta coordinates
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://api.maptiler.com/maps/019996dd-306b-7019-acc5-de8469c0388d/{z}/{x}/{y}.png?key=nRGZ9lGblbV9lFK2KclL"
            attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a>'
          />
        </MapContainer>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Debug Info:</h3>
        <ul>
          <li>Map center: [7.1475, 3.3619] (Abeokuta)</li>
          <li>Zoom level: 13</li>
          <li>MapTiler API Key: nRGZ9lGblbV9lFK2KclL</li>
          <li>Tile URL: Working MapTiler basic tiles</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleMapTest;