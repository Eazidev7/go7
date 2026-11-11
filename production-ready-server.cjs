const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Create Express app
const app = express();
const PORT = 3000;

// Get network information for connecting from mobile devices
function getLocalIPv4Address() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    for (const addr of addresses) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return 'localhost'; // Default if no network interface found
}

const localIPv4 = getLocalIPv4Address();

// Set up request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Configure correct MIME types (critical fix)
app.use(express.static(__dirname, {
  setHeaders: function(res, filePath) {
    if (filePath.endsWith('.jsx') || filePath.endsWith('.tsx') || 
        filePath.endsWith('.js') || filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
    if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// Enable JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Application routes
// ===================

// Main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Standard routes
app.get('/fixed', (req, res) => {
  res.sendFile(path.join(__dirname, 'direct-react-nomodule.html'));
});

app.get('/maptracking', (req, res) => {
  res.sendFile(path.join(__dirname, 'maptracking-demo.html'));
});

app.get('/diagnose', (req, res) => {
  res.sendFile(path.join(__dirname, 'react-diagnostic.html'));
});

// API endpoint for testing
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Client-side routing support (SPA fallback)
app.use((req, res, next) => {
  // Skip API routes and static assets
  if (req.path.startsWith('/api/') || 
      req.path.includes('.') || 
      req.path === '/favicon.ico') {
    return next();
  }
  
  // Return index.html for all other routes (SPA routing)
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Server error occurred');
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log('======================================================');
  console.log(`✅ GO7 PRODUCTION SERVER RUNNING`);
  console.log(`🌐 Local:   http://localhost:${PORT}`);
  console.log(`📱 Network: http://${localIPv4}:${PORT}`);
  console.log('======================================================');
  console.log('🔧 All MIME types properly configured');
  console.log('🔒 Security headers enabled');
  console.log('🛣️  Client-side routing support enabled');
});