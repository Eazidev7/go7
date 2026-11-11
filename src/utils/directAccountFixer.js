/**
 * Direct Account Fixer - Works without Cloud Functions
 * Uses Firebase Admin operations directly from the client
 */

import { getAuth, deleteUser, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Check if an account is orphaned and fix it
 * @param {string} email - Email to check
 * @param {string} password - Password to authenticate
 * @returns {Promise<Object>} Result object
 */
export async function fixOrphanedAccount(email, password) {
  const auth = getAuth();
  
  try {
    console.log('🔍 Checking account for:', email);

    // Try to sign in with the credentials
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        return {
          status: 'no_account',
          message: 'No account exists. You can register.'
        };
      }
      if (authError.code === 'auth/wrong-password') {
        return {
          status: 'wrong_password',
          message: 'Incorrect password.'
        };
      }
      throw authError;
    }

    const user = userCredential.user;
    console.log('✅ Auth successful, UID:', user.uid);

    // Check if vendor document exists
    const vendorRef = doc(db, 'vendors', user.uid);
    const vendorSnap = await getDoc(vendorRef);

    if (vendorSnap.exists()) {
      return {
        status: 'complete',
        message: 'Account is complete. Redirecting to dashboard...',
        vendorId: user.uid
      };
    }

    // Orphaned account found - delete it
    console.log('🗑️ Orphaned account detected. Deleting...');
    
    try {
      await deleteUser(user);
      console.log('✅ Orphaned account deleted');
      
      return {
        status: 'fixed',
        message: 'Account issue resolved! Please register again.',
        action: 'deleted_orphaned_auth_user'
      };
    } catch (deleteError) {
      console.error('❌ Could not delete user:', deleteError);
      
      // Sign out if deletion fails
      await auth.signOut();
      
      return {
        status: 'partial_fix',
        message: 'Account signed out. Please try registering with a different email or contact support.',
        error: deleteError.message
      };
    }

  } catch (error) {
    console.error('❌ Error:', error);
    return {
      status: 'error',
      message: 'An error occurred: ' + error.message,
      error: error.message
    };
  }
}
