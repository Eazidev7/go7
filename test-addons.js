import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDLkhSCiqGEsm83BybEt6ZNWbKg4DmUTKI",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "625688969186",
  appId: "1:625688969186:web:8b9e0d45fbdf0e20e7f88d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAddons() {
  try {
    console.log('🔍 Checking addons data...\n');
    
    const vendorId = 'quYmbLz5cINa0JSuHXQWHmT9PRw2';
    const productsSnap = await getDocs(collection(db, 'vendors', vendorId, 'products'));
    
    for (const prodDoc of productsSnap.docs) {
      console.log(`\n📦 Product: ${prodDoc.data().name} (${prodDoc.id})`);
      
      const addonsSnap = await getDocs(collection(db, 'vendors', vendorId, 'products', prodDoc.id, 'addons'));
      console.log(`   Found ${addonsSnap.size} addons`);
      
      addonsSnap.forEach(addonDoc => {
        const addon = addonDoc.data();
        console.log(`\n   🍔 Addon: ${addon.name || addon.title}`);
        console.log(`      📋 Fields:`, Object.keys(addon));
        console.log(`      💰 price: ${addon.price}`);
        console.log(`      💰 addonPrice: ${addon.addonPrice}`);
        console.log(`      💰 basePrice: ${addon.basePrice}`);
        console.log(`      🖼️ imageUrl: ${addon.imageUrl}`);
        console.log(`      🖼️ image: ${addon.image}`);
        console.log(`      🖼️ thumbnail: ${addon.thumbnail}`);
        console.log(`      🖼️ photo: ${addon.photo}`);
        console.log(`      ✅ available: ${addon.available}`);
        console.log(`      ✅ isAvailable: ${addon.isAvailable}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkAddons();
