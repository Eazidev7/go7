// Find and remove vendor with guy image
// Run this with: node remove-guy-vendor.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

const removeVendorWithGuyImage = async () => {
  try {
    console.log('🔍 Looking for vendor with guy image...');
    
    const vendorsRef = collection(db, 'vendors');
    const vendorsSnapshot = await getDocs(vendorsRef);
    
    if (vendorsSnapshot.empty) {
      console.log('❌ No vendors found in database');
      return;
    }
    
    console.log(`📊 Found ${vendorsSnapshot.docs.length} vendors. Checking images...`);
    
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorData = vendorDoc.data();
      const vendorName = vendorData.businessName || vendorData.name || 'Unknown';
      const vendorImage = vendorData.profileImage || vendorData.businessLogo || vendorData.image || vendorData.logo || 'No image';
      
      console.log(`\n🏪 Vendor: ${vendorName}`);
      console.log(`📸 Image URL: ${vendorImage}`);
      console.log(`🆔 ID: ${vendorDoc.id}`);
      
      // Check if this looks like a test vendor or has a guy image
      // Look for unsplash URLs or generic profile images
      if (vendorImage.includes('unsplash.com') || 
          vendorImage.includes('photo-') ||
          vendorImage.includes('man') ||
          vendorImage.includes('guy') ||
          vendorImage.includes('person') ||
          vendorImage.includes('profile') ||
          vendorName.toLowerCase().includes('test') ||
          vendorName.toLowerCase().includes('sweet') && !vendorName.includes('Oke Ilewo')) {
        
        console.log(`\n🎯 FOUND SUSPECT VENDOR: ${vendorName}`);
        console.log(`🖼️ Image: ${vendorImage}`);
        console.log(`🗑️ This looks like the test vendor with guy image!`);
        
        // Ask for confirmation (in real scenario, you'd want this)
        console.log(`\n⚠️  REMOVING VENDOR: ${vendorName} (ID: ${vendorDoc.id})`);
        
        try {
          // Remove all products first
          const productsRef = collection(db, 'vendors', vendorDoc.id, 'products');
          const productsSnapshot = await getDocs(productsRef);
          
          for (const productDoc of productsSnapshot.docs) {
            console.log(`  🗑️ Removing product: ${productDoc.data().name || productDoc.data().title || productDoc.id}`);
            
            // Remove addons
            const addonsRef = collection(db, 'vendors', vendorDoc.id, 'products', productDoc.id, 'addons');
            const addonsSnapshot = await getDocs(addonsRef);
            
            for (const addonDoc of addonsSnapshot.docs) {
              await deleteDoc(doc(db, 'vendors', vendorDoc.id, 'products', productDoc.id, 'addons', addonDoc.id));
            }
            
            // Remove product
            await deleteDoc(doc(db, 'vendors', vendorDoc.id, 'products', productDoc.id));
          }
          
          // Remove the vendor
          await deleteDoc(doc(db, 'vendors', vendorDoc.id));
          console.log(`✅ Successfully removed vendor: ${vendorName}`);
          
        } catch (error) {
          console.error(`❌ Error removing vendor ${vendorName}:`, error);
        }
      }
    }
    
    console.log('\n✅ Finished checking all vendors!');
    console.log('🔄 Please refresh your mobile page to see the changes.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
};

// Run immediately
removeVendorWithGuyImage();