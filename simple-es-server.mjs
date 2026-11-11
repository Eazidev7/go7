// ES module compatible server
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 8090;

const server = createServer(async (req, res) => {
  console.log(`Request received: ${req.url}`);
  
  let filePath;
  
  // Serve test-page.html for root path
  if (req.url === '/' || req.url === '/index.html') {
    filePath = join(__dirname, 'test-page.html');
  } else {
    // Try to serve requested file
    filePath = join(__dirname, req.url);
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
    }
    
    res.writeHead(200, {'Content-Type': contentType});
    res.end(data);
  } catch (err) {
    console.error(`Error serving ${filePath}:`, err);
    res.writeHead(404);
    res.end(`File not found: ${req.url}`);
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Serving files from: ${__dirname}`);
  console.log(`Try opening: http://localhost:${PORT}/test-page.html`);
});