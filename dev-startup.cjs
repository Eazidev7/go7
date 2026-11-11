/**
 * Go7 Development Server Startup Handler
 * Handles environment validation, logging, and graceful fallback
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class Go7DevStarter {
  constructor() {
    this.port = 5174;
    this.host = true;
    this.startTime = Date.now();
    this.requiredEnvVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET'
    ];
    
    this.setupErrorHandlers();
  }

  setupErrorHandlers() {
    // Prevent silent crashes
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception:', error);
      console.error('Stack:', error.stack);
      console.log('🔄 Attempting to continue...');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Promise Rejection:', reason);
      console.error('Promise:', promise);
      console.log('⚠️ This may cause instability');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down Go7 dev server...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Go7 dev server terminated');
      process.exit(0);
    });
  }

  checkEnvironment() {
    console.log('🔍 Checking environment variables...');
    
    const missingVars = [];
    const foundVars = [];

    this.requiredEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      } else {
        foundVars.push(varName);
      }
    });

    if (foundVars.length > 0) {
      console.log('✅ Found environment variables:', foundVars.join(', '));
    }

    if (missingVars.length > 0) {
      console.warn('⚠️ Missing environment variables:');
      missingVars.forEach(varName => {
        console.warn(`   ❌ ${varName}`);
      });
      console.warn('📄 Please check your .env file or environment configuration');
      console.warn('🔧 App may still work with defaults, continuing...');
    } else {
      console.log('✅ All required environment variables found');
    }

    return { missing: missingVars, found: foundVars };
  }

  async startViteServer() {
    console.log('🚀 Starting Go7 Vite development server...');
    console.log(`📍 Port: ${this.port}`);
    console.log(`🌐 Host: ${this.host}`);

    const viteArgs = [
      '--host', this.host.toString(),
      '--port', this.port.toString(),
      '--force'
    ];

    // Try different ways to start Vite
    const viteCommands = [
      { cmd: 'npx', args: ['vite', ...viteArgs] },
      { cmd: 'node', args: ['node_modules/.bin/vite', ...viteArgs] },
      { cmd: path.join(__dirname, 'node_modules', '.bin', 'vite.cmd'), args: viteArgs }
    ];

    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const tryVite = () => {
        if (attempts >= viteCommands.length) {
          reject(new Error('All Vite startup methods failed'));
          return;
        }

        const { cmd, args } = viteCommands[attempts];
        attempts++;

        console.log(`🔄 Attempting Vite startup method ${attempts}: ${cmd}`);

        const viteProcess = spawn(cmd, args, {
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_OPTIONS: '--max-old-space-size=4096'
        }
      });

      let serverReady = false;
      let outputBuffer = '';

      viteProcess.stdout.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;
        
        // Check for server ready message
        if (output.includes('ready in') || output.includes('Local:')) {
          if (!serverReady) {
            serverReady = true;
            console.log('🎉 Go7 Dev Server started successfully at http://localhost:5174');
            console.log('🌐 Network access available');
            resolve(viteProcess);
          }
        }
        
        // Forward output
        process.stdout.write(output);
      });

      viteProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error('Vite Error:', error);
        
        // Check for specific errors that indicate failure
        if (error.includes('EADDRINUSE') || error.includes('port') || error.includes('EACCES')) {
          reject(new Error(`Port ${this.port} is already in use or access denied`));
        }
      });

        viteProcess.on('close', (code) => {
          if (code !== 0 && !serverReady) {
            console.log(`❌ Vite method ${attempts} failed with code ${code}`);
            tryVite(); // Try next method
          }
        });

        viteProcess.on('error', (error) => {
          console.log(`❌ Vite method ${attempts} failed: ${error.message}`);
          tryVite(); // Try next method
        });

        // Timeout for each attempt
        setTimeout(() => {
          if (!serverReady && attempts === 1) {
            viteProcess.kill();
            tryVite(); // Try next method
          }
        }, 10000); // 10 second timeout per attempt
      };

      // Start the first attempt
      tryVite();

      // Overall timeout fallback
      setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Vite server startup timeout'));
        }
      }, 30000); // 30 second total timeout
    });
  }

  async startFallbackServer() {
    console.log('🔄 Starting fallback Express server...');
    
    const fallbackScript = path.join(__dirname, 'fallback-server.cjs');
    
    return new Promise((resolve, reject) => {
      const fallbackProcess = spawn('node', [fallbackScript], {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_OPTIONS: '--max-old-space-size=4096',
          GO7_PORT: this.port.toString()
        }
      });

      fallbackProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Fallback server exited with code ${code}`));
        }
      });

      fallbackProcess.on('error', (error) => {
        reject(new Error(`Fallback server error: ${error.message}`));
      });

      // Give it time to start
      setTimeout(() => {
        resolve(fallbackProcess);
      }, 2000);
    });
  }

  async start() {
    console.log('🚀 Go7 Development Server Initializing...');
    console.log('=' .repeat(50));
    
    // Check environment
    this.checkEnvironment();
    
    try {
      // Try to start Vite server
      console.log('\n📦 Attempting to start with Vite...');
      await this.startViteServer();
      
    } catch (error) {
      console.error('❌ Vite failed to start:', error.message);
      console.log('\n🔄 Falling back to Express static server...');
      
      try {
        await this.startFallbackServer();
        console.log('🎉 Go7 Dev Server started successfully at http://localhost:5174 (Fallback Mode)');
        
      } catch (fallbackError) {
        console.error('❌ Fallback server also failed:', fallbackError.message);
        console.error('\n🆘 Unable to start development server');
        console.error('📋 Troubleshooting steps:');
        console.error('   1. Check if port 5174 is available');
        console.error('   2. Run: npm run dev:clean');
        console.error('   3. Check your network/firewall settings');
        console.error('   4. Try: npm run dev:fallback directly');
        process.exit(1);
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  const starter = new Go7DevStarter();
  starter.start().catch((error) => {
    console.error('💥 Fatal error starting Go7 dev server:', error);
    process.exit(1);
  });
}

module.exports = Go7DevStarter;