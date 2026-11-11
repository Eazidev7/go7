// Map Diagnostic Script
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

console.log('Starting Map Diagnostic Tests');
console.log('==============================');

// Function to check if a URL is accessible
function checkURL(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      console.log(`STATUS: ${res.statusCode} for ${url}`);
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    }).on('error', (err) => {
      console.error(`ERROR: ${err.message} for ${url}`);
      resolve(false);
    });
  });
}

// Check if Leaflet CSS and JS files are accessible
async function checkLeafletFiles() {
  console.log('\nChecking Leaflet Resources:');
  const leafletCss = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  const leafletJs = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  
  const cssAccessible = await checkURL(leafletCss);
  const jsAccessible = await checkURL(leafletJs);
  
  console.log(`Leaflet CSS accessible: ${cssAccessible ? 'YES' : 'NO'}`);
  console.log(`Leaflet JS accessible: ${jsAccessible ? 'YES' : 'NO'}`);
  
  return cssAccessible && jsAccessible;
}

// Check if OpenStreetMap tiles are accessible
async function checkOsmTiles() {
  console.log('\nChecking OpenStreetMap Tiles:');
  const tileUrl = 'https://a.tile.openstreetmap.org/10/300/384.png';
  
  const tilesAccessible = await checkURL(tileUrl);
  console.log(`OpenStreetMap tiles accessible: ${tilesAccessible ? 'YES' : 'NO'}`);
  
  return tilesAccessible;
}

// Check if map-related CSS files exist
function checkCssFiles() {
  console.log('\nChecking Map CSS Files:');
  const cssFiles = [
    path.join(__dirname, 'src', 'components', 'maps', 'map.css'),
    path.join(__dirname, 'src', 'components', 'maps', 'map-fix.css')
  ];
  
  cssFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`${path.basename(file)} exists: ${exists ? 'YES' : 'NO'}`);
  });
}

// Check if map component files exist
function checkMapComponents() {
  console.log('\nChecking Map Component Files:');
  const componentFiles = [
    path.join(__dirname, 'src', 'components', 'maps', 'SimpleMap.jsx'),
    path.join(__dirname, 'src', 'components', 'maps', 'LiveAreasMap.tsx')
  ];
  
  componentFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`${path.basename(file)} exists: ${exists ? 'YES' : 'NO'}`);
  });
}

// Main diagnostic function
async function runDiagnostics() {
  console.log('System Information:');
  console.log(`Node.js Version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  
  await checkLeafletFiles();
  await checkOsmTiles();
  checkCssFiles();
  checkMapComponents();
  
  console.log('\nDiagnostic tests completed.');
  console.log('To test the simple map, run:');
  console.log('  node simple-map-server.js');
  console.log('Then open http://localhost:3000 in your browser');
}

runDiagnostics();