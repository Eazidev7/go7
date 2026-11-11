import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

const vendorId = 'DHRa7xmdUjgACDGrfoXQyfgk7Tq2';

async function checkCombos() {
  console.log('🔍 Checking for combos...\n');

  // 1. Check OLD location: /combos (root collection)
  console.log('1️⃣ Checking OLD location: /combos (root collection)');
  try {
    const oldCombosRef = collection(db, 'combos');
    const oldSnapshot = await getDocs(oldCombosRef);
    console.log(`   Found ${oldSnapshot.size} combos in OLD location`);
    
    if (oldSnapshot.size > 0) {
      console.log('   📦 Combos in old location:');
      oldSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`      - "${data.name}" (vendorId: ${data.vendorId})`);
      });
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  // 2. Check NEW location: /vendors/{vendorId}/combos
  console.log(`\n2️⃣ Checking NEW location: /vendors/${vendorId}/combos`);
  try {
    const newCombosRef = collection(db, 'vendors', vendorId, 'combos');
    const newSnapshot = await getDocs(newCombosRef);
    console.log(`   Found ${newSnapshot.size} combos in NEW location`);
    
    if (newSnapshot.size > 0) {
      console.log('   📦 Combos in new location:');
      newSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`      - "${data.name}" (isActive: ${data.isActive})`);
      });
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  // 3. Search for combos with this vendorId anywhere
  console.log(`\n3️⃣ Searching for combos with vendorId: ${vendorId}`);
  try {
    const oldCombosRef = collection(db, 'combos');
    const q = query(oldCombosRef, where('vendorId', '==', vendorId));
    const matchingSnapshot = await getDocs(q);
    console.log(`   Found ${matchingSnapshot.size} combos matching this vendor`);
    
    if (matchingSnapshot.size > 0) {
      console.log('   📦 Your combos found in OLD location:');
      matchingSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`      - ID: ${doc.id}`);
        console.log(`        Name: "${data.name}"`);
        console.log(`        Price: ₦${data.price}`);
        console.log(`        Active: ${data.isActive}`);
        console.log('');
      });
      
      console.log('\n✅ SOLUTION: Your combos are in the OLD location!');
      console.log('   They need to be migrated to: vendors/' + vendorId + '/combos');
      console.log('   Run the migration script to move them.');
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  console.log('\n✅ Check complete!');
}

checkCombos().catch(console.error);
