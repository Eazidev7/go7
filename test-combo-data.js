// Test script to check if combo data exists and is accessible
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

// Firebase config (you may need to update this)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);



async function testComboData() {
  console.log('🔍 Testing combo data access...');
  
  try {
    // Check for vendors
    const vendorsRef = collection(db, 'vendors');
    const vendorsSnapshot = await getDocs(vendorsRef);
    
    console.log(`📊 Found ${vendorsSnapshot.docs.length} vendors`);
    
    let totalCombos = 0;
    
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorData = vendorDoc.data();
      console.log(`🏪 Vendor: ${vendorData.name || vendorDoc.id}`);
      
      // Check for combos in this vendor
      try {
        const combosRef = collection(db, 'vendors', vendorDoc.id, 'combos');
        const combosSnapshot = await getDocs(combosRef);
        
        console.log(`  📦 Combos: ${combosSnapshot.docs.length}`);
        totalCombos += combosSnapshot.docs.length;
        
        combosSnapshot.docs.forEach(comboDoc => {
          const combo = comboDoc.data();
          console.log(`    - ${combo.name || 'Unnamed'} (Active: ${combo.isActive})`);
        });
      } catch (error) {
        console.log(`    ❌ Error loading combos: ${error.message}`);
      }
    }
    
    console.log(`\n🎯 Total combos found: ${totalCombos}`);
    
    if (totalCombos === 0) {
      console.log('\n💡 No combo data found. You may need to:');
      console.log('   1. Create combos via the vendor dashboard');
      console.log('   2. Ensure they are marked as active (isActive: true)');
      console.log('   3. Check Firebase permissions');
    }
    
  } catch (error) {
    console.error('❌ Error testing combo data:', error);
  }
}

testComboData();