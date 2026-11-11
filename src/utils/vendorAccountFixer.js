/**
 * Vendor Account Fixer Utility
 * Detects and fixes orphaned vendor accounts (auth exists but no Firestore doc)
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Check and fix a vendor account by email
 * @param {string} email - The email address to check
 * @returns {Promise<Object>} Result object with status and message
 */
export async function fixVendorAccountByEmail(email) {
  try {
    console.log('🔧 Checking vendor account for:', email);
    
    const functions = getFunctions();
    const fixVendorAccount = httpsCallable(functions, 'fixVendorAccount');
    
    const result = await fixVendorAccount({ email });
    
    console.log('✅ Fix result:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Error fixing vendor account:', error);
    throw error;
  }
}

/**
 * Run cleanup for all orphaned accounts (admin only)
 * @param {boolean} deleteOrphaned - Whether to actually delete orphaned accounts
 * @returns {Promise<Object>} Cleanup results
 */
export async function cleanupOrphanedAccounts(deleteOrphaned = false) {
  try {
    console.log('🧹 Running orphaned account cleanup...');
    
    const functions = getFunctions();
    const cleanupOrphanedVendorAccounts = httpsCallable(functions, 'cleanupOrphanedVendorAccounts');
    
    const result = await cleanupOrphanedVendorAccounts({ deleteOrphaned });
    
    console.log('✅ Cleanup results:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    throw error;
  }
}
