// Map Diagnostics Script
// This script checks for potential map loading issues

import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting Map Diagnostics...');

// Create a simple diagnostic HTML file
const diagnosticHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Map Diagnostics</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
    h1 { color: #E53935; }
    .test-section { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
    .map-container { height: 300px; margin-top: 10px; }
    .results { background: #f5f5f5; padding: 10px; margin-top: 10px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; }
    button { background: #E53935; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
    button:hover { background: #D32F2F; }
    .success { color: green; }
    .error { color: red; }
  </style>
</head>
<body>
  <h1>Map Diagnostics</h1>
  
  <div class="test-section">
    <h2>1. Leaflet Availability Test</h2>
    <button id="testLeaflet">Run Test</button>
    <div id="leafletResults" class="results">Click "Run Test" to check if Leaflet is properly loaded.</div>
  </div>
  
  <div class="test-section">
    <h2>2. Map Initialization Test</h2>
    <button id="testMapInit">Run Test</button>
    <div id="mapContainer" class="map-container"></div>
    <div id="mapResults" class="results">Click "Run Test" to check if a map can be initialized.</div>
  </div>
  
  <div class="test-section">
    <h2>3. Tile Loading Test</h2>
    <button id="testTiles">Run Test</button>
    <div id="tileResults" class="results">Click "Run Test" to check if map tiles can be loaded.</div>
  </div>
  
  <div class="test-section">
    <h2>4. Browser Compatibility Check</h2>
    <button id="testCompatibility">Run Test</button>
    <div id="compatibilityResults" class="results">Click "Run Test" to check browser compatibility.</div>
  </div>
  
  <script>
    // Test 1: Check if Leaflet is available
    document.getElementById('testLeaflet').addEventListener('click', function() {
      const results = document.getElementById('leafletResults');
      results.innerHTML = '';
      
      try {
        if (typeof L === 'undefined') {
          results.innerHTML += '<div class="error">❌ Leaflet library not found. Check if the script is properly loaded.</div>';
        } else {
          results.innerHTML += '<div class="success">✓ Leaflet found (version ' + L.version + ')</div>';
          results.innerHTML += '<div class="success">✓ L.Map constructor available: ' + (typeof L.Map === 'function') + '</div>';
          results.innerHTML += '<div class="success">✓ L.TileLayer constructor available: ' + (typeof L.TileLayer === 'function') + '</div>';
          results.innerHTML += '<div class="success">✓ L.Marker constructor available: ' + (typeof L.Marker === 'function') + '</div>';
        }
      } catch (error) {
        results.innerHTML += '<div class="error">❌ Error checking Leaflet: ' + error.message + '</div>';
      }
    });
    
    // Test 2: Initialize a map
    document.getElementById('testMapInit').addEventListener('click', function() {
      const results = document.getElementById('mapResults');
      const mapContainer = document.getElementById('mapContainer');
      results.innerHTML = '';
      
      try {
        // Clear previous map if any
        mapContainer.innerHTML = '<div id="testMap" style="height: 100%;"></div>';
        
        // Initialize map
        const map = L.map('testMap', {
          center: [7.1475, 3.3619], // Abeokuta
          zoom: 12
        });
        
        results.innerHTML += '<div class="success">✓ Map initialized successfully</div>';
        results.innerHTML += '<div class="success">✓ Map center: ' + map.getCenter() + '</div>';
        results.innerHTML += '<div class="success">✓ Map zoom: ' + map.getZoom() + '</div>';
        results.innerHTML += '<div class="success">✓ Map size: ' + map.getSize().x + 'x' + map.getSize().y + '</div>';
        
        // Add a simple marker to test
        const marker = L.marker([7.1475, 3.3619]).addTo(map);
        marker.bindPopup("Abeokuta").openPopup();
        
        results.innerHTML += '<div class="success">✓ Marker added to map</div>';
        
        // Add a simple tile layer
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        
        results.innerHTML += '<div class="success">✓ Tile layer added to map</div>';
        
        // Invalidate size to ensure proper rendering
        setTimeout(() => {
          map.invalidateSize();
          results.innerHTML += '<div class="success">✓ Map size invalidated</div>';
        }, 100);
      } catch (error) {
        results.innerHTML += '<div class="error">❌ Error initializing map: ' + error.message + '</div>';
        console.error(error);
      }
    });
    
    // Test 3: Tile loading
    document.getElementById('testTiles').addEventListener('click', function() {
      const results = document.getElementById('tileResults');
      results.innerHTML = 'Testing tile loading...';
      
      try {
        const img = new Image();
        img.onload = function() {
          results.innerHTML = '<div class="success">✓ Test tile loaded successfully</div>';
          results.innerHTML += '<div class="success">✓ Tile dimensions: ' + img.width + 'x' + img.height + '</div>';
        };
        img.onerror = function() {
          results.innerHTML = '<div class="error">❌ Failed to load test tile. Check network connectivity or proxy settings.</div>';
        };
        
        // Try to load a test tile from OpenStreetMap
        const timestamp = new Date().getTime(); // Prevent caching
        img.src = 'https://a.tile.openstreetmap.org/12/2048/2048.png?' + timestamp;
        
        results.innerHTML += '<div>Loading test tile from OpenStreetMap...</div>';
      } catch (error) {
        results.innerHTML = '<div class="error">❌ Error in tile test: ' + error.message + '</div>';
      }
    });
    
    // Test 4: Browser compatibility
    document.getElementById('testCompatibility').addEventListener('click', function() {
      const results = document.getElementById('compatibilityResults');
      results.innerHTML = '';
      
      try {
        results.innerHTML += '<div>User Agent: ' + navigator.userAgent + '</div>';
        
        // Check for required browser features
        const tests = {
          'localStorage': !!window.localStorage,
          'sessionStorage': !!window.sessionStorage,
          'geolocation': !!navigator.geolocation,
          'WebWorkers': !!window.Worker,
          'requestAnimationFrame': !!window.requestAnimationFrame,
          'canvas': !!document.createElement('canvas').getContext,
          'Fetch API': !!window.fetch,
          'Promises': !!window.Promise,
          'CSS3 transitions': typeof document.body.style.transition !== 'undefined',
          'classList API': !!document.documentElement.classList,
          'ResizeObserver': !!window.ResizeObserver
        };
        
        let allPassed = true;
        for (const feature in tests) {
          if (tests[feature]) {
            results.innerHTML += '<div class="success">✓ ' + feature + ' supported</div>';
          } else {
            results.innerHTML += '<div class="error">❌ ' + feature + ' NOT supported</div>';
            allPassed = false;
          }
        }
        
        if (allPassed) {
          results.innerHTML += '<div class="success">✓ All required features are supported by your browser.</div>';
        } else {
          results.innerHTML += '<div class="error">❌ Some required features are not supported. This may affect map functionality.</div>';
        }
      } catch (error) {
        results.innerHTML += '<div class="error">❌ Error in compatibility test: ' + error.message + '</div>';
      }
    });
  </script>
</body>
</html>
`;

// Write the diagnostic HTML file
fs.writeFileSync(path.join(__dirname, 'map-diagnostics.html'), diagnosticHtml);
console.log('Created diagnostic HTML file: map-diagnostics.html');

// Create a simple HTTP server to serve the diagnostic file
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/map-diagnostics.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(diagnosticHtml);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Start the server on port 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Map Diagnostics server running at http://localhost:${PORT}/`);
  console.log('Open this URL in your browser to run the diagnostics.');
  console.log('Press Ctrl+C to stop the server.');
});