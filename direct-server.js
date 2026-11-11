// Simple HTTP server that bypasses the service worker issues
// This server serves static files directly from the public directory

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'url';
import os from 'os';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// MIME types for different file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

// Create HTTP server
const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.url}`);
  
  // Parse URL
  const parsedUrl = parse(req.url);
  
  // Extract path from URL
  let pathname = path.join(process.cwd(), parsedUrl.pathname || '');
  
  // Special case for root path
  if (parsedUrl.pathname === '/') {
    pathname = path.join(process.cwd(), 'static-mobile.html');
  }
  
  // Get file extension
  const ext = path.parse(pathname).ext;
  
  // Check if file exists
  fs.stat(pathname, (err, stats) => {
    if (err) {
      // If the requested file doesn't exist, try looking for it in the public directory
      const publicPath = path.join(process.cwd(), 'public', parsedUrl.pathname);
      
      fs.stat(publicPath, (err2, stats2) => {
        if (err2) {
          // If it's not in the public directory, return 404
          console.log(`File not found: ${pathname}`);
          res.statusCode = 404;
          res.end(`File ${parsedUrl.pathname} not found!`);
          return;
        }
        
        // If it exists in public directory, serve it
        serveFile(publicPath, ext, res);
      });
      return;
    }
    
    // If it's a directory, look for index.html
    if (stats.isDirectory()) {
      pathname = path.join(pathname, 'index.html');
      fs.stat(pathname, (err, stats) => {
        if (err) {
          res.statusCode = 404;
          res.end(`Directory ${parsedUrl.pathname} does not contain an index.html file!`);
          return;
        }
        
        serveFile(pathname, '.html', res);
      });
      return;
    }
    
    // Serve the file
    serveFile(pathname, ext, res);
  });
});

// Function to serve a file
function serveFile(pathname, ext, res) {
  // Read file
  fs.readFile(pathname, (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.end(`Error reading file: ${err}`);
      return;
    }
    
    // Set content type header
    res.setHeader('Content-type', MIME_TYPES[ext] || 'text/plain');
    
    // Add CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Send response
    res.end(data);
  });
}

// Start server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Static mobile page: http://localhost:${PORT}/static-mobile.html`);
  
  // Get local IP addresses for testing on mobile devices
  const nets = os.networkInterfaces();
  
  console.log('\nFor testing on mobile devices, use one of these URLs:');
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over internal (non-public) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`http://${net.address}:${PORT}/static-mobile.html`);
      }
    }
  }
});