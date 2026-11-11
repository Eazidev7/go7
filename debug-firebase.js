// Debug Firebase Configuration
console.log('🔍 FIREBASE CONFIG DEBUG');
console.log('Environment variables:');
console.log('VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY);
console.log('VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log('VITE_FIREBASE_AUTH_DOMAIN:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);

import { auth } from './src/firebase/config.js';
console.log('Firebase auth instance:', auth);
console.log('Firebase auth app:', auth?.app);
console.log('Firebase auth app options:', auth?.app?.options);

if (auth?.app?.options) {
    console.log('✅ Using API Key:', auth.app.options.apiKey?.substring(0, 20) + '...');
    console.log('✅ Using Project ID:', auth.app.options.projectId);
} else {
    console.log('❌ Firebase auth not properly initialized');
}