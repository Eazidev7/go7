const express = require('express');
const path = require('path');
const app = express();

// Configure MIME types using middleware
app.use(express.static(__dirname, {
  setHeaders: function(res, path) {
    if (path.endsWith('.jsx') || path.endsWith('.tsx') || 
        path.endsWith('.ts') || path.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Serve direct React for the root route - simpler approach
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'direct-react.html'));
});

// Original index.html for /app route
app.get('/app', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'));
});

// MapTracking demo specific route
app.get('/maptracking', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'maptracking-demo.html'));
});

// Catch-all route
app.use((req, res) => {
  res.sendFile(path.resolve(__dirname, 'direct-react.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📱 Mobile access URL: http://172.20.10.5:${PORT}`);
  console.log('🚀 Go7 testing server active');
});