/**
 * Enhanced Mobile Detection Script for Go7
 * Handles mobile device detection and redirects
 */

console.log(" ✅ Enhanced Mobile Detection Script Loaded\);

// Simple mobile detection
function isMobileDevice() {
 return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Initialize mobile detection
(function() {
 const isMobile = isMobileDevice();
 const currentPath = window.location.pathname;
 
 console.log(Mobile detection: isMobile=, path=);
 
 // Simple mobile redirect logic can be added here if needed
 if (isMobile && !currentPath.includes(\mobile\)) {
 console.log(\Mobile device detected\);
 }
})();
