// Emergency static server with no dependencies
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3030;

// Simple MIME type detection
const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };
  return types[ext] || 'application/octet-stream';
};

// Create the server
const server = http.createServer((req, res) => {
  console.log(`📝 ${new Date().toISOString()} - Request: ${req.method} ${req.url}`);
  
  // Handle the favicon separately
  if (req.url === '/favicon.ico') {
    const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
    fs.readFile(faviconPath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Favicon not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'image/x-icon' });
      res.end(content);
    });
    return;
  }
  
  // Parse the URL to get the filepath
  let filePath = req.url;
  
  // Default to simple-test.html for root
  if (filePath === '/') {
    filePath = '/simple-test.html';
  }
  
  // Add the public directory to the path
  filePath = path.join(__dirname, 'public', filePath);
  
  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File not found, serve simple-test.html instead
      console.log(`🚫 File not found: ${filePath}, serving simple-test.html instead`);
      filePath = path.join(__dirname, 'public', 'simple-test.html');
    }
    
    // Read and serve the file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
        return;
      }
      
      const contentType = getMimeType(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    });
  });
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`✅ Try accessing http://localhost:${PORT}/simple-test.html`);
  
  // Show local IP for mobile access
  const networkInterfaces = require('os').networkInterfaces();
  Object.keys(networkInterfaces).forEach((iface) => {
    networkInterfaces[iface].forEach((details) => {
      if (details.family === 'IPv4' && !details.internal) {
        console.log(`✅ Network access: http://${details.address}:${PORT}/simple-test.html`);
      }
    });
  });
});