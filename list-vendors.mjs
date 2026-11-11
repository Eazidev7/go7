// List all vendors in Firebase
// Run this with: node list-vendors.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBmQwPSnQslo6Sq4NeYjAUi8iaZIYVlaBg",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "232009015458",
  appId: "1:232009015458:web:49dbb63a5a67112325f7fb",
  databaseURL: "https://go7-delivery-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const listAllVendors = async () => {
  try {
    console.log('🔍 Listing all vendors in Firebase...');
    
    const vendorsRef = collection(db, 'vendors');
    const vendorsSnapshot = await getDocs(vendorsRef);
    
    if (vendorsSnapshot.empty) {
      console.log('❌ No vendors found in database');
    } else {
      console.log(`📊 Found ${vendorsSnapshot.docs.length} vendors:`);
      
      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorData = vendorDoc.data();
        console.log(`\n🏪 Vendor ID: ${vendorDoc.id}`);
        console.log(`   Name: ${vendorData.businessName || vendorData.name || 'Unknown'}`);
        console.log(`   Type: ${vendorData.businessType || vendorData.category || 'Not specified'}`);
        console.log(`   Active: ${vendorData.isActive !== false ? 'Yes' : 'No'}`);
        
        // Check if this vendor has products
        const productsRef = collection(db, 'vendors', vendorDoc.id, 'products');
        const productsSnapshot = await getDocs(productsRef);
        console.log(`   Products: ${productsSnapshot.docs.length}`);
        
        if (productsSnapshot.docs.length > 0) {
          console.log(`   Product names: ${productsSnapshot.docs.map(p => p.data().name || p.data().title || 'Unnamed').join(', ')}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error listing vendors:', error);
  } finally {
    process.exit(0);
  }
};

// Run immediately
listAllVendors();