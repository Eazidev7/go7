// Direct Firebase Test Data Remover
// Run this with: node remove-sweet-sensations.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Firebase config from your project
const firebaseConfig = {
  apiKey: "AIzaSyBmQwPSnQslo6Sq4NeYjAUi8iaZIYVlaBg",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "232009015458",
  appId: "1:232009015458:web:49dbb63a5a67112325f7fb",
  databaseURL: "https://go7-delivery-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const removeTestData = async () => {
  try {
    console.log('🗑️ Starting test data removal...');
    
    // Test vendor IDs that were created by seedTestData
    const testVendorIds = [
      'test-vendor-1',
      'test-vendor-2', 
      'sweet-sensations',
      'quick-bites',
      'healthy-choices',
      'coffee-corner'
    ];
    
    let removedCount = 0;
    
    for (const vendorId of testVendorIds) {
      console.log(`🗑️ Checking vendor: ${vendorId}`);
      
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
        removedCount++;
        
      } catch (error) {
        console.log(`⚠️ Vendor ${vendorId} doesn't exist or already removed`);
      }
    }
    
    console.log(`✅ Test data removal completed! Removed ${removedCount} test vendors.`);
    console.log('🔄 Please refresh your mobile page to see the changes.');
    
  } catch (error) {
    console.error('❌ Error removing test data:', error);
  } finally {
    process.exit(0);
  }
};

// Run immediately
removeTestData();