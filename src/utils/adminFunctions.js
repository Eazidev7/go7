// Admin functions for removing vendors
// Add this to any page and call from browser console

import { db } from './src/config/firebase.js';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

window.adminRemoveVendor = async (vendorId) => {
  try {
    console.log(`🗑️ Removing vendor: ${vendorId}`);
    
    // Remove all products first
    const productsRef = collection(db, 'vendors', vendorId, 'products');
    const productsSnapshot = await getDocs(productsRef);
    
    for (const productDoc of productsSnapshot.docs) {
      console.log(`  🗑️ Removing product: ${productDoc.id}`);
      
      // Remove addons
      const addonsRef = collection(db, 'vendors', vendorId, 'products', productDoc.id, 'addons');
      const addonsSnapshot = await getDocs(addonsRef);
      
      for (const addonDoc of addonsSnapshot.docs) {
        await deleteDoc(doc(db, 'vendors', vendorId, 'products', productDoc.id, 'addons', addonDoc.id));
      }
      
      // Remove product
      await deleteDoc(doc(db, 'vendors', vendorId, 'products', productDoc.id));
    }
    
    // Remove the vendor
    await deleteDoc(doc(db, 'vendors', vendorId));
    console.log(`✅ Successfully removed vendor: ${vendorId}`);
    alert('Vendor removed! Refresh the page to see changes.');
    
  } catch (error) {
    console.error('❌ Error removing vendor:', error);
    alert('Error: ' + error.message);
  }
};

window.adminRemoveSweetSensation = () => {
  return window.adminRemoveVendor('fW4EoEvkVpPmNtIMmNYit06xrl02');
};

console.log('🔧 Admin functions loaded! Use:');
console.log('- window.adminRemoveSweetSensation() to remove the guy image vendor');
console.log('- window.adminRemoveVendor("vendorId") to remove any vendor by ID');