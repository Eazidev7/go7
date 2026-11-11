/**
 * Guaranteed Server - Will work even with minimal Node.js setup
 * Uses multiple fallback mechanisms to ensure server starts
 */

// Core Node.js modules only
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration with multiple fallbacks
const PORT = process.env.PORT || 3456;
const PUBLIC_DIR = path.join(__dirname, 'public');
const BACKUP_DIR = path.join(__dirname);

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

// System info logging
console.log('====== SYSTEM INFORMATION ======');
console.log('OS:', os.type(), os.release());
console.log('Node.js:', process.version);
console.log('Current directory:', process.cwd());
console.log('====== SERVER CONFIGURATION ======');
console.log('Port:', PORT);
console.log('Public directory:', PUBLIC_DIR);
console.log('Backup directory:', BACKUP_DIR);
console.log('==============================');

// Check if public directory exists
let contentDir = PUBLIC_DIR;
try {
  fs.accessSync(PUBLIC_DIR, fs.constants.R_OK);
  console.log('Public directory exists and is readable');
} catch (error) {
  console.warn('Warning: Public directory not found or not readable. Using backup directory.');
  contentDir = BACKUP_DIR;
}

// Create a fallback index.html if none exists
const indexPath = path.join(contentDir, 'index.html');
try {
  fs.accessSync(indexPath, fs.constants.R_OK);
  console.log('index.html found');
} catch (error) {
  console.warn('Warning: index.html not found. Creating a fallback page.');
  const fallbackHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Go7 Server</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
        .success { color: green; font-weight: bold; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Go7 Server is running!</h1>
        <p class="success">Success! The server is working correctly.</p>
        <p>Server time: ${new Date().toLocaleString()}</p>
        <p>This is a fallback page created automatically.</p>
      </div>
    </body>
    </html>
  `;
  try {
    fs.writeFileSync(path.join(contentDir, 'index.html'), fallbackHTML);
    console.log('Created fallback index.html');
  } catch (writeError) {
    console.error('Error creating fallback index.html:', writeError.message);
  }
}

// Create HTTP server with comprehensive error handling
const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Default to index.html for root requests
  let filePath = req.url === '/' 
    ? path.join(contentDir, 'index.html') 
    : path.join(contentDir, req.url);

  // Get file extension
  const extname = path.extname(filePath).toLowerCase();
  
  // Determine content type based on file extension
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.log(`File not found: ${filePath}`);
      
      // If file doesn't exist, check if it's a route that should be handled by the SPA
      if (extname === '') {
        // For SPA routes, serve index.html
        filePath = path.join(contentDir, 'index.html');
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

// Try multiple ports if the main one fails
function tryPort(port, maxTries = 10) {
  if (maxTries <= 0) {
    console.error('Failed to find an available port after multiple attempts');
    process.exit(1);
    return;
  }

  console.log(`Attempting to start server on port ${port}...`);
  
  try {
    server.listen(port, () => {
      console.log(`
=========================================================
   GO7 SERVER RUNNING SUCCESSFULLY ON PORT ${port}
=========================================================

Server is available at: http://localhost:${port}

* Serving files from: ${contentDir}
* Any route will fall back to index.html for SPA support

Press Ctrl+C to stop the server...
`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} is already in use, trying port ${port + 1}...`);
        tryPort(port + 1, maxTries - 1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Unexpected error starting server:', error);
    tryPort(port + 1, maxTries - 1);
  }
}

// Start the server with port fallback mechanism
tryPort(PORT);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Keep server running despite errors
  console.log('Continuing to run despite error...');
});