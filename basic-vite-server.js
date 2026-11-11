// basic-vite-server.js
// Simple Vite server with minimal configuration to diagnose issues

import { createServer } from 'vite';

async function startServer() {
  const server = await createServer({
    // Base Vite config
    configFile: false,
    root: process.cwd(),
    server: {
      port: 5190,
      open: '/index.html', // Try to open the main index.html
      strictPort: true,
      cors: true
    },
    plugins: [
      {
        name: 'diagnostic-plugin',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Log all requests for diagnostic purposes
            console.log(`[Request] ${req.method} ${req.url}`);
            
            // Force manifest.json to have correct MIME type
            if (req.url.endsWith('manifest.json')) {
              res.setHeader('Content-Type', 'application/manifest+json');
              console.log('[Content-Type override] Setting application/manifest+json for manifest.json');
            }
            
            next();
          });
        }
      }
    ],
  });

  await server.listen();
  console.log(`Diagnostic server running at ${server.resolvedUrls.local}`);
  console.log('Open the diagnostic page at: ' + server.resolvedUrls.local + 'diagnostic.html');
}

startServer().catch((e) => {
  console.error('Error starting server:', e);
  process.exit(1);
});
