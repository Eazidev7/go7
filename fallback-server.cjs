/**
 * Go7 Fallback Express Server
 * Basic static server for testing when Vite fails
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

class Go7FallbackServer {
  constructor() {
    this.port = parseInt(process.env.GO7_PORT) || 3000;
    this.app = express();
    this.setupServer();
  }

  setupServer() {
    // Enable CORS for development
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Serve static files from dist directory (if exists)
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      console.log('📁 Serving from dist directory');
      this.app.use(express.static(distPath));
    }

    // Serve static files from public directory
    const publicPath = path.join(__dirname, 'public');
    if (fs.existsSync(publicPath)) {
      console.log('📁 Serving from public directory');
      this.app.use(express.static(publicPath));
    }

    // Serve static files from src directory (for development)
    const srcPath = path.join(__dirname, 'src');
    if (fs.existsSync(srcPath)) {
      console.log('📁 Serving from src directory');
      this.app.use('/src', express.static(srcPath));
    }

    // Basic HTML template for React app
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Go7 Delivery App (Fallback Mode)</title>
    <style>
      body {
        margin: 0;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .container {
        text-align: center;
        background: rgba(255,255,255,0.1);
        padding: 40px;
        border-radius: 20px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
      }
      .logo {
        font-size: 4rem;
        margin-bottom: 20px;
      }
      .title {
        font-size: 2.5rem;
        margin-bottom: 10px;
        font-weight: bold;
      }
      .subtitle {
        font-size: 1.2rem;
        margin-bottom: 30px;
        opacity: 0.9;
      }
      .status {
        background: rgba(76, 175, 80, 0.2);
        padding: 15px;
        border-radius: 10px;
        border-left: 4px solid #4CAF50;
        margin-bottom: 20px;
      }
      .info {
        background: rgba(33, 150, 243, 0.2);
        padding: 15px;
        border-radius: 10px;
        border-left: 4px solid #2196F3;
        margin-bottom: 20px;
      }
      .warning {
        background: rgba(255, 152, 0, 0.2);
        padding: 15px;
        border-radius: 10px;
        border-left: 4px solid #FF9800;
        margin-bottom: 20px;
      }
      ul {
        text-align: left;
        margin: 10px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">🚚</div>
      <div class="title">Go7 Delivery App</div>
      <div class="subtitle">Development Server (Fallback Mode)</div>
      
      <div class="status">
        <strong>✅ Server Status: Running</strong><br>
        Port: ${this.port} | Mode: Express Static Server
      </div>
      
      <div class="info">
        <strong>ℹ️ Fallback Mode Active</strong><br>
        Vite development server failed to start. Using basic Express server for testing.
      </div>
      
      <div class="warning">
        <strong>⚠️ Limited Functionality</strong><br>
        <ul>
          <li>Static file serving only</li>
          <li>No hot module replacement</li>
          <li>No React compilation</li>
          <li>Basic CORS enabled</li>
        </ul>
      </div>
      
      <div class="info">
        <strong>🔧 To restore full functionality:</strong><br>
        <ul>
          <li>Run: <code>npm run dev:clean</code></li>
          <li>Check port availability</li>
          <li>Verify Vite configuration</li>
          <li>Check network/firewall settings</li>
        </ul>
      </div>
    </div>

    <script>
      // Basic JavaScript for interactivity
      console.log('🚀 Go7 Fallback Server loaded');
      console.log('📍 Server running on port ${this.port}');
      
      // Check if we can reach the main app
      fetch('/src/App.jsx')
        .then(response => {
          if (response.ok) {
            console.log('✅ React source files accessible');
          }
        })
        .catch(error => {
          console.log('⚠️ React source files not accessible:', error);
        });
    </script>
  </body>
</html>`;

    // Simple routing - avoid complex patterns that cause issues
    this.app.get('/', (req, res) => {
      res.send(htmlTemplate);
    });

    this.app.get('/home', (req, res) => {
      res.send(htmlTemplate);
    });

    this.app.get('/profile', (req, res) => {
      res.send(htmlTemplate);
    });

    this.app.get('/orders', (req, res) => {
      res.send(htmlTemplate);
    });

    // Simple catch-all for React Router
    this.app.use((req, res) => {
      // Check if it's a file request by extension
      const ext = req.url.split('.').pop();
      if (['js', 'css', 'json', 'png', 'jpg', 'svg', 'ico'].includes(ext)) {
        res.status(404).send('File not found');
      } else {
        res.send(htmlTemplate);
      }
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      const server = this.app.listen(this.port, () => {
        console.log(`🎉 Go7 Fallback Server running on http://localhost:${this.port}`);
        console.log('📱 Fallback mode provides basic static serving for testing');
        console.log('🔄 To get full React functionality, fix Vite and restart');
        resolve(server);
      });

      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.port} is already in use`));
        } else {
          reject(error);
        }
      });
    });
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new Go7FallbackServer();
  
  server.start().catch(error => {
    console.error('❌ Failed to start fallback server:', error.message);
    process.exit(1);
  });
}

module.exports = Go7FallbackServer;