console.log('🚀 Starting GO7 Server...');
console.log('📁 Working directory:', process.cwd());

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
  console.log(`📥 ${req.method} ${req.url}`);
  
  if (req.url === '/' || req.url === '/index.html') {
    const indexPath = path.join(__dirname, 'index.html');
    
    fs.readFile(indexPath, 'utf8', (err, data) => {
      if (err) {
        console.error('❌ Error reading index.html:', err.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading page: ' + err.message);
        return;
      }
      
      console.log('✅ Serving index.html');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>GO7 Server Test</title></head>
        <body>
          <h1>🎉 GO7 Server is Working!</h1>
          <p>✅ Node.js: ${process.version}</p>
          <p>✅ Server running on port ${PORT}</p>
          <p>✅ Time: ${new Date().toLocaleString()}</p>
          <p><a href="/">Go to Home Page</a></p>
        </body>
      </html>
    `);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Page not found');
  }
});

server.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Server failed to start:', err.message);
    process.exit(1);
  }
  
  console.log('');
  console.log('🎉 SUCCESS! GO7 Server is running!');
  console.log('🌐 Open your browser and go to:');
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://localhost:${PORT}/test`);
  console.log('');
  console.log('⏹️  Press Ctrl+C to stop the server');
  console.log('');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.log(`💡 Port ${PORT} is busy. Trying port ${PORT + 1}...`);
    server.listen(PORT + 1);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('⏹️  Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});
