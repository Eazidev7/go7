const fs = require('fs');
const path = require('path');
const express = require('express');

// Create Express app
const app = express();
const PORT = 3000;

console.log('Starting icon fixer server...');

// Add special middleware just for icons
app.use((req, res, next) => {
    if (req.url.includes('icon') && (req.url.endsWith('.png') || req.url.endsWith('.jpg'))) {
        console.log(`Icon request detected: ${req.url}`);
        
        // Get the path to the requested icon
        const iconPath = path.join(__dirname, req.url.startsWith('/') ? req.url.slice(1) : req.url);
        
        // Check if the icon exists
        fs.access(iconPath, fs.constants.F_OK, (err) => {
            if (err) {
                console.log(`Icon not found: ${iconPath}, using fallback`);
                
                // Use go7-logo.png as fallback
                const fallbackIcon = path.join(__dirname, 'go7-logo.png');
                
                fs.access(fallbackIcon, fs.constants.F_OK, (fallbackErr) => {
                    if (fallbackErr) {
                        console.log('Fallback icon not found either');
                        res.status(404).send('Icon not found');
                    } else {
                        console.log(`Serving fallback icon: ${fallbackIcon}`);
                        res.setHeader('Content-Type', 'image/png');
                        fs.createReadStream(fallbackIcon).pipe(res);
                    }
                });
            } else {
                console.log(`Serving icon: ${iconPath}`);
                res.setHeader('Content-Type', 'image/png');
                fs.createReadStream(iconPath).pipe(res);
            }
        });
    } else {
        next();
    }
});

// Special handler for manifest.json
app.get('/manifest.json', (req, res) => {
    const manifestPath = path.join(__dirname, 'manifest.json');
    
    fs.readFile(manifestPath, 'utf8', (err, data) => {
        if (err) {
            console.log(`Error reading manifest: ${err.message}`);
            return res.status(500).send('Error reading manifest');
        }
        
        try {
            const manifest = JSON.parse(data);
            
            // Ensure icon paths are correct
            if (manifest.icons && Array.isArray(manifest.icons)) {
                manifest.icons = manifest.icons.map(icon => {
                    // Make sure icon paths start with /
                    if (icon.src && !icon.src.startsWith('/') && !icon.src.startsWith('http')) {
                        icon.src = '/' + icon.src;
                        console.log(`Fixed icon path: ${icon.src}`);
                    }
                    return icon;
                });
            }
            
            console.log('Serving manifest with fixed icon paths');
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(manifest));
        } catch (jsonErr) {
            console.log(`Error parsing manifest: ${jsonErr.message}`);
            res.status(500).send('Error parsing manifest');
        }
    });
});

// Serve static files with proper MIME types
app.use(express.static(__dirname, {
    setHeaders: (res, filePath) => {
        // Set correct MIME types for specific file extensions
        if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
        } else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (filePath.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
        } else if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        }
    }
}));

// Special diagnostic endpoint to check if icons are being served correctly
app.get('/icon-check', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Icon Check</title>
            <style>
                body { font-family: sans-serif; margin: 20px; }
                .icon-test { margin: 20px 0; padding: 15px; border: 1px solid #ccc; }
                .success { color: green; font-weight: bold; }
                .error { color: red; font-weight: bold; }
                img { max-width: 128px; border: 1px dashed #999; padding: 5px; }
            </style>
        </head>
        <body>
            <h1>Icon Checker</h1>
            
            <div class="icon-test">
                <h2>Manifest Icons</h2>
                <p>Testing icon from manifest (icon-192.png):</p>
                <img src="/icon-192.png" onerror="this.alt='Failed to load'; this.style.border='2px solid red';" />
                <div id="status192" class="loading">Loading...</div>
            </div>
            
            <div class="icon-test">
                <h2>Manifest Icons</h2>
                <p>Testing icon from manifest (icon-512.png):</p>
                <img src="/icon-512.png" onerror="this.alt='Failed to load'; this.style.border='2px solid red';" />
                <div id="status512" class="loading">Loading...</div>
            </div>
            
            <div class="icon-test">
                <h2>Logo Image</h2>
                <p>Testing regular logo image (go7-logo.png):</p>
                <img src="/go7-logo.png" onerror="this.alt='Failed to load'; this.style.border='2px solid red';" />
                <div id="statusLogo" class="loading">Loading...</div>
            </div>
            
            <div class="icon-test">
                <h2>Manifest Content</h2>
                <p>Testing manifest.json:</p>
                <pre id="manifestContent">Loading manifest...</pre>
            </div>
            
            <script>
                // Check icon-192.png
                const img192 = document.querySelector('img[src="/icon-192.png"]');
                img192.onload = function() {
                    document.getElementById('status192').className = 'success';
                    document.getElementById('status192').textContent = 'Success: icon-192.png loaded correctly';
                };
                img192.onerror = function() {
                    document.getElementById('status192').className = 'error';
                    document.getElementById('status192').textContent = 'Error: Failed to load icon-192.png';
                };
                
                // Check icon-512.png
                const img512 = document.querySelector('img[src="/icon-512.png"]');
                img512.onload = function() {
                    document.getElementById('status512').className = 'success';
                    document.getElementById('status512').textContent = 'Success: icon-512.png loaded correctly';
                };
                img512.onerror = function() {
                    document.getElementById('status512').className = 'error';
                    document.getElementById('status512').textContent = 'Error: Failed to load icon-512.png';
                };
                
                // Check go7-logo.png
                const imgLogo = document.querySelector('img[src="/go7-logo.png"]');
                imgLogo.onload = function() {
                    document.getElementById('statusLogo').className = 'success';
                    document.getElementById('statusLogo').textContent = 'Success: go7-logo.png loaded correctly';
                };
                imgLogo.onerror = function() {
                    document.getElementById('statusLogo').className = 'error';
                    document.getElementById('statusLogo').textContent = 'Error: Failed to load go7-logo.png';
                };
                
                // Check manifest.json
                fetch('/manifest.json')
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('manifestContent').textContent = JSON.stringify(data, null, 2);
                    })
                    .catch(error => {
                        document.getElementById('manifestContent').textContent = 'Error loading manifest: ' + error.message;
                    });
            </script>
        </body>
        </html>
    `);
});

// Automatically create placeholder icons if they don't exist
function createPlaceholderIcons() {
    const icon192Path = path.join(__dirname, 'icon-192.png');
    const icon512Path = path.join(__dirname, 'icon-512.png');
    const logoPath = path.join(__dirname, 'go7-logo.png');
    
    // Check if icons already exist
    if (!fs.existsSync(icon192Path) && fs.existsSync(logoPath)) {
        console.log('Creating icon-192.png from go7-logo.png');
        fs.copyFileSync(logoPath, icon192Path);
    }
    
    if (!fs.existsSync(icon512Path) && fs.existsSync(logoPath)) {
        console.log('Creating icon-512.png from go7-logo.png');
        fs.copyFileSync(logoPath, icon512Path);
    }
}

// Create placeholder icons
createPlaceholderIcons();

// Special route to handle SPA routing
app.get('*', (req, res) => {
    // Skip for file extensions - only handle routes
    if (path.extname(req.url)) {
        res.status(404).send(`File not found: ${req.url}`);
        return;
    }
    
    // Serve index.html for all other routes
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`
========================================================
    ICON FIXER SERVER RUNNING
========================================================
    Server running at: http://localhost:${PORT}
    
    FIXES IMPLEMENTED:
    - Icons served with correct Content-Type
    - Automatic fallback to go7-logo.png
    - Manifest paths corrected
    
    TEST YOUR ICONS:
    http://localhost:${PORT}/icon-check
    
    Access your app:
    http://localhost:${PORT}
========================================================
`);
});