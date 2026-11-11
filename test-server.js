const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4000;

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Serve a simple test page
  if (req.url === '/' || req.url === '/index.html') {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GO7 Test Server</title>
  <style>
    body {
      margin: 0;
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      background: rgba(255,255,255,0.1);
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    }
    .status {
      background: rgba(255,255,255,0.2);
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
    }
    button {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      margin: 10px;
    }
    button:hover {
      background: #45a049;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚚 GO7 Delivery - Test Server</h1>
    <p>Server is running successfully!</p>
    
    <div class="status">
      <h3>✅ Connection Status: WORKING</h3>
      <p>Port: ${PORT}</p>
      <p>Time: ${new Date().toLocaleString()}</p>
      <p>Server: Node.js HTTP</p>
    </div>
    
    <button onclick="testReact()">Test React Loading</button>
    <button onclick="window.location.reload()">Refresh</button>
    
    <div id="react-test" style="margin-top: 20px;"></div>
  </div>
  
  <script>
    console.log('✅ JavaScript is working');
    
    function testReact() {
      const div = document.getElementById('react-test');
      div.innerHTML = '<p style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 5px;">🧪 JavaScript execution: SUCCESS<br>Ready for React testing!</p>';
    }
    
    // Auto-test after 1 second
    setTimeout(() => {
      console.log('✅ Page loaded successfully');
    }, 1000);
  </script>
</body>
</html>`;
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }
  
  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 GO7 Test Server Started
📍 URL: http://localhost:${PORT}/
🌐 Network: http://0.0.0.0:${PORT}/
⏰ Time: ${new Date().toLocaleString()}
  `);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});