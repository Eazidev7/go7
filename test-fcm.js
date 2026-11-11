#!/usr/bin/env node
/**
 * Firebase FCM Tester - Verify all push notification functionality
 * Tests VAPID key, service worker, and FCM configuration
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Firebase FCM Configuration Tester');
console.log('=====================================');

/**
 * Test VAPID key configuration
 */
async function testVAPIDKey() {
  console.log('\n🔑 Testing VAPID Key Configuration...');
  
  try {
    const envPath = join(__dirname, '.env');
    const envContent = await readFile(envPath, 'utf8');
    
    const vapidMatch = envContent.match(/^VITE_FIREBASE_VAPID_KEY=(.+)$/m);
    
    if (!vapidMatch) {
      console.log('❌ VAPID key not found in .env file');
      return false;
    }
    
    const vapidKey = vapidMatch[1].trim();
    
    if (!vapidKey || vapidKey === '') {
      console.log('❌ VAPID key is empty');
      return false;
    }
    
    if (vapidKey.length !== 88) {
      console.log(`❌ VAPID key length is ${vapidKey.length}, should be 88`);
      return false;
    }
    
    if (!/^[A-Za-z0-9+/=_-]+$/.test(vapidKey)) {
      console.log('❌ VAPID key contains invalid characters');
      return false;
    }
    
    console.log('✅ VAPID key format is valid');
    console.log(`✅ Key length: ${vapidKey.length} characters`);
    console.log(`✅ Key preview: ${vapidKey.substring(0, 20)}...`);
    
    return true;
    
  } catch (error) {
    console.log('❌ Error testing VAPID key:', error.message);
    return false;
  }
}

/**
 * Test Firebase configuration
 */
async function testFirebaseConfig() {
  console.log('\n🔥 Testing Firebase Configuration...');
  
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN', 
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];
  
  try {
    const envPath = join(__dirname, '.env');
    const envContent = await readFile(envPath, 'utf8');
    
    let allValid = true;
    
    for (const varName of requiredVars) {
      const regex = new RegExp(`^${varName}=(.+)$`, 'm');
      const match = envContent.match(regex);
      
      if (!match || !match[1] || match[1].trim() === '') {
        console.log(`❌ ${varName}: Missing or empty`);
        allValid = false;
      } else {
        console.log(`✅ ${varName}: OK`);
      }
    }
    
    return allValid;
    
  } catch (error) {
    console.log('❌ Error testing Firebase config:', error.message);
    return false;
  }
}

/**
 * Test service worker file
 */
async function testServiceWorker() {
  console.log('\n👷 Testing Firebase Service Worker...');
  
  try {
    const swPath = join(__dirname, 'public', 'firebase-messaging-sw.js');
    const swContent = await readFile(swPath, 'utf8');
    
    // Check for required components
    const checks = [
      { name: 'Firebase app import', pattern: /firebase-app-compat\.js/ },
      { name: 'Firebase messaging import', pattern: /firebase-messaging-compat\.js/ },
      { name: 'Firebase config object', pattern: /firebaseConfig\s*=/ },
      { name: 'Project ID', pattern: /go7-delivery/ },
      { name: 'Background message handler', pattern: /onBackgroundMessage/ },
      { name: 'Notification click handler', pattern: /notificationclick/ }
    ];
    
    let allValid = true;
    
    for (const check of checks) {
      if (check.pattern.test(swContent)) {
        console.log(`✅ ${check.name}: Found`);
      } else {
        console.log(`❌ ${check.name}: Missing`);
        allValid = false;
      }
    }
    
    return allValid;
    
  } catch (error) {
    console.log('❌ Error testing service worker:', error.message);
    return false;
  }
}

/**
 * Generate test summary
 */
function generateTestSummary(vapidValid, configValid, swValid) {
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  console.log(`🔑 VAPID Key: ${vapidValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔥 Firebase Config: ${configValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`👷 Service Worker: ${swValid ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = vapidValid && configValid && swValid;
  
  console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 Firebase FCM is properly configured!');
    console.log('📱 Push notifications should work correctly');
    console.log('🚀 Your Go7 delivery app is ready for production FCM');
  } else {
    console.log('\n🔧 Issues found that need attention:');
    if (!vapidValid) console.log('  - Fix VAPID key configuration');
    if (!configValid) console.log('  - Fix Firebase environment variables');
    if (!swValid) console.log('  - Fix service worker configuration');
  }
  
  return allPassed;
}

/**
 * Main test execution
 */
async function main() {
  try {
    console.log('🚀 Starting Firebase FCM tests...\n');
    
    const vapidValid = await testVAPIDKey();
    const configValid = await testFirebaseConfig();
    const swValid = await testServiceWorker();
    
    const allPassed = generateTestSummary(vapidValid, configValid, swValid);
    
    if (allPassed) {
      console.log('\n🌐 Ready for testing in browser:');
      console.log('1. Open http://localhost:3000');
      console.log('2. Check browser console for FCM logs');
      console.log('3. Try requesting notification permission');
      console.log('4. Verify no VAPID key errors appear');
    }
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);