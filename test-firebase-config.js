// Test Firebase Configuration
// Run this in browser console at http://localhost:8080/

console.log('%c🔥 Firebase Configuration Test', 'color: orange; font-size: 16px; font-weight: bold');

// Test 1: Check environment variables
console.log('\n📋 Environment Variables:');
const envVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

envVars.forEach(varName => {
  const value = import.meta.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.error(`❌ ${varName}: MISSING`);
  }
});

// Test 2: Check Firebase initialization
console.log('\n🔥 Firebase Services:');
try {
  const { auth, db } = await import('./firebaseConfig.js');
  console.log('✅ auth:', auth ? 'Initialized' : 'Not initialized');
  console.log('✅ db:', db ? 'Initialized' : 'Not initialized');
  
  if (auth && db) {
    console.log('%c\n✅ SUCCESS: Firebase is properly configured!', 'color: green; font-size: 14px; font-weight: bold');
  } else {
    console.error('%c\n❌ ERROR: Firebase services not initialized', 'color: red; font-size: 14px; font-weight: bold');
  }
} catch (error) {
  console.error('%c\n❌ ERROR: Failed to import Firebase config', 'color: red; font-size: 14px; font-weight: bold');
  console.error(error);
}

// Test 3: Check API key format
console.log('\n🔑 API Key Validation:');
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
if (apiKey && apiKey.startsWith('AIza')) {
  console.log('✅ API key format looks correct (starts with AIza)');
} else {
  console.error('❌ API key format looks incorrect');
}

console.log('\n%c📝 Next: Try signing in to test authentication', 'color: blue; font-size: 12px');
