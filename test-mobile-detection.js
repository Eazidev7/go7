// This script tests mobile detection and routing in the Go7 app
console.log(`
===== MOBILE DETECTION TEST INSTRUCTIONS =====

1. Open the homepage of the Go7 app
2. Open browser developer console (F12)
3. Run the test by typing: window.testMobileDetection()
4. Observe the logs in the console
5. Check if the mobile version displays after the viewport change

To access mobile version directly, navigate to: /mobile
To use the dedicated mobile access page, go to: /direct-mobile.html
`);
console.log('Testing mobile detection and routing...');

// Function to simulate different viewport sizes
function simulateViewport(width, height) {
  console.log(`Simulating viewport: ${width}x${height}`);
  
  // Store original window properties
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;
  
  // Override window properties
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
  
  // Create and dispatch resize event
  const resizeEvent = new Event('resize');
  window.dispatchEvent(resizeEvent);
  
  console.log(`Window inner dimensions now: ${window.innerWidth}x${window.innerHeight}`);
  
  // Return function to restore original values
  return () => {
    Object.defineProperty(window, 'innerWidth', { value: originalWidth, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalHeight, writable: true });
    window.dispatchEvent(new Event('resize'));
    console.log('Restored original viewport dimensions');
  };
}

// This function would be called from the browser's console
window.testMobileDetection = () => {
  console.log('Starting mobile detection tests...');
  console.log('Current window dimensions:', window.innerWidth, 'x', window.innerHeight);
  
  // Check if the mobile utilities are available
  if (typeof window.isMobileDevice === 'function') {
    console.log('Mobile detection function found in global scope');
    console.log('Current detection result:', window.isMobileDevice());
  } else {
    console.warn('Mobile detection function not found in global scope');
  }
  
  // Test small mobile size
  console.log('\n--- Testing small mobile size (375x667) ---');
  const restoreAfterMobile = simulateViewport(375, 667);
  console.log('Is mobile now?', window.innerWidth < 768);
  
  // Check if route handler reacts
  console.log('Current location:', window.location.pathname);
  console.log('To test mobile routing, navigate to homepage and then run this test again');
  
  // Restore after a timeout
  setTimeout(() => {
    restoreAfterMobile();
    console.log('Mobile detection test completed');
  }, 5000);
};

// Instructions for manual testing
console.log(`
===== MOBILE DETECTION TEST INSTRUCTIONS =====

1. Open the homepage of the Go7 app
2. Open browser developer console (F12)
3. Run the test by typing: window.testMobileDetection()
4. Observe the logs in the console
5. Check if the mobile version displays after the viewport change

To access mobile version directly, navigate to: /mobile
To use the dedicated mobile access page, go to: /direct-mobile.html
`);
