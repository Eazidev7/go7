import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, doc } from 'firebase/firestore';

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

async function testFetchVendorProducts() {
  try {
    const vendorId = 'quYmbLz5cINa0JSuHXQWHmT9PRw2';
    
    console.log('\n🔍 Testing fetchVendorProducts logic...\n');
    
    // Get vendor details
    const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
    const vendorData = vendorDoc.data();
    
    console.log('📊 Vendor Data:');
    console.log('  businessName:', vendorData.businessName);
    console.log('  name:', vendorData.name);
    console.log('  rating:', vendorData.rating);
    
    // Get products
    const prodRef = collection(db, 'vendors', vendorId, 'products');
    const prodSnap = await getDocs(prodRef);
    
    console.log(`\n📦 Found ${prodSnap.size} products\n`);
    
    prodSnap.docs.forEach(docSnap => {
      const productData = docSnap.data();
      
      // Simulate the mapping
      const mappedProduct = {
        id: docSnap.id,
        name: productData.name || productData.productName || 'Unnamed Product',
        description: productData.description || productData.desc || productData.details || '',
        price: productData.price || productData.basePrice || 0,
        imageUrl: productData.imageUrl || productData.image || productData.photo || '',
        available: productData.available !== undefined ? productData.available : 
                  (productData.isAvailable !== undefined ? productData.isAvailable : true),
        category: productData.category || 'Main',
        vendorName: vendorData?.businessName || vendorData?.name || 'Business',
      };
      
      console.log('✅ Mapped Product:');
      console.log('   ID:', mappedProduct.id);
      console.log('   Name:', mappedProduct.name);
      console.log('   Price:', mappedProduct.price);
      console.log('   ImageUrl:', mappedProduct.imageUrl.substring(0, 50) + '...');
      console.log('   Available:', mappedProduct.available);
      console.log('   Category:', mappedProduct.category);
      console.log('   VendorName:', mappedProduct.vendorName);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

testFetchVendorProducts();
