// Script to migrate combo data from old location to new location
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Firebase config (you may need to adjust this)
const firebaseConfig = {
  // Add your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateCombos() {
  try {
    console.log('🔍 Checking for combos in old location...');
    
    // Get combos from old location (root combos collection)
    const oldCombosRef = collection(db, 'combos');
    const oldCombosSnapshot = await getDocs(oldCombosRef);
    
    console.log(`📦 Found ${oldCombosSnapshot.docs.length} combos in old location`);
    
    if (oldCombosSnapshot.empty) {
      console.log('No combos found in old location');
      return;
    }
    
    // Migrate each combo to vendor-specific location
    for (const comboDoc of oldCombosSnapshot.docs) {
      const comboData = comboDoc.data();
      const vendorId = comboData.vendorId;
      
      if (!vendorId) {
        console.log(`❌ Skipping combo ${comboDoc.id} - no vendorId`);
        continue;
      }
      
      console.log(`🚀 Migrating combo "${comboData.name}" to vendor ${vendorId}`);
      
      // Copy to new location
      const newComboRef = doc(db, 'vendors', vendorId, 'combos', comboDoc.id);
      await setDoc(newComboRef, comboData);
      
      // Delete from old location
      await deleteDoc(comboDoc.ref);
      
      console.log(`✅ Migrated combo "${comboData.name}"`);
    }
    
    console.log('🎉 Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateCombos();