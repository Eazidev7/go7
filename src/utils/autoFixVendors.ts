import { db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';

// Verify and fix products database-wide
export async function verifyAndFixAllProducts() {
  console.log('🔍 VERIFY & FIX: Checking all products...');
  
  try {
    const vendorsRef = collection(db, 'vendors');
    const vendorsSnapshot = await getDocs(vendorsRef);
    
    console.log(`✅ Found ${vendorsSnapshot.size} vendors to verify`);
    
    let totalProducts = 0;
    let productsFixed = 0;
    let vendorsWithProducts = 0;
    let vendorsWithoutProducts = 0;
    
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorName = vendorDoc.data().name || vendorDoc.data().businessName || 'Unnamed';
      
      const productsRef = collection(db, 'vendors', vendorId, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      if (productsSnapshot.size === 0) {
        console.log(`⚠️ ${vendorName} (${vendorId}): NO PRODUCTS`);
        vendorsWithoutProducts++;
        continue;
      }
      
      console.log(`\n📦 ${vendorName} (${vendorId}): ${productsSnapshot.size} products`);
      vendorsWithProducts++;
      totalProducts += productsSnapshot.size;
      
      // Check each product for vendorId
      for (const productDoc of productsSnapshot.docs) {
        const productData = productDoc.data();
        const productId = productDoc.id;
        
        if (!productData.vendorId || productData.vendorId !== vendorId) {
          console.log(`  🔧 Fixing product ${productData.name || productId}: missing/wrong vendorId`);
          
          const productRef = doc(db, 'vendors', vendorId, 'products', productId);
          await updateDoc(productRef, {
            vendorId: vendorId,
            updatedAt: Timestamp.now()
          });
          
          productsFixed++;
        } else {
          console.log(`  ✅ Product ${productData.name}: vendorId correct`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION RESULTS:');
    console.log('='.repeat(60));
    console.log(`Total Vendors: ${vendorsSnapshot.size}`);
    console.log(`Vendors WITH Products: ${vendorsWithProducts}`);
    console.log(`Vendors WITHOUT Products: ${vendorsWithoutProducts}`);
    console.log(`Total Products Found: ${totalProducts}`);
    console.log(`Products Fixed: ${productsFixed}`);
    console.log('='.repeat(60));
    
    // List all vendor IDs for reference
    console.log('\n📋 VENDOR LIST:');
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorName = vendorDoc.data().name || vendorDoc.data().businessName || 'Unnamed';
      console.log(`  - ${vendorName} (ID: ${vendorDoc.id})`);
    }
    console.log('='.repeat(60));
    
    return { 
      totalVendors: vendorsSnapshot.size,
      vendorsWithProducts,
      vendorsWithoutProducts,
      totalProducts,
      productsFixed
    };
    
  } catch (error) {
    console.error('❌ Verification Error:', error);
    throw error;
  }
}

// Create products for vendors that have none
export async function autoFixAllVendors() {
  console.log('🚀 AUTO-FIX: Starting...');
  
  const sampleProducts = [
    { name: "Jollof Rice", basePrice: 2500, category: "Main Course", description: "Delicious Nigerian Jollof rice with chicken" },
    { name: "Fried Rice", basePrice: 2000, category: "Main Course", description: "Mixed vegetable fried rice" },
    { name: "Amala & Ewedu", basePrice: 1500, category: "Local Dishes", description: "Traditional Nigerian soup" },
    { name: "Pounded Yam & Egusi", basePrice: 3000, category: "Local Dishes", description: "Fresh pounded yam with egusi soup" },
    { name: "Chicken & Chips", basePrice: 2800, category: "Fast Food", description: "Crispy fried chicken with chips" }
  ];
  
  try {
    const vendorsRef = collection(db, 'vendors');
    const vendorsSnapshot = await getDocs(vendorsRef);
    
    console.log(`✅ Found ${vendorsSnapshot.size} vendors`);
    
    let fixed = 0;
    let created = 0;
    
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorName = vendorDoc.data().name || vendorDoc.data().businessName || 'Unnamed';
      
      const productsRef = collection(db, 'vendors', vendorId, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      if (productsSnapshot.size > 0) {
        console.log(`⏭️ ${vendorName}: already has ${productsSnapshot.size} products`);
        continue;
      }
      
      console.log(`🛠️ Creating products for ${vendorName} (${vendorId})...`);
      
      for (const product of sampleProducts) {
        await addDoc(productsRef, {
          name: product.name,
          description: product.description,
          desc: product.description,
          basePrice: product.basePrice,
          price: product.basePrice,
          category: product.category,
          
          // CRITICAL: Always set vendorId
          vendorId: vendorId,
          restaurant_id: vendorId, // Legacy field
          
          // ALL availability flags
          active: true,
          isActive: true,
          available: true,
          isAvailable: true,
          
          measurementType: 'portion',
          imageUrl: `https://via.placeholder.com/400x300?text=${encodeURIComponent(product.name)}`,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        created++;
        console.log(`    ✅ Created: ${product.name} with vendorId=${vendorId}`);
      }
      
      fixed++;
      console.log(`✅ ${vendorName}: created ${sampleProducts.length} products`);
    }
    
    console.log(`\n🎉 DONE! Fixed ${fixed} vendors, created ${created} products`);
    return { fixed, created };
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Complete fix: verify + create
export async function completeProductFix() {
  console.log('🔧 COMPLETE FIX: Starting full database repair...\n');
  
  // Step 1: Verify and fix existing products
  const verifyResults = await verifyAndFixAllProducts();
  
  console.log('\n');
  
  // Step 2: Create products for vendors without any
  if (verifyResults.vendorsWithoutProducts > 0) {
    const createResults = await autoFixAllVendors();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 COMPLETE FIX FINISHED!');
    console.log('='.repeat(60));
    console.log(`Products Fixed: ${verifyResults.productsFixed}`);
    console.log(`Vendors Given Products: ${createResults.fixed}`);
    console.log(`New Products Created: ${createResults.created}`);
    console.log('='.repeat(60));
    
    return { verifyResults, createResults };
  } else {
    console.log('\n✅ All vendors already have products!');
    return { verifyResults };
  }
}

// Auto-run when imported
if (typeof window !== 'undefined') {
  window.autoFixAllVendors = autoFixAllVendors;
  window.verifyAndFixAllProducts = verifyAndFixAllProducts;
  window.completeProductFix = completeProductFix;
  console.log('✅ Product fix functions loaded:');
  console.log('  - window.completeProductFix() - Full database repair');
  console.log('  - window.verifyAndFixAllProducts() - Check and fix vendorIds');
  console.log('  - window.autoFixAllVendors() - Create products for empty vendors');
}
