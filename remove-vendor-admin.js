// Firebase Admin SDK script to remove vendor
// This uses service account credentials for admin access

import admin from 'firebase-admin';

// Initialize Firebase Admin with default credentials
// Make sure you're authenticated with: firebase login
try {
  admin.initializeApp({
    projectId: 'go7-delivery'
  });
} catch (error) {
  console.log('Firebase already initialized or error:', error.message);
}

const db = admin.firestore();

const removeVendorById = async (vendorId, vendorName = 'Unknown') => {
  try {
    console.log(`🗑️ Removing vendor: ${vendorName} (ID: ${vendorId})`);
    
    // Get all products for this vendor
    const productsRef = db.collection('vendors').doc(vendorId).collection('products');
    const productsSnapshot = await productsRef.get();
    
    // Remove all products and their addons
    const batch = db.batch();
    let deleteCount = 0;
    
    for (const productDoc of productsSnapshot.docs) {
      console.log(`  🗑️ Removing product: ${productDoc.id}`);
      
      // Get all addons for this product
      const addonsRef = db.collection('vendors').doc(vendorId).collection('products').doc(productDoc.id).collection('addons');
      const addonsSnapshot = await addonsRef.get();
      
      // Delete all addons
      for (const addonDoc of addonsSnapshot.docs) {
        console.log(`    🗑️ Removing addon: ${addonDoc.id}`);
        batch.delete(addonDoc.ref);
        deleteCount++;
      }
      
      // Delete the product
      batch.delete(productDoc.ref);
      deleteCount++;
    }
    
    // Delete the vendor document
    const vendorRef = db.collection('vendors').doc(vendorId);
    batch.delete(vendorRef);
    deleteCount++;
    
    // Commit all deletions
    await batch.commit();
    
    console.log(`✅ Successfully removed vendor ${vendorName}`);
    console.log(`📊 Total items deleted: ${deleteCount}`);
    console.log('🔄 Vendor should now be removed from mobile page!');
    
  } catch (error) {
    console.error('❌ Error removing vendor:', error);
  }
};

// Remove the specific vendor with guy image
const main = async () => {
  try {
    // Remove the "sweet sensation" vendor with ID: fW4EoEvkVpPmNtIMmNYit06xrl02
    await removeVendorById('fW4EoEvkVpPmNtIMmNYit06xrl02', 'sweet sensation (guy image)');
    
    console.log('\n✅ Removal completed!');
    console.log('🔄 Please refresh your mobile page to see the changes.');
    
  } catch (error) {
    console.error('❌ Error in main function:', error);
  } finally {
    process.exit(0);
  }
};

// Run the removal
main();