// Test Firebase Authentication
// Run this in the browser console to diagnose auth issues

console.log('%c🔥 Firebase Authentication Test', 'color: orange; font-size: 16px; font-weight: bold');
console.log('='.repeat(50));

// 1. Check environment variables
console.log('\n1️⃣ Environment Variables:');
console.log('API Key:', import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing');
console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID || '❌ Missing');
console.log('Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '❌ Missing');

// 2. Check Firebase initialization
console.log('\n2️⃣ Firebase Initialization:');
import { auth } from './firebase/config';
console.log('Auth instance:', auth ? '✅ Initialized' : '❌ Not initialized');
if (auth) {
  console.log('Current user:', auth.currentUser?.email || 'Not signed in');
}

// 3. Test authentication
console.log('\n3️⃣ Testing Authentication...');
import { signInWithEmailAndPassword } from 'firebase/auth';

// You can run this manually:
console.log('To test login, run:');
console.log(`testLogin('your-email@example.com', 'your-password')`);

window.testLogin = async (email, password) => {
  try {
    console.log('Attempting login...');
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Login successful!', result.user.email);
    return result;
  } catch (error) {
    console.error('❌ Login failed:', error.code, error.message);
    return error;
  }
};

console.log('\n' + '='.repeat(50));
console.log('%c✅ Test script loaded. Check results above.', 'color: green; font-weight: bold');
