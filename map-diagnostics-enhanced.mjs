// Enhanced Map Diagnostics Script
// This script provides a more complete diagnostic for the LiveAreasMap component

import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting Enhanced Map Diagnostics...');

// Create a simple diagnostic HTML file
const diagnosticHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enhanced Map Diagnostics</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; max-width: 1200px; margin: 0 auto; }
    h1 { color: #E53935; }
    h2 { margin-top: 20px; }
    .test-section { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
    .map-container { height: 400px; margin-top: 10px; border-radius: 8px; overflow: hidden; }
    .results { background: #f5f5f5; padding: 10px; margin-top: 10px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; max-height: 300px; overflow: auto; }
    button { background: #E53935; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
    button:hover { background: #D32F2F; }
    .success { color: green; }
    .error { color: red; }
    .warning { color: orange; }
    .preload-test { margin-bottom: 20px; }
    .code-display { background: #f0f0f0; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; white-space: pre-wrap; }
    .recommendations { background: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 20px; }
    .tab-container { display: flex; margin-bottom: 10px; }
    .tab { padding: 8px 16px; background: #f0f0f0; cursor: pointer; border-radius: 4px 4px 0 0; margin-right: 5px; }
    .tab.active { background: #E53935; color: white; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
  </style>
</head>
<body>
  <h1>Enhanced Map Diagnostics</h1>
  <p>This diagnostic tool helps identify issues with Leaflet map implementation in your GO7 application.</p>
  
  <div class="tab-container">
    <div class="tab active" data-tab="basic-tests">Basic Tests</div>
    <div class="tab" data-tab="preload-tests">Preload Tests</div>
    <div class="tab" data-tab="css-tests">CSS Tests</div>
    <div class="tab" data-tab="environment">Environment</div>
  </div>
  
  <div id="basic-tests" class="tab-content active">
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
  </div>
  
  <div id="preload-tests" class="tab-content">
    <div class="test-section">
      <h2>1. Preload Link Test</h2>
      <div class="preload-test">
        <button id="testAddPreload">Add Preload Link</button>
        <button id="testRemovePreload">Remove Preload Link</button>
        <div id="preloadResults" class="results">This test adds and removes a Leaflet preload link to test your fix.</div>
      </div>
      
      <h2>2. Current Head Links</h2>
      <button id="checkHeadLinks">Check Current Links</button>
      <div id="headLinksResults" class="results">Click to see all current link elements in document head.</div>
    </div>
  </div>
  
  <div id="css-tests" class="tab-content">
    <div class="test-section">
      <h2>1. CSS Specificity Test</h2>
      <button id="testCssSpecificity">Run Test</button>
      <div id="cssContainer" class="map-container"></div>
      <div id="cssResults" class="results">Click "Run Test" to check CSS specificity.</div>
    </div>
    
    <h2>2. Computed Style Test</h2>
    <button id="testComputedStyles">Run Test</button>
    <div id="computedStyleResults" class="results">Click "Run Test" to check computed styles.</div>
  </div>
  
  <div id="environment" class="tab-content">
    <div class="test-section">
      <h2>Environment Information</h2>
      <div id="environmentInfo" class="results">
        <div>User Agent: <span id="userAgent"></span></div>
        <div>Window Size: <span id="windowSize"></span></div>
        <div>Device Pixel Ratio: <span id="devicePixelRatio"></span></div>
        <div>Touch Device: <span id="touchDevice"></span></div>
      </div>
    </div>
  </div>
  
  <div class="recommendations">
    <h2>Recommendations Based on Test Results</h2>
    <div id="recommendationsList">Run the tests above to get personalized recommendations.</div>
  </div>
  
  <script>
    // Tab functionality
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        // Hide all content
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        // Deactivate all tabs
        document.querySelectorAll('.tab').forEach(t => {
          t.classList.remove('active');
        });
        
        // Activate clicked tab
        tab.classList.add('active');
        
        // Show corresponding content
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
      });
    });
    
    // Fill environment info immediately
    document.getElementById('userAgent').textContent = navigator.userAgent;
    document.getElementById('windowSize').textContent = \`\${window.innerWidth}x\${window.innerHeight}\`;
    document.getElementById('devicePixelRatio').textContent = window.devicePixelRatio;
    document.getElementById('touchDevice').textContent = 
      ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)
        ? 'Yes' : 'No';
    
    // Global recommendation array
    const recommendations = [];
    
    // Helper function to update recommendations
    function updateRecommendations() {
      const list = document.getElementById('recommendationsList');
      if (recommendations.length === 0) {
        list.innerHTML = '<p>No issues detected or not enough tests run yet.</p>';
        return;
      }
      
      list.innerHTML = '<ul>' + 
        recommendations.map(rec => \`<li>\${rec}</li>\`).join('') +
        '</ul>';
    }
    
    // Test 1: Check if Leaflet is available
    document.getElementById('testLeaflet').addEventListener('click', function() {
      const results = document.getElementById('leafletResults');
      results.innerHTML = '';
      
      try {
        if (typeof L === 'undefined') {
          results.innerHTML += '<div class="error">❌ Leaflet library not found. Check if the script is properly loaded.</div>';
          recommendations.push('Add Leaflet JavaScript and CSS to your project. Try using CDN links or npm package.');
        } else {
          results.innerHTML += '<div class="success">✓ Leaflet found (version ' + L.version + ')</div>';
          results.innerHTML += '<div class="success">✓ L.Map constructor available: ' + (typeof L.Map === 'function') + '</div>';
          results.innerHTML += '<div class="success">✓ L.TileLayer constructor available: ' + (typeof L.TileLayer === 'function') + '</div>';
          results.innerHTML += '<div class="success">✓ L.Marker constructor available: ' + (typeof L.Marker === 'function') + '</div>';
        }
      } catch (error) {
        results.innerHTML += '<div class="error">❌ Error checking Leaflet: ' + error.message + '</div>';
        recommendations.push('Fix Leaflet loading error: ' + error.message);
      }
      
      updateRecommendations();
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
        recommendations.push('Fix map initialization error: ' + error.message);
      }
      
      updateRecommendations();
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
          updateRecommendations();
        };
        img.onerror = function() {
          results.innerHTML = '<div class="error">❌ Failed to load test tile. Check network connectivity or proxy settings.</div>';
          recommendations.push('Check your network connection and proxy settings. Ensure your application can access OpenStreetMap tiles.');
          updateRecommendations();
        };
        
        // Try to load a test tile from OpenStreetMap
        const timestamp = new Date().getTime(); // Prevent caching
        img.src = 'https://a.tile.openstreetmap.org/12/2048/2048.png?' + timestamp;
        
        results.innerHTML += '<div>Loading test tile from OpenStreetMap...</div>';
      } catch (error) {
        results.innerHTML = '<div class="error">❌ Error in tile test: ' + error.message + '</div>';
        recommendations.push('Fix tile loading error: ' + error.message);
        updateRecommendations();
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
            recommendations.push('Your browser is missing support for ' + feature + '. This may affect map functionality.');
          }
        }
        
        if (allPassed) {
          results.innerHTML += '<div class="success">✓ All required features are supported by your browser.</div>';
        } else {
          results.innerHTML += '<div class="error">❌ Some required features are not supported. This may affect map functionality.</div>';
        }
      } catch (error) {
        results.innerHTML += '<div class="error">❌ Error in compatibility test: ' + error.message + '</div>';
        recommendations.push('Error during compatibility test: ' + error.message);
      }
      
      updateRecommendations();
    });
    
    // Preload test functions
    document.getElementById('testAddPreload').addEventListener('click', function() {
      const results = document.getElementById('preloadResults');
      results.innerHTML = '';
      
      try {
        // Create a preload link
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.as = 'style';
        link.id = 'test-preload-link';
        document.head.appendChild(link);
        
        results.innerHTML += '<div class="success">✓ Added test preload link for Leaflet CSS</div>';
        results.innerHTML += '<div class="warning">⚠️ Check browser console for any warnings about unused preload resources</div>';
        
        // Check if it's still there after a short delay
        setTimeout(() => {
          const linkStillExists = document.getElementById('test-preload-link');
          if (linkStillExists) {
            results.innerHTML += '<div class="warning">⚠️ After 100ms: Preload link still exists - your fix may not be removing dynamic links</div>';
            recommendations.push('Your preload fix is not detecting and removing dynamically added links. Check your MutationObserver implementation.');
          } else {
            results.innerHTML += '<div class="success">✓ After 100ms: Preload link was automatically removed - your fix is working!</div>';
          }
          updateRecommendations();
        }, 100);
      } catch (error) {
        results.innerHTML += '<div class="error">❌ Error adding preload link: ' + error.message + '</div>';
      }
    });
    
    document.getElementById('testRemovePreload').addEventListener('click', function() {
      const results = document.getElementById('preloadResults');
      const link = document.getElementById('test-preload-link');
      
      if (link) {
        link.remove();
        results.innerHTML += '<div class="success">✓ Manually removed test preload link</div>';
      } else {
        results.innerHTML += '<div class="warning">⚠️ No test preload link found to remove</div>';
      }
    });
    
    document.getElementById('checkHeadLinks').addEventListener('click', function() {
      const results = document.getElementById('headLinksResults');
      results.innerHTML = '';
      
      try {
        const links = document.querySelectorAll('head link');
        
        if (links.length === 0) {
          results.innerHTML += '<div class="warning">⚠️ No link elements found in document head</div>';
        } else {
          results.innerHTML += '<div>Found ' + links.length + ' link elements in document head:</div>';
          
          let preloadCount = 0;
          let leafletCssCount = 0;
          let leafletJsCount = 0;
          
          links.forEach((link, index) => {
            const rel = link.getAttribute('rel') || 'none';
            const href = link.getAttribute('href') || 'none';
            
            results.innerHTML += \`<div>\${index + 1}. <span class="success">\${rel}</span>: \${href}</div>\`;
            
            if (rel === 'preload') preloadCount++;
            if (href.includes('leaflet.css')) leafletCssCount++;
            if (href.includes('leaflet.js')) leafletJsCount++;
          });
          
          if (preloadCount > 0) {
            results.innerHTML += \`<div class="warning">⚠️ Found \${preloadCount} preload links</div>\`;
            recommendations.push('Your page contains preload links. Check if they are necessary or causing warnings.');
          }
          
          if (leafletCssCount > 1) {
            results.innerHTML += \`<div class="warning">⚠️ Found \${leafletCssCount} links to leaflet.css - potential duplication</div>\`;
            recommendations.push('Multiple leaflet.css files detected. Remove duplicates to prevent conflicts.');
          }
          
          if (leafletJsCount > 1) {
            results.innerHTML += \`<div class="warning">⚠️ Found \${leafletJsCount} links to leaflet.js - potential duplication</div>\`;
            recommendations.push('Multiple leaflet.js files detected. Remove duplicates to prevent conflicts.');
          }
        }
      } catch (error) {
        results.innerHTML += '<div class="error">❌ Error checking head links: ' + error.message + '</div>';
      }
      
      updateRecommendations();
    });
    
    // CSS tests
    document.getElementById('testCssSpecificity').addEventListener('click', function() {
      const results = document.getElementById('cssResults');
      const container = document.getElementById('cssContainer');
      results.innerHTML = '';
      
      try {
        // Create test elements
        container.innerHTML = \`
          <div class="leaflet-container" style="height: 100%;">
            <div class="leaflet-pane leaflet-map-pane">
              <div class="leaflet-pane leaflet-tile-pane">
                <div class="leaflet-layer">
                  <div class="leaflet-tile-container"></div>
                </div>
              </div>
              <div class="leaflet-pane leaflet-marker-pane"></div>
              <div class="leaflet-pane leaflet-popup-pane"></div>
            </div>
            <div class="leaflet-control-container">
              <div class="leaflet-top leaflet-left">
                <div class="leaflet-control-zoom leaflet-bar leaflet-control">
                  <a class="leaflet-control-zoom-in" href="#" title="Zoom in">+</a>
                  <a class="leaflet-control-zoom-out" href="#" title="Zoom out">−</a>
                </div>
              </div>
            </div>
          </div>
        \`;
        
        results.innerHTML += '<div class="success">✓ Created test Leaflet DOM structure</div>';
        
        // Check computed styles
        const leafletContainer = container.querySelector('.leaflet-container');
        const computedStyle = window.getComputedStyle(leafletContainer);
        
        results.innerHTML += '<div>Computed styles for .leaflet-container:</div>';
        results.innerHTML += \`<div>- position: \${computedStyle.position}</div>\`;
        results.innerHTML += \`<div>- width: \${computedStyle.width}</div>\`;
        results.innerHTML += \`<div>- height: \${computedStyle.height}</div>\`;
        
        // Check for common CSS issues
        if (computedStyle.position !== 'relative') {
          results.innerHTML += '<div class="warning">⚠️ .leaflet-container position is not "relative"</div>';
          recommendations.push('The .leaflet-container element should have position: relative; Check for CSS overrides.');
        }
        
        if (computedStyle.width !== '100%' && computedStyle.width !== container.clientWidth + 'px') {
          results.innerHTML += '<div class="warning">⚠️ .leaflet-container width may not be optimal</div>';
        }
        
        if (computedStyle.height === '0px') {
          results.innerHTML += '<div class="error">❌ .leaflet-container has zero height</div>';
          recommendations.push('The .leaflet-container has zero height. Ensure the container has a defined height.');
        }
      } catch (error) {
        results.innerHTML += '<div class="error">❌ Error in CSS test: ' + error.message + '</div>';
      }
      
      updateRecommendations();
    });
    
    document.getElementById('testComputedStyles').addEventListener('click', function() {
      const results = document.getElementById('computedStyleResults');
      results.innerHTML = '';
      
      // Create a temporary map to check real computed styles
      const tempMapDiv = document.createElement('div');
      tempMapDiv.style.height = '200px';
      tempMapDiv.style.width = '200px';
      tempMapDiv.style.position = 'absolute';
      tempMapDiv.style.left = '-9999px';
      tempMapDiv.id = 'temp-map';
      document.body.appendChild(tempMapDiv);
      
      try {
        // Initialize a temporary map
        const tempMap = L.map('temp-map').setView([51.505, -0.09], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(tempMap);
        
        // Wait a bit for the map to render
        setTimeout(() => {
          try {
            const mapContainer = document.querySelector('#temp-map');
            if (!mapContainer) {
              results.innerHTML += '<div class="error">❌ Could not find the temporary map container</div>';
              return;
            }
            
            const leafletContainer = mapContainer.querySelector('.leaflet-container');
            if (!leafletContainer) {
              results.innerHTML += '<div class="error">❌ Could not find .leaflet-container element</div>';
              return;
            }
            
            const style = window.getComputedStyle(leafletContainer);
            
            // Display relevant styles
            results.innerHTML += '<div class="success">✓ Found .leaflet-container element</div>';
            results.innerHTML += '<div>Key computed styles:</div>';
            
            const keyCssProperties = [
              'position', 'width', 'height', 'z-index', 'overflow',
              'background', 'font-family', 'font-size'
            ];
            
            keyCssProperties.forEach(prop => {
              results.innerHTML += \`<div>- \${prop}: \${style.getPropertyValue(prop)}</div>\`;
            });
            
            // Clean up
            tempMap.remove();
            tempMapDiv.remove();
          } catch (innerError) {
            results.innerHTML += '<div class="error">❌ Error analyzing styles: ' + innerError.message + '</div>';
          }
        }, 200);
      } catch (error) {
        results.innerHTML += '<div class="error">❌ Error creating temporary map: ' + error.message + '</div>';
        // Clean up
        if (tempMapDiv) tempMapDiv.remove();
      }
    });
  </script>
</body>
</html>
`;

// Write the diagnostic HTML file
fs.writeFileSync(path.join(__dirname, 'map-diagnostics-enhanced.html'), diagnosticHtml);
console.log('Created enhanced diagnostic HTML file: map-diagnostics-enhanced.html');

// Create a simple HTTP server to serve the diagnostic file
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/map-diagnostics-enhanced.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(diagnosticHtml);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Start the server on port 3001
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Enhanced Map Diagnostics server running at http://localhost:${PORT}/`);
  console.log('Open this URL in your browser to run the diagnostics.');
  console.log('Press Ctrl+C to stop the server.');
});