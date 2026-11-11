const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// CRITICAL FIX: Configure correct MIME types for module scripts
app.use(express.static(__dirname, {
  setHeaders: function(res, filePath) {
    // This fixes the "Failed to load module script" error
    // by setting the correct MIME type for JSX and other JavaScript files
    if (filePath.endsWith('.jsx') || filePath.endsWith('.tsx') || 
        filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript');
      console.log(`🔧 Setting correct MIME type for: ${path.basename(filePath)}`);
    }
  }
}));

// Log requests for debugging
app.use((req, res, next) => {
  console.log(`📄 Request: ${req.method} ${req.url}`);
  next();
});

// Main app route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Support for client-side routing
app.use((req, res, next) => {
  if (req.path.includes('.')) {
    return next(); // Let static middleware handle files with extensions
  }
  // Serve index.html for all routes without file extensions
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ Server is running with MIME type fix!');
  console.log(`🌐 Open: http://localhost:${PORT}`);
  console.log('🔧 MIME types correctly configured for JSX/JS modules');
  console.log('📱 Mobile access enabled\n');
});