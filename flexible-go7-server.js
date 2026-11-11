/**
 * Go7 Flexible Application Server - Automatically detects your content location
 * Configured for Port 6789
 */

// Core Node.js modules only
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration - using the port we know works
const PORT = 6789;

// Detect the correct directory structure by checking various possibilities
function findContentDirectory() {
  const possiblePaths = [
    // Check for standard locations
    path.join(__dirname, 'public'),
    path.join(__dirname, 'go7', 'public'),
    path.join(__dirname, 'go7'),
    // Check for index.html in various locations
    ...['', 'go7', 'public', 'go7/public', 'src', 'go7/src'].map(subdir => 
      fs.existsSync(path.join(__dirname, subdir, 'index.html')) ? path.join(__dirname, subdir) : null
    ).filter(Boolean)
  ];

  // Log what we're checking
  console.log('Searching for Go7 application files...');
  
  // Return the first directory that exists and contains at least one HTML file
  for (const dir of possiblePaths) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const hasHtmlFiles = files.some(file => file.endsWith('.html'));
        
        if (hasHtmlFiles) {
          console.log(`✓ Found content directory: ${dir}`);
          return dir;
        }
        console.log(`- Directory exists but has no HTML files: ${dir}`);
      } else {
        console.log(`- Directory does not exist: ${dir}`);
      }
    } catch (err) {
      console.log(`- Error checking directory ${dir}: ${err.message}`);
    }
  }

  // If we couldn't find a directory with HTML files, use the current directory as fallback
  console.log('⚠ Could not find a suitable content directory. Using current directory as fallback.');
  return __dirname;
}

// Determine the content directory
const PUBLIC_DIR = findContentDirectory();

// MIME types for common files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.webp': 'image/webp'
};

console.log(`
=========================================================
   GO7 APPLICATION SERVER - PORT ${PORT}
=========================================================

Starting server for Go7 application...
Public directory: ${PUBLIC_DIR}
`);

// Create an index.html file if none exists in the content directory
const indexPath = path.join(PUBLIC_DIR, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.log('⚠ No index.html found in content directory. Creating a basic one...');
  
  // Create a simple index.html with links to any HTML files in the directory
  try {
    const files = fs.readdirSync(PUBLIC_DIR);
    const htmlFiles = files.filter(file => file.endsWith('.html') && file !== 'index.html');
    
    let linksHtml = '';
    if (htmlFiles.length > 0) {
      linksHtml = '<h2>Available Pages:</h2><ul>' + 
        htmlFiles.map(file => `<li><a href="${file}">${file}</a></li>`).join('') +
        '</ul>';
    }
    
    const indexContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Go7 Application</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          .file-list { text-align: left; margin: 20px auto; max-width: 600px; }
          ul { padding-left: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Go7 Application</h1>
          <p>Server is running correctly on port ${PORT}.</p>
          
          <div class="file-list">
            ${linksHtml}
          </div>
          
          <p><small>This is an auto-generated index page.</small></p>
        </div>
      </body>
      </html>
    `;
    
    fs.writeFileSync(indexPath, indexContent);
    console.log('✓ Created basic index.html file');
  } catch (err) {
    console.error('Failed to create index.html:', err.message);
  }
}

// List all available HTML files for debugging
console.log('\nAvailable HTML files in content directory:');
try {
  const files = fs.readdirSync(PUBLIC_DIR);
  const htmlFiles = files.filter(file => file.endsWith('.html'));
  
  if (htmlFiles.length === 0) {
    console.log('- No HTML files found');
  } else {
    htmlFiles.forEach(file => console.log(`- ${file}`));
  }
} catch (err) {
  console.error('Error listing HTML files:', err.message);
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Log the request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Parse URL
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  
  // Handle root requests
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Determine the file path for the request
  let filePath = path.join(PUBLIC_DIR, pathname);
  
  // Handle directory requests by looking for index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  
  // Determine content type based on file extension
  const extname = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.log(`File not found: ${filePath}`);
      
      // For routes with no file extension, try to serve them as SPA routes
      if (extname === '') {
        // First check if we have a file with this name plus .html
        const htmlFilePath = `${filePath}.html`;
        if (fs.existsSync(htmlFilePath)) {
          return serveFile(htmlFilePath, 'text/html', res);
        }
        
        // Then try to handle it as SPA route
        return handleSPA(res);
      }
      
      // If a specific file was requested but not found, try some fallbacks
      if (pathname.endsWith('.html')) {
        // Try finding the file without case sensitivity
        const dir = path.dirname(filePath);
        if (fs.existsSync(dir)) {
          try {
            const files = fs.readdirSync(dir);
            const lowercaseFilename = path.basename(filePath).toLowerCase();
            const matchingFile = files.find(file => file.toLowerCase() === lowercaseFilename);
            
            if (matchingFile) {
              const correctedPath = path.join(dir, matchingFile);
              console.log(`Found case-insensitive match: ${correctedPath}`);
              return serveFile(correctedPath, 'text/html', res);
            }
          } catch (dirErr) {
            console.error('Error searching directory for case-insensitive match:', dirErr);
          }
        }
      }
      
      // Otherwise return 404
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>404 - Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
            .error { color: #e74c3c; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">404 - Not Found</h1>
            <p>The requested resource was not found on this server.</p>
            <p>Path: ${pathname}</p>
            <p><a href="/">Go to Homepage</a></p>
            
            <div>
              <h3>Available pages:</h3>
              <ul>
                ${getAvailablePages()}
              </ul>
            </div>
          </div>
        </body>
        </html>
      `);
      return;
    }
    
    // File exists, serve it
    serveFile(filePath, contentType, res);
  });
});

// Helper function to serve a file
function serveFile(filePath, contentType, res) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      // Handle file reading errors
      console.error(`Error reading file: ${filePath}`, err);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>500 - Server Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
            .error { color: #e74c3c; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">500 - Server Error</h1>
            <p>The server encountered an error while processing your request.</p>
            <p>Error reading file: ${path.basename(filePath)}</p>
            <p><a href="/">Go to Homepage</a></p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // Serve the file
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    console.log(`Successfully served: ${filePath}`);
  });
}

// Handle SPA routes by serving index.html
function handleSPA(res) {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  
  fs.readFile(indexPath, (err, content) => {
    if (err) {
      console.error('Error reading index.html for SPA route:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error - Could not serve SPA');
      return;
    }
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
    console.log('Served SPA route with index.html');
  });
}

// Helper function to get a list of available HTML pages for 404 page
function getAvailablePages() {
  try {
    const getAllHtmlFiles = (dir) => {
      let results = [];
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other special directories
          if (!['node_modules', '.git', '.vscode'].includes(file)) {
            results = results.concat(getAllHtmlFiles(filePath));
          }
        } else if (file.endsWith('.html')) {
          // Get relative path from PUBLIC_DIR
          const relativePath = path.relative(PUBLIC_DIR, filePath);
          // Convert Windows backslashes to forward slashes for URLs
          const urlPath = relativePath.replace(/\\/g, '/');
          results.push({ name: file, path: urlPath });
        }
      });
      
      return results;
    };
    
    const htmlFiles = getAllHtmlFiles(PUBLIC_DIR);
    
    if (htmlFiles.length === 0) {
      return '<li>No HTML files found</li>';
    }
    
    return htmlFiles
      .map(file => `<li><a href="/${file.path}">${file.name}</a></li>`)
      .join('');
  } catch (err) {
    console.error('Error getting available pages:', err);
    return '<li>Error listing available pages</li>';
  }
}

// Start the server
server.listen(PORT, () => {
  console.log(`
=========================================================
   GO7 APPLICATION SERVER RUNNING SUCCESSFULLY!
=========================================================

Server is available at: http://localhost:${PORT}

* Serving Go7 application from: ${PUBLIC_DIR}
* SPA mode enabled (all routes will work)
* Automatic index.html creation if needed

Press Ctrl+C to stop the server...
`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`
ERROR: Port ${PORT} is already in use!
Another application is already using this port.
Please close that application or change the PORT value in this script.
`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});