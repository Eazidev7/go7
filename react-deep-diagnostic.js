/**
 * React Deep Diagnostics Tool
 * 
 * This script can be injected into any HTML page to provide detailed diagnostics
 * about React initialization and mounting issues.
 */

(function() {
  console.log('🔍 React Deep Diagnostics Tool - Starting checks...');
  
  // Store original console methods
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Create diagnostics log panel
  function createDiagnosticPanel() {
    const panel = document.createElement('div');
    panel.id = 'react-diagnostic-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      max-height: 50vh;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      font-family: monospace;
      font-size: 14px;
      padding: 10px;
      z-index: 10000;
      border-top: 2px solid #666;
    `;
    
    // Add minimize/maximize button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Minimize';
    toggleButton.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: #333;
      color: white;
      border: 1px solid #666;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
    `;
    
    let minimized = false;
    toggleButton.onclick = function() {
      const logs = document.getElementById('diagnostic-logs');
      if (minimized) {
        logs.style.display = 'block';
        toggleButton.textContent = 'Minimize';
        minimized = false;
      } else {
        logs.style.display = 'none';
        toggleButton.textContent = 'Maximize';
        minimized = true;
      }
    };
    
    panel.appendChild(toggleButton);
    
    // Container for logs
    const logsContainer = document.createElement('div');
    logsContainer.id = 'diagnostic-logs';
    panel.appendChild(logsContainer);
    
    document.body.appendChild(panel);
    return logsContainer;
  }
  
  // Wait for DOM to be ready
  function whenDocumentReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }
  
  // Initialize diagnostic tools
  whenDocumentReady(() => {
    const logsContainer = createDiagnosticPanel();
    
    // Intercept console methods
    console.log = function(...args) {
      addToPanel('LOG', ...args);
      originalLog.apply(console, args);
    };
    
    console.error = function(...args) {
      addToPanel('ERROR', ...args);
      originalError.apply(console, args);
    };
    
    console.warn = function(...args) {
      addToPanel('WARN', ...args);
      originalWarn.apply(console, args);
    };
    
    // Add message to diagnostic panel
    function addToPanel(level, ...messages) {
      const line = document.createElement('div');
      const timestamp = new Date().toLocaleTimeString();
      
      let color;
      switch (level) {
        case 'ERROR':
          color = '#ff5555';
          break;
        case 'WARN':
          color = '#ffcc00';
          break;
        case 'INFO':
          color = '#55aaff';
          break;
        default:
          color = '#00ff00';
      }
      
      line.style.color = color;
      
      // Format message
      const formattedMessages = messages.map(msg => {
        if (typeof msg === 'object') {
          try {
            return JSON.stringify(msg, null, 2);
          } catch (e) {
            return String(msg);
          }
        }
        return String(msg);
      }).join(' ');
      
      line.textContent = `[${timestamp}] [${level}] ${formattedMessages}`;
      logsContainer.appendChild(line);
      
      // Auto-scroll to bottom
      logsContainer.scrollTop = logsContainer.scrollHeight;
    }
    
    // Run diagnostics
    runDiagnostics();
  });
  
  function runDiagnostics() {
    console.log('🔍 Running React diagnostics...');
    
    // Check if React is available
    if (typeof React !== 'undefined') {
      console.log('✅ React is available:', React.version);
    } else {
      console.error('❌ React is not loaded or not available in global scope');
    }
    
    // Check if ReactDOM is available
    if (typeof ReactDOM !== 'undefined') {
      console.log('✅ ReactDOM is available:', ReactDOM.version);
    } else {
      console.error('❌ ReactDOM is not loaded or not available in global scope');
    }
    
    // Check for root element
    const rootElements = ['root', 'app', 'react-root'].filter(id => document.getElementById(id));
    if (rootElements.length > 0) {
      console.log('✅ Found potential React root elements:', rootElements);
      
      // Check if root elements have children (indicating React might have mounted)
      rootElements.forEach(id => {
        const el = document.getElementById(id);
        if (el.children.length > 0) {
          console.log(`✅ Root element #${id} has children (${el.children.length}), React might be mounted`);
        } else {
          console.warn(`⚠️ Root element #${id} has no children, React might not be mounted yet`);
        }
      });
    } else {
      console.error('❌ No common React root element found (tried #root, #app, #react-root)');
    }
    
    // Monitor for React mounting
    monitorReactMounting();
    
    // Check for common module issues
    checkModuleIssues();
    
    // Check for common file loading issues
    checkFileLoadingIssues();
    
    // Check browser storage
    checkBrowserStorage();
  }
  
  function monitorReactMounting() {
    let checkCount = 0;
    const maxChecks = 30; // Check for 30 seconds
    
    console.log('🔍 Monitoring for React mounting activity...');
    
    function checkForReactActivity() {
      const rootElements = ['root', 'app', 'react-root'].filter(id => document.getElementById(id));
      
      rootElements.forEach(id => {
        const el = document.getElementById(id);
        const newChildCount = el.children.length;
        
        if (newChildCount > 0) {
          console.log(`✅ React appears to be mounted in #${id}! (${newChildCount} children)`);
        }
      });
      
      // Continue checking until we reach the limit
      checkCount++;
      if (checkCount < maxChecks) {
        setTimeout(checkForReactActivity, 1000);
      } else if (rootElements.some(id => document.getElementById(id).children.length === 0)) {
        console.error('❌ React still not mounted after 30 seconds of monitoring');
      }
    }
    
    setTimeout(checkForReactActivity, 1000);
  }
  
  function checkModuleIssues() {
    console.log('🔍 Checking for common module issues...');
    
    // Check if using ES modules
    const esModuleScripts = document.querySelectorAll('script[type="module"]');
    if (esModuleScripts.length > 0) {
      console.log(`✅ Found ${esModuleScripts.length} ES module scripts`);
      
      // Check for common import issues
      const scriptContents = Array.from(esModuleScripts).map(script => script.innerText).join('\\n');
      if (scriptContents.includes('import ') && !scriptContents.includes('.js')) {
        console.warn('⚠️ Potential issue: ES module imports may be missing file extensions (.js)');
      }
    } else {
      console.log('ℹ️ No ES module scripts found, using traditional scripts');
    }
  }
  
  function checkFileLoadingIssues() {
    console.log('🔍 Checking for file loading issues...');
    
    // Monitor network for 404s and other issues
    if (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes && 
        PerformanceObserver.supportedEntryTypes.includes('resource')) {
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('.js') || entry.name.includes('.jsx') || 
              entry.name.includes('.css') || entry.name.includes('.json')) {
            
            if (!entry.responseStatus) {
              // Chrome doesn't provide responseStatus, so check transferSize
              if (entry.transferSize === 0 && entry.duration > 0) {
                console.error(`❌ Resource failed to load: ${entry.name}`);
              } else {
                console.log(`✅ Resource loaded: ${entry.name}`);
              }
            } else if (entry.responseStatus >= 400) {
              console.error(`❌ Resource failed with status ${entry.responseStatus}: ${entry.name}`);
            } else {
              console.log(`✅ Resource loaded with status ${entry.responseStatus}: ${entry.name}`);
            }
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
      console.log('✅ Resource loading monitoring active');
    } else {
      console.warn('⚠️ Performance monitoring API not available in this browser');
    }
  }
  
  function checkBrowserStorage() {
    console.log('🔍 Checking browser storage...');
    
    try {
      // Check localStorage
      const testKey = 'react-diagnostic-test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      console.log('✅ localStorage is working');
    } catch (e) {
      console.error('❌ localStorage issue:', e.message);
    }
    
    try {
      // Check sessionStorage
      const testKey = 'react-diagnostic-test';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      console.log('✅ sessionStorage is working');
    } catch (e) {
      console.error('❌ sessionStorage issue:', e.message);
    }
  }
})();