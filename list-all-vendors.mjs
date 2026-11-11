import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA4R2fq2FhwsOj0O5SXLb_v1ZWFU48ivOI",
  authDomain: "go7-44914.firebaseapp.com", 
  projectId: "go7-44914",
  storageBucket: "go7-44914.appspot.com",
  messagingSenderId: "1066788741513",
  appId: "1:1066788741513:web:8ef31ad18a9e7e37d33b3f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listAllVendors() {
  try {
    console.log('🔍 Fetching all vendors from Firebase...');
    const vendorsRef = collection(db, 'vendors');
    const snapshot = await getDocs(vendorsRef);
    
    console.log(`\n📊 Found ${snapshot.size} total vendors:\n`);
    
    const vendors = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const vendor = {
        id: doc.id,
        name: data.businessName || data.name || data.restaurantName || data.storeName || data.companyName || 'Unknown',
        image: data.image || data.logo || data.coverImage || data.profileImage || 'No image',
        createdAt: data.createdAt?.toDate?.() || 'Unknown date'
      };
      vendors.push(vendor);
      
      // Check for Sweet Sensations variants
      const lowerName = vendor.name.toLowerCase();
      const isSweetSensations = lowerName.includes('sweet') && (lowerName.includes('sensation') || lowerName.includes('sensations'));
      
      console.log(`${isSweetSensations ? '🚨' : '📋'} ID: ${vendor.id}`);
      console.log(`   Name: ${vendor.name}`);
      console.log(`   Image: ${vendor.image.substring(0, 60)}${vendor.image.length > 60 ? '...' : ''}`);
      console.log(`   Created: ${vendor.createdAt}\n`);
    });
    
    // Find potential duplicates by name similarity
    console.log('\n🔍 POTENTIAL DUPLICATES:');
    const sweetSensationsVendors = vendors.filter(v => {
      const lowerName = v.name.toLowerCase();
      return lowerName.includes('sweet') && (lowerName.includes('sensation') || lowerName.includes('sensations'));
    });
    
    if (sweetSensationsVendors.length > 0) {
      console.log(`\n🚨 Found ${sweetSensationsVendors.length} Sweet Sensations variants:`);
      sweetSensationsVendors.forEach(vendor => {
        console.log(`   - ${vendor.name} (ID: ${vendor.id})`);
        console.log(`     Image: ${vendor.image}`);
      });
    } else {
      console.log('✅ No Sweet Sensations vendors found!');
    }
    
  } catch (error) {
    console.error('❌ Error fetching vendors:', error);
  }
}

listAllVendors();