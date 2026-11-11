/**
 * Ultra simplified HTTP server for serving Go7 application
 * This server uses the absolute minimum dependencies and configuration
 * to serve static files from the public directory.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 7777;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for common files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

// Create HTTP server
const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Default to index.html for root requests
  let filePath = req.url === '/' 
    ? path.join(PUBLIC_DIR, 'index.html') 
    : path.join(PUBLIC_DIR, req.url);

  // Get file extension
  const extname = path.extname(filePath).toLowerCase();
  
  // Determine content type based on file extension
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`File not found: ${filePath}`);
      
      // If file doesn't exist, check if it's a route that should be handled by the SPA
      if (extname === '') {
        // For SPA routes, serve index.html
        filePath = path.join(PUBLIC_DIR, 'index.html');
        serveFile(filePath, 'text/html', res);
      } else {
        // Otherwise return 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
      return;
    }

    // File exists, serve it
    serveFile(filePath, contentType, res);
  });
});

// Helper function to serve a file
function serveFile(filePath, contentType, res) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      console.error(`Error reading file: ${filePath}`, err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    console.log(`Successfully served: ${filePath}`);
  });
}

// Start the server
server.listen(PORT, () => {
  console.log(`
=========================================================
   ULTRA MINIMAL GO7 SERVER RUNNING ON PORT ${PORT}
=========================================================

Server is available at: http://localhost:${PORT}

* No dependencies required
* Serving static files from: ${PUBLIC_DIR}
* Any route will fall back to index.html for SPA support

Press Ctrl+C to stop the server...
`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`
ERROR: Port ${PORT} is already in use!
Try changing the PORT variable in the script or closing the application using this port.
`);
  } else {
    console.error('Server error:', err);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});