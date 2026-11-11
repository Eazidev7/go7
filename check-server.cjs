/**
 * Simple server status checker
 */

const http = require('http');

function checkServer() {
  console.log('🔍 Checking Go7 server status...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'HEAD',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log('✅ Server is running!');
    console.log(`📊 Status: ${res.statusCode}`);
    console.log(`🌐 URL: http://localhost:3000`);
    console.log('🎉 Go7 app is accessible!');
  });

  req.on('error', (error) => {
    console.log('❌ Server not responding:', error.message);
  });

  req.on('timeout', () => {
    console.log('⏱️ Request timeout - server may be slow');
    req.destroy();
  });

  req.end();
}

checkServer();