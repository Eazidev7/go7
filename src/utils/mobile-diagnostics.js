// Mobile diagnostics script
// This script helps diagnose issues with mobile detection and rendering

console.log('Mobile Diagnostics Script Loaded');

// Function to check if the device is mobile based on various signals
function detectMobile() {
  console.log('Running mobile detection...');

  const results = {
    userAgent: false,
    screenSize: false,
    touchPoints: false,
    orientation: false
  };

  // 1. User agent check
  const userAgentCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  results.userAgent = userAgentCheck;
  console.log('User agent indicates mobile:', userAgentCheck);

  // 2. Screen size check
  const MOBILE_BREAKPOINT = 768;
  const screenSizeCheck = window.innerWidth <= MOBILE_BREAKPOINT;
  results.screenSize = screenSizeCheck;
  console.log('Screen width:', window.innerWidth, 'px (Mobile:', screenSizeCheck, ')');

  // 3. Touch points check
  const touchPointsCheck = 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0;
  results.touchPoints = touchPointsCheck;
  console.log('Touch points:', navigator.maxTouchPoints, '(Mobile:', touchPointsCheck, ')');

  // 4. Orientation capability check
  const orientationCheck = typeof window.orientation !== 'undefined' || navigator.userAgent.indexOf('Mobile') !== -1;
  results.orientation = orientationCheck;
  console.log('Orientation capable:', orientationCheck);

  // Overall result
  const isMobile = screenSizeCheck || (userAgentCheck && (touchPointsCheck || orientationCheck));
  const forceResult = getQueryParam('forceMobile');
  
  let finalResult = isMobile;
  
  if (forceResult === 'true' || forceResult === '1') {
    finalResult = true;
    console.log('Mobile view FORCED via URL parameter');
  } else if (forceResult === 'false' || forceResult === '0') {
    finalResult = false;
    console.log('Desktop view FORCED via URL parameter');
  }

  console.log('FINAL DETECTION RESULT - Is Mobile:', finalResult);
  return finalResult;
}

// Get URL query parameters
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Test if the mobile routing works
function testMobileRouting() {
  console.log('Testing mobile routing...');
  const isMobile = detectMobile();
  const currentPath = window.location.pathname;
  
  console.log('Current path:', currentPath);
  
  // Check if we need to redirect
  if (isMobile && currentPath !== '/mobile' && !currentPath.includes('/mobile/')) {
    console.log('Mobile detected but not on mobile path. Should redirect to /mobile');
    
    // Don't actually redirect, just log what would happen
    console.log('Would redirect to:', '/mobile');
  } else if (!isMobile && (currentPath === '/mobile' || currentPath.includes('/mobile/'))) {
    console.log('Desktop detected but on mobile path. Should redirect to /');
    
    // Don't actually redirect, just log what would happen
    console.log('Would redirect to:', '/');
  } else {
    console.log('Current path matches device type. No redirect needed.');
  }
}

// Create diagnostic display
function showDiagnosticInfo() {
  console.log('Creating diagnostic display...');
  
  const isMobile = detectMobile();
  
  // Create diagnostic overlay
  const overlay = document.createElement('div');
  overlay.id = 'mobileDiagnosticOverlay';
  overlay.style.position = 'fixed';
  overlay.style.bottom = '0';
  overlay.style.left = '0';
  overlay.style.right = '0';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
  overlay.style.color = 'white';
  overlay.style.padding = '10px';
  overlay.style.fontSize = '12px';
  overlay.style.zIndex = '9999';
  overlay.style.fontFamily = 'monospace';
  
  // Create content
  const content = document.createElement('div');
  content.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <strong style="font-size: 14px;">Mobile Diagnostics</strong>
      <button id="closeMobileDiagnostics" style="background: none; border: 1px solid white; color: white; cursor: pointer; border-radius: 3px;">Close</button>
    </div>
    <div style="margin-bottom: 5px;">
      <span style="color: ${isMobile ? '#00ff00' : '#ff9900'};">Detection Result: ${isMobile ? 'MOBILE' : 'DESKTOP'}</span>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 8px;">
      <div>• User Agent: <span style="color: ${navigator.userAgent.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i) ? '#00ff00' : '#ff9900'};">${navigator.userAgent.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i) ? 'Mobile' : 'Desktop'}</span></div>
      <div>• Screen Width: <span style="color: ${window.innerWidth <= 768 ? '#00ff00' : '#ff9900'};">${window.innerWidth}px</span></div>
      <div>• Touch Points: <span style="color: ${'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0 ? '#00ff00' : '#ff9900'};">${'maxTouchPoints' in navigator ? navigator.maxTouchPoints : 'N/A'}</span></div>
      <div>• Current Path: <span>${window.location.pathname}</span></div>
    </div>
    <div style="font-size: 11px;">
      <span>To force mobile view: <code style="background: rgba(255,255,255,0.2); padding: 1px 3px; border-radius: 3px;">?forceMobile=true</code></span>
    </div>
  `;
  
  overlay.appendChild(content);
  
  // Add to body when DOM is loaded
  if (document.body) {
    document.body.appendChild(overlay);
    
    // Add event listener for close button
    document.getElementById('closeMobileDiagnostics').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(overlay);
      
      // Add event listener for close button
      document.getElementById('closeMobileDiagnostics').addEventListener('click', () => {
        document.body.removeChild(overlay);
      });
    });
  }
}

// Check if we're already running diagnostics
if (!window.mobileDiagnosticsRunning) {
  window.mobileDiagnosticsRunning = true;
  
  // Run tests
  detectMobile();
  testMobileRouting();
  
  // Setup diagnostics display
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', showDiagnosticInfo);
  } else {
    showDiagnosticInfo();
  }
}

// Export for possible use by other scripts
window.mobileDiagnostics = {
  detectMobile,
  testMobileRouting,
  showDiagnosticInfo
};