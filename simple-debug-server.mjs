import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 8888;

console.log('Starting GO7 simple server on port', PORT);
console.log('Current directory:', __dirname);

const server = createServer(async (req, res) => {
  console.log(`Request received: ${req.url}`);
  
  // Handle different routes
  let filePath;
  if (req.url === '/' || req.url === '/index.html') {
    filePath = join(__dirname, 'index.html');
    console.log('Serving main index.html from:', filePath);
  } else if (req.url.startsWith('/public/')) {
    // Remove /public/ from the beginning
    const relativePath = req.url.substring(8);
    filePath = join(__dirname, 'public', relativePath);
    console.log('Serving public file:', filePath);
  } else if (req.url.startsWith('/src/')) {
    // Serving source files
    filePath = join(__dirname, req.url);
    console.log('Serving source file:', filePath);
  } else {
    // Try to serve from current directory first
    filePath = join(__dirname, req.url);
    console.log('Serving other file:', filePath);
  }
  
  try {
    const data = await readFile(filePath);
    
    // Set content type based on file extension
    const ext = filePath.split('.').pop().toLowerCase();
    let contentType = 'text/plain';
    
    switch (ext) {
      case 'html': contentType = 'text/html'; break;
      case 'css': contentType = 'text/css'; break;
      case 'js': contentType = 'text/javascript'; break;
      case 'json': contentType = 'application/json'; break;
      case 'png': contentType = 'image/png'; break;
      case 'jpg': case 'jpeg': contentType = 'image/jpeg'; break;
      case 'gif': contentType = 'image/gif'; break;
      case 'svg': contentType = 'image/svg+xml'; break;
    }
    
    res.writeHead(200, {'Content-Type': contentType});
    res.end(data);
    console.log(`Successfully served ${filePath} as ${contentType}`);
  } catch (err) {
    console.error(`Error serving ${filePath}:`, err.message);
    
    // For a missing index.html, provide a detailed error message
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(404, {'Content-Type': 'text/html'});
      res.end(`
        <html>
          <head><title>GO7 - Error</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6;">
            <h1 style="color: #E53935;">Index.html Not Found</h1>
            <p>The server could not find the index.html file at: <code>${filePath}</code></p>
            <p>Current directory: <code>${__dirname}</code></p>
            <p>Available files you can try:</p>
            <ul>
              <li><a href="/public/diagnostic.html">/public/diagnostic.html</a></li>
              <li><a href="/public/basic-test.html">/public/basic-test.html</a></li>
              <li><a href="/public/minimal-test.html">/public/minimal-test.html</a></li>
            </ul>
          </body>
        </html>
      `);
    } else {
      res.writeHead(404);
      res.end(`File not found: ${req.url}`);
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});