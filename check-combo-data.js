// Quick script to check combo data in database
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, getDocs, where } from 'firebase/firestore';

// Import your existing Firebase config
let db;

try {
  // Try to use existing app if available
  const existingApp = getApps()[0];
  if (existingApp) {
    db = getFirestore(existingApp);
  } else {
    // Use your actual Firebase config
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
    db = getFirestore(app);
  }
} catch (error) {
  console.error('Firebase initialization failed:', error);
  process.exit(1);
}

async function checkComboData() {
  console.log('🔍 Checking combo data locations...\n');
  
  try {
    // Check old location (root combos collection)
    console.log('1️⃣ Checking OLD location: /combos');
    const oldCombosRef = collection(db, 'combos');
    const oldSnapshot = await getDocs(oldCombosRef);
    
    console.log(`   Found ${oldSnapshot.docs.length} combos in OLD location`);
    oldSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${data.name} (Vendor: ${data.vendorId || 'Unknown'})`);
    });
    
    console.log('\n2️⃣ Checking NEW location: /vendors/{vendorId}/combos');
    
    // Check vendors collection first
    const vendorsRef = collection(db, 'vendors');
    const vendorsSnapshot = await getDocs(vendorsRef);
    
    console.log(`   Found ${vendorsSnapshot.docs.length} vendors`);
    
    let totalNewCombos = 0;
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      
      try {
        const newCombosRef = collection(db, 'vendors', vendorId, 'combos');
        const newSnapshot = await getDocs(newCombosRef);
        
        if (newSnapshot.docs.length > 0) {
          console.log(`   📦 Vendor "${vendorData.name || vendorId}" has ${newSnapshot.docs.length} combos:`);
          newSnapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`      - ${data.name} (₦${data.comboPrice || data.price})`);
          });
          totalNewCombos += newSnapshot.docs.length;
        }
      } catch (err) {
        console.log(`   ⚠️  Could not check combos for vendor ${vendorId}`);
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   OLD location: ${oldSnapshot.docs.length} combos`);
    console.log(`   NEW location: ${totalNewCombos} combos`);
    
    if (oldSnapshot.docs.length > 0 && totalNewCombos === 0) {
      console.log(`\n🔧 ACTION NEEDED: Combos are in OLD location and need migration!`);
    } else if (totalNewCombos > 0) {
      console.log(`\n✅ Combos are in the correct location!`);
    } else {
      console.log(`\n⚠️  No combo data found in either location`);
    }
    
  } catch (error) {
    console.error('❌ Error checking combo data:', error);
  }
}

checkComboData();