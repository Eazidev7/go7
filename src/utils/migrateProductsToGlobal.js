// 🔥 MIGRATE EXISTING PRODUCTS TO GLOBAL COLLECTION
// Run this once to copy all vendor products to products/ collection

import { db } from '../config/firebase';
import { collection, getDocs, doc, setDoc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

export const migrateProductsToGlobal = async () => {
  console.log('🚀 Starting product migration...');
  
  try {
    // Get all vendors
    const vendorsRef = collection(db, 'vendors');
    const vendorsSnapshot = await getDocs(vendorsRef);
    
    console.log(`Found ${vendorsSnapshot.docs.length} vendors`);
    
    let totalProducts = 0;
    let migratedProducts = 0;
    
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      
      console.log(`\n📦 Processing vendor: ${vendorData.businessName || vendorData.name || vendorId}`);
      
      // Get products from vendor's subcollection
      const productsRef = collection(db, 'vendors', vendorId, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      console.log(`  Found ${productsSnapshot.docs.length} products`);
      totalProducts += productsSnapshot.docs.length;
      
      if (productsSnapshot.docs.length === 0) continue;
      
      // Batch write products to global collection
      const batch = writeBatch(db);
      let batchCount = 0;
      
      for (const productDoc of productsSnapshot.docs) {
        const productData = productDoc.data();
        const productId = productDoc.id;
        
        console.log(`  📦 Migrating product: ${productData.name || productId}`);
        
        // Build complete product with vendor metadata
        const completeProduct = {
          // Product fields
          productName: productData.name || productData.productName || 'Unnamed Product',
          name: productData.name || productData.productName || 'Unnamed Product',
          price: productData.price || 0,
          category: productData.category || 'food',
          description: productData.description || '',
          imageURL: productData.imageUrl || productData.imageURL || '/placeholder-product.png',
          imageUrl: productData.imageUrl || productData.imageURL || '/placeholder-product.png',
          
          // Measurement fields
          measurementType: productData.measurementType || productData.measurement || 'unit',
          minQty: productData.minQty || 1,
          maxQty: productData.maxQty || 100,
          
          // Vendor metadata (EMBEDDED - NO FETCH NEEDED)
          vendorId: vendorId,
          vendorName: vendorData.businessName || vendorData.name || vendorData.email?.split('@')[0] || 'Unknown Vendor',
          vendorLogo: vendorData.logo || vendorData.logoUrl || vendorData.profileImage || '/placeholder-vendor.png',
          vendorAddress: vendorData.address || vendorData.location || 'Address not set',
          vendorRating: vendorData.rating || 4.5,
          vendorDeliveryFee: vendorData.deliveryFee || 300,
          vendorDeliveryTime: vendorData.deliveryTime || '20-30 min',
          
          // Addons
          addons: productData.addons || [],
          
          // Status - ensure active products show
          active: true,
          isActive: true,
          available: productData.available !== false,
          
          // Timestamps
          timestamp: serverTimestamp(),
          createdAt: productData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
          popularityScore: productData.popularityScore || 0
        };
        
        console.log(`    ✓ Vendor: ${completeProduct.vendorName}`);
        console.log(`    ✓ Address: ${completeProduct.vendorAddress}`);
        console.log(`    ✓ Price: ₦${completeProduct.price}`);
        
        const globalProductRef = doc(db, 'products', productId);
        batch.set(globalProductRef, completeProduct, { merge: true }); // merge to update existing
        batchCount++;
        migratedProducts++;
        
        // Commit batch every 500 operations (Firestore limit)
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`  ✅ Committed ${batchCount} products`);
          batchCount = 0;
        }
      }
      
      // Commit remaining products
      if (batchCount > 0) {
        await batch.commit();
        console.log(`  ✅ Committed ${batchCount} products`);
      }
    }
    
    console.log('\n🎉 Migration complete!');
    console.log(`Total products found: ${totalProducts}`);
    console.log(`Products migrated: ${migratedProducts}`);
    console.log(`Products skipped (already exist): ${totalProducts - migratedProducts}`);
    
    return {
      success: true,
      totalProducts,
      migratedProducts,
      skipped: totalProducts - migratedProducts
    };
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

// Run migration if called directly
if (typeof window !== 'undefined') {
  window.migrateProductsToGlobal = migrateProductsToGlobal;
  console.log('💡 Migration utility loaded. Run: window.migrateProductsToGlobal()');
}
