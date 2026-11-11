/**
 * 🔄 MIGRATION SCRIPT: Move legacy products to vendor menus
 * One-time script to migrate old product structure
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBmQwPSnQslo6Sq4NeYjAUi8iaZIYVlaBg",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "232009015458",
  appId: "1:232009015458:web:49dbb63a5a67112325f7fb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateProductsToVendorMenus() {
  console.log('🔄 Starting migration...');
  
  try {
    // Get all vendors
    const vendorsSnap = await getDocs(collection(db, 'vendors'));
    console.log(`📋 Found ${vendorsSnap.size} vendors`);
    
    // Check for legacy products collection
    let productsSnap;
    try {
      productsSnap = await getDocs(collection(db, 'products'));
      console.log(`📦 Found ${productsSnap.size} legacy products`);
    } catch (e) {
      console.log('✅ No legacy products collection found - nothing to migrate');
      return;
    }
    
    if (productsSnap.size === 0) {
      console.log('✅ No products to migrate');
      return;
    }
    
    // Migrate products to first vendor (or distribute as needed)
    for (const vendorDoc of vendorsSnap.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      
      console.log(`\n🏪 Processing vendor: ${vendorData.restaurantName || vendorData.name || vendorId}`);
      
      let migratedCount = 0;
      
      for (const productDoc of productsSnap.docs) {
        const product = productDoc.data();
        
        // Create menu item from product
        const menuItem = {
          name: product.name || 'Unnamed Item',
          description: product.description || '',
          basePrice: product.price || product.basePrice || 0,
          unitLabel: product.unit || product.unitLabel || 'plate',
          addOns: product.addOns || [],
          imageUrl: product.imageUrl || product.image || '',
          isAvailable: product.isAvailable !== false,
          createdAt: new Date(),
          migratedFrom: 'legacy-products',
          originalId: productDoc.id
        };
        
        // Add to vendor's menu
        await addDoc(collection(db, 'vendors', vendorId, 'menus'), menuItem);
        migratedCount++;
        
        console.log(`  ✅ Migrated: ${menuItem.name}`);
      }
      
      console.log(`📊 Total migrated to ${vendorData.restaurantName}: ${migratedCount}`);
      
      // Only migrate to first vendor (change logic if needed)
      break;
    }
    
    // Optional: Delete legacy products (uncomment to enable)
    console.log('\n⚠️  Legacy products still exist in /products collection');
    console.log('To delete them, uncomment the cleanup code in this script');
    
    // UNCOMMENT TO DELETE LEGACY PRODUCTS:
    // console.log('\n🧹 Cleaning up legacy products...');
    // for (const productDoc of productsSnap.docs) {
    //   await deleteDoc(doc(db, 'products', productDoc.id));
    //   console.log(`  🗑️  Deleted: ${productDoc.id}`);
    // }
    // console.log('✅ Legacy products cleaned up');
    
    console.log('\n✅ Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

// Run migration
migrateProductsToVendorMenus()
  .then(() => {
    console.log('\n🎉 Migration script finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
