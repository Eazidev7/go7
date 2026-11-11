/**
 * Enhanced HTTP Server for Go7 (ES Module version)
 * This script provides a reliable way to serve the Go7 app
 * without requiring npm or other build tools
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PORT = 8000;
console.log('🚀 GO7 Enhanced Server Starting...');

// Get current directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('📁 Working directory:', __dirname);

// Verify we're in the right directory
if (!fs.existsSync(path.join(__dirname, 'index.html'))) {
  console.log('⚠️ WARNING: index.html not found in current directory!');
  console.log('Make sure you run this from the go7 project root.');
}

// MIME types for different file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.jsx': 'text/javascript',
  '.mjs': 'text/javascript',
  '.ts': 'text/javascript',
  '.tsx': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.eot': 'application/vnd.ms-fontobject',
};

// Serve files and handle routing
const server = http.createServer((req, res) => {
  console.log(`📥 Request: ${req.method} ${req.url}`);

  // Parse URL and remove query parameters
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let url = parsedUrl.pathname;

  // Normalize URL to prevent directory traversal
  if (url.includes('..')) {
    res.writeHead(403);
    res.end('Forbidden: Path cannot contain ".."');
    return;
  }

  // Default to index.html for root requests
  if (url === '/') url = '/index.html';

  // Determine file path
  let filePath = path.join(__dirname, url);

  // Handle special case for /scripts/ folder (check public directory)
  if (url.startsWith('/scripts/')) {
    const publicPath = path.join(__dirname, 'public', url);
    if (fs.existsSync(publicPath)) {
      filePath = publicPath;
    }
  }

  // Get file extension for content type
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Read and serve the file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        console.log(`⚠️ File not found: ${filePath}`);

        // For API or data requests that fail, return 404
        if (url.includes('/api/') || url.includes('.json')) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }

        // For all other requests, serve index.html (SPA routing)
        fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
          if (err) {
            console.error('❌ Critical error: index.html not found!', err);
            res.writeHead(500);
            res.end('Server Error: index.html not found');
          } else {
            console.log('🔄 Serving index.html for SPA routing');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          }
        });
        return;
      }

      // Handle other file reading errors
      console.error(`❌ Error reading file: ${filePath}`, err);
      res.writeHead(500);
      res.end(`Server Error: ${err.code}`);
      return;
    }

    // Success! Serve the file
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content, 'utf-8');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`
  🚀 GO7 SERVER RUNNING!
  
  Open in browser:  http://localhost:${PORT}/
  
  Press Ctrl+C to stop the server
  `);
});