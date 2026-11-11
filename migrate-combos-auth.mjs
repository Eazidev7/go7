// Run this with: node migrate-combos-admin.mjs
// This uses the default Firebase credentials from your logged-in account

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBmQwPSnQslo6Sq4NeYjAUi8iaZIYVlaBg",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "232009015458",
  appId: "1:232009015458:web:49dbb63a5a67112325f7fb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const vendorId = 'DHRa7xmdUjgACDGrfoXQyfgk7Tq2';

async function migrateCombos() {
  console.log('🚀 Starting combo migration with authentication...\n');

  try {
    // Sign in first
    console.log('🔐 Signing in...');
    await signInAnonymously(auth);
    console.log('✅ Authenticated\n');

    // Get combos from old location
    const oldCombosRef = collection(db, 'combos');
    const q = query(oldCombosRef, where('vendorId', '==', vendorId));
    const snapshot = await getDocs(q);

    console.log(`📦 Found ${snapshot.size} combos to migrate\n`);

    if (snapshot.size === 0) {
      console.log('✅ No combos to migrate!');
      return;
    }

    for (const comboDoc of snapshot.docs) {
      const comboId = comboDoc.id;
      const comboData = comboDoc.data();

      console.log(`Moving: "${comboData.name}"`);
      console.log(`  From: /combos/${comboId}`);
      console.log(`  To: /vendors/${vendorId}/combos/${comboId}`);

      try {
        // Create in new location
        const newRef = doc(db, 'vendors', vendorId, 'combos', comboId);
        await setDoc(newRef, comboData);
        console.log(`  ✅ Created in new location`);

        // Delete from old location
        await deleteDoc(doc(db, 'combos', comboId));
        console.log(`  ✅ Deleted from old location\n`);
      } catch (error) {
        console.error(`  ❌ Error migrating combo:`, error.message);
      }
    }

    console.log('✅ Migration complete!');
    console.log('   Refresh your vendor dashboard to see your combos.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

migrateCombos().catch(console.error);
