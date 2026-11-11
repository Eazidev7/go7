/**
 * 🧹 CLEANUP ORPHANED AUTH USERS
 * 
 * This script helps clean up Firebase Auth users who don't have 
 * corresponding vendor profiles in Firestore
 */

import { initializeApp } from 'firebase/app';
import { getAuth, deleteUser, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, deleteDoc } from 'firebase/firestore';

// Firebase config (use your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyBmQwPSnQslo6Sq4NeYjAUi8iaZIYVlaBg",
  authDomain: "go7-delivery.firebaseapp.com", 
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "232009015458",
  appId: "1:232009015458:web:49dbb63a5a67112325f7fb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Clean up orphaned auth user for a specific email
 * @param {string} email - Email to clean up
 * @param {string} password - Password to authenticate
 */
export async function cleanupOrphanedAuth(email, password) {
  try {
    console.log(`🔍 Checking auth user for: ${email}`);
    
    // Try to sign in to get the user
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const uid = user.uid;
    
    console.log(`✅ Found auth user with UID: ${uid}`);
    
    // Check if vendor profile exists
    const vendorDoc = await getDoc(doc(db, 'vendors', uid));
    
    if (vendorDoc.exists()) {
      console.log(`⚠️  Vendor profile exists for ${email}. This is not an orphaned account.`);
      console.log('Vendor should use the login page instead of registering again.');
      return {
        success: false,
        message: 'Vendor profile exists. Use login page instead.'
      };
    }
    
    console.log(`🧹 No vendor profile found. Cleaning up orphaned auth user...`);
    
    // Delete the orphaned auth user
    await deleteUser(user);
    
    console.log(`✅ Successfully cleaned up orphaned auth user for: ${email}`);
    console.log(`🎉 ${email} can now register again.`);
    
    return {
      success: true,
      message: 'Orphaned auth user cleaned up successfully. You can now register again.'
    };
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    
    if (error.code === 'auth/user-not-found') {
      return {
        success: false,
        message: 'No auth user found for this email.'
      };
    } else if (error.code === 'auth/wrong-password') {
      return {
        success: false, 
        message: 'Incorrect password provided.'
      };
    } else if (error.code === 'auth/invalid-email') {
      return {
        success: false,
        message: 'Invalid email address format.'
      };
    }
    
    return {
      success: false,
      message: error.message
    };
  }
}

// Example usage (uncomment to use):
// cleanupOrphanedAuth('test@example.com', 'password123')
//   .then(result => console.log('Result:', result))
//   .catch(error => console.error('Error:', error));