// 🔧 AUTO-FIX ALL VENDOR PRODUCTS - CONSOLE SCRIPT
// Copy this entire script and paste it into your browser console (F12)

(async function() {
  console.log('🚀 Starting Auto-Fix for All Vendors...');
  
  // Import Firebase modules
  const { collection, getDocs, addDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
  
  // Get db from window (already initialized in your app)
  const db = window.db || (await import('../src/config/firebase.js')).db;
  
  if (!db) {
    console.error('❌ Firestore not initialized! Make sure you are on a page with Firebase loaded.');
    return;
  }
  
  console.log('✅ Firestore instance found');
  
  // Sample products to create
  const sampleProducts = [
    { name: "Jollof Rice", basePrice: 2500, category: "Main Course", description: "Delicious Nigerian Jollof rice with chicken" },
    { name: "Fried Rice", basePrice: 2000, category: "Main Course", description: "Mixed vegetable fried rice" },
    { name: "Amala & Ewedu", basePrice: 1500, category: "Local Dishes", description: "Traditional Nigerian soup" },
    { name: "Pounded Yam & Egusi", basePrice: 3000, category: "Local Dishes", description: "Fresh pounded yam with egusi soup" },
    { name: "Chicken & Chips", basePrice: 2800, category: "Fast Food", description: "Crispy fried chicken with chips" }
  ];
  
  try {
    // Get all vendors
    console.log('📋 Fetching all vendors...');
    const vendorsRef = collection(db, 'vendors');
    const vendorsSnapshot = await getDocs(vendorsRef);
    
    console.log(`✅ Found ${vendorsSnapshot.size} vendors`);
    
    let totalVendors = vendorsSnapshot.size;
    let vendorsFixed = 0;
    let vendorsSkipped = 0;
    let totalProductsCreated = 0;
    
    // Process each vendor
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorData = vendorDoc.data();
      const vendorId = vendorDoc.id;
      const vendorName = vendorData.name || vendorData.businessName || 'Unnamed';
      
      console.log(`\n🔍 Processing: ${vendorName} (${vendorId})`);
      
      // Check if vendor has products
      const productsRef = collection(db, 'vendors', vendorId, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      if (productsSnapshot.size > 0) {
        console.log(`  ⏭️ Skipping - already has ${productsSnapshot.size} products`);
        vendorsSkipped++;
        continue;
      }
      
      console.log(`  🛠️ Creating ${sampleProducts.length} products...`);
      
      // Create each product
      for (const product of sampleProducts) {
        const productData = {
          name: product.name,
          description: product.description,
          basePrice: product.basePrice,
          price: product.basePrice,
          category: product.category,
          vendorId: vendorId,
          
          // ALL availability flags set to true
          active: true,
          isActive: true,
          available: true,
          isAvailable: true,
          
          // Additional fields
          measurementType: 'portion',
          imageUrl: `https://via.placeholder.com/400x300?text=${encodeURIComponent(product.name)}`,
          
          // Timestamps
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        
        const docRef = await addDoc(productsRef, productData);
        console.log(`    ✅ Created: ${product.name} (${docRef.id})`);
        totalProductsCreated++;
      }
      
      vendorsFixed++;
      console.log(`  ✅ Successfully created ${sampleProducts.length} products for ${vendorName}`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 AUTO-FIX COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Total Vendors: ${totalVendors}`);
    console.log(`✅ Vendors Fixed: ${vendorsFixed}`);
    console.log(`⏭️ Vendors Skipped: ${vendorsSkipped} (already had products)`);
    console.log(`📦 Total Products Created: ${totalProductsCreated}`);
    console.log('='.repeat(60));
    console.log('\n✅ SUCCESS! You can now view products on vendor pages!');
    
    alert(`✅ Auto-fix complete!\n\nFixed: ${vendorsFixed} vendors\nCreated: ${totalProductsCreated} products\n\nRefresh the page and click on any vendor to see products!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
})();
