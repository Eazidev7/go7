import { initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import admin from 'firebase-admin';

// Initialize Firebase Admin
const app = initializeApp({
  projectId: 'go7-delivery',
  storageBucket: 'go7-delivery.firebasestorage.app'
});

async function initializeStorage() {
  try {
    console.log('🔥 Initializing Firebase Storage...');
    
    const bucket = getStorage().bucket();
    
    // Try to get bucket metadata
    const [metadata] = await bucket.getMetadata();
    console.log('✅ Storage bucket exists:', metadata.name);
    console.log('📊 Bucket details:', {
      name: metadata.name,
      location: metadata.location,
      created: metadata.timeCreated
    });
    
    // Set CORS configuration
    console.log('🔧 Setting CORS configuration...');
    await bucket.setCorsConfiguration([
      {
        origin: ['*'],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
        maxAgeSeconds: 3600,
        responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'X-Requested-With']
      }
    ]);
    console.log('✅ CORS configuration set successfully');
    
    console.log('');
    console.log('✅ Firebase Storage is ready to use!');
    console.log('');
    console.log('Next step: Deploy storage rules');
    console.log('Run: firebase deploy --only storage');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('This usually means Storage needs to be enabled in Firebase Console first.');
    console.error('Go to: https://console.firebase.google.com/project/go7-delivery/storage');
    console.error('Click "Get Started" → "Start in production mode" → "Done"');
  }
  
  process.exit(0);
}

initializeStorage();
