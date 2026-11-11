/**
 * Enhanced Mobile Detection with Immediate Redirect
 * This script automatically detects mobile devices and redirects to mobile interface
 */

console.log('Enhanced Mobile Detection Script Loading...');

// Enhanced mobile detection function
function detectMobileDevice() {
  // Check 1: Screen width (primary detection method)
  const screenWidth = window.innerWidth;
  const isMobileByWidth = screenWidth <= 768;
  
  // Check 2: User agent detection
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'android', 'webos', 'iphone', 'ipad', 'ipod', 
    'blackberry', 'iemobile', 'opera mini', 'mobile'
  ];
  const isMobileByUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
  
  // Check 3: Touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check 4: Force mobile from localStorage or URL
  const urlParams = new URLSearchParams(window.location.search);
  const forceMobileParam = urlParams.get('forceMobile');
  const forceMobileStorage = localStorage.getItem('forceMobile');
  
  let forceMobile = false;
  if (forceMobileParam === 'true' || forceMobileParam === '1') {
    forceMobile = true;
    localStorage.setItem('forceMobile', 'true');
  } else if (forceMobileParam === 'false' || forceMobileParam === '0') {
    forceMobile = false;
    localStorage.setItem('forceMobile', 'false');
  } else if (forceMobileStorage === 'true') {
    forceMobile = true;
  }
  
  // Final decision: prioritize screen width, then user agent + touch
  const isMobile = forceMobile || isMobileByWidth || (isMobileByUA && isTouchDevice);
  
  console.log('Mobile Detection Results:', {
    screenWidth,
    isMobileByWidth,
    isMobileByUA,
    isTouchDevice,
    forceMobile,
    finalResult: isMobile ? 'MOBILE' : 'DESKTOP'
  });
  
  return isMobile;
}

// Function to perform immediate mobile redirect
function performMobileRedirect() {
  const isMobile = detectMobileDevice();
  const currentPath = window.location.pathname;
  
  console.log('Current path: ' + currentPath + ' | Device: ' + (isMobile ? 'MOBILE' : 'DESKTOP'));
  
  // Only redirect if we detect mobile and we're not already on a mobile path
  if (isMobile && currentPath !== '/mobile' && !currentPath.startsWith('/mobile/') && !currentPath.includes('mobile')) {
    console.log('REDIRECTING TO MOBILE INTERFACE...');
    
    // Use replace() to avoid back button issues
    window.location.replace('/mobile');
    return true;
  }
  
  // If we're on mobile path but not mobile device, redirect to home
  if (!isMobile && (currentPath === '/mobile' || currentPath.startsWith('/mobile/'))) {
    console.log('REDIRECTING TO DESKTOP INTERFACE...');
    window.location.replace('/');
    return true;
  }
  
  console.log('No redirect needed - correct interface for device type');
  return false;
}

// Function to render fallback mobile interface if needed
function renderFallbackMobileInterface() {
  if (window.location.pathname === '/mobile') {
    setTimeout(() => {
      const rootElement = document.getElementById('root');
      if (!rootElement || rootElement.children.length === 0) {
        console.log('React failed to render, showing fallback mobile interface');
        
        rootElement.innerHTML = `
          <div style="
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background-color: #f5f5f5;
            min-height: 100vh;
            padding: 20px;
          ">
            <div style="
              background-color: #E30613;
              color: white;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              text-align: center;
            ">
              <h1 style="margin: 0; font-size: 24px;">Go7 Mobile</h1>
              <p style="margin: 5px 0 0 0;">Mobile Interface Active</p>
            </div>
            <div style="
              background-color: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              margin-bottom: 20px;
            ">
              <h2 style="color: #E30613; margin: 0 0 15px 0;">Mobile View Loaded</h2>
              <p>The mobile interface is now active. This is a fallback view while the React component loads.</p>
              <div style="background: #E5FFE5; padding: 10px; border-radius: 5px; margin-top: 15px; border: 1px solid #00CC00;">
                <strong>Mobile Detection Successful</strong><br>
                You are now viewing the mobile-optimized interface.
              </div>
            </div>
            <div style="
              display: flex;
              gap: 10px;
              overflow-x: auto;
              padding-bottom: 10px;
              margin-bottom: 20px;
            ">
              <div style="
                flex-shrink: 0;
                background: #f0f0f0;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                min-width: 80px;
              ">
                <div style="font-size: 24px;">🍔</div>
                <div style="font-size: 12px; margin-top: 5px;">Food</div>
              </div>
              <div style="
                flex-shrink: 0;
                background: #E30613;
                color: white;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                min-width: 80px;
              ">
                <div style="font-size: 24px;">🛒</div>
                <div style="font-size: 12px; margin-top: 5px;">Market</div>
              </div>
              <div style="
                flex-shrink: 0;
                background: #f0f0f0;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                min-width: 80px;
              ">
                <div style="font-size: 24px;">💊</div>
                <div style="font-size: 12px; margin-top: 5px;">Pharmacy</div>
              </div>
            </div>
            <button onclick="window.location.reload()" style="
              background: #333;
              color: white;
              border: none;
              padding: 12px 15px;
              border-radius: 5px;
              font-weight: bold;
              width: 100%;
              font-size: 16px;
              cursor: pointer;
            ">
              Reload Mobile Interface
            </button>
          </div>
        `;
      }
    }, 1500);
  }
}

// Execute mobile detection and redirect immediately
console.log('Starting mobile detection and redirect process...');

// Run detection immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready - executing mobile redirect');
    if (!performMobileRedirect()) {
      renderFallbackMobileInterface();
    }
  });
} else {
  console.log('DOM already ready - executing mobile redirect immediately');
  if (!performMobileRedirect()) {
    renderFallbackMobileInterface();
  }
}

// Also run on window load as a safety net
window.addEventListener('load', () => {
  console.log('Window loaded - final mobile redirect check');
  performMobileRedirect();
});

// Make functions globally available
window.detectMobileDevice = detectMobileDevice;
window.performMobileRedirect = performMobileRedirect;

// Export for other scripts
window.mobileDetection = {
  detectMobileDevice,
  performMobileRedirect,
  forceMobileView: () => {
    localStorage.setItem('forceMobile', 'true');
    window.location.replace('/mobile');
  },
  forceDesktopView: () => {
    localStorage.setItem('forceMobile', 'false');
    if (window.location.pathname === '/mobile') {
      window.location.replace('/');
    }
  }
};

console.log('Enhanced Mobile Detection Script Loaded and Active');