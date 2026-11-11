// Test script to verify Market and Pharmacy pages functionality
// This can be run in the browser console when the app is loaded

console.log('🧪 Testing Go7 Market and Pharmacy Pages');

const testPages = () => {
  // Test routes
  const routes = [
    { path: '/market', name: 'Market Page' },
    { path: '/pharmacy', name: 'Pharmacy Page' }
  ];

  routes.forEach(route => {
    console.log(`✅ ${route.name} route: ${window.origin}${route.path}`);
  });

  // Test if pages are accessible
  console.log('\n📱 To test the new pages:');
  console.log('1. Navigate to http://localhost:5173/market for Local Market');
  console.log('2. Navigate to http://localhost:5173/pharmacy for Pharmacy');
  console.log('3. Use the mobile homepage category buttons');
  console.log('4. Use the new quick action buttons');

  // Test vendor service
  if (window.location.pathname === '/market' || window.location.pathname === '/pharmacy') {
    console.log('\n🏪 Vendor data should be loading...');
    
    // Check if elements exist
    const searchBar = document.querySelector('input[placeholder*="Search"]');
    const categoryButtons = document.querySelectorAll('button[data-category], .rounded-full');
    const vendorCards = document.querySelectorAll('.bg-white.rounded-xl');
    
    console.log(`📍 Search bar found: ${!!searchBar}`);
    console.log(`🏷️ Category buttons found: ${categoryButtons.length}`);
    console.log(`🏪 Vendor cards found: ${vendorCards.length}`);
  }
};

// Run tests
testPages();

// Export for manual testing
window.testGo7Pages = testPages;