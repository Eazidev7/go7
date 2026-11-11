// Check what menu items exist in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collectionGroup, getDocs } from 'firebase/firestore';

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

async function checkMenus() {
  try {
    console.log('🔍 Checking all vendor menus...\n');
    
    const menusQuery = collectionGroup(db, 'menus');
    const snapshot = await getDocs(menusQuery);
    
    console.log(`📊 Found ${snapshot.size} menu items total\n`);
    
    if (snapshot.empty) {
      console.log('⚠️  No menu items found in any vendor menus subcollection');
      return;
    }
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const vendorId = doc.ref.parent.parent.id;
      
      console.log(`\n📍 Vendor ID: ${vendorId}`);
      console.log(`   Item: ${data.name}`);
      console.log(`   Price: ₦${data.basePrice || data.price || 0}`);
      console.log(`   Available: ${data.isAvailable}`);
      console.log(`   Image: ${data.imageUrl ? 'Yes' : 'No'}`);
      console.log(`   Add-ons: ${data.addOns?.length || 0}`);
    });
    
    console.log('\n✅ Menu check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkMenus();
