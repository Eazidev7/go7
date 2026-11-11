const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple HTTP server that can serve static files
const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  
  // Default to index.html
  let filePath = req.url === '/' ? '/index.html' : req.url;
  
  // Remove query strings
  filePath = filePath.split('?')[0];
  
  // Get full path to requested file
  const fullPath = path.join(__dirname, filePath);
  
  // Default content type
  let contentType = 'text/html';
  
  // Set content type based on file extension
  switch (path.extname(filePath)) {
    case '.js':
    case '.jsx':
    case '.mjs':
      contentType = 'application/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
    case '.jpeg':
      contentType = 'image/jpeg';
      break;
    case '.gif':
      contentType = 'image/gif';
      break;
    case '.svg':
      contentType = 'image/svg+xml';
      break;
  }
  
  // Read the file
  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found - try index.html for SPA routing
        if (!path.extname(filePath)) {
          fs.readFile(path.join(__dirname, '/index.html'), (indexErr, indexContent) => {
            if (indexErr) {
              // Can't even serve index.html
              console.log(`Error: Cannot serve index.html - ${indexErr.message}`);
              res.writeHead(500);
              res.end('Server Error: Could not serve index.html');
              return;
            }
            
            console.log(`Serving index.html for client route: ${filePath}`);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent, 'utf-8');
          });
          return;
        }
        
        // Regular file not found
        console.log(`404: ${fullPath}`);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not Found: ${filePath}`);
      } else {
        // Server error
        console.log(`Server error: ${err.message}`);
        res.writeHead(500);
        res.end(`Server Error: ${err.message}`);
      }
    } else {
      // Success - send the file
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
      console.log(`Served: ${filePath} (${contentType})`);
    }
  });
});

// Default port - will try several ports if the first one fails
const tryPorts = [3000, 3001, 3002, 8080, 8081];

function startServer(portIndex) {
  if (portIndex >= tryPorts.length) {
    console.log('Failed to start server on any port');
    process.exit(1);
  }
  
  const port = tryPorts[portIndex];
  
  server.listen(port, () => {
    console.log(`
========================================================
    EMERGENCY MINIMAL SERVER RUNNING
========================================================
    Server running at: http://localhost:${port}
    
    - MIME types fixed for all files
    - Icons served with correct Content-Type
    - SPA client-side routing support
    - Detailed request logging
========================================================
    Try to access in browser:
    http://localhost:${port}
========================================================
`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is already in use, trying next port...`);
      startServer(portIndex + 1);
    } else {
      console.log(`Error starting server: ${err.message}`);
    }
  });
}

// Start the server on the first available port
startServer(0);