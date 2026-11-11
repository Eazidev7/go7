const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Log requests for debugging
app.use((req, res, next) => {
  console.log(`📝 Request: ${req.method} ${req.path}`);
  next();
});

// Set proper MIME types - CRITICAL FIX
app.use(express.static(__dirname, {
  setHeaders: function(res, path) {
    if (path.endsWith('.jsx') || path.endsWith('.tsx') || 
        path.endsWith('.js') || path.endsWith('.ts')) {
      console.log(`🔧 Setting JavaScript MIME type for: ${path}`);
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Root route
app.get('/', (req, res) => {
  console.log('📄 Serving index.html for route: /');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Add fixed React version route
app.get('/fixed', (req, res) => {
  console.log('📄 Serving fixed React version');
  res.sendFile(path.join(__dirname, 'direct-react-nomodule.html'));
});

// React diagnostic tool
app.get('/diagnose', (req, res) => {
  console.log('🔍 Serving diagnostic tool');
  res.sendFile(path.join(__dirname, 'react-diagnostic.html'));
});

// MapTracking demo
app.get('/maptracking', (req, res) => {
  console.log('🗺️ Serving MapTracking demo');
  res.sendFile(path.join(__dirname, 'maptracking-demo.html'));
});

// Catch-all route for client-side routing - IMPORTANT FOR REACT ROUTER
app.use((req, res) => {
  console.log(`♻️ Catch-all serving index.html for: ${req.path}`);
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ =======================================');
  console.log(`✅ Go7 server running on http://localhost:${PORT}`);
  console.log(`📱 Mobile access URL: http://172.20.10.5:${PORT}`);
  console.log('✅ =======================================');
  console.log('🔧 MIME types properly configured');
  console.log('📊 Available Routes:');
  console.log('   - / (Main app)');
  console.log('   - /fixed (Fixed React version)');
  console.log('   - /maptracking (MapTracking demo)');
  console.log('   - /diagnose (React diagnostic tool)');
});