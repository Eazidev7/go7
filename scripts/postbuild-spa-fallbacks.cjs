const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const indexPath = path.join(dist, 'index.html');
const vendorPath = path.join(dist, 'vendor.html');

if (!fs.existsSync(indexPath)) {
  console.error('postbuild-spa-fallbacks: dist/index.html not found');
  process.exit(1);
}


const BUILD_ID = 'v8.' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.' + Date.now();

function injectBuildId(filePath) {
  if (!fs.existsSync(filePath)) return;
  const html = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(filePath, html.split('__GO7_BUILD_ID__').join(BUILD_ID).split('cache-buster').join('go7-build-id'));
}

injectBuildId(indexPath);
injectBuildId(vendorPath);
if (fs.existsSync(path.join(dist, '404.html'))) {
  injectBuildId(path.join(dist, '404.html'));
}
console.log('Build ID:', BUILD_ID);
// Copy root .htaccess into dist (Hostinger SPA + vendor.html routing)
const rootHtaccess = path.join(__dirname, '..', '.htaccess');
if (fs.existsSync(rootHtaccess)) {
  fs.copyFileSync(rootHtaccess, path.join(dist, '.htaccess'));
  console.log('Copied root .htaccess -> dist/.htaccess');
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const vendorHtml = fs.existsSync(vendorPath) ? fs.readFileSync(vendorPath, 'utf8') : indexHtml;

// NOTE: /rider/ is the separate Go7 Rider App - do NOT add SPA fallbacks here.
// Vendor login/register are served by .htaccess -> /vendor.html (no folders).
// Folder fallbacks caused Hostinger DirectorySlash to bounce into customer homepage.

const routes = [
  'vendor/dashboard',
  'agent/login',
  'agent/signup',
  'admin/login',
  'admin/setup',
  'explore',
  'book',
  'track',
  'cart',
  'profile',
];

// Lite vendor auth pages: copy vendor.html into folder indexes (Hostinger-safe).
for (const authRoute of ['vendor/login', 'vendor/register']) {
  const dir = path.join(dist, ...authRoute.split('/'));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), vendorHtml);
}

for (const route of routes) {
  const dir = path.join(dist, ...route.split('/'));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), indexHtml);
}

// Remove any stale rider SPA fallbacks from older builds
for (const stale of ['rider', 'riders']) {
  const staleDir = path.join(dist, stale);
  if (fs.existsSync(staleDir)) {
    fs.rmSync(staleDir, { recursive: true, force: true });
    console.log('Removed stale dist/' + stale + ' (separate rider app uses /rider/)');
  }
}

fs.writeFileSync(path.join(dist, '404.html'), indexHtml);

console.log('SPA fallbacks: ' + routes.length + ' routes + 404.html (vendor auth via vendor.html)');
