/**
 * Development Server Stability Monitor
 * Prevents random crashes and provides auto-restart capabilities
 */

const fs = require('fs');
const path = require('path');

class StabilityMonitor {
  constructor() {
    this.startTime = Date.now();
    this.crashCount = 0;
    this.maxCrashes = 5;
    this.memoryThreshold = 512 * 1024 * 1024; // 512MB
    this.statsFile = path.join(process.cwd(), '.dev-stats.json');
    
    this.init();
  }

  init() {
    console.log('🛡️ Stability Monitor initialized');
    
    // Load previous stats
    this.loadStats();
    
    // Setup monitoring
    this.setupMemoryMonitoring();
    this.setupProcessHandlers();
    this.setupPeriodicChecks();
    
    // Log startup
    this.logEvent('startup', { pid: process.pid, nodeVersion: process.version });
  }

  loadStats() {
    try {
      if (fs.existsSync(this.statsFile)) {
        const stats = JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
        this.crashCount = stats.crashCount || 0;
        console.log(`📊 Previous session stats: ${this.crashCount} crashes`);
      }
    } catch (error) {
      console.log('📊 Starting fresh stats tracking');
    }
  }

  saveStats() {
    try {
      const stats = {
        crashCount: this.crashCount,
        lastUpdate: new Date().toISOString(),
        uptime: Date.now() - this.startTime
      };
      fs.writeFileSync(this.statsFile, JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error('❌ Failed to save stats:', error);
    }
  }

  logEvent(type, data = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      uptime: Date.now() - this.startTime,
      memory: this.getMemoryStats(),
      ...data
    };
    
    console.log(`📝 [${type.toUpperCase()}]`, event);
  }

  getMemoryStats() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024)
    };
  }

  setupMemoryMonitoring() {
    // Force garbage collection if exposed
    if (global.gc) {
      setInterval(() => {
        const beforeGC = process.memoryUsage();
        global.gc();
        const afterGC = process.memoryUsage();
        
        const freed = beforeGC.heapUsed - afterGC.heapUsed;
        if (freed > 10 * 1024 * 1024) { // If freed more than 10MB
          console.log(`🗑️ GC freed ${Math.round(freed / 1024 / 1024)}MB`);
        }
      }, 120000); // Every 2 minutes
    }

    // Memory threshold monitoring
    setInterval(() => {
      const usage = process.memoryUsage();
      
      if (usage.heapUsed > this.memoryThreshold) {
        this.logEvent('memory_warning', {
          threshold: Math.round(this.memoryThreshold / 1024 / 1024),
          current: Math.round(usage.heapUsed / 1024 / 1024)
        });
        
        // Force GC if available
        if (global.gc) {
          console.log('🔄 Forcing garbage collection...');
          global.gc();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  setupProcessHandlers() {
    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      this.logEvent('shutdown', { signal });
      this.saveStats();
      
      setTimeout(() => {
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      }, 1000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Crash handlers
    process.on('uncaughtException', (error) => {
      this.crashCount++;
      this.logEvent('uncaught_exception', { 
        error: error.message, 
        stack: error.stack,
        crashCount: this.crashCount
      });
      
      this.saveStats();
      
      if (this.crashCount >= this.maxCrashes) {
        console.error('🚨 Too many crashes, exiting...');
        process.exit(1);
      }
      
      console.log('⚠️ Attempting to continue...');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logEvent('unhandled_rejection', { 
        reason: reason?.toString(), 
        promise: promise?.toString() 
      });
    });

    // Warning handlers
    process.on('warning', (warning) => {
      if (warning.name === 'MaxListenersExceededWarning') {
        this.logEvent('listeners_warning', {
          name: warning.name,
          message: warning.message
        });
      }
    });
  }

  setupPeriodicChecks() {
    // Health check every 5 minutes
    setInterval(() => {
      const stats = this.getMemoryStats();
      const uptime = Date.now() - this.startTime;
      
      console.log(`💚 Health Check - Uptime: ${Math.round(uptime / 1000 / 60)}min, Memory: ${stats.heapUsed}MB`);
      
      // Auto-save stats
      this.saveStats();
      
      // Check for memory leaks
      if (stats.heapUsed > 400) { // More than 400MB
        console.warn('⚠️ High memory usage detected - possible memory leak');
      }
      
    }, 300000); // Every 5 minutes
  }

  // Restart helper for external use
  static createRestartScript() {
    const restartScript = `
@echo off
echo 🔄 Auto-restarting Go7 Dev Server...
timeout /t 2 /nobreak >nul
cd /d "${process.cwd().replace(/\//g, '\\\\')}"
npm run dev:stable
`;
    
    const scriptPath = path.join(process.cwd(), 'auto-restart.bat');
    try {
      fs.writeFileSync(scriptPath, restartScript);
      console.log(`📝 Restart script created: ${scriptPath}`);
    } catch (error) {
      console.error('❌ Failed to create restart script:', error);
    }
  }
}

// Initialize if we're in the main process
if (process.env.NODE_ENV === 'development' && !process.env.DISABLE_STABILITY_MONITOR) {
  const monitor = new StabilityMonitor();
  
  // Create restart script
  StabilityMonitor.createRestartScript();
  
  // Export for external access
  global.stabilityMonitor = monitor;
}

module.exports = StabilityMonitor;