const http = require('http');
const fs = require('fs');
const path = require('path');

// List of directories to search for files
const possibleDirs = [
  __dirname,
  path.join(__dirname, 'public'),
  path.join(__dirname, 'go7'),
  path.join(__dirname, 'go7', 'public')
];

// Log which directories exist
console.log('Checking directories:');
possibleDirs.forEach(dir => {
  console.log(`- ${dir} (${fs.existsSync(dir) ? 'exists' : 'not found'})`);
  if (fs.existsSync(dir)) {
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
      console.log(`  HTML files: ${files.join(', ') || 'none'}`);
    } catch(e) {
      console.log(`  Error reading directory: ${e.message}`);
    }
  }
});

// Create server
const server = http.createServer((req, res) => {
  console.log(`Request: ${req.url}`);
  let url = req.url === '/' ? '/index.html' : req.url;
  let found = false;
  
  // Try to find the requested file in any of the possible directories
  for (const dir of possibleDirs) {
    const filePath = path.join(dir, url);
    if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
      const ext = path.extname(filePath);
      let contentType = 'text/html';
      
      // Set appropriate content type
      if (ext === '.js') contentType = 'text/javascript';
      else if (ext === '.css') contentType = 'text/css';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.gif') contentType = 'image/gif';
      
      // Serve the file
      fs.readFile(filePath, (err, content) => {
        if (err) {
          console.error(`Error reading ${filePath}:`, err);
          res.writeHead(500);
          res.end('Server Error');
        } else {
          console.log(`Serving ${filePath}`);
          res.writeHead(200, {'Content-Type': contentType});
          res.end(content);
        }
      });
      
      found = true;
      break;
    }
  }
  
  // If file not found, show a directory listing
  if (!found) {
    const htmlFilesList = possibleDirs
      .filter(dir => fs.existsSync(dir))
      .map(dir => {
        try {
          return fs.readdirSync(dir)
            .filter(f => f.endsWith('.html'))
            .map(f => `<li><a href='/${f}'>${f}</a> (in ${path.relative(__dirname, dir) || 'current dir'})</li>`)
            .join('');
        } catch(e) {
          return '';
        }
      })
      .join('');
    
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`
      <html>
      <head>
        <title>Go7 Server</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }
          .container { max-width: 800px; margin: 0 auto; text-align: left; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          h1 { color: #333; }
          ul { margin-top: 20px; }
          li { margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Go7 Server Running</h1>
          <p>Server is working but file not found: ${url}</p>
          <p>${new Date().toLocaleString()}</p>
          
          <h2>Available HTML Files:</h2>
          <ul>
            ${htmlFilesList || '<li>No HTML files found</li>'}
          </ul>
        </div>
      </body>
      </html>
    `);
  }
});

// Start server
const PORT = 7777;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});