import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple diagnostic server
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html');
  
  let htmlOutput = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Go7 Diagnostics</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { color: #E53935; }
      .section { margin-bottom: 20px; }
      pre { background: #f5f5f5; padding: 10px; overflow: auto; }
      .error { color: red; }
      .success { color: green; }
    </style>
  </head>
  <body>
    <h1>Go7 Application Diagnostics</h1>
    
    <div class="section">
      <h2>Directory Structure</h2>
      <pre>${listDirectoryStructure('.')}</pre>
    </div>
    
    <div class="section">
      <h2>index.html Content</h2>
      <pre>${readFileContent('./index.html')}</pre>
    </div>
    
    <div class="section">
      <h2>main.jsx Content</h2>
      <pre>${readFileContent('./src/main.jsx')}</pre>
    </div>
    
    <div class="section">
      <h2>Vite Config</h2>
      <pre>${readFileContent('./vite.config.js')}</pre>
    </div>
    
    <div class="section">
      <h2>Browser Information</h2>
      <p>User Agent: ${req.headers['user-agent']}</p>
      <p>Request URL: ${req.url}</p>
    </div>
    
    <div class="section">
      <h2>Quick Links</h2>
      <ul>
        <li><a href="http://localhost:5184" target="_blank">Vite Dev Server (Port 5184)</a></li>
        <li><a href="http://localhost:5173" target="_blank">Standard Vite Port (5173)</a></li>
        <li><a href="http://localhost:7777" target="_blank">Previous Node Server (Port 7777)</a></li>
      </ul>
    </div>
  </body>
  </html>
  `;
  
  res.end(htmlOutput);
});

// Helper function to list directory structure
function listDirectoryStructure(dir, depth = 0) {
  try {
    let output = '';
    const fullPath = path.resolve(__dirname, dir);
    const items = fs.readdirSync(fullPath);
    
    for (const item of items) {
      if (item === 'node_modules') continue;
      
      const itemPath = path.join(fullPath, item);
      const stats = fs.statSync(itemPath);
      
      output += '  '.repeat(depth) + (stats.isDirectory() ? '📁 ' : '📄 ') + item + '\n';
      
      if (stats.isDirectory() && depth < 2) {
        output += listDirectoryStructure(path.join(dir, item), depth + 1);
      }
    }
    
    return output;
  } catch (err) {
    return `Error reading directory: ${err.message}`;
  }
}

// Helper function to safely read file content
function readFileContent(filePath) {
  try {
    const fullPath = path.resolve(__dirname, filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    return content.substring(0, 1000) + (content.length > 1000 ? '\n... (truncated)' : '');
  } catch (err) {
    return `Error reading file: ${err.message}`;
  }
}

// Start the server on port 8000
const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Diagnostic server running at http://localhost:${PORT}`);
});