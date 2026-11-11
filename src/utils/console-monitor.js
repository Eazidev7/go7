// Console Monitor for Browser Debugging
// This script captures and categorizes actual console errors

(function() {
  'use strict';
  
  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  
  // Array to collect all console messages
  window.consoleMessages = [];
  
  // Enhanced console.error
  console.error = function(...args) {
    window.consoleMessages.push({
      type: 'error',
      timestamp: new Date().toISOString(),
      message: args.join(' '),
      args: args,
      stack: new Error().stack
    });
    
    // Check if it's map-related
    const messageStr = args.join(' ').toLowerCase();
    if (messageStr.includes('map') || messageStr.includes('leaflet') || messageStr.includes('tile')) {
      console.log('🔴 MAP ERROR DETECTED:', ...args);
    }
    
    return originalError.apply(console, args);
  };
  
  // Enhanced console.warn
  console.warn = function(...args) {
    window.consoleMessages.push({
      type: 'warn',
      timestamp: new Date().toISOString(),
      message: args.join(' '),
      args: args
    });
    
    // Check if it's map-related (reduced verbosity)
    const messageStr = args.join(' ').toLowerCase();
    if (messageStr.includes('map') || messageStr.includes('leaflet') || messageStr.includes('tile')) {
      // Only log severe map issues, not diagnostic warnings
      if (messageStr.includes('failed') || messageStr.includes('error') || messageStr.includes('not found') && !messageStr.includes('l._leaflet_id_map') && !messageStr.includes('l.map._instances')) {
        console.log('🟡 MAP WARNING DETECTED:', ...args);
      }
    }
    
    return originalWarn.apply(console, args);
  };
  
  // Network error monitoring
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).catch(error => {
      window.consoleMessages.push({
        type: 'network-error',
        timestamp: new Date().toISOString(),
        message: `Fetch failed: ${args[0]}`,
        error: error.message
      });
      
      console.log('🔴 NETWORK ERROR:', args[0], error);
      throw error;
    });
  };
  
  // Add a function to get all console messages
  window.getConsoleMessages = function() {
    return window.consoleMessages;
  };
  
  // Add a function to get only map-related messages
  window.getMapErrors = function() {
    return window.consoleMessages.filter(msg => {
      const text = msg.message.toLowerCase();
      return text.includes('map') || text.includes('leaflet') || text.includes('tile');
    });
  };
  
  // Add a function to clear messages
  window.clearConsoleMessages = function() {
    window.consoleMessages = [];
    console.log('Console messages cleared');
  };
  
  console.log('✅ Console monitor active - use window.getMapErrors() to see map issues');
})();