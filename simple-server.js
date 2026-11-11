const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

console.log('🚀 Starting GO7 Development Server...');
console.log('📁 Serving from:', __dirname);

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  
  // Handle common file extensions
  const ext = path.extname(filePath);
  let contentType = 'text/html';
  
  switch(ext) {
    case '.js': contentType = 'text/javascript'; break;
    case '.css': contentType = 'text/css'; break;
    case '.json': contentType = 'application/json'; break;
    case '.png': contentType = 'image/png'; break;
    case '.jpg': contentType = 'image/jpg'; break;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found - serve index.html for SPA routing
        fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
          if (err) {
            res.writeHead(500);
            res.end('Server Error');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf8');
    }
  });
});

server.listen(PORT, () => {
  console.log('✅ Server running at http://localhost:' + PORT);
  console.log('🏠 Your GO7 Home page is ready!');
  console.log('📝 Open http://localhost:' + PORT + ' in your browser');
  console.log('⏹️  Press Ctrl+C to stop');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
});
