const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  
  // Serve index.html for all requests (SPA support)
  const filePath = path.join(__dirname, 'index.html');
  
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      console.error('Error reading index.html:', err);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Error 500</h1>
            <p>Cannot read index.html: ${err.message}</p>
          </body>
        </html>
      `);
      return;
    }
    
    res.writeHead(200, { 
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 GO7 Simple Server Running!
📍 Local:   http://localhost:${PORT}/
📍 Network: http://0.0.0.0:${PORT}/

Press Ctrl+C to stop
`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});