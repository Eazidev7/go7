import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

console.log('🚀 Starting Go7 App - Debugging Mode...');

// AGGRESSIVE SERVICE WORKER CLEANUP - RUNS IMMEDIATELY
(async function forceCleanup() {
  if ('serviceWorker' in navigator) {
    try {
      // Get all registrations
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      if (registrations.length > 0) {
        console.log('🔄 FORCING UNREGISTER of', registrations.length, 'service worker(s)...');
        
        // Unregister all
        await Promise.all(
          registrations.map(registration => {
            console.log('Unregistering:', registration.scope);
            return registration.unregister();
          })
        );
        
        console.log('✅ All service workers unregistered');
        
        // Also stop any active service workers
        if (navigator.serviceWorker.controller) {
          console.log('⚠️ Active service worker detected, posting SKIP_WAITING');
          navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    } catch (error) {
      console.error('Error during service worker cleanup:', error);
    }
  }
  
  // AGGRESSIVE CACHE CLEANUP
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      
      if (cacheNames.length > 0) {
        console.log('🗑️ FORCING DELETE of', cacheNames.length, 'cache(s)...');
        
        await Promise.all(
          cacheNames.map(name => {
            console.log('Deleting cache:', name);
            return caches.delete(name);
          })
        );
        
        console.log('✅ All caches deleted');
      }
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }
  
  // Force reload if service worker was active
  if (navigator.serviceWorker.controller) {
    console.log('🔄 Service worker was active, forcing hard reload in 1 second...');
    setTimeout(() => {
      window.location.reload(true);
    }, 1000);
  }
})();


// Global error handling for external resources
window.addEventListener('error', function(e) {
  // Handle external resource loading errors silently
  if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
    const url = e.target.src || e.target.href;
    if (url && (url.includes('paystack.com') || url.includes('datadog') || url.includes('external'))) {
      console.warn('⚠️ External resource failed to load:', url);
      e.preventDefault(); // Prevent console error spam
      return false;
    }
  }
}, true);

// Suppress Firebase API restriction errors (403)
const originalFetch = window.fetch;
window.fetch = function(...args) {
  return originalFetch.apply(this, args).catch(error => {
    // Suppress Firebase Identity Toolkit 403 errors
    if (args[0]?.includes('identitytoolkit') || args[0]?.includes('googleapis.com')) {
      console.warn('ℹ️ Firebase API request blocked (app continues in limited mode)');
      return Promise.reject(error);
    }
    return Promise.reject(error);
  });
};

// Handle SDK storage issues in development
if (typeof window !== 'undefined') {
  // Ensure localStorage and sessionStorage are available for SDKs
  try {
    if (!window.localStorage) {
      console.warn('⚠️ localStorage not available, creating mock');
      window.localStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null
      };
    }
    
    if (!window.sessionStorage) {
      console.warn('⚠️ sessionStorage not available, creating mock');
      window.sessionStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null
      };
    }
    
    // Test storage functionality
    window.localStorage.setItem('test', 'test');
    window.localStorage.removeItem('test');
    window.sessionStorage.setItem('test', 'test');
    window.sessionStorage.removeItem('test');
  } catch (error) {
    console.warn('⚠️ Storage test failed:', error);
  }

  // Disable problematic SDK features in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Development mode: Disabling external SDK features');
    
    // Mock Datadog SDK completely BEFORE it loads
    window.DD_RUM = window.DD_RUM || {
      init: () => console.log('📊 Datadog RUM init (mocked in dev)'),
      addTiming: () => {},
      addError: () => {},
      setUser: () => {},
      setUserProperty: () => {},
      addAction: () => {},
      startView: () => {},
      stopView: () => {},
      getSessionReplayLink: () => null
    };
    
    // Mock Datadog Logs if present
    window.DD_LOGS = window.DD_LOGS || {
      init: () => console.log('📝 Datadog Logs init (mocked in dev)'),
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {}
      }
    };
    
    // Override any existing Datadog initialization
    if (window.datadogRum) {
      window.datadogRum.init = () => console.log('📊 Datadog RUM blocked in dev');
    }
    
    // Prevent Datadog storage warnings by providing mock storage
    const mockStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null
    };
    
    // Intercept Datadog's storage access
    const originalLocalStorage = window.localStorage;
    const originalSessionStorage = window.sessionStorage;
    
    Object.defineProperty(window, 'localStorage', {
      get: function() {
        // Check if Datadog is trying to access storage
        const stack = new Error().stack;
        if (stack && (stack.includes('datadog') || stack.includes('DD_'))) {
          console.warn('🚫 Blocked Datadog localStorage access in dev mode');
          return mockStorage;
        }
        return originalLocalStorage;
      },
      configurable: true
    });
    
    Object.defineProperty(window, 'sessionStorage', {
      get: function() {
        const stack = new Error().stack;
        if (stack && (stack.includes('datadog') || stack.includes('DD_'))) {
          console.warn('🚫 Blocked Datadog sessionStorage access in dev mode');
          return mockStorage;
        }
        return originalSessionStorage;
      },
      configurable: true
    });
  }
}

// Live Update Checker Component
function AppWithUpdateChecker() {
  useEffect(() => {
    console.log('🔄 Live update checker initialized - Production Mode - Fixed Service Worker Enabled')
    
    // TEMPORARILY DISABLED SERVICE WORKER FOR HOMEPAGE UPDATE - v2.0
    // Enable service worker for production-like experience with fix
    if (false && 'serviceWorker' in navigator) {
      // Check if there were previous service worker errors
      const hadPreviousErrors = localStorage.getItem('sw-error-count') > 5;
      
      // Use the fixed service worker instead
      const swUrl = hadPreviousErrors ? '/sw-fix.js' : '/sw-fix.js'; // Always use fixed version
      
      // Register service worker with improved error handling
      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          console.log('✅ Fixed Service Worker registered successfully:', registration.scope);
          localStorage.setItem('sw-error-count', '0'); // Reset error counter on success
          
          // Handle service worker updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;
            
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('📦 New content is available, please refresh.');
                } else {
                  console.log('📦 Content is cached for offline use.');
                }
              }
            };
          };
        })
        .catch(error => {
          console.error('❌ Service Worker registration failed:', error);
          // Track service worker errors
          const errorCount = parseInt(localStorage.getItem('sw-error-count') || '0') + 1;
          localStorage.setItem('sw-error-count', errorCount.toString());
          
          // If too many errors, disable service worker
          if (errorCount > 10) {
            console.warn('⚠️ Too many service worker errors, disabling service worker');
            localStorage.setItem('sw-disabled', 'true');
          }
        });
    }
    
    // Update checker with improved offline handling
    let failedChecks = 0;
    const MAX_FAILED_CHECKS = 3;
    
    const checkForUpdate = setInterval(() => {
      // Stop checking after multiple failures (likely offline)
      if (failedChecks >= MAX_FAILED_CHECKS) {
        console.log('⏸️ Pausing update checks (server unavailable)');
        clearInterval(checkForUpdate);
        return;
      }

      // Skip check if browser is offline
      if (!navigator.onLine) {
        console.log('📴 Browser offline, skipping update check');
        return;
      }

      const timestamp = Date.now();
      fetch(`${window.location.href}?t=${timestamp}`, { 
        cache: "no-store",
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
        .then((res) => res.text())
        .then(() => {
          failedChecks = 0; // Reset on success
          console.log("✅ Go7 live reload check passed - " + new Date().toLocaleTimeString());
          // Visual feedback for mobile users
          if (window.innerWidth <= 768) {
            const indicator = document.createElement('div');
            indicator.innerHTML = '🔄 Updated';
            indicator.style.cssText = 'position:fixed;top:10px;right:10px;background:green;color:white;padding:5px;border-radius:5px;z-index:9999;font-size:12px';
            document.body.appendChild(indicator);
            setTimeout(() => indicator.remove(), 2000);
          }
        })
        .catch((err) => {
          failedChecks++;
          // Only warn on first failure, then stay quiet
          if (failedChecks === 1) {
            console.warn("⚠️ Update check failed:", err.message);
          }
        });
    }, 10000); // Check every 10 seconds (more frequent)

    return () => {
      console.log('🛑 Live update checker stopped');
      clearInterval(checkForUpdate);
    };
  }, []);

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

// Get the root element
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('❌ Root element not found!')
  throw new Error('Root element not found!')
}

console.log('✅ Root element found, mounting React immediately...')

// SIMPLIFIED: Just mount React immediately
try {
  const root = ReactDOM.createRoot(rootElement);
  console.log('✅ React root created');

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  console.log('✅ Go7 App v2.0 rendered successfully!');
} catch (error) {
  console.error('❌ Render error:', error);
  showFallbackUI();
}

function showFallbackUI() {
  document.body.innerHTML = `
    <div style="
      padding: 40px 20px; 
      text-align: center; 
      font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: #f9f9f9;
    ">
      <div style="
        max-width: 400px;
        margin: 0 auto;
        padding: 30px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      ">
        <h2 style="color: #E50914; margin-bottom: 16px;">🔧 Go7 Loading</h2>
        <p style="color: #666; margin-bottom: 24px; line-height: 1.5;">
          The app is starting up. If this takes more than a few seconds, 
          please refresh your browser.
        </p>
        <button onclick="window.location.reload()" style="
          background: #E50914;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          font-family: inherit;
        ">
          Refresh Page
        </button>
      </div>
    </div>
  `;
}