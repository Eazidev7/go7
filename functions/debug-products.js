// ====================================================================
// 🔍 SYSTEMATIC FIRESTORE PRODUCT DATA INSPECTOR
// Uses Firebase Web SDK to query and analyze product data
// ====================================================================

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, limit } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBOqK7vVNmNf0mh9CkEEzMQV7ktETQ-4q8",
  authDomain: "go7-b69ab.firebaseapp.com",
  projectId: "go7-b69ab",
  storageBucket: "go7-b69ab.appspot.com",
  messagingSenderId: "925656316430",
  appId: "1:925656316430:web:8a2e2e2e2e2e2e2e2e2e2e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function systematicProductScan() {
  console.log('\n🔍 ========================================');
  console.log('📊 SYSTEMATIC FIRESTORE PRODUCT SCAN');
  console.log('==========================================\n');

  try {
    // Step 1: Find all vendors
    console.log('Step 1: Scanning for vendors...\n');
    const vendorsRef = collection(db, 'vendors');
    const vendorsQuery = query(vendorsRef, limit(10));
    const vendorsSnapshot = await getDocs(vendorsQuery);
    
    if (vendorsSnapshot.empty) {
      console.log('❌ No vendors found in database');
      return;
    }

    console.log(`✅ Found ${vendorsSnapshot.size} vendors\n`);

    // Step 2: For each vendor, check their products
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      
      console.log(`\n📍 VENDOR: ${vendorId}`);
      console.log(`   Name: ${vendorData.name || vendorData.title || 'Unknown'}`);
      console.log('─────────────────────────────────────');

      // Check products subcollection
      const productsRef = collection(db, 'vendors', vendorId, 'products');
      const productsQuery = query(productsRef, limit(3));
      const productsSnapshot = await getDocs(productsQuery);

      if (productsSnapshot.empty) {
        console.log('   ⚠️  No products found');
        continue;
      }

      console.log(`   ✅ Found ${productsSnapshot.size} products\n`);

      // Step 3: Analyze each product's structure
      productsSnapshot.docs.forEach((productDoc, index) => {
        const data = productDoc.data();
        
        console.log(`   📦 Product ${index + 1}: ${productDoc.id}`);
        console.log('   ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌');
        
        // Show critical fields
        console.log(`   🏷️  NAMING FIELDS:`);
        console.log(`      name: "${data.name || 'NOT SET'}" ${data.name ? '✓' : '✗'}`);
        console.log(`      title: "${data.title || 'NOT SET'}" ${data.title ? '✓' : '✗'}`);
        
        console.log(`   📝 DESCRIPTION FIELDS:`);
        console.log(`      description: "${(data.description || 'NOT SET').substring(0, 30)}..." ${data.description ? '✓' : '✗'}`);
        console.log(`      desc: "${(data.desc || 'NOT SET').substring(0, 30)}..." ${data.desc ? '✓' : '✗'}`);
        
        console.log(`   🖼️  IMAGE FIELDS:`);
        console.log(`      imageUrl: "${(data.imageUrl || 'NOT SET').substring(0, 40)}..." ${data.imageUrl ? '✓' : '✗'}`);
        console.log(`      image: "${(data.image || 'NOT SET').substring(0, 40)}..." ${data.image ? '✓' : '✗'}`);
        
        console.log(`   💰 PRICE ANALYSIS:`);
        console.log(`      Raw Value: ${data.price}`);
        console.log(`      Type: ${typeof data.price}`);
        console.log(`      Is Number: ${typeof data.price === 'number'}`);
        console.log(`      Is NaN: ${isNaN(data.price)}`);
        console.log(`      Parsed Float: ${parseFloat(String(data.price))}`);
        
        if (typeof data.price === 'number' && !isNaN(data.price)) {
          console.log(`      ✅ Formatted: ₦${data.price.toLocaleString()}`);
        } else {
          console.log(`      ❌ INVALID PRICE - Will show as NaN!`);
        }
        
        console.log(`   📋 ALL FIELD NAMES:`);
        console.log(`      ${Object.keys(data).join(', ')}`);
        console.log('');
      });
    }

    console.log('\n==========================================');
    console.log('✅ SCAN COMPLETE - SUMMARY');
    console.log('==========================================');
    console.log('\nField Usage Pattern:');
    console.log('If products use "name" → Code expects "title" = MISMATCH ❌');
    console.log('If products use "description" → Code expects "desc" = MISMATCH ❌');
    console.log('If products use "image" → Code expects "imageUrl" = MISMATCH ❌');
    console.log('\nThe normalization fixes handle both variants ✓\n');

  } catch (error) {
    console.error('❌ ERROR:', error);
    throw error;
  }
}

// Run the systematic scan
console.log('🚀 Starting Systematic Firestore Product Scanner...\n');

systematicProductScan()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
