// REACT DEBUG HELPER
// This script helps check and fix any issues with React not mounting properly

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔍 React Debug Helper active');
  
  // Check if React is loaded
  const reactLoaded = typeof React !== 'undefined';
  console.log(`✓ React loaded: ${reactLoaded}`);
  
  // Check if the root element exists
  const rootElement = document.getElementById('root');
  console.log(`✓ Root element exists: ${!!rootElement}`);
  
  // Check if the page is still showing loading message
  const loadingMessage = document.body.textContent.includes('loading') || 
                        document.body.textContent.includes('Loading');
  console.log(`✓ Loading message showing: ${loadingMessage}`);
  
  // Set a timeout to force React to mount if it hasn't after 3 seconds
  setTimeout(() => {
    // Check if React content is in the root element, not just anywhere on the page
    const rootElement = document.getElementById('root');
    
    // Better detection of React mounting - check if root element has different content than initial
    const initialContentIncludesLoading = rootElement && 
      (rootElement.textContent.includes('loading') || rootElement.textContent.includes('Loading'));
    
    const stillLoading = initialContentIncludesLoading;
    
    if (stillLoading) {
      console.warn('⚠️ React still not mounted after 3 seconds');
      console.log('� Adding diagnostic tools instead of refreshing...');
      
      // Add diagnostic buttons instead of auto-refreshing
      const diagContainer = document.createElement('div');
      diagContainer.style.cssText = 'position:fixed;top:10px;right:10px;display:flex;flex-direction:column;gap:10px;z-index:9999;';
      
      // Refresh button
      const refreshButton = document.createElement('button');
      refreshButton.innerHTML = 'Force Refresh';
      refreshButton.style.cssText = 'padding:10px;background:#e61e25;color:white;border:none;border-radius:4px;cursor:pointer;';
      refreshButton.addEventListener('click', () => {
        window.location.reload(true); // Force reload from server
      });
      diagContainer.appendChild(refreshButton);
      
      // Mount diagnostic button
      const diagButton = document.createElement('button');
      diagButton.innerHTML = 'Run Mount Diagnostic';
      diagButton.style.cssText = 'padding:10px;background:#0066cc;color:white;border:none;border-radius:4px;cursor:pointer;';
      diagButton.addEventListener('click', () => {
        window.location.href = '/mount-diagnostic';
      });
      diagContainer.appendChild(diagButton);
      
      // Comprehensive diagnostic button
      const fullDiagButton = document.createElement('button');
      fullDiagButton.innerHTML = 'Full Diagnostic';
      fullDiagButton.style.cssText = 'padding:10px;background:#4caf50;color:white;border:none;border-radius:4px;cursor:pointer;';
      fullDiagButton.addEventListener('click', () => {
        window.location.href = '/diagnostic';
      });
      diagContainer.appendChild(fullDiagButton);
      
      document.body.appendChild(diagContainer);
      
      // Add info banner
      const infoBanner = document.createElement('div');
      infoBanner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:rgba(0,0,0,0.8);color:white;padding:15px;font-family:sans-serif;z-index:9998;';
      infoBanner.innerHTML = '<strong>React isn\'t mounting.</strong> This could be due to module loading errors or browser storage issues. Check the browser console for details or use the diagnostic tools.';
      document.body.appendChild(infoBanner);
    } else {
      console.log('✅ React successfully mounted');
    }
  }, 3000);
});