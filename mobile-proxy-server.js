// Simple Express server for Go7 mobile access
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 5175;

// Get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  let ipAddress = 'localhost';
  
  for (const interfaceName in interfaces) {
    const interfaceInfo = interfaces[interfaceName];
    for (const info of interfaceInfo) {
      if (!info.internal && info.family === 'IPv4') {
        ipAddress = info.address;
        break;
      }
    }
    if (ipAddress !== 'localhost') break;
  }
  
  return ipAddress;
}

// Proxy to main Vite server
app.use('/', createProxyMiddleware({
  target: 'http://localhost:5173',
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    // Add headers to disable cache
    proxyReq.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    proxyReq.setHeader('Pragma', 'no-cache');
    proxyReq.setHeader('Expires', '0');
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.writeHead(500, {
      'Content-Type': 'text/html'
    });
    res.end(`
      <html>
        <head>
          <title>Go7 Mobile - Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              max-width: 600px;
              margin: 0 auto;
              text-align: center;
            }
            .error-icon {
              font-size: 60px;
              margin: 30px 0;
            }
            .btn {
              background: #5c6ac4;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              display: inline-block;
              margin-top: 20px;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="error-icon">❌</div>
          <h1>Connection Error</h1>
          <p>Could not connect to the main development server at http://localhost:5173.</p>
          <p>Make sure it's running before accessing the mobile proxy.</p>
          <p>
            <a href="/" class="btn">Retry Connection</a>
            <a href="/public/diagnostics.html" class="btn">Run Diagnostics</a>
          </p>
        </body>
      </html>
    `);
  }
}));

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│   🚀 Go7 Mobile Access Server Started!                                 │
│                                                                        │
│   Access your app on any device on the same network:                   │
│                                                                        │
│   📱 Mobile URL: http://${localIp}:${PORT}                     │
│                                                                        │
│   This server forwards all requests to the main development server     │
│   running at http://localhost:5173                                     │
│                                                                        │
│   Make sure your main Vite server is running!                          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
`);
});