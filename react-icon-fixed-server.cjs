const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Log middleware for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Set CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Special middleware for React files
app.use((req, res, next) => {
  // Force React to be included in index.html response
  if (req.url === '/' || req.url === '/index.html' || !path.extname(req.url)) {
    const indexPath = path.join(__dirname, 'index-fixed.html');
    
    // Check if the fixed index exists, otherwise fall back to original
    if (fs.existsSync(indexPath)) {
      console.log('[REACT FIX] Using fixed index.html with React CDN');
      res.sendFile(indexPath);
      return;
    }
  }
  next();
});

// Special middleware for JavaScript files
app.use((req, res, next) => {
  const ext = path.extname(req.url);
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.tsx') {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    console.log(`[MIME] Set JavaScript type for: ${req.url}`);
  }
  next();
});

// Icon handling middleware
app.use((req, res, next) => {
  if (req.url.includes('icon') && (req.url.endsWith('.png') || req.url.endsWith('.jpg'))) {
    const iconPath = path.join(__dirname, req.url);
    
    fs.access(iconPath, fs.constants.F_OK, (err) => {
      if (err) {
        // Icon not found, use a default logo instead
        const logoPath = path.join(__dirname, 'go7-logo.png');
        fs.access(logoPath, fs.constants.F_OK, (logoErr) => {
          if (!logoErr) {
            console.log(`[ICON FIX] Using logo as fallback for: ${req.url}`);
            res.setHeader('Content-Type', 'image/png');
            res.sendFile(logoPath);
          } else {
            next();
          }
        });
      } else {
        // Make sure the content type is set correctly
        res.setHeader('Content-Type', req.url.endsWith('.png') ? 'image/png' : 'image/jpeg');
        next();
      }
    });
  } else {
    next();
  }
});

// Special handler for manifest.json
app.get('/manifest.json', (req, res) => {
  const manifestPath = path.join(__dirname, 'manifest.json');
  fs.readFile(manifestPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).send('Manifest not found');
    }
    
    try {
      const manifest = JSON.parse(data);
      
      // Ensure icon paths are correct
      if (manifest.icons && Array.isArray(manifest.icons)) {
        manifest.icons = manifest.icons.map(icon => {
          // Make sure icon paths start with /
          if (icon.src && !icon.src.startsWith('http') && !icon.src.startsWith('/')) {
            icon.src = '/' + icon.src;
          }
          return icon;
        });
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(manifest));
    } catch (jsonErr) {
      res.status(500).send('Error parsing manifest');
    }
  });
});

// Serve static files
app.use(express.static(__dirname, {
  setHeaders: function(res, filePath) {
    // Set proper MIME types
    if (filePath.endsWith('.jsx') || filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

// Fallback for client-side routing (SPA)
app.get('*', (req, res) => {
  // Don't apply SPA routing to files with extensions
  if (path.extname(req.path)) {
    return res.status(404).send('Not found');
  }
  
  // For all other routes, serve the fixed index.html for client-side routing
  const indexPath = path.join(__dirname, 'index-fixed.html');
  
  // Check if the fixed index exists, otherwise fall back to original
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
=========================================================
   REACT + ICON FIXED SERVER
=========================================================
   Server running at: http://localhost:${PORT}
   
   FIXES APPLIED:
   - React loading via CDN in index-fixed.html
   - Icon fallback using go7-logo.png
   - Proper MIME types for all JavaScript files
   - Manifest.json path correction
=========================================================
`);
});