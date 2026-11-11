// Mobile development server with network access
// This server exposes your app to your local network so mobile devices can access it

import { createServer } from 'vite';
import fs from 'fs';
import { networkInterfaces } from 'os';
import chalk from 'chalk';

// Get local IP addresses
function getLocalIPs() {
  const interfaces = networkInterfaces();
  const ips = [];
  
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (!iface.internal && iface.family === 'IPv4') {
        ips.push(iface.address);
      }
    }
  }
  
  return ips;
}

async function startServer() {
  try {
    console.log(chalk.blue('🚀 Starting Go7 mobile development server...'));
    
    // Create Vite server
    const server = await createServer({
      // Allow connections from network
      server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        hmr: {
          // Disable overlay to reduce CPU usage
          overlay: false 
        },
        watch: {
          // Reduce file watching to improve performance
          usePolling: false,
          interval: 1000,
          binaryInterval: 3000,
          ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**']
        }
      },
      
      // Log level
      logLevel: 'info',
      
      // Use memory cache to improve performance
      optimizeDeps: {
        force: false
      },
      
      // Clear screen to make logs more readable
      clearScreen: true
    });
    
    // Start the server
    await server.listen();
    
    // Display access URLs with IP addresses
    const localIPs = getLocalIPs();
    
    console.log('\n' + chalk.green('📱 Go7 Mobile Development Server Running!'));
    console.log(chalk.yellow('✅ Local access: ') + chalk.blue('http://localhost:5173/'));
    
    if (localIPs.length > 0) {
      console.log(chalk.yellow('✅ Network access (for mobile devices):'));
      localIPs.forEach(ip => {
        console.log(`  ${chalk.blue(`http://${ip}:5173/`)}`);
      });
    } else {
      console.log(chalk.red('❌ No network interfaces found for mobile access'));
    }
    
    console.log('\n' + chalk.magenta('📝 Instructions:'));
    console.log('1. Connect your mobile device to the same WiFi network as this computer');
    console.log('2. Open one of the network URLs above in your mobile browser');
    console.log('3. For iOS/Safari issues, enable "Disable Local Network Privacy Prompt" in Safari settings\n');
    
    console.log(chalk.yellow('⚠️ Troubleshooting:'));
    console.log('• Make sure your firewall allows connections on port 5173');
    console.log('• If blank screen appears, try clearing cache or using incognito mode');
    console.log('• Check console for JavaScript errors (connect Chrome DevTools to device)');
    console.log('• For connection refused errors, check if another server is using port 5173\n');
    
    console.log(chalk.blue('Press Ctrl+C to stop the server'));
    
  } catch (error) {
    console.error(chalk.red('Error starting server:'), error);
    process.exit(1);
  }
}

startServer();