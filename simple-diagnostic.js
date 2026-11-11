// Simple script to create an index.html file with diagnostic information
// This doesn't use modules or require

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('Starting Go7 diagnostic server...');

// Create a server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  
  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Go7 Diagnostics</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { color: #E53935; }
      .section { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
      pre { background: #f5f5f5; padding: 10px; overflow: auto; max-height: 300px; }
      .error { color: red; }
      .success { color: green; }
    </style>
  </head>
  <body>
    <h1>Go7 Application Diagnostics</h1>
    
    <div class="section">
      <h2>Current Working Directory</h2>
      <pre>${process.cwd()}</pre>
    </div>
    
    <div class="section">
      <h2>Environment</h2>
      <pre>Node.js: ${process.version}
Platform: ${process.platform}
Architecture: ${process.arch}</pre>
    </div>
    
    <div class="section">
      <h2>Files in current directory</h2>
      <pre>${listCurrentDir()}</pre>
    </div>
    
    <div class="section">
      <h2>Files in src directory</h2>
      <pre>${listDirectory('./src')}</pre>
    </div>
    
    <div class="section">
      <h2>Package.json</h2>
      <pre>${safeReadFile('./package.json')}</pre>
    </div>
    
    <div class="section">
      <h2>Test Links</h2>
      <ul>
        <li><a href="/" target="_blank">Root (this page)</a></li>
        <li><a href="/index.html" target="_blank">index.html</a></li>
        <li><a href="/src/main.jsx" target="_blank">main.jsx</a></li>
      </ul>
    </div>
    
  </body>
  </html>
  `;
  
  res.end(html);
});

// Start server on port 8888
const PORT = 8888;
server.listen(PORT, () => {
  console.log(`Diagnostic server running at http://localhost:${PORT}`);
});

// Helper functions
function listCurrentDir() {
  try {
    const files = fs.readdirSync('.');
    return files.map(file => {
      const stats = fs.statSync(file);
      return `${stats.isDirectory() ? '📁' : '📄'} ${file}`;
    }).join('\\n');
  } catch (err) {
    return `Error listing directory: ${err.message}`;
  }
}

function listDirectory(dir) {
  try {
    if (!fs.existsSync(dir)) return `Directory not found: ${dir}`;
    const files = fs.readdirSync(dir);
    return files.map(file => {
      try {
        const stats = fs.statSync(path.join(dir, file));
        return `${stats.isDirectory() ? '📁' : '📄'} ${file}`;
      } catch (err) {
        return `Error with file ${file}: ${err.message}`;
      }
    }).join('\\n');
  } catch (err) {
    return `Error listing directory: ${err.message}`;
  }
}

function safeReadFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return `File not found: ${filePath}`;
    const content = fs.readFileSync(filePath, 'utf8');
    return content.length > 500 ? content.substring(0, 500) + '...(truncated)' : content;
  } catch (err) {
    return `Error reading file: ${err.message}`;
  }
}