// 🚀 GO7 COMPREHENSIVE FIX MIGRATION
// This script fixes ALL data issues:
// 1. Migrates products from vendors/{id}/products to /products (with vendor metadata)
// 2. Migrates addons from vendors/{id}/addons to products/{id}/addons
// 3. Syncs vendor info to all existing products
// 4. Creates dual-write structure

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * STEP 1: Migrate all vendor products to global /products collection
 * with complete vendor metadata
 */
export const migrateAllProductsToGlobal = async () => {
  try {
    console.log('🚀 STEP 1: Migrating products to global collection...');
    
    // Get all vendors
    const vendorsRef = collection(db, 'vendors');
    const vendorsSnapshot = await getDocs(vendorsRef);
    
    let totalProducts = 0;
    let batch = writeBatch(db);
    let batchCount = 0;
    
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      
      console.log(`\n📦 Processing vendor: ${vendorData.businessName || vendorData.name || vendorId}`);
      console.log(`✓ Address: ${vendorData.address || 'Not set'}`);
      console.log(`✓ Delivery Fee: ₦${vendorData.deliveryFee || 300}`);
      
      // Get vendor's products
      const productsRef = collection(db, 'vendors', vendorId, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      console.log(`  Found ${productsSnapshot.docs.length} products`);
      
      for (const productDoc of productsSnapshot.docs) {
        const productData = productDoc.data();
        const productId = productDoc.id;
        
        // Extract vendor metadata
        const vendorName = vendorData.businessName || vendorData.name || vendorData.email?.split('@')[0] || 'Unknown Vendor';
        const vendorLogo = vendorData.businessLogo || vendorData.profileImage || vendorData.logo || vendorData.imageUrl || '/placeholder-vendor.png';
        const vendorAddress = vendorData.address || vendorData.location?.address || 'Address not set';
        const vendorRating = vendorData.rating || 4.5;
        const vendorDeliveryFee = vendorData.deliveryFee || 300;
        const vendorDeliveryTime = vendorData.deliveryTime || '20-30 min';
        
        // Build complete product with embedded vendor metadata
        const completeProduct = {
          // Product fields
          productName: productData.name || productData.productName || productData.title || 'Unnamed Product',
          name: productData.name || productData.productName || productData.title,
          title: productData.name || productData.productName || productData.title,
          price: productData.price || 0,
          category: productData.category || 'food',
          description: productData.description || '',
          imageURL: productData.imageUrl || productData.imageURL || '/placeholder-product.png',
          imageUrl: productData.imageUrl || productData.imageURL || '/placeholder-product.png',
          
          // Measurement
          measurementType: productData.measurementType || 'unit',
          minQty: productData.minQty || 1,
          maxQty: productData.maxQty || 100,
          
          // Vendor metadata (embedded)
          vendorId: vendorId,
          vendorName: vendorName,
          vendorLogo: vendorLogo,
          vendorAddress: vendorAddress,
          vendorRating: vendorRating,
          vendorDeliveryFee: vendorDeliveryFee,
          vendorDeliveryTime: vendorDeliveryTime,
          
          // Status
          active: true,
          isActive: true,
          available: true,
          
          // Timestamps
          timestamp: productData.timestamp || serverTimestamp(),
          createdAt: productData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Write to global products collection
        const globalProductRef = doc(db, 'products', productId);
        batch.set(globalProductRef, completeProduct, { merge: true });
        
        batchCount++;
        totalProducts++;
        
        console.log(`    ✓ ${completeProduct.productName} - ₦${completeProduct.price}`);
        
        // Commit batch every 500 operations
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`    💾 Committed batch of ${batchCount} products`);
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`    💾 Committed final batch of ${batchCount} products`);
    }
    
    console.log(`\n✅ STEP 1 COMPLETE: Migrated ${totalProducts} products to global collection`);
    return totalProducts;
    
  } catch (error) {
    console.error('❌ Error migrating products:', error);
    throw error;
  }
};

/**
 * STEP 2: Migrate addons to dual-write structure
 * vendors/{vendorId}/products/{productId}/addons/{addonId}
 * products/{productId}/addons/{addonId}
 */
export const migrateAllAddonsToDualWrite = async () => {
  try {
    console.log('\n🚀 STEP 2: Migrating addons to dual-write structure...');
    
    let totalAddons = 0;
    let batch = writeBatch(db);
    let batchCount = 0;
    
    // Get all vendors
    const vendorsRef = collection(db, 'vendors');
    const vendorsSnapshot = await getDocs(vendorsRef);
    
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      
      console.log(`\n🍕 Processing addons for: ${vendorData.businessName || vendorData.name}`);
      
      // Get vendor's general addons
      const vendorAddonsRef = collection(db, 'vendors', vendorId, 'addons');
      const vendorAddonsSnapshot = await getDocs(vendorAddonsRef);
      
      if (vendorAddonsSnapshot.empty) {
        console.log('  No addons found');
        continue;
      }
      
      // Get vendor's products to link addons
      const productsRef = collection(db, 'vendors', vendorId, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      console.log(`  Found ${vendorAddonsSnapshot.docs.length} addons for ${productsSnapshot.docs.length} products`);
      
      // Link each addon to each product
      for (const productDoc of productsSnapshot.docs) {
        const productId = productDoc.id;
        
        for (const addonDoc of vendorAddonsSnapshot.docs) {
          const addonId = addonDoc.id;
          const addonData = addonDoc.data();
          
          const completeAddon = {
            name: addonData.name,
            price: addonData.price || 0,
            category: addonData.category || 'extra',
            description: addonData.description || '',
            imageUrl: addonData.imageUrl || '',
            isActive: addonData.isActive !== false,
            vendorId: vendorId,
            productId: productId,
            createdAt: addonData.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          // 1. Write to vendor's product addons
          const vendorProductAddonRef = doc(db, 'vendors', vendorId, 'products', productId, 'addons', addonId);
          batch.set(vendorProductAddonRef, completeAddon, { merge: true });
          
          // 2. Write to global product addons
          const globalProductAddonRef = doc(db, 'products', productId, 'addons', addonId);
          batch.set(globalProductAddonRef, completeAddon, { merge: true });
          
          batchCount += 2;
          totalAddons++;
          
          // Commit batch every 500 operations
          if (batchCount >= 500) {
            await batch.commit();
            console.log(`    💾 Committed batch of ${batchCount / 2} addons`);
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
      }
      
      console.log(`  ✓ Linked ${vendorAddonsSnapshot.docs.length} addons to ${productsSnapshot.docs.length} products`);
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`    💾 Committed final batch of ${batchCount / 2} addons`);
    }
    
    console.log(`\n✅ STEP 2 COMPLETE: Migrated ${totalAddons} addon links`);
    return totalAddons;
    
  } catch (error) {
    console.error('❌ Error migrating addons:', error);
    throw error;
  }
};

/**
 * STEP 3: Sync addons to product.addons[] array for backward compatibility
 */
export const syncAddonsToProductArrays = async () => {
  try {
    console.log('\n🚀 STEP 3: Syncing addons to product.addons[] arrays...');
    
    // Get all products
    const productsRef = collection(db, 'products');
    const productsSnapshot = await getDocs(productsRef);
    
    let totalSynced = 0;
    let batch = writeBatch(db);
    let batchCount = 0;
    
    for (const productDoc of productsSnapshot.docs) {
      const productId = productDoc.id;
      
      // Get product's addons
      const addonsRef = collection(db, 'products', productId, 'addons');
      const addonsSnapshot = await getDocs(addonsRef);
      
      if (!addonsSnapshot.empty) {
        const addons = addonsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(addon => addon.isActive !== false);
        
        // Update product with addons array
        const productRef = doc(db, 'products', productId);
        batch.update(productRef, {
          addons: addons,
          updatedAt: serverTimestamp()
        });
        
        batchCount++;
        totalSynced++;
        
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`  💾 Synced ${batchCount} products`);
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }
    
    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
      console.log(`  💾 Synced final ${batchCount} products`);
    }
    
    console.log(`\n✅ STEP 3 COMPLETE: Synced addons to ${totalSynced} products`);
    return totalSynced;
    
  } catch (error) {
    console.error('❌ Error syncing addons:', error);
    throw error;
  }
};

/**
 * RUN ALL MIGRATION STEPS
 */
export const runCompleteMigration = async () => {
  console.log('🚀🚀🚀 STARTING GO7 COMPREHENSIVE MIGRATION 🚀🚀🚀\n');
  console.log('This will fix:');
  console.log('  1. Products not showing (migrate to /products)');
  console.log('  2. Missing vendor info (embed metadata)');
  console.log('  3. Addons not loading (dual-write structure)');
  console.log('  4. ₦0 prices (preserve real prices)\n');
  
  try {
    const startTime = Date.now();
    
    // Step 1: Migrate products
    const productsCount = await migrateAllProductsToGlobal();
    
    // Step 2: Migrate addons
    const addonsCount = await migrateAllAddonsToDualWrite();
    
    // Step 3: Sync to arrays
    const syncedCount = await syncAddonsToProductArrays();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n\n✅✅✅ MIGRATION COMPLETE! ✅✅✅');
    console.log(`\nResults:`);
    console.log(`  • ${productsCount} products migrated to global collection`);
    console.log(`  • ${addonsCount} addon links created`);
    console.log(`  • ${syncedCount} products synced with addon arrays`);
    console.log(`  • Completed in ${duration} seconds`);
    console.log('\n🎉 All vendor + product + addon issues fixed!');
    console.log('📱 Refresh the app to see changes.\n');
    
    return {
      success: true,
      products: productsCount,
      addons: addonsCount,
      synced: syncedCount,
      duration: duration
    };
    
  } catch (error) {
    console.error('\n❌❌❌ MIGRATION FAILED ❌❌❌');
    console.error('Error:', error);
    throw error;
  }
};

// Auto-run migration once on app load
let migrationRun = false;

export const autoRunMigration = async () => {
  const migrationKey = 'go7_comprehensive_migration_completed';
  
  if (localStorage.getItem(migrationKey)) {
    console.log('✓ Migration already completed');
    return;
  }
  
  if (migrationRun) {
    console.log('✓ Migration already running');
    return;
  }
  
  migrationRun = true;
  
  try {
    console.log('🔄 Auto-running comprehensive migration...');
    const result = await runCompleteMigration();
    localStorage.setItem(migrationKey, JSON.stringify(result));
    console.log('✅ Auto-migration completed');
  } catch (error) {
    console.error('❌ Auto-migration failed:', error);
    migrationRun = false;
  }
};

// Expose to window for manual execution
if (typeof window !== 'undefined') {
  window.runGo7Migration = runCompleteMigration;
  window.forceGo7Migration = () => {
    localStorage.removeItem('go7_comprehensive_migration_completed');
    migrationRun = false;
    return runCompleteMigration();
  };
}

// Auto-run 1 second after import
setTimeout(() => {
  autoRunMigration();
}, 1000);

export default {
  migrateAllProductsToGlobal,
  migrateAllAddonsToDualWrite,
  syncAddonsToProductArrays,
  runCompleteMigration,
  autoRunMigration
};
