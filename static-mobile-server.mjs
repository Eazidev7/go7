// Simple static file server with network access (ES modules version)
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { networkInterfaces } from 'os';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();
const PORT = 8000;

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')));

// Special route for diagnostics
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'diagnostics.html'));
});

// Special route for mobile test
app.get('/mobile', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'minimal-test.html'));
});

// Get local IP address for easy mobile access
function getLocalIpAddress() {
  const interfaces = networkInterfaces();
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

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│   🚀 Go7 Mobile Static Server Started!                                 │
│                                                                        │
│   Access your app on any device on the same network:                   │
│                                                                        │
│   📱 Mobile URLs:                                                      │
│      http://${localIp}:${PORT}           (Diagnostics)          │
│      http://${localIp}:${PORT}/mobile    (Mobile Test App)      │
│                                                                        │
│   This server serves static files from the public directory.          │
│   Use this for basic mobile testing and diagnostics.                  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
`);
});