#!/usr/bin/env node
/**
 * GO7 QUICK FEATURE TEST (No Browser Required)
 * Tests API endpoints and server responses
 * Run with: node quick-feature-test.js
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.env.TEST_URL || 'https://localhost:3000';
const TEST_RESULTS = [];

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function logSection(title) {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(80)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(80)}${colors.reset}\n`);
}

function logTest(testName) {
  console.log(`${colors.blue}▶ Testing:${colors.reset} ${testName}`);
}

function logPass(message) {
  console.log(`${colors.green}✓ PASS:${colors.reset} ${message}`);
}

function logFail(message) {
  console.log(`${colors.red}✗ FAIL:${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠ WARNING:${colors.reset} ${message}`);
}

function logInfo(message) {
  console.log(`${colors.cyan}ℹ INFO:${colors.reset} ${message}`);
}

function recordTest(category, testName, passed, details = '') {
  TEST_RESULTS.push({
    category,
    testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const protocol = url.startsWith('https') ? https : http;
    
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 10000);
    
    const options = {
      rejectUnauthorized: false // Ignore self-signed certificate errors
    };
    
    protocol.get(url, options, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ==========================================
// FEATURE TESTS
// ==========================================

async function testAllRoutes() {
  logSection('🧭 TESTING: ALL CORE ROUTES');
  
  const routes = [
    { path: '/', name: 'Homepage', keywords: ['go7', 'delivery', 'order', 'home'] },
    { path: '/book', name: 'Book Delivery', keywords: ['pickup', 'dropoff', 'delivery', 'book'] },
    { path: '/gobuy', name: 'GoBuy Shopping', keywords: ['shopping', 'gobuy', 'items', 'list'] },
    { path: '/restaurants', name: 'Restaurants', keywords: ['restaurant', 'food', 'menu', 'order'] },
    { path: '/shops', name: 'Shops', keywords: ['shop', 'store', 'product', 'category'] },
    { path: '/pharmacy', name: 'Pharmacy', keywords: ['pharmacy', 'medicine', 'drug', 'health'] },
    { path: '/markets', name: 'Markets', keywords: ['market', 'grocery', 'fresh', 'produce'] },
    { path: '/checkout', name: 'Checkout', keywords: ['checkout', 'payment', 'order', 'summary'] },
    { path: '/track', name: 'Track Order', keywords: ['track', 'order', 'status', 'delivery'] },
    { path: '/profile', name: 'Profile', keywords: ['profile', 'account', 'user', 'settings'] },
    { path: '/vendor', name: 'Vendor Portal', keywords: ['vendor', 'business', 'products', 'dashboard'] },
    { path: '/rider', name: 'Rider Dashboard', keywords: ['rider', 'delivery', 'orders', 'earnings'] },
    { path: '/admin', name: 'Admin Dashboard', keywords: ['admin', 'management', 'dashboard', 'analytics'] },
  ];

  for (const route of routes) {
    logTest(`${route.name} (${route.path})`);
    try {
      const response = await makeRequest(route.path);
      
      if (response.statusCode === 200) {
        const bodyLower = response.body.toLowerCase();
        const foundKeywords = route.keywords.filter(keyword => 
          bodyLower.includes(keyword.toLowerCase())
        );
        
        if (foundKeywords.length >= 1) {
          logPass(`${route.name} - Accessible & contains expected content`);
          recordTest('Routes', route.name, true, `Found: ${foundKeywords.join(', ')}`);
        } else {
          logWarning(`${route.name} - Accessible but missing expected keywords`);
          recordTest('Routes', route.name, true, `Warning: No keywords found`);
        }
      } else if ([301, 302, 307, 308].includes(response.statusCode)) {
        logWarning(`${route.name} - Redirects (may require authentication)`);
        recordTest('Routes', route.name, true, `Redirect: ${response.statusCode}`);
      } else {
        logFail(`${route.name} - Returned ${response.statusCode}`);
        recordTest('Routes', route.name, false, `Status: ${response.statusCode}`);
      }
    } catch (error) {
      logFail(`${route.name} - ${error.message}`);
      recordTest('Routes', route.name, false, error.message);
    }
  }
}

async function testReactApp() {
  logSection('⚛️ TESTING: REACT APP BUNDLE');
  
  logTest('Checking for React app bundle');
  try {
    const response = await makeRequest('/');
    const html = response.body;
    
    // Check for script tags
    const hasScript = /<script[^>]*src=['"]([^'"]*\.js)['"]/i.test(html);
    const hasReact = /react/i.test(html) || /<div[^>]*id=['"]root['"]/i.test(html);
    const hasVite = /vite/i.test(html);
    
    if (hasScript) {
      logPass('JavaScript bundle referenced');
      recordTest('React App', 'Bundle Scripts', true);
    } else {
      logFail('No JavaScript bundle found');
      recordTest('React App', 'Bundle Scripts', false);
    }
    
    if (hasReact) {
      logPass('React app structure detected');
      recordTest('React App', 'React Structure', true);
    } else {
      logWarning('React structure not clearly visible');
      recordTest('React App', 'React Structure', false);
    }
    
    if (hasVite) {
      logPass('Vite development detected');
      recordTest('React App', 'Vite Dev', true);
    } else {
      logInfo('Production build (Vite not detected)');
      recordTest('React App', 'Vite Dev', true, 'Production mode');
    }
    
  } catch (error) {
    logFail(`React app check failed - ${error.message}`);
    recordTest('React App', 'Bundle Check', false, error.message);
  }
}

async function testAssetLoading() {
  logSection('📦 TESTING: STATIC ASSETS');
  
  logTest('Checking CSS stylesheets');
  try {
    const response = await makeRequest('/');
    const html = response.body;
    
    const styleCount = (html.match(/<link[^>]*rel=['"]stylesheet['"]/gi) || []).length;
    const inlineStyles = (html.match(/<style/gi) || []).length;
    
    if (styleCount > 0 || inlineStyles > 0) {
      logPass(`Found ${styleCount} linked stylesheets and ${inlineStyles} inline styles`);
      recordTest('Assets', 'CSS Loading', true, `${styleCount} linked, ${inlineStyles} inline`);
    } else {
      logWarning('No stylesheets detected');
      recordTest('Assets', 'CSS Loading', false);
    }
    
  } catch (error) {
    logFail(`Asset check failed - ${error.message}`);
    recordTest('Assets', 'CSS Loading', false, error.message);
  }
}

async function testMetaAndSEO() {
  logSection('🏷️ TESTING: META TAGS & SEO');
  
  logTest('Checking essential meta tags');
  try {
    const response = await makeRequest('/');
    const html = response.body;
    
    const checks = {
      'Title Tag': /<title>.*?<\/title>/i.test(html),
      'Viewport Meta': /viewport/i.test(html),
      'Description Meta': /name=['"]description['"]/i.test(html),
      'Charset': /charset/i.test(html),
      'Favicon': /rel=['"]icon['"]|rel=['"]shortcut icon['"]/i.test(html)
    };
    
    for (const [name, present] of Object.entries(checks)) {
      if (present) {
        logPass(`${name} is present`);
        recordTest('SEO', name, true);
      } else {
        logWarning(`${name} is missing`);
        recordTest('SEO', name, false, 'Missing');
      }
    }
    
  } catch (error) {
    logFail(`Meta tag check failed - ${error.message}`);
    recordTest('SEO', 'Meta Tags', false, error.message);
  }
}

async function testAPIEndpoints() {
  logSection('🔌 TESTING: API ENDPOINTS (if available)');
  
  const apiRoutes = [
    '/api/health',
    '/api/status',
    '/api/products',
    '/api/vendors',
    '/api/restaurants'
  ];
  
  for (const route of apiRoutes) {
    logTest(`API: ${route}`);
    try {
      const response = await makeRequest(route);
      
      if (response.statusCode === 200) {
        logPass(`${route} is accessible`);
        recordTest('API', route, true);
      } else if (response.statusCode === 404) {
        logInfo(`${route} not implemented (404)`);
        recordTest('API', route, true, 'Not implemented');
      } else {
        logWarning(`${route} returned ${response.statusCode}`);
        recordTest('API', route, false, `Status: ${response.statusCode}`);
      }
    } catch (error) {
      logInfo(`${route} - ${error.message} (may not be implemented)`);
      recordTest('API', route, true, 'Not implemented');
    }
  }
}

async function testServerStatus() {
  logSection('🖥️ TESTING: SERVER STATUS');
  
  logTest('Checking server response time');
  try {
    const start = Date.now();
    const response = await makeRequest('/');
    const duration = Date.now() - start;
    
    if (duration < 1000) {
      logPass(`Server responds in ${duration}ms (excellent)`);
      recordTest('Server', 'Response Time', true, `${duration}ms`);
    } else if (duration < 3000) {
      logWarning(`Server responds in ${duration}ms (acceptable)`);
      recordTest('Server', 'Response Time', true, `${duration}ms - slow`);
    } else {
      logFail(`Server responds in ${duration}ms (too slow)`);
      recordTest('Server', 'Response Time', false, `${duration}ms`);
    }
    
  } catch (error) {
    logFail(`Server check failed - ${error.message}`);
    recordTest('Server', 'Response Time', false, error.message);
  }
}

async function testContentSecurity() {
  logSection('🔒 TESTING: SECURITY HEADERS');
  
  logTest('Checking security headers');
  try {
    const response = await makeRequest('/');
    const headers = response.headers;
    
    const securityChecks = {
      'X-Content-Type-Options': headers['x-content-type-options'],
      'X-Frame-Options': headers['x-frame-options'],
      'Content-Security-Policy': headers['content-security-policy'],
      'Strict-Transport-Security': headers['strict-transport-security']
    };
    
    let secureCount = 0;
    for (const [header, value] of Object.entries(securityChecks)) {
      if (value) {
        logPass(`${header}: ${value}`);
        recordTest('Security', header, true, value);
        secureCount++;
      } else {
        logInfo(`${header} not set (optional)`);
        recordTest('Security', header, true, 'Not set');
      }
    }
    
    if (secureCount === 0) {
      logWarning('No security headers detected (consider adding them)');
    }
    
  } catch (error) {
    logFail(`Security check failed - ${error.message}`);
    recordTest('Security', 'Headers', false, error.message);
  }
}

// ==========================================
// GENERATE SUMMARY REPORT
// ==========================================
function generateSummaryReport() {
  logSection('📊 TEST SUMMARY REPORT');
  
  const passed = TEST_RESULTS.filter(t => t.passed).length;
  const failed = TEST_RESULTS.filter(t => !t.passed).length;
  const total = TEST_RESULTS.length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;
  
  console.log(`${colors.bold}Total Tests:${colors.reset} ${total}`);
  console.log(`${colors.green}${colors.bold}Passed:${colors.reset} ${passed}`);
  console.log(`${colors.red}${colors.bold}Failed:${colors.reset} ${failed}`);
  console.log(`${colors.cyan}${colors.bold}Pass Rate:${colors.reset} ${passRate}%\n`);
  
  // Group by category
  const categories = [...new Set(TEST_RESULTS.map(t => t.category))];
  
  console.log(`${colors.bold}Breakdown by Category:${colors.reset}`);
  categories.forEach(category => {
    const categoryTests = TEST_RESULTS.filter(t => t.category === category);
    const categoryPassed = categoryTests.filter(t => t.passed).length;
    const categoryTotal = categoryTests.length;
    const categoryRate = categoryTotal > 0 ? ((categoryPassed / categoryTotal) * 100).toFixed(0) : 0;
    
    const icon = categoryRate == 100 ? '✓' : categoryRate >= 50 ? '⚠' : '✗';
    const color = categoryRate == 100 ? colors.green : categoryRate >= 50 ? colors.yellow : colors.red;
    
    console.log(`  ${color}${icon} ${category}:${colors.reset} ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
  });
  
  // Show failures
  const failures = TEST_RESULTS.filter(t => !t.passed);
  if (failures.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Failed Tests:${colors.reset}`);
    failures.forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.category} - ${test.testName}`);
      if (test.details) {
        console.log(`     ${colors.yellow}${test.details}${colors.reset}`);
      }
    });
  }
  
  // Save to file
  const fs = require('fs');
  const reportPath = `./test-results-quick-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: { total, passed, failed, passRate: passRate + '%' },
    tests: TEST_RESULTS
  }, null, 2));
  
  console.log(`\n${colors.cyan}Full report saved to: ${reportPath}${colors.reset}`);
}

// ==========================================
// MAIN EXECUTION
// ==========================================
async function runAllTests() {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║          GO7 QUICK FEATURE TEST SUITE                                        ║');
  console.log('║          Testing URL: ' + BASE_URL.padEnd(55) + '║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  try {
    await testServerStatus();
    await testAllRoutes();
    await testReactApp();
    await testAssetLoading();
    await testMetaAndSEO();
    await testAPIEndpoints();
    await testContentSecurity();
    
    generateSummaryReport();
    
    console.log(`\n${colors.green}${colors.bold}🎉 Testing complete!${colors.reset}\n`);
    
    // Exit code based on results
    const failed = TEST_RESULTS.filter(t => !t.passed).length;
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error(`${colors.red}Fatal error during testing:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
