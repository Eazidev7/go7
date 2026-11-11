/**
 * React Mounting Diagnostic Tool
 * 
 * This script provides detailed diagnostics for React mounting issues.
 * It detects common problems that prevent React from successfully mounting.
 */

(function() {
  console.log('🔍 React Mounting Diagnostic Tool starting...');
  
  // Store DOM state before React tries to mount
  const initialHTML = document.getElementById('root')?.innerHTML || '';
  
  // Check if we're using React 18's createRoot or older ReactDOM.render
  let usingReactDOM18 = false;
  let reactInitialized = false;
  let reactVersion = 'unknown';
  
  // Monitor React loading
  function checkReactLoaded() {
    if (typeof React !== 'undefined') {
      reactInitialized = true;
      reactVersion = React.version;
      console.log(`✅ React ${reactVersion} is loaded`);
      
      // Detect React DOM version
      if (typeof ReactDOM !== 'undefined') {
        usingReactDOM18 = typeof ReactDOM.createRoot === 'function';
        console.log(`✅ ReactDOM ${ReactDOM.version} is loaded (${usingReactDOM18 ? 'createRoot API' : 'render API'})`);
      } else {
        console.error('❌ ReactDOM is not loaded');
      }
    } else {
      console.error('❌ React is not loaded');
    }
  }
  
  // Monitor module loading issues
  function monitorScriptLoading() {
    // Check for script errors
    window.addEventListener('error', function(e) {
      if (e.target && e.target.tagName === 'SCRIPT') {
        const url = e.target.src || 'inline script';
        console.error(`❌ Script failed to load or execute: ${url}`);
      }
    }, true);
    
    // Check for module loading issues
    if ('performance' in window) {
      const resources = performance.getEntriesByType('resource');
      const jsResources = resources.filter(r => r.name.endsWith('.js') || r.name.endsWith('.jsx'));
      
      jsResources.forEach(resource => {
        if (resource.duration > 2000) {
          console.warn(`⚠️ Slow resource loading: ${resource.name} took ${Math.round(resource.duration)}ms`);
        }
      });
    }
  }
  
  // Check for error boundary issues
  function checkErrorBoundaries() {
    // Look for error patterns in the DOM that indicate an error boundary caught an error
    const errorMessages = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const text = el.textContent || '';
        return text.includes('Something went wrong') || 
               text.includes('Error:') || 
               text.includes('failed to compile');
      })
      .map(el => el.textContent);
    
    if (errorMessages.length > 0) {
      console.error('❌ Error boundary may have caught an error:', errorMessages[0]);
    }
  }
  
  // Check for common React mounting issues
  function checkReactMounting() {
    // Make sure the root element exists
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error('❌ Root element #root not found');
      return;
    }
    
    console.log('✅ Root element #root exists');
    
    // Check if root element content has changed since initial load
    const currentHTML = rootElement.innerHTML;
    const htmlChanged = initialHTML !== currentHTML;
    
    if (htmlChanged) {
      console.log('✅ Root element content has changed (React likely mounted)');
    } else {
      console.warn('⚠️ Root element content unchanged (React might not have mounted)');
    }
    
    // Check for React DevTools
    const hasReactDevTools = typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';
    if (hasReactDevTools) {
      console.log('ℹ️ React DevTools detected');
      
      // Use DevTools to check if React is running
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers && 
          Object.keys(window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers).length > 0) {
        console.log('✅ React is rendering according to DevTools');
      }
    }
  }
  
  // Monitor module imports
  function monitorImports() {
    const originalImport = window.import;
    if (originalImport) {
      window.import = function(specifier) {
        console.log(`📦 Dynamic import: ${specifier}`);
        return originalImport.call(this, specifier)
          .catch(error => {
            console.error(`❌ Import failed for ${specifier}: ${error.message}`);
            throw error;
          });
      };
    }
  }
  
  // Check for common browser issues
  function checkBrowserEnvironment() {
    // Check for browser features needed by modern React
    if (!window.Promise) {
      console.error('❌ Promise API not available - React requires promises');
    }
    
    if (!window.fetch) {
      console.warn('⚠️ Fetch API not available - may cause issues with data loading');
    }
    
    // Check for localStorage availability (needed for many React apps)
    try {
      localStorage.setItem('react-mount-test', 'test');
      localStorage.removeItem('react-mount-test');
      console.log('✅ localStorage is available');
    } catch (e) {
      console.error('❌ localStorage is not available:', e.message);
      console.warn('⚠️ This may cause errors with libraries that depend on localStorage (like Datadog)');
    }
    
    // Detect private/incognito mode which can affect storage
    const isPrivateMode = () => {
      return new Promise(resolve => {
        const db = window.indexedDB.open('test');
        db.onerror = () => resolve(true);
        db.onsuccess = () => resolve(false);
      });
    };
    
    isPrivateMode().then(isPrivate => {
      if (isPrivate) {
        console.warn('⚠️ Private/incognito mode detected - may affect storage availability');
      }
    });
    
    // Check if document has focus
    if (!document.hasFocus()) {
      console.warn('⚠️ Document does not have focus - some React features may be throttled');
    }
  }
  
  // Setup React hook monitoring
  function monitorReactLifecycle() {
    // Create a MutationObserver to watch for DOM changes
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && 
            mutation.target.id === 'root' && 
            mutation.addedNodes.length > 0) {
          console.log('✅ Detected React rendering to DOM');
          
          // No need to keep watching once we've seen React render
          observer.disconnect();
          
          // Check for client-side routing
          setTimeout(() => {
            if (window.location.pathname !== '/' && document.getElementById('root').children.length > 0) {
              console.log('✅ Client-side routing appears to be working');
            }
          }, 1000);
          
          break;
        }
      }
    });
    
    // Start observing the root element
    const root = document.getElementById('root');
    if (root) {
      observer.observe(root, { childList: true, subtree: true });
    }
  }
  
  // Provide suggested fixes
  function suggestFixes(issues) {
    console.log('\n🔧 DIAGNOSTIC RESULTS:');
    
    if (issues.length === 0) {
      console.log('✅ No critical issues detected with React mounting');
      return;
    }
    
    issues.forEach((issue, i) => {
      console.log(`\nIssue ${i+1}: ${issue.problem}`);
      console.log(`Solution: ${issue.solution}`);
      if (issue.code) {
        console.log('Example:');
        console.log(issue.code);
      }
    });
  }
  
  // Wait for the page to load completely
  window.addEventListener('load', function() {
    console.log('🚀 Page loaded, running full React mounting diagnostics...');
    
    // Run all diagnostic checks
    checkReactLoaded();
    monitorScriptLoading();
    checkBrowserEnvironment();
    monitorReactLifecycle();
    
    // Wait a bit for React to mount before checking
    setTimeout(() => {
      checkReactMounting();
      checkErrorBoundaries();
      
      // Collect found issues
      const issues = [];
      
      // Check for common issues based on our diagnostics
      if (!reactInitialized) {
        issues.push({
          problem: 'React is not loaded properly',
          solution: 'Ensure React scripts are loading correctly and check for script errors in the console',
          code: '<script src="https://unpkg.com/react@17/umd/react.development.js"></script>\n<script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>'
        });
      }
      
      if (document.getElementById('root') === null) {
        issues.push({
          problem: 'Root element (#root) is missing',
          solution: 'Ensure there is a div with id="root" in your HTML',
          code: '<div id="root"></div>'
        });
      }
      
      if (reactVersion.startsWith('18') && !usingReactDOM18) {
        issues.push({
          problem: 'Using React 18 but not using createRoot API',
          solution: 'Update your code to use the React 18 createRoot API',
          code: 'import { createRoot } from "react-dom/client";\nconst root = createRoot(document.getElementById("root"));\nroot.render(<App />);'
        });
      }
      
      // Check for common ES modules issues
      const hasModuleScripts = document.querySelectorAll('script[type="module"]').length > 0;
      if (hasModuleScripts) {
        const errorLogs = Array.from(console.error.toString().match(/Failed to load module script/g) || []);
        if (errorLogs.length > 0) {
          issues.push({
            problem: 'Module loading errors detected',
            solution: 'Check that your server is configured to serve JS files with the correct MIME type (application/javascript)',
            code: '// Server configuration example (Express):\napp.use(express.static("public", {\n  setHeaders: (res, path) => {\n    if (path.endsWith(".js")) {\n      res.setHeader("Content-Type", "application/javascript");\n    }\n  }\n}));'
          });
        }
      }
      
      // Look for missing file extensions in imports (common Vite issue)
      const scripts = document.querySelectorAll('script');
      let foundMissingExtensions = false;
      
      scripts.forEach(script => {
        const content = script.textContent || '';
        if (content.includes('import') && 
            !content.match(/import.*from\s+['"][^'"]+\.(js|jsx|ts|tsx)['"]/) &&
            content.match(/import.*from\s+['"][^'"]+['"]/) &&
            !content.match(/import.*from\s+['"][^'"]+(react|react-dom).*['"]/)) {
          foundMissingExtensions = true;
        }
      });
      
      if (foundMissingExtensions) {
        issues.push({
          problem: 'Imports may be missing file extensions',
          solution: 'Add explicit file extensions to all imports',
          code: '// Change this:\nimport Component from "./Component"\n\n// To this:\nimport Component from "./Component.jsx"'
        });
      }
      
      // Suggest fixes
      suggestFixes(issues);
      
      // Add visual indicator to the page
      const statusElement = document.createElement('div');
      statusElement.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#333;color:#fff;padding:10px;font-family:monospace;z-index:9999;';
      
      if (issues.length > 0) {
        statusElement.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span>⚠️ ${issues.length} React mounting issue(s) detected. See console for details.</span>
            <button id="fix-react" style="background:#4CAF50;color:#fff;border:none;padding:5px 10px;cursor:pointer;border-radius:4px;">
              Try to Fix
            </button>
          </div>
        `;
        
        document.body.appendChild(statusElement);
        
        document.getElementById('fix-react')?.addEventListener('click', function() {
          // Try fixing common issues automatically
          if (document.getElementById('root') === null) {
            const newRoot = document.createElement('div');
            newRoot.id = 'root';
            document.body.appendChild(newRoot);
            console.log('✅ Created missing root element');
          }
          
          // Force reload the page with cache busting
          window.location.href = window.location.pathname + '?cacheBust=' + Date.now();
        });
      } else {
        // If no issues found but React still not mounted, something else might be wrong
        const rootElement = document.getElementById('root');
        const initialContentUnchanged = rootElement && initialHTML === rootElement.innerHTML;
        
        if (initialContentUnchanged) {
          statusElement.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span>🤔 React appears loaded but hasn't mounted content. Check for errors inside your React components.</span>
              <button id="force-refresh" style="background:#2196F3;color:#fff;border:none;padding:5px 10px;cursor:pointer;border-radius:4px;">
                Force Refresh
              </button>
            </div>
          `;
          
          document.body.appendChild(statusElement);
          
          document.getElementById('force-refresh')?.addEventListener('click', function() {
            window.location.href = window.location.pathname + '?forceCacheBust=' + Date.now();
          });
        }
      }
    }, 3000);
  });
})();