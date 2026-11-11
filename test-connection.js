// Simple test server to verify port accessibility
import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
      <head><title>Go7 Test Server</title></head>
      <body>
        <h1>✅ Go7 Test Server Working!</h1>
        <p>Port 3000 is accessible</p>
        <p>Time: ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
});

server.listen(3000, '0.0.0.0', () => {
  console.log('🚀 Test server running on http://localhost:3000');
  console.log('🌐 Network access: http://0.0.0.0:3000');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.log('Port 3000 is already in use');
  }
});