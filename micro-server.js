// A super minimal server with no dependencies
const http = require('http');
const net = require('net');

// Function to check if a port is in use
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close();
        resolve(true);
      })
      .listen(port);
  });
}

// Try to find an available port
async function findAvailablePort(startPort) {
  let port = startPort;
  const maxPort = startPort + 10; // Try 10 ports
  
  while (port < maxPort) {
    const isAvailable = await isPortAvailable(port);
    if (isAvailable) {
      return port;
    }
    port++;
  }
  
  return null; // No port available
}

// Create a simple server
const server = http.createServer((req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Server Connection Test</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .success-box {
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .info-box {
          background-color: #e2f0fd;
          border: 1px solid #b8daff;
          color: #004085;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        h1 {
          color: #2c3e50;
        }
        h2 {
          color: #3498db;
        }
        pre {
          background-color: #f8f9fa;
          border: 1px solid #eaecef;
          padding: 10px;
          border-radius: 3px;
          overflow-x: auto;
        }
        .code {
          font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          background-color: #f8f9fa;
          padding: 2px 4px;
          border-radius: 3px;
        }
      </style>
    </head>
    <body>
      <h1>Connection Test Successful! ✅</h1>
      
      <div class="success-box">
        <strong>Your server is running correctly and your browser can connect to it.</strong>
        <p>This means your network configuration and Node.js installation are working properly.</p>
      </div>
      
      <h2>Request Details</h2>
      <ul>
        <li><strong>URL:</strong> ${req.url}</li>
        <li><strong>Method:</strong> ${req.method}</li>
        <li><strong>Time:</strong> ${new Date().toLocaleTimeString()}</li>
      </ul>
      
      <div class="info-box">
        <h3>Next Steps</h3>
        <p>Since this minimal server is working, your connection is fine. If your main application server isn't working, the problem is likely with:</p>
        <ol>
          <li>Express or other dependencies</li>
          <li>Port conflicts</li>
          <li>Syntax errors in your server code</li>
        </ol>
        <p>Try running your application with:</p>
        <pre>node --trace-warnings server.js</pre>
        <p>This will show more detailed error messages that can help identify the issue.</p>
      </div>
      
      <h2>Troubleshooting Tips</h2>
      <ol>
        <li>Check if another process is using the port your main server needs</li>
        <li>Make sure all required npm packages are installed</li>
        <li>Look for syntax errors in your server code</li>
        <li>Try using a different port for your main application</li>
      </ol>
    </body>
    </html>
  `;
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
});

// Start the server on an available port
(async () => {
  // Try these ports in order
  const portOptions = [3000, 5000, 8080, 3001, 8000, 8888, 4000];
  
  let port = null;
  
  // Try each port option
  for (const testPort of portOptions) {
    const available = await isPortAvailable(testPort);
    if (available) {
      port = testPort;
      break;
    }
    console.log(`Port ${testPort} is in use, trying next option...`);
  }
  
  // If no pre-defined port works, find any available port
  if (!port) {
    port = await findAvailablePort(9000);
  }
  
  if (!port) {
    console.error('ERROR: Could not find any available port. Check your network configuration.');
    process.exit(1);
  }
  
  // Start the server on the available port
  server.listen(port, () => {
    console.log(`
=====================================================
   MICRO SERVER - PORT ${port}
=====================================================
   Server is running at: http://localhost:${port}
   
   If you can access this page in your browser,
   your connection is working properly!
=====================================================
`);

    // Open the browser automatically (Windows only)
    const startCommand = process.platform === 'win32' ? 
      `start http://localhost:${port}` : 
      `open http://localhost:${port}`;
    
    require('child_process').exec(startCommand);
  });
})();