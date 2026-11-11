/**
 * Go7 Application Server - Configured for Port 6789
 * This server is based on the configuration that works on your system
 */

// Core Node.js modules only
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration - using the port we know works
const PORT = 6789;
// Look for files in the current directory first, then try go7/public if exists
const PUBLIC_DIR = fs.existsSync(path.join(__dirname, 'go7', 'public')) 
  ? path.join(__dirname, 'go7', 'public') 
  : (fs.existsSync(path.join(__dirname, 'go7')) 
    ? path.join(__dirname, 'go7') 
    : __dirname);

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
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.webp': 'image/webp'
};

console.log(`
=========================================================
   GO7 APPLICATION SERVER - PORT ${PORT}
=========================================================

Starting server for Go7 application...
Public directory: ${PUBLIC_DIR}
`);

// Verify public directory exists
try {
  fs.accessSync(PUBLIC_DIR, fs.constants.R_OK);
  console.log('✓ Public directory exists and is readable');
} catch (error) {
  console.error(`ERROR: Public directory not found or not readable: ${PUBLIC_DIR}`);
  console.error('Please make sure the public directory exists in your Go7 folder.');
  process.exit(1);
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Log the request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Parse URL
  const parsedUrl = url.parse(req.url);
  
  // Determine the file path for the request
  let filePath = path.join(PUBLIC_DIR, parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);
  
  // Determine content type based on file extension
  const extname = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // If the file doesn't exist:
      
      // 1. If it's a directory, try index.html in that directory
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        return fs.access(filePath, fs.constants.F_OK, (dirErr) => {
          if (dirErr) {
            // If no index.html in directory, try SPA handling
            handleSPA(res);
          } else {
            // Serve the index.html in the directory
            serveFile(filePath, 'text/html', res);
          }
        });
      }
      
      // 2. Check if it's an API request (for future expansion)
      if (parsedUrl.pathname.startsWith('/api/')) {
        return handleAPI(req, res);
      }
      
      // 3. For SPA routes (no file extension), serve index.html
      if (extname === '') {
        return handleSPA(res);
      }
      
      // 4. Otherwise return 404
      console.log(`File not found: ${filePath}`);
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>404 - Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
            .error { color: #e74c3c; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">404 - Not Found</h1>
            <p>The requested resource was not found on this server.</p>
            <p>Path: ${parsedUrl.pathname}</p>
            <p><a href="/">Go to Homepage</a></p>
          </div>
        </body>
        </html>
      `);
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
      // Handle file reading errors
      console.error(`Error reading file: ${filePath}`, err);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>500 - Server Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
            .error { color: #e74c3c; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">500 - Server Error</h1>
            <p>The server encountered an error while processing your request.</p>
            <p><a href="/">Go to Homepage</a></p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // Serve the file
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    console.log(`Successfully served: ${filePath}`);
  });
}

// Handle SPA routes by serving index.html
function handleSPA(res) {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  
  fs.readFile(indexPath, (err, content) => {
    if (err) {
      console.error('Error reading index.html for SPA route:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error - Could not serve SPA');
      return;
    }
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
    console.log('Served SPA route with index.html');
  });
}

// Handle API requests (placeholder for future expansion)
function handleAPI(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'API endpoint - Placeholder for future implementation',
    endpoint: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  }));
  console.log(`Handled API request: ${req.method} ${req.url}`);
}

// Start the server
server.listen(PORT, () => {
  console.log(`
=========================================================
   GO7 APPLICATION SERVER RUNNING SUCCESSFULLY!
=========================================================

Server is available at: http://localhost:${PORT}

* Serving Go7 application from: ${PUBLIC_DIR}
* SPA mode enabled (all routes will work)
* API endpoints available at /api/* (placeholder)

Press Ctrl+C to stop the server...
`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`
ERROR: Port ${PORT} is already in use!
Another application is already using this port.
Please close that application or change the PORT value in this script.
`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});