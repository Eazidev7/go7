// Firebase Domain Check Script
// This helps diagnose Firebase authentication issues

const firebaseConfig = {
  apiKey: 'AIzaSyBmQwPSnQslo6Sq4NeYjAUi8iaZIYVlaBg',
  authDomain: 'go7-delivery.firebaseapp.com',
  projectId: 'go7-delivery',
};

console.log('🔍 Firebase Configuration Check\n');
console.log('Project ID:', firebaseConfig.projectId);
console.log('Auth Domain:', firebaseConfig.authDomain);
console.log('API Key:', firebaseConfig.apiKey.substring(0, 20) + '...');
console.log('\n📍 Current Origin:', typeof window !== 'undefined' ? window.location.origin : 'N/A');
console.log('Current Host:', typeof window !== 'undefined' ? window.location.host : 'N/A');
console.log('\n✅ Required Authorized Domains in Firebase Console:');
console.log('   1. localhost');
console.log('   2. 127.0.0.1');
console.log('   3. go7-delivery.firebaseapp.com (auto-added)');
console.log('   4. go7-delivery.web.app (auto-added)');
console.log('\n🔗 Fix at: https://console.firebase.google.com/project/go7-delivery/authentication/settings');
console.log('\n📋 Steps to Fix:');
console.log('   1. Go to Firebase Console');
console.log('   2. Select "Authentication" → "Settings"');
console.log('   3. Scroll to "Authorized domains"');
console.log('   4. Click "Add domain" and add: localhost');
console.log('   5. Click "Add domain" and add: 127.0.0.1');
console.log('   6. Save changes');
console.log('\n⚠️ If still failing, check Google Cloud Console:');
console.log('   https://console.cloud.google.com/apis/credentials?project=go7-delivery');
console.log('   - Find API key and ensure "Identity Toolkit API" is enabled');
console.log('   - Set application restrictions to "None" or add localhost to HTTP referrers');
