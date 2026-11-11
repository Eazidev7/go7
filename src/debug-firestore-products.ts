// ====================================================================
// 🔍 FIRESTORE PRODUCT DATA DEBUGGER
// This script will connect to your Firestore and show exactly what's stored
// ====================================================================

import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from './firebase/config';

async function debugFirestoreProducts(vendorId: string) {
  console.log('\n🔍 ========================================');
  console.log(`📊 DEBUGGING PRODUCTS FOR VENDOR: ${vendorId}`);
  console.log('==========================================\n');

  try {
    // Query the products collection
    const productsRef = collection(db, `vendors/${vendorId}/products`);
    const q = query(productsRef, limit(5));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('❌ NO PRODUCTS FOUND');
      console.log(`   Path: vendors/${vendorId}/products`);
      return;
    }

    console.log(`✅ Found ${snapshot.size} products\n`);

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      
      console.log(`\n📦 PRODUCT ${index + 1}: ${doc.id}`);
      console.log('─────────────────────────────────────');
      
      // Show ALL fields
      console.log('ALL FIELDS:');
      Object.entries(data).forEach(([key, value]) => {
        const type = typeof value;
        const displayValue = type === 'object' 
          ? JSON.stringify(value).substring(0, 100) 
          : value;
        console.log(`  ${key}: ${displayValue} (${type})`);
      });

      console.log('\n🔍 FIELD NAME CHECK:');
      console.log(`  ✓ Has 'name' field: ${!!data.name}`);
      console.log(`  ✓ Has 'title' field: ${!!data.title}`);
      console.log(`  ✓ Has 'description' field: ${!!data.description}`);
      console.log(`  ✓ Has 'desc' field: ${!!data.desc}`);
      console.log(`  ✓ Has 'image' field: ${!!data.image}`);
      console.log(`  ✓ Has 'imageUrl' field: ${!!data.imageUrl}`);

      console.log('\n💰 PRICE ANALYSIS:');
      console.log(`  Raw value: ${data.price}`);
      console.log(`  Type: ${typeof data.price}`);
      console.log(`  Is number: ${typeof data.price === 'number'}`);
      console.log(`  Is NaN: ${isNaN(data.price)}`);
      console.log(`  Parsed: ${parseFloat(String(data.price))}`);
      console.log(`  Formatted: ₦${typeof data.price === 'number' && !isNaN(data.price) ? data.price.toLocaleString() : 'NaN'}`);

      // Test the normalization logic
      const title = data.title || data.name || 'Unnamed Product';
      const desc = data.desc || data.description || '';
      const imageUrl = data.imageUrl || data.image || '';
      
      console.log('\n🔧 NORMALIZED VALUES:');
      console.log(`  Title: ${title}`);
      console.log(`  Desc: ${desc.substring(0, 50)}...`);
      console.log(`  ImageUrl: ${imageUrl.substring(0, 50)}...`);
    });

    console.log('\n==========================================');
    console.log('✅ DEBUG COMPLETE');
    console.log('==========================================\n');

  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

// Run the debugger
const vendorId = process.argv[2] || 'PASTE_YOUR_VENDOR_ID_HERE';

console.log('🚀 Starting Firestore Product Debugger...');
console.log(`   Vendor ID: ${vendorId}\n`);

debugFirestoreProducts(vendorId)
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
