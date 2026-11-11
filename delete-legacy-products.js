/**
 * 🗑️ DELETE LEGACY PRODUCTS COLLECTION
 * Removes old /products collection completely
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

async function deleteLegacyProducts() {
  console.log('🗑️ Starting deletion of legacy products...');
  
  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    
    if (snapshot.empty) {
      console.log('✅ No products collection found - nothing to delete');
      return;
    }
    
    console.log(`Found ${snapshot.size} products to delete`);
    
    let deletedCount = 0;
    
    for (const productDoc of snapshot.docs) {
      await deleteDoc(doc(db, 'products', productDoc.id));
      deletedCount++;
      console.log(`  🗑️ Deleted: ${productDoc.id}`);
    }
    
    console.log(`\n✅ Successfully deleted ${deletedCount} legacy products`);
    console.log('🎉 Legacy /products collection cleaned up!');
    
  } catch (error) {
    console.error('❌ Error deleting products:', error);
  }
}

deleteLegacyProducts()
  .then(() => {
    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
