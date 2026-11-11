// Simple Vite Server to start development
import { createServer } from 'vite';

async function startServer() {
  const server = await createServer({
    // Use the base Vite config
    configFile: './vite.config.simple.js',
    server: {
      port: 3000,
      open: true
    }
  });
  
  await server.listen();
  
  console.log('Server running at http://localhost:3000');
  console.log('Press Ctrl+C to stop');
}

startServer().catch(error => {
  console.error('Error starting server:', error);
  process.exit(1);
});