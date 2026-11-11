const { createServer } = require('vite');

async function startServer() {
  try {
    const server = await createServer({
      // Force the server to use a specific root directory
      root: __dirname,
      
      // Basic server configuration
      server: {
        port: 7000,
        strictPort: true,
        host: true,
        fs: {
          strict: false,
          allow: [__dirname]
        }
      },
      
      // Add some debugging
      logLevel: 'info',
      
      // Define the base public path
      base: '/'
    });
    
    await server.listen();
    
    const info = server.config.logger.info;
    
    info(`
      ✓ Vite server running at:
      - Local:   ${server.resolvedUrls.local}
      - Network: ${server.resolvedUrls.network}
      
      Workspace root: ${__dirname}
      Index file: ${__dirname}\\index.html
    `);
    
  } catch (e) {
    console.error('Failed to start Vite server:', e);
  }
}

startServer();