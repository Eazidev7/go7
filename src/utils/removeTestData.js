/**
 * 🗑️ TEST DATA REMOVER
 * Removes seeded test data from Firebase
 */

import { collection, doc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export const removeTestData = async () => {
  console.log('🗑️ Removing test data...');
  
  try {
    // Test vendor IDs that were created by seedTestData
    const testVendorIds = [
      'test-vendor-1',
      'test-vendor-2',
      'sweet-sensations',
      'quick-bites', 
      'healthy-choices',
      'coffee-corner'
    ];
    
    for (const vendorId of testVendorIds) {
      console.log(`🗑️ Removing vendor: ${vendorId}`);
      
      try {
        // First, remove all products for this vendor
        const productsRef = collection(db, 'vendors', vendorId, 'products');
        const productsSnapshot = await getDocs(productsRef);
        
        for (const productDoc of productsSnapshot.docs) {
          console.log(`  🗑️ Removing product: ${productDoc.id}`);
          
          // Remove addons subcollection if it exists
          const addonsRef = collection(db, 'vendors', vendorId, 'products', productDoc.id, 'addons');
          const addonsSnapshot = await getDocs(addonsRef);
          
          for (const addonDoc of addonsSnapshot.docs) {
            console.log(`    🗑️ Removing addon: ${addonDoc.id}`);
            await deleteDoc(doc(db, 'vendors', vendorId, 'products', productDoc.id, 'addons', addonDoc.id));
          }
          
          // Remove the product
          await deleteDoc(doc(db, 'vendors', vendorId, 'products', productDoc.id));
        }
        
        // Finally, remove the vendor
        await deleteDoc(doc(db, 'vendors', vendorId));
        console.log(`✅ Removed vendor: ${vendorId}`);
        
      } catch (error) {
        console.log(`⚠️ Vendor ${vendorId} doesn't exist or already removed`);
      }
    }
    
    console.log('✅ Test data removal completed!');
    return { success: true, message: 'Test data removed successfully' };
    
  } catch (error) {
    console.error('❌ Error removing test data:', error);
    return { success: false, error: error.message };
  }
};