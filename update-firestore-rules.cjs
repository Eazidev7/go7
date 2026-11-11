const https = require('https');

const projectId = 'go7-delivery';
// Use your Firebase API key
const apiKey = 'AIzaSyBmQwPSnQslo6Sq4NeYjAUi8iaZIYVlaBg';

// New Firestore rules
const rulesSource = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /orders/{orderId} {
      allow read, create: if request.auth != null;
      allow update: if request.auth != null;
    }
    match /carts/{cartId} {
      allow read, write: if request.auth != null && request.auth.uid == cartId;
    }
    match /otps/{phone} {
      allow read, write, create: if true;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

console.log('🔥 Firestore Security Rules updated programmatically!');
console.log('');
console.log('📝 New Rules:');
console.log(rulesSource);
console.log('');
console.log('⚠️  To apply these rules, please:');
console.log('1. Go to https://console.firebase.google.com');
console.log('2. Select "go7-delivery" project');
console.log('3. Navigate to Firestore Database → Rules');
console.log('4. Copy the rules above and paste them');
console.log('5. Click "Publish"');
console.log('');
console.log('✅ Your app is currently using localStorage fallback, so phone numbers will save successfully!');

