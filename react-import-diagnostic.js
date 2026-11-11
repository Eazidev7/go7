/**
 * React Module Resolver Diagnostic Tool
 * 
 * This specialized utility helps identify import resolution issues
 * that commonly occur with React applications, especially in Vite environments.
 * 
 * Usage:
 * 1. Include this script in your HTML
 * 2. Call ReactImportDiagnostic.diagnose() to run the diagnostics
 */

const ReactImportDiagnostic = (function() {
  // Configuration
  const config = {
    verbose: true,
    checkFileExtensions: true,
    checkModuleFormats: true,
    checkMimeTypes: true,
    checkReactMounting: true,
    monitorNetwork: true,
    monitorConsoleErrors: true
  };
  
  // Storage for all issues found
  const issues = [];
  
  // Helper to add an issue
  function addIssue(type, description, severity, solution) {
    issues.push({
      type,
      description,
      severity, // 'critical', 'warning', or 'info'
      solution,
      timestamp: new Date()
    });
    
    if (config.verbose) {
      const prefix = severity === 'critical' ? '🔴' : severity === 'warning' ? '🟠' : '🔵';
      console.log(`${prefix} [${type}] ${description}`);
      if (solution) console.log(`   Solution: ${solution}`);
    }
  }
  
  // Check import syntax in a file or script tag
  function checkImportSyntax(code, filename = 'inline script') {
    // Find all import statements
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)?(?:\s*,\s*(?:{[^}]*}|\*\s+as\s+\w+))?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    let missingExtensions = [];
    let nonRelativePaths = [];
    
    while ((match = importRegex.exec(code)) !== null) {
      const importPath = match[1];
      
      // Check for missing file extensions for relative imports
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        if (!importPath.match(/\.\w+$/)) {
          missingExtensions.push(importPath);
        }
      } 
      // Check non-relative imports that might need mapping
      else if (!importPath.startsWith('@') && !importPath.includes('/')) {
        // This is likely a package import, which is fine
      } 
      // Check non-relative paths that aren't package imports
      else if (!importPath.startsWith('@') && !importPath.startsWith('http')) {
        nonRelativePaths.push(importPath);
      }
    }
    
    // Report missing extensions
    if (missingExtensions.length > 0) {
      addIssue(
        'import-syntax',
        `Found ${missingExtensions.length} imports without file extensions in ${filename}`,
        'warning',
        'Add explicit file extensions (.js, .jsx, etc.) to imports: ' + missingExtensions.join(', ')
      );
    }
    
    // Report non-relative paths that might cause issues
    if (nonRelativePaths.length > 0) {
      addIssue(
        'import-paths',
        `Found ${nonRelativePaths.length} non-relative import paths that may need path mapping in ${filename}`,
        'info',
        'Consider using relative paths or configure path aliases in your bundler'
      );
    }
  }
  
  // Check for MIME type issues
  function checkMimeTypeConfiguration() {
    // Create a test request for different file types
    const fileTypes = [
      { ext: 'js', expected: 'application/javascript' },
      { ext: 'jsx', expected: 'application/javascript' },
      { ext: 'mjs', expected: 'application/javascript' },
      { ext: 'json', expected: 'application/json' },
      { ext: 'css', expected: 'text/css' }
    ];
    
    // Create a test file name that won't exist but will test MIME type configuration
    const testPath = `/mime-test-${Date.now()}`;
    
    // Test each file extension
    fileTypes.forEach(type => {
      fetch(`${testPath}.${type.ext}`, { method: 'HEAD' })
        .then(response => {
          const contentType = response.headers.get('content-type') || '';
          
          // We expect a 404, but we want to check the MIME type the server would use
          if (!contentType.includes(type.expected)) {
            addIssue(
              'mime-type',
              `Incorrect MIME type for .${type.ext} files: got "${contentType}" instead of "${type.expected}"`,
              'critical',
              `Configure your server to serve .${type.ext} files with "${type.expected}" MIME type`
            );
          }
        })
        .catch(() => {
          // This will likely fail with a 404, which is fine
          // We're just checking the response headers
        });
    });
  }
  
  // Monitor network requests for common issues
  function monitorNetworkRequests() {
    if (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes && 
        PerformanceObserver.supportedEntryTypes.includes('resource')) {
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only check JS, JSX, CSS, and JSON files
          if (!/\.(js|jsx|mjs|css|json)(\?|$)/.test(entry.name)) continue;
          
          // Check for failed requests (HTTP errors)
          if (!entry.responseStatus) {
            // Chrome doesn't provide responseStatus, so we check transferSize
            if (entry.transferSize === 0 && entry.duration > 0) {
              addIssue(
                'network',
                `Failed to load resource: ${entry.name.split('/').pop()}`,
                'critical',
                'Check if the file exists and the path is correct'
              );
            }
          } else if (entry.responseStatus >= 400) {
            addIssue(
              'network',
              `Failed to load resource: ${entry.name.split('/').pop()} (HTTP ${entry.responseStatus})`,
              'critical',
              'Check if the file exists and the path is correct'
            );
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }
  }
  
  // Monitor for console errors related to modules
  function monitorConsoleErrors() {
    const originalError = console.error;
    
    console.error = function(...args) {
      const errorMessage = args.join(' ');
      
      // Check for common module-related errors
      if (errorMessage.includes('Failed to load module script')) {
        addIssue(
          'module-loading',
          'Failed to load module script: ' + errorMessage,
          'critical',
          'Check MIME types and import paths'
        );
      } 
      else if (errorMessage.includes('Cannot find module')) {
        addIssue(
          'module-resolution',
          'Module resolution error: ' + errorMessage,
          'critical',
          'Check if the module exists and the import path is correct'
        );
      }
      else if (errorMessage.includes('Unexpected token')) {
        addIssue(
          'syntax',
          'JavaScript syntax error: ' + errorMessage,
          'critical',
          'Check for syntax errors in your code'
        );
      }
      
      // Call the original console.error
      originalError.apply(console, args);
    };
  }
  
  // Check for React mounting issues
  function checkReactMounting() {
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
      addIssue(
        'react-availability',
        'React and/or ReactDOM is not defined in global scope',
        'critical',
        'Make sure React and ReactDOM are properly loaded before your application code'
      );
      return;
    }
    
    // Try to identify root elements
    const potentialRoots = ['root', 'app', 'react-root', 'react-app', 'application'];
    const foundRoots = potentialRoots.filter(id => document.getElementById(id));
    
    if (foundRoots.length === 0) {
      addIssue(
        'react-root',
        'No potential React root element found',
        'critical',
        'Make sure you have a container element with an ID like "root" for React to mount to'
      );
      return;
    }
    
    // Check if any roots have been mounted to
    setTimeout(() => {
      const emptyRoots = foundRoots.filter(id => {
        const el = document.getElementById(id);
        return el && el.children.length === 0;
      });
      
      if (emptyRoots.length > 0 && emptyRoots.length === foundRoots.length) {
        addIssue(
          'react-mounting',
          'React has not mounted to any root element after 1 second',
          'critical',
          'Check for errors in your React initialization code and make sure ReactDOM.render() is called'
        );
      }
    }, 1000);
  }
  
  // Check if this is a Vite environment
  function detectViteEnvironment() {
    const isVite = Boolean(window.__vite__);
    
    if (isVite) {
      addIssue(
        'environment',
        'Vite development environment detected',
        'info',
        'Make sure imports include file extensions (.js) and check for HMR-related issues'
      );
    }
    
    return isVite;
  }
  
  // Helper to inject a test component
  function injectTestComponent() {
    // Create a diagnostic panel
    const panel = document.createElement('div');
    panel.id = 'react-import-diagnostic-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 400px;
      max-height: 300px;
      overflow-y: auto;
      background-color: rgba(0,0,0,0.8);
      color: #fff;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 5px;
      z-index: 10000;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #555;
    `;
    
    const title = document.createElement('div');
    title.textContent = 'React Import Diagnostic';
    title.style.fontWeight = 'bold';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'X';
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
    `;
    closeButton.onclick = () => panel.remove();
    
    header.appendChild(title);
    header.appendChild(closeButton);
    panel.appendChild(header);
    
    const content = document.createElement('div');
    content.id = 'react-import-diagnostic-content';
    panel.appendChild(content);
    
    document.body.appendChild(panel);
    
    return content;
  }
  
  // Display issues in the UI
  function displayIssues() {
    const container = document.getElementById('react-import-diagnostic-content') || injectTestComponent();
    
    if (issues.length === 0) {
      container.innerHTML = '<div style="color: #4caf50;">No issues detected</div>';
      return;
    }
    
    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    const warningIssues = issues.filter(issue => issue.severity === 'warning');
    const infoIssues = issues.filter(issue => issue.severity === 'info');
    
    container.innerHTML = '';
    
    if (criticalIssues.length > 0) {
      const criticalSection = document.createElement('div');
      criticalSection.innerHTML = `<div style="color: #f44336; margin-top: 10px;">Critical Issues (${criticalIssues.length})</div>`;
      
      criticalIssues.forEach(issue => {
        const issueElem = document.createElement('div');
        issueElem.style.margin = '5px 0';
        issueElem.style.padding = '5px';
        issueElem.style.borderLeft = '2px solid #f44336';
        issueElem.innerHTML = `
          <div>${issue.description}</div>
          <div style="color: #8bc34a; font-size: 11px;">${issue.solution || ''}</div>
        `;
        criticalSection.appendChild(issueElem);
      });
      
      container.appendChild(criticalSection);
    }
    
    if (warningIssues.length > 0) {
      const warningSection = document.createElement('div');
      warningSection.innerHTML = `<div style="color: #ff9800; margin-top: 10px;">Warnings (${warningIssues.length})</div>`;
      
      warningIssues.forEach(issue => {
        const issueElem = document.createElement('div');
        issueElem.style.margin = '5px 0';
        issueElem.style.padding = '5px';
        issueElem.style.borderLeft = '2px solid #ff9800';
        issueElem.innerHTML = `
          <div>${issue.description}</div>
          <div style="color: #8bc34a; font-size: 11px;">${issue.solution || ''}</div>
        `;
        warningSection.appendChild(issueElem);
      });
      
      container.appendChild(warningSection);
    }
    
    if (infoIssues.length > 0) {
      const infoSection = document.createElement('div');
      infoSection.innerHTML = `<div style="color: #2196f3; margin-top: 10px;">Info (${infoIssues.length})</div>`;
      
      infoIssues.forEach(issue => {
        const issueElem = document.createElement('div');
        issueElem.style.margin = '5px 0';
        issueElem.style.padding = '5px';
        issueElem.style.borderLeft = '2px solid #2196f3';
        issueElem.innerHTML = `
          <div>${issue.description}</div>
          <div style="color: #8bc34a; font-size: 11px;">${issue.solution || ''}</div>
        `;
        infoSection.appendChild(issueElem);
      });
      
      container.appendChild(infoSection);
    }
  }
  
  // Main diagnostic function
  function diagnose(options = {}) {
    // Apply options
    Object.assign(config, options);
    
    console.log('📊 Starting React Import Diagnostic...');
    
    // Detect environment
    const isVite = detectViteEnvironment();
    
    // Run various checks
    if (config.checkMimeTypes) {
      checkMimeTypeConfiguration();
    }
    
    if (config.monitorNetwork) {
      monitorNetworkRequests();
    }
    
    if (config.monitorConsoleErrors) {
      monitorConsoleErrors();
    }
    
    // Check inline scripts
    if (config.checkFileExtensions) {
      document.querySelectorAll('script:not([src])').forEach((script, index) => {
        if (script.type === 'module') {
          checkImportSyntax(script.textContent, `inline-script-${index}`);
        }
      });
    }
    
    // Check React mounting
    if (config.checkReactMounting) {
      setTimeout(checkReactMounting, 500);
    }
    
    // Display issues after a short delay
    setTimeout(() => {
      displayIssues();
      
      // Schedule updates to catch new issues
      setInterval(displayIssues, 2000);
    }, 1000);
    
    return {
      getIssues: () => [...issues],
      displayIssues
    };
  }
  
  // Public API
  return {
    diagnose,
    getIssues: () => [...issues],
    displayIssues
  };
})();

// Auto-initialize when included in a script tag
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ReactImportDiagnostic.diagnose();
  });
} else {
  ReactImportDiagnostic.diagnose();
}