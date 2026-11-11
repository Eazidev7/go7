// Migration script to move combo from old to new location
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBmQwPSnQslo6Sq4NeYjAUi8iaZIYVlaBg",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "232009015458",
  appId: "1:232009015458:web:49dbb63a5a67112325f7fb",
  databaseURL: "https://go7-delivery-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateCombos() {
  try {
    console.log('🚀 Starting combo migration...\n');
    
    // Get combos from old location
    const oldCombosRef = collection(db, 'combos');
    const oldSnapshot = await getDocs(oldCombosRef);
    
    console.log(`📦 Found ${oldSnapshot.docs.length} combos to migrate\n`);
    
    for (const comboDoc of oldSnapshot.docs) {
      const comboData = comboDoc.data();
      const vendorId = comboData.vendorId;
      
      console.log(`🔄 Migrating "${comboData.name}"`);
      console.log(`   From: /combos/${comboDoc.id}`);
      console.log(`   To: /vendors/${vendorId}/combos/${comboDoc.id}`);
      
      // Create in new location
      const newComboRef = doc(db, 'vendors', vendorId, 'combos', comboDoc.id);
      await setDoc(newComboRef, {
        ...comboData,
        timeLeft: comboData.timeLeft || 60, // Ensure timeLeft exists
        soldCount: comboData.soldCount || 0, // Ensure soldCount exists
        isActive: comboData.isActive !== false, // Ensure isActive exists
        category: comboData.category || 'combo' // Ensure category exists
      });
      
      console.log(`   ✅ Created in new location`);
      
      // Delete from old location
      await deleteDoc(comboDoc.ref);
      console.log(`   🗑️  Removed from old location`);
      
      console.log(`   🎉 Migration complete for "${comboData.name}"\n`);
    }
    
    console.log('🎊 All combos migrated successfully!');
    console.log('🔄 Please refresh your frontend to see the combos.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateCombos();