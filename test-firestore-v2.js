// Quick test to check if products exist in V2 structure
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCvoFW3h01H3OLMIrIrNJKUBd5EH4fGpAE",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "780267781011",
  appId: "1:780267781011:web:bc8efedea0579bacc8c2f9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkV2Products() {
  console.log('🔍 Checking for products in V2 structure...\n');
  
  try {
    // Get all vendors
    const vendorsSnap = await getDocs(collection(db, 'vendors'));
    console.log(`📊 Found ${vendorsSnap.size} vendors\n`);
    
    let totalProducts = 0;
    
    for (const vendorDoc of vendorsSnap.docs) {
      const vendorData = vendorDoc.data();
      const vendorName = vendorData.businessName || vendorData.name || vendorDoc.id;
      
      // Get products for this vendor
      const productsSnap = await getDocs(collection(db, 'vendors', vendorDoc.id, 'products'));
      
      if (productsSnap.size > 0) {
        console.log(`✅ ${vendorName}: ${productsSnap.size} products`);
        
        // Show first product details
        const firstProduct = productsSnap.docs[0];
        const productData = firstProduct.data();
        console.log(`   Sample: ${productData.name || productData.productName || 'No name'}`);
        console.log(`   Fields: ${Object.keys(productData).join(', ')}`);
        console.log(`   Available: ${productData.available}`);
        console.log(`   Price: ${productData.price}\n`);
        
        totalProducts += productsSnap.size;
      } else {
        console.log(`⚠️  ${vendorName}: 0 products`);
      }
    }
    
    console.log(`\n📊 TOTAL: ${totalProducts} products across ${vendorsSnap.size} vendors`);
    
    if (totalProducts === 0) {
      console.log('\n❌ NO PRODUCTS FOUND IN V2 STRUCTURE!');
      console.log('You need to add products using the Vendor Dashboard V2');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkV2Products();
