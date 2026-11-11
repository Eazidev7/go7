import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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

async function checkVendorData() {
  try {
    console.log('🔍 Checking vendor data...\n');
    
    // Get all vendors
    const vendorsSnap = await getDocs(collection(db, 'vendors'));
    
    for (const vendorDoc of vendorsSnap.docs) {
      const vendorData = vendorDoc.data();
      const vendorId = vendorDoc.id;
      
      console.log(`\n🏪 VENDOR: ${vendorId}`);
      console.log(`📋 All fields:`, Object.keys(vendorData));
      console.log(`📝 businessName: ${vendorData.businessName}`);
      console.log(`📝 name: ${vendorData.name}`);
      console.log(`📝 storeName: ${vendorData.storeName}`);
      console.log(`📝 email: ${vendorData.email}`);
      
      // Get products
      const productsSnap = await getDocs(collection(db, 'vendors', vendorId, 'products'));
      console.log(`\n📦 Found ${productsSnap.size} products`);
      
      productsSnap.forEach(prodDoc => {
        const prodData = prodDoc.data();
        console.log(`\n   🥔 Product: ${prodData.name}`);
        console.log(`   📋 Fields:`, Object.keys(prodData));
        console.log(`   💰 price: ${prodData.price}`);
        console.log(`   💰 basePrice: ${prodData.basePrice}`);
        console.log(`   🖼️ imageUrl: ${prodData.imageUrl}`);
        console.log(`   ✅ isAvailable: ${prodData.isAvailable}`);
        console.log(`   ✅ available: ${prodData.available}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkVendorData();
