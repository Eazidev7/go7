// VAPID Key Validator and Fixer for Go7 Delivery
// Run this script to validate and fix your Firebase Cloud Messaging VAPID key

console.log('🔧 Go7 VAPID Key Validator & Fixer');
console.log('=====================================');

// Check current VAPID key from .env
const vapidKey = process.env.VITE_FIREBASE_VAPID_KEY || 'NOT_SET';

console.log('\n📋 Current VAPID Key Status:');
console.log('Key Length:', vapidKey.length);
console.log('Key Preview:', vapidKey.substring(0, 20) + '...');

// Validate VAPID key format
const isValidFormat = vapidKey.length === 88 && /^[A-Za-z0-9+/=]+$/.test(vapidKey);

console.log('\n✅ Validation Results:');
console.log('- Length Check (should be 88):', vapidKey.length === 88 ? '✅' : '❌');
console.log('- Format Check (base64):', /^[A-Za-z0-9+/=]+$/.test(vapidKey) ? '✅' : '❌');
console.log('- Overall Valid:', isValidFormat ? '✅' : '❌');

if (!isValidFormat) {
  console.log('\n🚨 VAPID Key Issues Found!');
  console.log('\n📝 To Fix This Issue:');
  console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
  console.log('2. Select project: go7-delivery');
  console.log('3. Go to Project Settings ⚙️ → Cloud Messaging');
  console.log('4. Scroll to "Web Push certificates" section');
  console.log('5. Click "Generate key pair" or copy existing key');
  console.log('6. Replace VITE_FIREBASE_VAPID_KEY in your .env file');
  console.log('\n💡 The key should be exactly 88 characters and look like:');
  console.log('   BMxvzKdxthpQSlYAJ9jKhb123abc...xyz (88 characters total)');
  
  // Create a sample .env entry
  console.log('\n📄 Your .env file should contain:');
  console.log('VITE_FIREBASE_VAPID_KEY=YOUR_ACTUAL_88_CHAR_KEY_HERE');
} else {
  console.log('\n🎉 VAPID Key looks good!');
}

// Additional Firebase project info
console.log('\n🔥 Your Firebase Project Info:');
console.log('Project ID: go7-delivery');
console.log('Sender ID: 232009015458');
console.log('Auth Domain: go7-delivery.firebaseapp.com');

console.log('\n🌐 Firebase Console Link:');
console.log('https://console.firebase.google.com/project/go7-delivery/settings/cloudmessaging/');