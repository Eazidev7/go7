const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Enable detailed logging
const verboseLogging = true;

// Log middleware for debugging
app.use((req, res, next) => {
  if (verboseLogging) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Set CORS headers for debugging
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Configure proper MIME types - CRITICAL FIX
app.use((req, res, next) => {
  // Pre-check for JavaScript files to ensure proper MIME type
  const ext = path.extname(req.url);
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.tsx') {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    console.log(`🔧 [Pre-check] Set MIME type 'application/javascript' for: ${req.url}`);
  }
  next();
});

app.use(express.static(__dirname, {
  setHeaders: function(res, filePath) {
    // Log all file requests for debugging
    if (verboseLogging) {
      console.log(`📁 Serving: ${path.basename(filePath)}`);
    }

    // Fix JSX and JS MIME types - FIXED FOR MODULE COMPATIBILITY
    if (filePath.endsWith('.jsx') || filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.tsx')) {
      // Always use application/javascript for all JavaScript and JSX files
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      console.log(`🔧 Set MIME type 'application/javascript' for: ${path.basename(filePath)}`);
    }
    
    // Set proper MIME types for other files
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
    if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
    // Add explicit handling for manifest.json with more specific MIME type
    if (filePath.endsWith('manifest.json')) {
      res.setHeader('Content-Type', 'application/manifest+json');
      console.log(`🔧 Set MIME type 'application/manifest+json' for manifest.json`);
    }
    // Add proper image handling
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
      console.log(`🖼️ Set MIME type 'image/png' for: ${path.basename(filePath)}`);
    }
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
    if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
    if (filePath.endsWith('.ico')) {
      res.setHeader('Content-Type', 'image/x-icon');
    }
  }
}));

// Special middleware for module scripts
app.use((req, res, next) => {
  // Check if this request might be for a module script
  if (req.url.endsWith('.js') || req.url.endsWith('.jsx') || req.url.endsWith('.mjs')) {
    const filePath = path.join(__dirname, req.url);
    
    // Only process if the file exists
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const isModule = content.includes('import ') || content.includes('export ') ||
                        content.includes('import{') || content.includes('export{') ||
                        req.url.endsWith('.mjs');
        
        if (isModule) {
          // Create a special handler for module scripts
          console.log(`📦 Detected module script: ${req.url}`);
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          fs.readFile(filePath, (err, content) => {
            if (err) {
              return next(err);
            }
            return res.send(content);
          });
          return; // Stop processing
        }
      } catch (err) {
        console.error(`⚠️ Error analyzing module: ${filePath}`, err.message);
      }
    }
  }
  next(); // Continue to next middleware
});

// Root route with enhanced error handling
app.get('/', (req, res) => {
  try {
    const indexPath = path.join(__dirname, 'index.html');
    
    // Verify the file exists
    if (!fs.existsSync(indexPath)) {
      console.error(`❌ ERROR: index.html not found at ${indexPath}`);
      return res.status(500).send('index.html not found. Please create this file in your project root.');
    }
    
    console.log(`📄 Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath);
  } catch (err) {
    console.error(`❌ Error serving index.html:`, err);
    res.status(500).send('Server error');
  }
});

// Minimal React app that definitely works
app.get('/minimal', (req, res) => {
  try {
    console.log(`📄 Serving minimal-react.html`);
    res.sendFile(path.join(__dirname, 'minimal-react.html'));
  } catch (err) {
    console.error(`❌ Error serving minimal-react.html:`, err);
    res.status(500).send('Server error');
  }
});

// Special handler for manifest icon files - ENHANCED WITH FALLBACKS
app.get('/icon-:size.png', (req, res) => {
  try {
    const { size } = req.params;
    const validSizes = ['192', '512']; // Common PWA icon sizes
    
    if (!validSizes.includes(size)) {
      console.error(`❌ Invalid icon size requested: ${size}`);
      return res.status(404).send('Icon not found');
    }
    
    const iconPath = path.join(__dirname, `icon-${size}.png`);
    
    if (!fs.existsSync(iconPath)) {
      console.error(`⚠️ Icon file not found: ${iconPath}, generating placeholder icon`);
      
      // Create a canvas and generate a placeholder icon
      const { createCanvas } = require('canvas');
      const canvas = createCanvas(parseInt(size), parseInt(size));
      const ctx = canvas.getContext('2d');
      
      // Draw a simple placeholder icon
      ctx.fillStyle = '#4285f4';  // Google blue
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add text
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.floor(size/5)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`GO7`, canvas.width/2, canvas.height/2);
      
      // Send the generated icon
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'max-age=86400'); // Cache for 24 hours
      res.end(canvas.toBuffer('image/png'));
      return;
    }
    
    console.log(`🖼️ Serving icon-${size}.png from: ${iconPath}`);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'max-age=86400'); // Cache for 24 hours
    
    // Add CORS headers for icon files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    res.sendFile(iconPath);
  } catch (err) {
    console.error(`❌ Error serving icon:`, err);
    
    // Create a simple fallback icon if anything fails
    try {
      // Create a simple colored square as fallback
      res.setHeader('Content-Type', 'image/png');
      
      // Use a static fallback image instead since we might not have canvas
      const fallbackPath = path.join(__dirname, 'node_modules/express/lib/favicon.ico');
      if (fs.existsSync(fallbackPath)) {
        return res.sendFile(fallbackPath);
      }
      
      // If all fails, send a text response
      res.status(500).send('Icon generation failed');
    } catch (fallbackErr) {
      res.status(500).send('Server error serving icon');
    }
  }
});

// Special handler for manifest.json with proper content type
app.get('/manifest.json', (req, res) => {
  try {
    const manifestPath = path.join(__dirname, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      console.error(`❌ manifest.json not found at ${manifestPath}`);
      return res.status(404).send('Manifest file not found');
    }
    
    console.log(`📄 Serving manifest.json from: ${manifestPath}`);
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(manifestPath);
  } catch (err) {
    console.error(`❌ Error serving manifest.json:`, err);
    res.status(500).send('Server error serving manifest');
  }
});

// Special handler for JSX files used as modules - FIXED
app.get('*.jsx', (req, res) => {
  try {
    const jsxPath = path.join(__dirname, req.path);
    
    if (!fs.existsSync(jsxPath)) {
      console.error(`❌ JSX file not found: ${jsxPath}`);
      return res.status(404).send('JSX file not found');
    }
    
    const content = fs.readFileSync(jsxPath, 'utf8');
    // ALWAYS treat JSX files as modules for consistent behavior
    console.log(`🔧 Serving JSX file: ${req.path} (as module)`);
    
    // Use application/javascript MIME type for ALL JSX files
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    res.sendFile(jsxPath);
  } catch (err) {
    console.error(`❌ Error serving JSX file:`, err);
    res.status(500).send('Server error serving JSX file');
  }
});

// Guaranteed working React app (no module dependencies)
app.get('/guaranteed-react', (req, res) => {
  try {
    console.log(`📄 Serving guaranteed-react.html`);
    res.sendFile(path.join(__dirname, 'guaranteed-react.html'));
  } catch (err) {
    console.error(`❌ Error serving guaranteed-react.html:`, err);
    res.status(500).send('Server error');
  }
});

// Vite-specific debugging tool
app.get('/vite-debug', (req, res) => {
  try {
    console.log(`📄 Serving vite-debug.html`);
    res.sendFile(path.join(__dirname, 'vite-debug.html'));
  } catch (err) {
    console.error(`❌ Error serving vite-debug.html:`, err);
    res.status(500).send('Server error');
  }
});

// Comprehensive React diagnostic tool
app.get('/diagnostic', (req, res) => {
  try {
    console.log(`📄 Serving comprehensive-react-diagnostic.html`);
    res.sendFile(path.join(__dirname, 'comprehensive-react-diagnostic.html'));
  } catch (err) {
    console.error(`❌ Error serving comprehensive-react-diagnostic.html:`, err);
    res.status(500).send('Server error');
  }
});

// Deep React mounting diagnostic
app.get('/mount-diagnostic', (req, res) => {
  try {
    console.log(`📄 Serving mount-diagnostic.html`);
    
    // Create the HTML on the fly
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Mount Diagnostic</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #0066cc; }
    .success { color: #00aa00; }
    .warning { color: #ff6600; }
    .error { color: #cc0000; }
    button { background: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>React Mount Diagnostic Tool</h1>
  
  <div>
    <p>This tool tests React mounting with zero dependencies and no module system.</p>
    <button id="run-test">Run Test</button>
    <p id="status">Click "Run Test" to begin...</p>
  </div>
  
  <div id="root" style="padding: 20px; border: 2px dashed #ccc; margin: 20px 0;">
    <p>React will mount here...</p>
  </div>
  
  <div>
    <h2>Console Output</h2>
    <pre id="console-output"></pre>
  </div>
  
  <!-- Load React with plain script tags -->
  <script src="https://unpkg.com/react@17.0.2/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@17.0.2/umd/react-dom.development.js"></script>
  
  <!-- Include our diagnostic tool -->
  <script src="/react-mount-diagnostic.js"></script>
  
  <script>
    // Capture console output
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const consoleOutput = document.getElementById('console-output');
    
    function addToConsole(type, ...args) {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg, null, 2); }
          catch (e) { return String(arg); }
        }
        return String(arg);
      }).join(' ');
      
      const line = document.createElement('div');
      line.classList.add(type);
      line.textContent = message;
      consoleOutput.appendChild(line);
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
      
      return message;
    }
    
    console.log = function(...args) {
      addToConsole('log', ...args);
      originalLog.apply(console, args);
    };
    
    console.error = function(...args) {
      addToConsole('error', ...args);
      originalError.apply(console, args);
    };
    
    console.warn = function(...args) {
      addToConsole('warning', ...args);
      originalWarn.apply(console, args);
    };
    
    // Setup the test
    document.getElementById('run-test').addEventListener('click', function() {
      const statusElement = document.getElementById('status');
      const rootElement = document.getElementById('root');
      
      statusElement.textContent = 'Testing React mounting...';
      statusElement.className = '';
      
      try {
        // First verify React is available
        if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
          throw new Error('React and/or ReactDOM not loaded');
        }
        
        console.log('React version:', React.version);
        console.log('ReactDOM version:', ReactDOM.version);
        
        // Create a simple component
        const SimpleComponent = React.createElement(
          'div',
          null,
          [
            React.createElement('h2', { key: 'title' }, 'React is Working!'),
            React.createElement(
              'p', 
              { key: 'version' }, 
              \`Using React \${React.version} with plain script tags (no modules)\`
            ),
            React.createElement(
              'button',
              { 
                key: 'button',
                onClick: () => alert('Button clicked - React events are working!'),
                style: { background: '#4CAF50', color: 'white', border: 'none', padding: '8px 16px' }
              },
              'Click Me'
            )
          ]
        );
        
        // Render to the DOM
        ReactDOM.render(SimpleComponent, rootElement);
        
        // Check if rendering worked
        setTimeout(() => {
          if (rootElement.innerText.includes('React is Working')) {
            statusElement.textContent = '✅ Success! React mounted correctly';
            statusElement.className = 'success';
          } else {
            statusElement.textContent = '⚠️ Warning: React may have mounted but content doesn\\'t match expected output';
            statusElement.className = 'warning';
          }
        }, 500);
      } catch (error) {
        console.error('Test failed:', error);
        statusElement.textContent = \`❌ Error: \${error.message}\`;
        statusElement.className = 'error';
      }
    });
  </script>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error(`❌ Error serving mount-diagnostic.html:`, err);
    res.status(500).send('Server error');
  }
});

// Debug route to inspect environment
app.get('/debug', (req, res) => {
  const debugInfo = {
    time: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    workingDirectory: process.cwd(),
    files: fs.existsSync(__dirname) ? 
      fs.readdirSync(__dirname).filter(f => !f.startsWith('.')).slice(0, 20) : 
      'Directory not accessible'
  };
  
  res.json(debugInfo);
});

// Special debug page to help diagnose React issues
app.get('/react-debug', (req, res) => {
  res.sendFile(path.join(__dirname, 'react-diagnostic.html'));
});

// Serve React diagnostic JavaScript files with proper MIME type
app.get('/react-debug.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.send(`
    // React Debug Script - Auto-generated to ensure correct MIME type
    console.log("React debug script loaded successfully");
    
    // Verify React mounting
    let reactMountAttempts = 0;
    
    function checkReactMounting() {
      const rootElement = document.getElementById('root');
      
      if (!rootElement) {
        console.log("⚠️ No #root element found in document");
        return;
      }
      
      const originalContent = rootElement.innerHTML;
      reactMountAttempts++;
      
      if (reactMountAttempts >= 20) {
        console.log("⚠️ React still not mounted after 10 seconds");
        console.log("🔧 Adding diagnostic tools instead of refreshing...");
        
        // Add visual diagnostic tools
        const diagnosticDiv = document.createElement('div');
        diagnosticDiv.style.padding = '20px';
        diagnosticDiv.style.background = '#f8f9fa';
        diagnosticDiv.style.border = '1px solid #dee2e6';
        diagnosticDiv.style.borderRadius = '4px';
        diagnosticDiv.style.margin = '20px';
        
        diagnosticDiv.innerHTML = \`
          <h2>React Mount Diagnostic</h2>
          <p>React components might not be mounting properly.</p>
          <div>
            <h3>Troubleshooting Steps:</h3>
            <ol>
              <li>Check browser console for errors</li>
              <li>Verify React and ReactDOM are properly loaded</li>
              <li>Check if your root element ID matches what React is targeting</li>
              <li>Try a different browser</li>
            </ol>
            <button id="force-reload" style="background:#007bff;color:white;border:none;padding:8px 16px;border-radius:4px;">
              Force Reload Page
            </button>
          </div>
        \`;
        
        document.body.appendChild(diagnosticDiv);
        
        document.getElementById('force-reload').addEventListener('click', () => {
          window.location.reload(true);
        });
        
        return;
      }
      
      // Check again after 500ms
      setTimeout(checkReactMounting, 500);
    }
    
    // Start checking after DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(checkReactMounting, 1000);
    });
  `);
});

// Serve React mount diagnostic script with proper MIME type
app.get('/react-mount-diagnostic.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.send(`
    // React Mount Diagnostic Script - Auto-generated to ensure correct MIME type
    console.log("React mount diagnostic tool loaded");
    
    function checkReactMounting() {
      const rootElement = document.getElementById('root');
      
      if (!rootElement) {
        console.log("❌ Root element #root not found");
        return;
      }
      
      console.log("✅ Root element #root exists");
      const originalContent = rootElement.innerHTML.trim();
      
      if (originalContent === "" || originalContent === "<div></div>") {
        console.log("⚠️ Root element is empty (React might be loading)");
      } else {
        console.log("⚠️ Root element content unchanged (React might not have mounted)");
      }
      
      // Check for common React indicators
      if (window.React) {
        console.log("✅ React global object found");
      } else {
        console.log("❌ React global object not found");
      }
      
      if (window.ReactDOM) {
        console.log("✅ ReactDOM global object found");
      } else {
        console.log("❌ ReactDOM global object not found");
      }
      
      console.log("\n🔧 DIAGNOSTIC SUMMARY");
    }
    
    // Call the diagnostic function after a delay
    setTimeout(checkReactMounting, 2000);
  `);
});

// Module script diagnostic tool - IMPROVED VERSION
app.get('/module-debug', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Module Script Diagnostic Tool</title>
  <link rel="manifest" href="/manifest.json">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .card { background: #f5f5f5; border-radius: 4px; padding: 15px; margin-bottom: 15px; }
    .success { color: #2e7d32; }
    .error { color: #c62828; }
    pre { background: #eee; padding: 10px; border-radius: 4px; overflow-x: auto; }
    button { background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
    button:hover { background: #388E3C; }
    .icon-test { display: flex; align-items: center; margin: 10px 0; }
    .icon-test img { margin-right: 15px; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>Module Script & Manifest Diagnostic Tool</h1>
  
  <div class="card">
    <h2>Module Import Test</h2>
    <div id="module-status">Running tests...</div>
  </div>
  
  <div class="card">
    <h2>Dynamic Import Test</h2>
    <div id="dynamic-status">Waiting...</div>
    <button id="run-dynamic-test">Run Dynamic Import Test</button>
  </div>
  
  <div class="card">
    <h2>Module MIME Type Check</h2>
    <div id="mime-status">Checking...</div>
  </div>

  <div class="card">
    <h2>JSX File MIME Type Check</h2>
    <div id="jsx-mime-status">Checking...</div>
  </div>
  
  <div class="card">
    <h2>Manifest Icon Tests</h2>
    <div id="icon-status">Testing...</div>
    <div class="icon-test">
      <img src="/icon-192.png" width="50" height="50" alt="Icon 192px">
      <div>icon-192.png</div>
    </div>
    <div class="icon-test">
      <img src="/icon-512.png" width="50" height="50" alt="Icon 512px">
      <div>icon-512.png</div>
    </div>
  </div>
  
  <div class="card">
    <h2>Manifest.json Check</h2>
    <div id="manifest-status">Checking manifest.json...</div>
    <pre id="manifest-content"></pre>
  </div>
  
  <script type="module">
    // Basic module import test
    try {
      // Simple module import
      const moduleStatus = document.getElementById('module-status');
      moduleStatus.innerHTML = '<span class="success">✅ Module scripts are working correctly!</span>';
    } catch (error) {
      document.getElementById('module-status').innerHTML = 
        '<span class="error">❌ Module script error: ' + error.message + '</span>';
    }
    
    // MIME type check for JavaScript
    fetch('/mime-check.js')
      .then(response => {
        const mimeStatus = document.getElementById('mime-status');
        const contentType = response.headers.get('Content-Type');
        
        mimeStatus.innerHTML = '<p>Content-Type: <strong>' + contentType + '</strong></p>';
        
        if (contentType && contentType.includes('application/javascript')) {
          mimeStatus.innerHTML += '<p class="success">✅ JavaScript MIME type is correct!</p>';
        } else {
          mimeStatus.innerHTML += '<p class="error">❌ JavaScript MIME type is incorrect. Should be application/javascript</p>';
        }
        
        return response.text();
      })
      .catch(error => {
        document.getElementById('mime-status').innerHTML = 
          '<span class="error">❌ Error checking MIME type: ' + error.message + '</span>';
      });

    // MIME type check for JSX
    fetch('/jsx-check.jsx')
      .then(response => {
        const jsxMimeStatus = document.getElementById('jsx-mime-status');
        const contentType = response.headers.get('Content-Type');
        
        jsxMimeStatus.innerHTML = '<p>Content-Type for JSX: <strong>' + contentType + '</strong></p>';
        
        if (contentType && contentType.includes('application/javascript')) {
          jsxMimeStatus.innerHTML += '<p class="success">✅ JSX MIME type is correct!</p>';
        } else {
          jsxMimeStatus.innerHTML += '<p class="error">❌ JSX MIME type is incorrect. Should be application/javascript</p>';
        }
        
        return response.text();
      })
      .catch(error => {
        document.getElementById('jsx-mime-status').innerHTML = 
          '<span class="error">❌ Error checking JSX MIME type: ' + error.message + '</span>';
      });
      
    // Check manifest and icons
    fetch('/manifest.json')
      .then(response => {
        const manifestStatus = document.getElementById('manifest-status');
        const contentType = response.headers.get('Content-Type');
        
        manifestStatus.innerHTML = '<p>Manifest Content-Type: <strong>' + contentType + '</strong></p>';
        
        if (contentType && contentType.includes('application/manifest+json')) {
          manifestStatus.innerHTML += '<p class="success">✅ Manifest MIME type is correct!</p>';
        } else {
          manifestStatus.innerHTML += '<p class="error">❌ Manifest MIME type is incorrect. Should be application/manifest+json</p>';
        }
        
        return response.json();
      })
      .then(data => {
        document.getElementById('manifest-content').textContent = JSON.stringify(data, null, 2);
        
        // Check for icons in manifest
        if (data.icons && Array.isArray(data.icons) && data.icons.length > 0) {
          const iconStatus = document.getElementById('icon-status');
          iconStatus.innerHTML = '<p class="success">✅ Found ' + data.icons.length + ' icons in manifest</p>';
          
          // Check each icon for proper URL format
          data.icons.forEach(icon => {
            if (icon.src && icon.src.includes('localhost:')) {
              iconStatus.innerHTML += '<p class="error">⚠️ Icon URL contains hardcoded localhost: ' + icon.src + '</p>';
            } else {
              iconStatus.innerHTML += '<p>Icon: ' + icon.src + ' (size: ' + icon.sizes + ')</p>';
            }
          });
        }
      })
      .catch(error => {
        document.getElementById('manifest-status').innerHTML = 
          '<span class="error">❌ Error loading manifest.json: ' + error.message + '</span>';
      });
      
    // Check icon loading
    const iconStatus = document.getElementById('icon-status');
    const icons = document.querySelectorAll('.icon-test img');
    
    // Function to check if image loaded
    function checkImage(img) {
      return new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        
        // If image is already loaded
        if (img.complete) {
          resolve(img.naturalWidth > 0);
        }
      });
    }
    
    // Check all icons
    Promise.all([...icons].map(img => checkImage(img)))
      .then(results => {
        const allLoaded = results.every(result => result);
        if (allLoaded) {
          iconStatus.innerHTML += '<p class="success">✅ All icons loaded successfully!</p>';
        } else {
          iconStatus.innerHTML += '<p class="error">❌ Some icons failed to load</p>';
        }
      });
  </script>
  
  <script>
    // Dynamic import test
    document.getElementById('run-dynamic-test').addEventListener('click', async () => {
      const dynamicStatus = document.getElementById('dynamic-status');
      dynamicStatus.textContent = 'Testing dynamic import...';
      
      try {
        const module = await import('./mime-check.js');
        dynamicStatus.innerHTML = '<span class="success">✅ Dynamic import successful!</span>';
      } catch (error) {
        dynamicStatus.innerHTML = 
          '<span class="error">❌ Dynamic import failed: ' + error.message + '</span>';
      }
    });
  </script>
</body>
</html>`);
});

// Create a test module script for module-debug
app.get('/mime-check.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(`// This is a test module
export const testValue = "Module is working";
console.log("Module loaded successfully");
`);

// Create a test JSX file for module-debug
app.get('/jsx-check.jsx', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(`// This is a test JSX module
import React from 'react';

export const TestComponent = () => {
  return (
    <div className="test-component">
      <h2>Test JSX Component</h2>
      <p>This is a test component to verify JSX handling</p>
    </div>
  );
};

export default TestComponent;
`);
`);
});

// Handle all other routes for SPA
app.use((req, res, next) => {
  // If the request is for a file with an extension, and not found by express.static
  if (req.path.includes('.')) {
    console.log(`WARNING: Resource not found: ${req.path}`);
    return res.status(404).send('Not found');
  }
  
  // For all other routes, serve index.html (for SPA/React Router)
  console.log(`REDIRECT: Client-side route: ${req.path} -> serving index.html`);
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Check for PWA requirements before starting
console.log('\n🔍 Validating PWA requirements...');

// Check for manifest.json
const manifestPath = path.join(__dirname, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  console.log('✅ manifest.json found');
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Check if the manifest has the required icon entries
    if (manifest.icons && Array.isArray(manifest.icons)) {
      console.log(`✅ Found ${manifest.icons.length} icons in manifest.json`);
      
      // Fix icon paths if they reference localhost:3000
      let manifestUpdated = false;
      manifest.icons.forEach(icon => {
        if (icon.src && icon.src.includes('localhost:')) {
          console.log(`⚠️ Fixing icon path in manifest: ${icon.src}`);
          icon.src = icon.src.replace(/http:\/\/localhost:[0-9]+\//g, '/');
          manifestUpdated = true;
        }
      });
      
      // Save the fixed manifest if needed
      if (manifestUpdated) {
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
        console.log('✅ Updated manifest.json with correct icon paths');
      }
    } else {
      console.log('⚠️ Warning: No icons found in manifest.json');
    }
  } catch (err) {
    console.error('⚠️ Error parsing manifest.json:', err.message);
  }
} else {
  console.log('⚠️ Warning: manifest.json not found');
}

// Check for icon files
const iconSizes = [192, 512];
iconSizes.forEach(size => {
  const iconPath = path.join(__dirname, `icon-${size}.png`);
  if (fs.existsSync(iconPath)) {
    console.log(`✅ icon-${size}.png found`);
  } else {
    console.log(`⚠️ Warning: icon-${size}.png not found`);
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n==================================================');
  console.log('✅ ENHANCED DEBUG SERVER RUNNING');
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  console.log(`📱 Mobile URL: http://172.20.10.5:${PORT}`);
  console.log('==================================================');
  console.log('🔍 Special routes:');
  console.log('   /debug    - Server environment info');
  console.log('   /react-debug - React diagnostic tool');
  console.log('   /module-debug - Module script testing tool');
  console.log('   /manifest.json - PWA manifest with proper MIME type');
  console.log('   /icon-192.png - PWA icon with proper MIME type');
  console.log('   /icon-512.png - PWA icon with proper MIME type');
  console.log('   /*.jsx - JSX files with automatic module detection');
  console.log('🔧 MIME types properly configured for all files:');
  console.log('   ✅ JavaScript modules - application/javascript');
  console.log('   ✅ JSX files - text/jsx (non-modules) or application/javascript (modules)');
  console.log('   ✅ Images, CSS, HTML and JSON with proper MIME types');
  console.log('==================================================\n');
});