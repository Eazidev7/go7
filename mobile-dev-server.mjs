// Complete mobile development server for Go7
// This script starts a Vite server with mobile network access
import { createServer } from 'vite';
import { networkInterfaces } from 'os';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get local IP addresses for network access
function getLocalIPs() {
  const interfaces = networkInterfaces();
  const ipv4Addresses = [];
  
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (!iface.internal && iface.family === 'IPv4') {
        ipv4Addresses.push(iface.address);
      }
    }
  }
  
  return ipv4Addresses;
}

async function startServer() {
  try {
    console.log(chalk.blue('🚀 Starting Go7 mobile development server...'));
    
    // Create Vite server with network access
    const server = await createServer({
      // Configure server with network access
      server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        hmr: {
          clientPort: 5173,
          overlay: false // Disable overlay to reduce CPU usage
        },
        watch: {
          // Reduce file watching to improve performance
          usePolling: false,
          interval: 1000,
          ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**']
        }
      },
      
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
    
    console.log('\n' + chalk.magenta('📝 Mobile Testing Instructions:'));
    console.log('1. Connect your mobile device to the same WiFi network as this computer');
    console.log('2. Open one of the network URLs above in your mobile browser');
    console.log('3. If the app is blank, try these diagnostic URLs:');
    console.log(`   ${chalk.blue(`http://${localIPs[0] || 'your-ip'}:5173/public/diagnostics.html`)}`);
    console.log(`   ${chalk.blue(`http://${localIPs[0] || 'your-ip'}:5173/public/minimal-test.html`)}`);
    
    console.log('\n' + chalk.yellow('⚠️ Troubleshooting:'));
    console.log('• Make sure your firewall allows connections on port 5173');
    console.log('• If blank screen appears, check browser console for JavaScript errors');
    console.log('• For connection refused errors, check network settings');
    console.log('• To stop the server, press Ctrl+C');
    
  } catch (error) {
    console.error(chalk.red('Error starting server:'), error);
    process.exit(1);
  }
}

// Start the server
startServer();