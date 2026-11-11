import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDLE2KExGTP_enia029xbJsXVZL9jatp-E",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "165892487405",
  appId: "1:165892487405:web:acf6e42b22d3e1f9f4a2a7",
  measurementId: "G-JXBS7G84DH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const vendorId = 'DHRa7xmdUjgACDGrfoXQyfgk7Tq2';

async function checkProducts() {
  console.log(`🔍 Checking products for vendor: ${vendorId}\n`);
  
  // Check all products (no filter)
  const allProductsRef = collection(db, 'vendors', vendorId, 'products');
  const allProductsSnap = await getDocs(allProductsRef);
  
  console.log(`📦 Total products in vendors/${vendorId}/products: ${allProductsSnap.size}\n`);
  
  allProductsSnap.docs.forEach(doc => {
    const product = doc.data();
    console.log(`Product: ${product.name}`);
    console.log(`  - ID: ${doc.id}`);
    console.log(`  - isActive: ${product.isActive}`);
    console.log(`  - basePrice: ₦${product.basePrice}`);
    console.log(`  - category: ${product.category}`);
    console.log('');
  });
  
  // Check active products
  const activeQuery = query(allProductsRef, where('isActive', '==', true));
  const activeSnap = await getDocs(activeQuery);
  console.log(`✅ Active products (isActive=true): ${activeSnap.size}`);
}

checkProducts()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
