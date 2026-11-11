// Quick script to check vendors in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

// Firebase config - update with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyDXoJHFUbqij0v02kzppT-FYY-Kz8Ie2yc",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "730084923333",
  appId: "1:730084923333:web:ef1e1e7ebdb1d90e6cb93f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkVendors() {
  try {
    console.log('🔍 Checking vendors in Firestore...\n');
    
    const vendorsRef = collection(db, 'vendors');
    const q = query(vendorsRef, limit(20));
    const snapshot = await getDocs(q);
    
    console.log(`📊 Total vendors found: ${snapshot.docs.length}\n`);
    
    if (snapshot.docs.length === 0) {
      console.log('❌ No vendors found in database!');
      console.log('\n💡 You need to add vendors through:');
      console.log('   - Vendor registration: http://localhost:3000/vendor/register');
      console.log('   - Or add them directly in Firebase Console');
      return;
    }
    
    console.log('📋 Vendor List:\n');
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.businessName || data.name || 'Unnamed'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Type: ${data.vendorType || 'N/A'}`);
      console.log(`   Rating: ${data.rating || 'N/A'}`);
      console.log(`   Online: ${data.isOnline ? '🟢 Yes' : '⚫ No'}`);
      console.log(`   Image: ${data.image ? '✅' : '❌'}`);
      console.log(`   Min Order: ₦${data.minimumOrder || data.minOrder || 'N/A'}`);
      console.log('');
    });
    
    // Check for missing fields
    console.log('\n🔧 Field Analysis:');
    const fields = {
      businessName: 0,
      name: 0,
      rating: 0,
      image: 0,
      isOnline: 0,
      minimumOrder: 0,
      vendorType: 0
    };
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.businessName || data.name) fields.businessName++;
      if (data.rating) fields.rating++;
      if (data.image) fields.image++;
      if (data.isOnline !== undefined) fields.isOnline++;
      if (data.minimumOrder || data.minOrder) fields.minimumOrder++;
      if (data.vendorType) fields.vendorType++;
    });
    
    console.log(`✅ Vendors with name: ${fields.businessName}/${snapshot.docs.length}`);
    console.log(`⭐ Vendors with rating: ${fields.rating}/${snapshot.docs.length}`);
    console.log(`🖼️  Vendors with image: ${fields.image}/${snapshot.docs.length}`);
    console.log(`🟢 Vendors with online status: ${fields.isOnline}/${snapshot.docs.length}`);
    console.log(`💰 Vendors with min order: ${fields.minimumOrder}/${snapshot.docs.length}`);
    console.log(`🏷️  Vendors with type: ${fields.vendorType}/${snapshot.docs.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkVendors();
