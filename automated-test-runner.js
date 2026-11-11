#!/usr/bin/env node
/**
 * GO7 AUTOMATED TESTING SCRIPT
 * This script performs automated tests on the GO7 application
 * Run with: node automated-test-runner.js
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_RESULTS = [];

// ANSI Color Codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Logging functions
function logSection(title) {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
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

// Test result tracking
function recordTest(category, testName, passed, details = '') {
  TEST_RESULTS.push({
    category,
    testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
}

// HTTP request helper
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

// ===========================
// TEST SUITE 1: ROUTE CHECKS
// ===========================
async function testRoutes() {
  logSection('🔍 TEST SUITE 1: ROUTE ACCESSIBILITY');
  
  const routes = [
    { path: '/', name: 'Homepage' },
    { path: '/book', name: 'Book Delivery' },
    { path: '/gobuy', name: 'GoBuy Shopping' },
    { path: '/restaurants', name: 'Restaurants' },
    { path: '/shops', name: 'Shops' },
    { path: '/pharmacy', name: 'Pharmacy' },
    { path: '/markets', name: 'Markets' },
    { path: '/checkout', name: 'Checkout' },
    { path: '/admin', name: 'Admin Login' },
    { path: '/vendor', name: 'Vendor Portal' },
    { path: '/rider', name: 'Rider Dashboard' },
    { path: '/profile', name: 'User Profile' },
    { path: '/track', name: 'Track Order' },
  ];

  for (const route of routes) {
    logTest(`${route.name} (${route.path})`);
    try {
      const response = await makeRequest(route.path);
      
      if (response.statusCode === 200) {
        logPass(`${route.name} is accessible`);
        recordTest('Routes', route.name, true, `Status: ${response.statusCode}`);
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        logWarning(`${route.name} redirects (may require auth)`);
        recordTest('Routes', route.name, true, `Redirect: ${response.statusCode}`);
      } else {
        logFail(`${route.name} returned ${response.statusCode}`);
        recordTest('Routes', route.name, false, `Status: ${response.statusCode}`);
      }
    } catch (error) {
      logFail(`${route.name} - ${error.message}`);
      recordTest('Routes', route.name, false, error.message);
    }
  }
}

// ===========================
// TEST SUITE 2: HTML CONTENT VERIFICATION
// ===========================
async function testContentPresence() {
  logSection('📄 TEST SUITE 2: CONTENT VERIFICATION');
  
  const contentTests = [
    { 
      path: '/', 
      name: 'Homepage - Hero Section',
      searchText: ['GO7', 'delivery', 'order', 'book']
    },
    {
      path: '/book',
      name: 'Book Delivery - Form Elements',
      searchText: ['pickup', 'dropoff', 'delivery', 'location']
    },
    {
      path: '/restaurants',
      name: 'Restaurants - Menu',
      searchText: ['restaurant', 'food', 'menu', 'order']
    }
  ];

  for (const test of contentTests) {
    logTest(test.name);
    try {
      const response = await makeRequest(test.path);
      
      if (response.statusCode === 200) {
        const bodyLower = response.body.toLowerCase();
        const foundTerms = test.searchText.filter(term => 
          bodyLower.includes(term.toLowerCase())
        );
        
        if (foundTerms.length >= 2) {
          logPass(`${test.name} contains expected content`);
          recordTest('Content', test.name, true, `Found: ${foundTerms.join(', ')}`);
        } else {
          logWarning(`${test.name} - Limited content found: ${foundTerms.join(', ')}`);
          recordTest('Content', test.name, false, `Only found: ${foundTerms.join(', ')}`);
        }
      } else {
        logFail(`${test.name} - Page not accessible`);
        recordTest('Content', test.name, false, `Status: ${response.statusCode}`);
      }
    } catch (error) {
      logFail(`${test.name} - ${error.message}`);
      recordTest('Content', test.name, false, error.message);
    }
  }
}

// ===========================
// TEST SUITE 3: ASSET LOADING
// ===========================
async function testAssetLoading() {
  logSection('🖼️ TEST SUITE 3: ASSET LOADING');
  
  logTest('Checking if main page loads assets');
  try {
    const response = await makeRequest('/');
    
    // Check for script tags
    const scriptMatches = response.body.match(/<script[^>]*src=['"]([^'"]*)['"]/gi);
    const styleMatches = response.body.match(/<link[^>]*href=['"]([^'"]*)['"]/gi);
    
    if (scriptMatches && scriptMatches.length > 0) {
      logPass(`Found ${scriptMatches.length} script references`);
      recordTest('Assets', 'JavaScript Loading', true, `${scriptMatches.length} scripts`);
    } else {
      logWarning('No script tags found');
      recordTest('Assets', 'JavaScript Loading', false, 'No scripts');
    }
    
    if (styleMatches && styleMatches.length > 0) {
      logPass(`Found ${styleMatches.length} stylesheet references`);
      recordTest('Assets', 'CSS Loading', true, `${styleMatches.length} stylesheets`);
    } else {
      logWarning('No stylesheet tags found');
      recordTest('Assets', 'CSS Loading', false, 'No stylesheets');
    }
  } catch (error) {
    logFail(`Asset check failed - ${error.message}`);
    recordTest('Assets', 'Asset Loading', false, error.message);
  }
}

// ===========================
// TEST SUITE 4: META TAGS & SEO
// ===========================
async function testMetaTags() {
  logSection('🏷️ TEST SUITE 4: META TAGS & SEO');
  
  logTest('Checking meta tags');
  try {
    const response = await makeRequest('/');
    const html = response.body;
    
    // Check for essential meta tags
    const checks = {
      'Title Tag': /<title>.*<\/title>/i.test(html),
      'Viewport Meta': /viewport/i.test(html),
      'Description Meta': /name=['"]description['"]/i.test(html),
      'Charset': /charset/i.test(html)
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

// ===========================
// TEST SUITE 5: SECURITY HEADERS
// ===========================
async function testSecurityHeaders() {
  logSection('🔒 TEST SUITE 5: SECURITY HEADERS');
  
  logTest('Checking security headers');
  try {
    const response = await makeRequest('/');
    const headers = response.headers;
    
    const securityChecks = {
      'X-Content-Type-Options': headers['x-content-type-options'],
      'X-Frame-Options': headers['x-frame-options'],
      'X-XSS-Protection': headers['x-xss-protection'],
      'Strict-Transport-Security': headers['strict-transport-security']
    };
    
    for (const [header, value] of Object.entries(securityChecks)) {
      if (value) {
        logPass(`${header}: ${value}`);
        recordTest('Security', header, true, value);
      } else {
        logWarning(`${header} not set`);
        recordTest('Security', header, false, 'Not set');
      }
    }
  } catch (error) {
    logFail(`Security header check failed - ${error.message}`);
    recordTest('Security', 'Headers', false, error.message);
  }
}

// ===========================
// GENERATE SUMMARY REPORT
// ===========================
function generateSummaryReport() {
  logSection('📊 TEST SUMMARY REPORT');
  
  const passed = TEST_RESULTS.filter(t => t.passed).length;
  const failed = TEST_RESULTS.filter(t => !t.passed).length;
  const total = TEST_RESULTS.length;
  const passRate = ((passed / total) * 100).toFixed(2);
  
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
    const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(0);
    
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
  const reportPath = './test-results-' + Date.now() + '.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: { total, passed, failed, passRate: passRate + '%' },
    tests: TEST_RESULTS
  }, null, 2));
  
  console.log(`\n${colors.cyan}Full report saved to: ${reportPath}${colors.reset}`);
}

// ===========================
// MAIN EXECUTION
// ===========================
async function runAllTests() {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          GO7 AUTOMATED TESTING SCRIPT                      ║');
  console.log('║          Testing URL: ' + BASE_URL.padEnd(39) + '║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  try {
    await testRoutes();
    await testContentPresence();
    await testAssetLoading();
    await testMetaTags();
    await testSecurityHeaders();
    
    generateSummaryReport();
    
    console.log(`\n${colors.green}${colors.bold}Testing complete!${colors.reset}\n`);
    
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

module.exports = { runAllTests, makeRequest };
