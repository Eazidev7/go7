#!/usr/bin/env node

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

// Create proxy middleware
const proxy = createProxyMiddleware({
  target: 'http://localhost:5173',
  changeOrigin: true,
  ws: true,
  logLevel: 'silent'
});

// Serve static files from dist directory if it exists
try {
  app.use(express.static(path.join(__dirname, 'dist')));
} catch (error) {
  console.log('No dist directory found, using proxy mode');
}

// Simple static file server
app.use(express.static(__dirname));

// Handle all routes
app.get('*', (req, res) => {
    if (req.path === '/') {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else if (req.path === '/test') {
        res.sendFile(path.join(__dirname, 'test.html'));
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

app.use('/', proxy);

// Error handler for proxy errors
proxy.on('error', function(err, req, res) {
    console.error('Proxy error:', err.message);
    if (res.headersSent) {
      return;
    }
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Go7 Mobile Server</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 40px auto; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          h1 { color: #e53e3e; margin-top: 0; }
          .error { background: #fed7d7; color: #e53e3e; padding: 15px; border-radius: 5px; margin-bottom: 20px; font-weight: bold; }
          .instructions { color: #7f8c8d; line-height: 1.6; }
          .code { background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Go7 Mobile Server</h1>
          <div class="error">Vite dev server not running</div>
          <div class="instructions">
            <p>Please start the Vite development server first:</p>
            <div class="code">npm run dev -- --host 0.0.0.0</div>
            <p>Then refresh this page.</p>
          </div>
        </div>
      </body>
      </html>
    `);
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Go7 Mobile Server running on:`);
  console.log(`   Local:   http://localhost:${PORT}/`);
  console.log(`   Network: http://192.168.18.5:${PORT}/`);
  console.log(`\n📱 Mobile Testing:`);
  console.log(`   1. Connect your mobile to the same WiFi`);
  console.log(`   2. Open: http://192.168.18.5:${PORT}/`);
  console.log(`\n⚡ Make sure Vite dev server is running on port 5173`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});