const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Enable detailed logging
const verboseLogging = true;

// Log middleware for debugging
app.use((req, res, next) => {
  if (verboseLogging) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Set CORS headers for debugging
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Special pre-check middleware for JavaScript files to ensure correct MIME types
app.use((req, res, next) => {
  const ext = path.extname(req.url);
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.tsx') {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    console.log(`[PRE-CHECK] Set MIME type for JavaScript: ${req.url}`);
  } else if (ext === '.json' || req.url.endsWith('manifest.json')) {
    res.setHeader('Content-Type', 'application/json');
    console.log(`[PRE-CHECK] Set MIME type for JSON: ${req.url}`);
  }
  next();
});

// Configure static file serving with proper MIME types
app.use(express.static(__dirname, {
  setHeaders: function(res, filePath) {
    // Log all file requests for debugging
    if (verboseLogging) {
      console.log(`[SERVING FILE] ${path.basename(filePath)}`);
    }

    // Fix JSX and JS MIME types - FIXED FOR MODULE COMPATIBILITY
    if (filePath.endsWith('.jsx') || filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.tsx')) {
      // Always use application/javascript for all JavaScript and JSX files
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      console.log(`[MIME] Set type 'application/javascript' for: ${path.basename(filePath)}`);
    }
    
    // Set proper MIME types for other files
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
    if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
    // Add explicit handling for manifest.json with more specific MIME type
    if (filePath.endsWith('manifest.json')) {
      res.setHeader('Content-Type', 'application/json');
      console.log(`[MIME] Set type 'application/json' for manifest.json`);
    }
    // Add proper image handling
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
      console.log(`[IMAGE] Set type 'image/png' for: ${path.basename(filePath)}`);
    }
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
    if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
    if (filePath.endsWith('.ico')) {
      res.setHeader('Content-Type', 'image/x-icon');
    }
  }
}));

// Icon fallback handler - serve a default icon if requested icon is not found
app.use((req, res, next) => {
  if (req.url.includes('icon') && (req.url.endsWith('.png') || req.url.endsWith('.jpg'))) {
    const iconPath = path.join(__dirname, req.url);
    fs.access(iconPath, fs.constants.F_OK, (err) => {
      if (err) {
        // Icon not found, check if fallback exists
        const fallbackIcon = path.join(__dirname, 'fallback-icon.png');
        fs.access(fallbackIcon, fs.constants.F_OK, (fallbackErr) => {
          if (!fallbackErr) {
            console.log(`[ICON] Using fallback for missing icon: ${req.url}`);
            res.setHeader('Content-Type', 'image/png');
            res.sendFile(fallbackIcon);
          } else {
            // No fallback available, continue to next middleware
            next();
          }
        });
      } else {
        // Icon exists, continue to next middleware
        next();
      }
    });
  } else {
    // Not an icon request, continue to next middleware
    next();
  }
});

// Special handler for manifest.json to ensure it works properly for PWA
app.get('/manifest.json', (req, res) => {
  const manifestPath = path.join(__dirname, 'manifest.json');
  fs.readFile(manifestPath, 'utf8', (err, data) => {
    if (err) {
      console.log(`[ERROR] Failed to read manifest.json: ${err.message}`);
      return res.status(404).send('Manifest not found');
    }
    
    try {
      const manifest = JSON.parse(data);
      console.log(`[MANIFEST] Serving manifest with ${manifest.icons ? manifest.icons.length : 0} icons`);
      
      // Ensure icon paths are correct
      if (manifest.icons && Array.isArray(manifest.icons)) {
        manifest.icons = manifest.icons.map(icon => {
          // Make sure icon paths are properly prefixed
          if (icon.src && !icon.src.startsWith('http') && !icon.src.startsWith('/')) {
            icon.src = '/' + icon.src;
            console.log(`[MANIFEST] Fixed icon path: ${icon.src}`);
          }
          return icon;
        });
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(manifest));
    } catch (jsonErr) {
      console.log(`[ERROR] Failed to parse manifest.json: ${jsonErr.message}`);
      res.status(500).send('Error parsing manifest');
    }
  });
});

// Fallback for client-side routing
app.get('*', (req, res) => {
  // Exclude certain file types from SPA fallback
  const fileExt = path.extname(req.path);
  if (fileExt && !['.html', ''].includes(fileExt)) {
    console.log(`[404] Resource not found: ${req.path}`);
    return res.status(404).send('Not found');
  }
  
  // For all other routes, serve index.html for client-side routing
  console.log(`[ROUTE] Client-side route: ${req.path} -> serving index.html`);
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Diagnostic endpoint
app.get('/server-info', (req, res) => {
  res.json({
    version: '1.0.0',
    mimeTypes: true,
    features: ['es6Modules', 'jsx', 'spa', 'pwa'],
    status: 'healthy'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`
=========================================================
   ENHANCED DEBUG SERVER
=========================================================
   Server running at: http://localhost:${PORT}
   
   Key features:
   - Module scripts properly served with application/javascript MIME type
   - Icon fallbacks enabled
   - PWA manifest handling with path correction
   - Client-side routing support
=========================================================
`);
});