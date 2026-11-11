/**
 * Go7 Development Server Monitor
 * Monitors the development server and Firebase listener usage for stability
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DevServerMonitor {
  constructor() {
    this.startTime = Date.now();
    this.checkInterval = 30000; // Check every 30 seconds
    this.serverProcess = null;
    this.monitoring = false;
    this.statsFile = path.join(__dirname, '.dev-monitor-stats.json');
    this.init();
  }

  init() {
    console.log('🔍 Go7 Development Server Monitor Started');
    console.log(`📊 Monitoring interval: ${this.checkInterval / 1000}s`);
    this.loadPreviousStats();
    this.startMonitoring();
  }

  loadPreviousStats() {
    try {
      if (fs.existsSync(this.statsFile)) {
        const stats = JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
        console.log('📈 Previous session stats:', {
          crashes: stats.crashCount || 0,
          maxMemory: stats.maxMemoryUsage || 'Unknown',
          lastSession: stats.lastSessionDuration || 'Unknown'
        });
      }
    } catch (error) {
      console.log('📊 No previous stats found, starting fresh');
    }
  }

  async checkServerStatus() {
    try {
      // Check if Vite dev server is responding
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        console.log('✅ Server is responding');
        return true;
      }
    } catch (error) {
      console.log('❌ Server not responding:', error.message);
      return false;
    }
  }

  getMemoryUsage() {
    try {
      // Get Node.js processes and their memory usage
      const output = execSync('wmic process where "name=\'node.exe\'" get ProcessId,WorkingSetSize /format:csv', 
        { encoding: 'utf8', stdio: 'pipe' });
      
      const lines = output.split('\n').filter(line => line.includes('node.exe'));
      let totalMemory = 0;
      let processCount = 0;

      lines.forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const memory = parseInt(parts[2]) || 0;
          totalMemory += memory;
          processCount++;
        }
      });

      return {
        totalMemoryMB: Math.round(totalMemory / 1024 / 1024),
        processCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { error: error.message, timestamp: new Date().toISOString() };
    }
  }

  checkFirebaseListeners() {
    try {
      // Check if listener manager stats file exists
      const listenerStatsPath = path.join(__dirname, '.firebase-listeners.json');
      if (fs.existsSync(listenerStatsPath)) {
        const listenerStats = JSON.parse(fs.readFileSync(listenerStatsPath, 'utf8'));
        console.log('🔥 Firebase Listeners:', {
          components: Object.keys(listenerStats).length,
          totalListeners: Object.values(listenerStats).reduce((sum, comp) => sum + comp.listenerCount, 0)
        });
        return listenerStats;
      }
    } catch (error) {
      console.log('⚠️ Could not read listener stats:', error.message);
    }
    return null;
  }

  async performHealthCheck() {
    console.log('\n🔍 Performing health check...');
    
    const serverStatus = await this.checkServerStatus();
    const memoryUsage = this.getMemoryUsage();
    const listenerStats = this.checkFirebaseListeners();
    
    const healthReport = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      serverResponding: serverStatus,
      memory: memoryUsage,
      listeners: listenerStats
    };

    console.log('📊 Health Report:', {
      serverStatus: serverStatus ? '✅ OK' : '❌ DOWN',
      memoryUsage: memoryUsage.totalMemoryMB ? `${memoryUsage.totalMemoryMB}MB` : 'Unknown',
      nodeProcesses: memoryUsage.processCount || 0,
      uptime: `${Math.round(healthReport.uptime / 1000 / 60)}min`
    });

    // Save stats
    this.saveStats(healthReport);

    // Check for issues
    if (memoryUsage.totalMemoryMB > 1000) {
      console.warn('⚠️ High memory usage detected!');
    }

    if (!serverStatus) {
      console.error('🚨 Server is not responding!');
    }

    return healthReport;
  }

  saveStats(healthReport) {
    try {
      let allStats = [];
      if (fs.existsSync(this.statsFile)) {
        allStats = JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
      }
      
      allStats.push(healthReport);
      
      // Keep only last 100 reports
      if (allStats.length > 100) {
        allStats = allStats.slice(-100);
      }

      fs.writeFileSync(this.statsFile, JSON.stringify(allStats, null, 2));
    } catch (error) {
      console.error('❌ Failed to save stats:', error);
    }
  }

  startMonitoring() {
    this.monitoring = true;
    console.log('🏃 Starting continuous monitoring...');

    const monitorLoop = async () => {
      if (!this.monitoring) return;

      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('❌ Monitor error:', error);
      }

      setTimeout(monitorLoop, this.checkInterval);
    };

    monitorLoop();
  }

  stop() {
    this.monitoring = false;
    console.log('🛑 Monitoring stopped');
  }
}

// Start monitoring if run directly
if (require.main === module) {
  const monitor = new DevServerMonitor();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down monitor...');
    monitor.stop();
    process.exit(0);
  });
}

module.exports = DevServerMonitor;