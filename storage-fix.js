/**
 * Storage Polyfill and Error Handler
 * 
 * This script provides:
 * 1. In-memory fallbacks for localStorage and sessionStorage when they're unavailable
 * 2. Error handling for Datadog and other libraries that require storage
 * 3. Diagnostic information about storage availability
 */

(function() {
  console.log('🔧 Storage Polyfill Loading...');
  
  // Check storage availability
  function isStorageAvailable(type) {
    try {
      const storage = window[type];
      const x = '__storage_test__';
      storage.setItem(x, x);
      storage.removeItem(x);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  // Create in-memory storage implementations
  function createMemoryStorage() {
    const data = {};
    
    return {
      getItem: function(key) {
        return key in data ? data[key] : null;
      },
      setItem: function(key, value) {
        data[key] = String(value);
      },
      removeItem: function(key) {
        delete data[key];
      },
      clear: function() {
        Object.keys(data).forEach(key => delete data[key]);
      },
      key: function(i) {
        return Object.keys(data)[i] || null;
      },
      get length() {
        return Object.keys(data).length;
      }
    };
  }
  
  // Apply memory storage if necessary
  const localStorageAvailable = isStorageAvailable('localStorage');
  const sessionStorageAvailable = isStorageAvailable('sessionStorage');
  
  if (!localStorageAvailable) {
    console.warn('⚠️ localStorage not available - using in-memory fallback');
    window.localStorage = createMemoryStorage();
  }
  
  if (!sessionStorageAvailable) {
    console.warn('⚠️ sessionStorage not available - using in-memory fallback');
    window.sessionStorage = createMemoryStorage();
  }
  
  // Patch Datadog to work with or without storage
  if (window.DD_RUM) {
    console.log('📊 Patching Datadog RUM to handle storage issues');
    
    const originalInit = window.DD_RUM.init;
    
    window.DD_RUM.init = function(config) {
      try {
        return originalInit.call(this, config);
      } catch (e) {
        console.warn('⚠️ Datadog initialization failed, using limited mode:', e.message);
        
        // Create a no-op implementation
        window.DD_RUM = {
          startSessionReplayRecording: function() {},
          addAction: function() {},
          addError: function() {},
          addTiming: function() {},
          setGlobalContext: function() {},
          setUser: function() {},
          getInternalContext: function() { return {}; }
        };
        
        return window.DD_RUM;
      }
    };
  }
  
  // Check cookie availability
  function areCookiesAvailable() {
    try {
      document.cookie = 'cookietest=1';
      const result = document.cookie.indexOf('cookietest=') !== -1;
      document.cookie = 'cookietest=1; expires=Thu, 01-Jan-1970 00:00:01 GMT';
      return result;
    } catch (e) {
      return false;
    }
  }
  
  const cookiesAvailable = areCookiesAvailable();
  if (!cookiesAvailable) {
    console.warn('⚠️ Cookies not available - this may affect authentication and session handling');
  }
  
  // Check for private/incognito mode
  function isPrivateMode() {
    try {
      localStorage.setItem('__test', 1);
      localStorage.removeItem('__test');
      
      // Safari private mode has quota of 0
      if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
        const storage = window.sessionStorage;
        if (storage) {
          storage.setItem('__test', 1);
          storage.removeItem('__test');
          
          const testStorage = 'i'.repeat(10000000);
          try {
            storage.setItem('__test_size', testStorage);
            storage.removeItem('__test_size');
            return false;
          } catch (e) {
            return true;
          }
        }
      }
      
      return false;
    } catch (e) {
      return true;
    }
  }
  
  if (isPrivateMode()) {
    console.warn('⚠️ Private/Incognito mode detected - storage may be limited or unavailable');
  }
  
  // Add diagnostic info to the page
  function addDiagnosticInfoToPage() {
    const diagnosticInfo = document.createElement('div');
    diagnosticInfo.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
    `;
    
    diagnosticInfo.innerHTML = `
      <div>localStorage: ${localStorageAvailable ? '✅' : '❌'}</div>
      <div>sessionStorage: ${sessionStorageAvailable ? '✅' : '❌'}</div>
      <div>cookies: ${cookiesAvailable ? '✅' : '❌'}</div>
      <div>private mode: ${isPrivateMode() ? '✓ yes' : '✓ no'}</div>
    `;
    
    // Add a close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'x';
    closeButton.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: none;
      border: none;
      color: white;
      cursor: pointer;
    `;
    closeButton.addEventListener('click', () => diagnosticInfo.remove());
    
    diagnosticInfo.appendChild(closeButton);
    document.body.appendChild(diagnosticInfo);
  }
  
  // Add diagnostics after page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDiagnosticInfoToPage);
  } else {
    addDiagnosticInfoToPage();
  }
  
  console.log('✅ Storage polyfill and error handling complete');
})();