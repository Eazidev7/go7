/**
 * Dev Server Performance Monitor
 * Monitors connection health and provides diagnostics for import issues
 */

class DevServerMonitor {
  constructor() {
    this.connectionAttempts = 0;
    this.failedConnections = 0;
    this.startTime = Date.now();
    this.importTimes = [];
    
    if (import.meta.env.DEV) {
      this.startMonitoring();
    }
  }

  startMonitoring() {
    console.log('🔍 Dev Server Monitor: Starting connection health monitoring...');
    
    // Monitor fetch failures (connection resets)
    this.interceptFetch();
    
    // Log performance metrics every 30 seconds
    setInterval(() => {
      this.logHealthReport();
    }, 30000);
    
    // Initial health check
    setTimeout(() => {
      this.performHealthCheck();
    }, 2000);
  }

  interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      this.connectionAttempts++;
      
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok && response.status >= 400) {
          this.failedConnections++;
          
          // Skip FCM registration errors to reduce console noise
          if (!args[0].includes('fcmregistrations.googleapis.com')) {
            console.warn(`🚨 Connection issue detected: ${response.status} for ${args[0]}`);
          }
        }
        
        return response;
      } catch (error) {
        this.failedConnections++;
        
        if (error.message.includes('ERR_CONNECTION_RESET') || 
            error.message.includes('ERR_CONNECTION_REFUSED')) {
          console.error('🔌 Connection Reset Detected:', args[0]);
          this.suggestFix();
        }
        
        throw error;
      }
    };
  }

  logHealthReport() {
    const uptime = Math.round((Date.now() - this.startTime) / 1000);
    const successRate = this.connectionAttempts > 0 ? 
      ((this.connectionAttempts - this.failedConnections) / this.connectionAttempts * 100).toFixed(1) : 100;
    
    console.log(`📊 Dev Server Health Report:
    ⏱️  Uptime: ${uptime}s
    🔗 Total Connections: ${this.connectionAttempts}
    ❌ Failed Connections: ${this.failedConnections}
    ✅ Success Rate: ${successRate}%`);
    
    if (this.failedConnections > 10) {
      console.warn('⚠️ High connection failure rate detected. Consider reducing import count.');
      this.suggestFix();
    }
  }

  performHealthCheck() {
    fetch('/src/App.jsx')
      .then(() => {
        console.log('✅ Dev Server Health Check: Connection OK');
      })
      .catch(() => {
        console.error('❌ Dev Server Health Check: Connection Failed');
        this.suggestFix();
      });
  }

  suggestFix() {
    console.log(`
🔧 CONNECTION RESET FIX SUGGESTIONS:
1. Reduce the number of static imports in App.jsx
2. Use React.lazy() for route components
3. Clear browser cache (Ctrl+Shift+Delete)
4. Restart the dev server: npm run dev
5. Check if Vite config has connection limits set

Current Browser: ${navigator.userAgent.includes('Chrome') ? 'Chrome ✅' : 'Other ⚠️'}
Network: ${navigator.onLine ? 'Online ✅' : 'Offline ❌'}
`);
  }

  // Track import performance
  trackImport(componentName, startTime) {
    const duration = Date.now() - startTime;
    this.importTimes.push({ componentName, duration });
    
    if (duration > 1000) {
      console.warn(`🐌 Slow import detected: ${componentName} took ${duration}ms`);
    }
  }
}

// Initialize monitor in development only
let devMonitor = null;
if (import.meta.env.DEV) {
  devMonitor = new DevServerMonitor();
}

export default devMonitor;