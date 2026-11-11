// Ultra Simple Server for Go7
// This is a minimal HTTP server with no dependencies beyond Node.js core
// Use this when other server methods are failing

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configure port
const PORT = 7000;

// Create HTTP server
const server = http.createServer((req, res) => {
  console.log(`Request: ${req.url}`);
  
  // Basic routing
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  
  // Enhanced MIME type detection for ES modules
  const ext = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.jsx': 'application/javascript; charset=utf-8',
    '.ts': 'application/javascript; charset=utf-8',
    '.tsx': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
  };
  
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  // Set CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Special handling for development files that should not be served as HTML
  if (req.url.includes('src/') || req.url.includes('.jsx') || req.url.includes('.js') || req.url.includes('.ts')) {
    // For development files, return 404 instead of fallback to HTML
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found: ' + req.url);
      return;
    }
  }
  
  // Read file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      // If file not found, try to serve index.html for SPA (but not for JS/CSS files)
      if (err.code === 'ENOENT' && !req.url.match(/\.(js|jsx|ts|tsx|css|json)$/)) {
        fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
          if (err) {
            res.writeHead(500);
            res.end('Error loading index.html');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          }
        });
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Start server
try {
  server.listen(PORT, () => {
    console.log(`
    ----------------------------------------
    📣 EMERGENCY GO7 SERVER
    ----------------------------------------
    
    Server running at http://localhost:${PORT}/
    
    This is a minimal emergency server.
    Press Ctrl+C to stop.
    `);
  });
} catch (e) {
  console.error('Failed to start server:', e);
}