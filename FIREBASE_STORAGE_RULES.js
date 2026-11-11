/**
 * 🔥 FIREBASE STORAGE SECURITY RULES
 * Configuration for GO7 vendor image uploads
 */

// Add this to your Firebase Storage Rules in the Firebase Console:
// https://console.firebase.google.com/project/go7-delivery/storage/go7-delivery.firebasestorage.app/rules

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload vendor logos
    match /vendors/{vendorId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == vendorId;
    }
    
    // Allow authenticated users to upload product images
    match /products/{productId}/{allPaths=**} {
      allow read: if true; // Public read for product images
      allow write: if request.auth != null;
    }
    
    // Allow authenticated users to upload profile images
    match /profiles/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read access for general assets
    match /assets/{allPaths=**} {
      allow read: if true;
    }
  }
}

/*
SETUP INSTRUCTIONS:

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your GO7 project
3. Navigate to Storage → Rules
4. Replace the default rules with the rules above
5. Click "Publish" to deploy the new rules

WHAT THESE RULES DO:
- Vendors can upload/manage their own logos and images
- Product images are publicly readable but require auth to write
- Profile images are private to each user
- General assets are publicly readable
- All writes require authentication

SECURITY FEATURES:
✅ Prevents unauthorized uploads
✅ Allows vendors to manage their own content
✅ Protects user privacy
✅ Enables public product viewing
*/