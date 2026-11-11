// Static server in a single file with no module dependencies
// This is designed to work in any Node.js environment

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;

// MIME types map
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

// Create server
http.createServer((req, res) => {
  // Log each request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Handle URL
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = reqUrl.pathname;
  
  // Special case for root path
  if (pathname === '/') {
    pathname = '/static-mobile.html';
  }
  
  // Calculate file path
  let filePath = path.join(process.cwd(), pathname);
  
  // Get file extension for MIME type
  const extname = path.extname(filePath);
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // Try in the public folder if not found in root
      const publicPath = path.join(process.cwd(), 'public', pathname);
      
      fs.access(publicPath, fs.constants.F_OK, (err2) => {
        if (err2) {
          console.log(`File not found: ${pathname}`);
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end(`File not found: ${pathname}`);
          return;
        }
        
        // File exists in public folder, serve it
        serveFile(publicPath, extname, res);
      });
    } else {
      // File exists in root, serve it
      serveFile(filePath, extname, res);
    }
  });
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Access the mobile page: http://localhost:${PORT}/static-mobile.html`);
  
  // Display IP addresses for mobile testing
  console.log('\nFor mobile testing, use one of these addresses:');
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach((iface) => {
    interfaces[iface].forEach((details) => {
      if (details.family === 'IPv4' && !details.internal) {
        console.log(`http://${details.address}:${PORT}/static-mobile.html`);
      }
    });
  });
});

// Function to serve a file
function serveFile(filePath, extname, res) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        console.log(`File not found: ${filePath}`);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`File not found: ${filePath}`);
      } else {
        console.error(`Server error: ${err.code}`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server error: ${err.code}`);
      }
      return;
    }
    
    // Set appropriate headers
    const contentType = MIME_TYPES[extname] || 'text/plain';
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    
    // Send the file content
    res.end(content);
  });
}