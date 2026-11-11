import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDLE2KExGTP_enia029xbJsXVZL9jatp-E",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "165892487405",
  appId: "1:165892487405:web:acf6e42b22d3e1f9f4a2a7",
  measurementId: "G-JXBS7G84DH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const vendorId = 'DHRa7xmdUjgACDGrfoXQyfgk7Tq2';

async function checkComboStatus() {
  console.log('🔍 Checking vendor and combo status...\n');
  
  // Check vendor
  const vendorRef = doc(db, 'vendors', vendorId);
  const vendorSnap = await getDoc(vendorRef);
  
  if (vendorSnap.exists()) {
    const vendorData = vendorSnap.data();
    console.log('📊 Vendor Data:');
    console.log(`  - ID: ${vendorId}`);
    console.log(`  - Name: ${vendorData.businessName || vendorData.name}`);
    console.log(`  - isActive: ${vendorData.isActive}`);
    console.log('');
  } else {
    console.log('❌ Vendor not found!');
    return;
  }
  
  // Check combos
  const combosRef = collection(db, 'vendors', vendorId, 'combos');
  const allCombosQuery = query(combosRef);
  const allCombosSnap = await getDocs(allCombosQuery);
  
  console.log(`📦 Total combos in vendors/${vendorId}/combos: ${allCombosSnap.docs.length}\n`);
  
  allCombosSnap.docs.forEach(doc => {
    const combo = doc.data();
    console.log(`Combo: ${combo.name}`);
    console.log(`  - ID: ${doc.id}`);
    console.log(`  - isActive: ${combo.isActive}`);
    console.log(`  - timeLeft: ${combo.timeLeft}`);
    console.log(`  - comboPrice: ₦${combo.comboPrice}`);
    console.log(`  - soldCount: ${combo.soldCount || 0}`);
    console.log('');
  });
  
  // Check with isActive filter
  const activeQuery = query(combosRef, where('isActive', '==', true));
  const activeSnap = await getDocs(activeQuery);
  console.log(`✅ Active combos (isActive=true): ${activeSnap.docs.length}`);
  
  activeSnap.docs.forEach(doc => {
    const combo = doc.data();
    console.log(`  - ${combo.name} (timeLeft: ${combo.timeLeft}m)`);
  });
}

checkComboStatus()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
