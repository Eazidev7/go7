const http = require('http');
const fs = require('fs');
const path = require('path');

// Super minimalist server with no dependencies
const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  
  if (req.url === '/') {
    // Serve a basic HTML page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Go7 Minimalist Server</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #333; }
            .success { color: green; }
          </style>
        </head>
        <body>
          <h1>Go7 Minimalist Server</h1>
          <p class="success">✓ Server is running correctly!</p>
          <p>If you can see this page, your server and network are working.</p>
          <p>Server time: ${new Date().toLocaleString()}</p>
          <h2>Next steps:</h2>
          <ol>
            <li>Try accessing <a href="/test">this test page</a> to verify routing</li>
            <li>Try accessing <a href="/test.json">this JSON endpoint</a> to verify content types</li>
            <li>Now try running your actual server</li>
          </ol>
        </body>
      </html>
    `);
    return;
  }
  
  if (req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Go7 Test Page</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #333; }
            .success { color: green; }
          </style>
        </head>
        <body>
          <h1>Go7 Test Page</h1>
          <p class="success">✓ Routing is working correctly!</p>
          <p>Server time: ${new Date().toLocaleString()}</p>
          <p><a href="/">Back to home</a></p>
        </body>
      </html>
    `);
    return;
  }
  
  if (req.url === '/test.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'JSON endpoint is working correctly',
      time: new Date().toISOString(),
      server: 'Go7 Minimalist Server'
    }));
    return;
  }
  
  // Try to serve a file from the file system
  const filePath = path.join(__dirname, req.url);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // File not found
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${req.url}`);
      return;
    }
    
    // Determine content type
    let contentType = 'text/plain';
    const ext = path.extname(filePath);
    if (ext === '.html') contentType = 'text/html';
    if (ext === '.js') contentType = 'application/javascript';
    if (ext === '.css') contentType = 'text/css';
    if (ext === '.json') contentType = 'application/json';
    if (ext === '.png') contentType = 'image/png';
    
    // Serve the file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`Server Error: ${err.message}`);
        return;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

// Try different ports
const ports = [3000, 8080, 5000, 3001, 8081];
let currentPortIndex = 0;

function tryStartServer() {
  if (currentPortIndex >= ports.length) {
    console.log('Failed to start server on any port');
    process.exit(1);
  }
  
  const port = ports[currentPortIndex];
  
  server.listen(port, () => {
    console.log(`
=================================================================
  ULTRA MINIMAL SERVER - RUNNING ON PORT ${port}
=================================================================
  
  Server is WORKING! Open one of these URLs in your browser:
  
  → http://localhost:${port}
  → http://127.0.0.1:${port}
  
=================================================================
`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is already in use, trying port ${ports[++currentPortIndex]}...`);
      tryStartServer();
    } else {
      console.log(`Error starting server: ${err.message}`);
    }
  });
}

tryStartServer();