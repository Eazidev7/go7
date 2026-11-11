// 🔥 GO7 MIGRATION SCRIPT - Move products to vendor-only structure
// Run this ONCE to migrate from global products to vendor-based products
// Products are fetched vendor-by-vendor (NO collectionGroup queries)

import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Migrate all products from root /products to /vendors/{vendorId}/products
 * Also migrate addons from /products/{id}/addons to /vendors/{vendorId}/products/{id}/addons
 */
export const migrateProductsToVendorPaths = async () => {
  try {
    console.log('🚀 Starting product migration to vendor-only structure...');
    
    // 1. Get all products from root collection
    const productsRef = collection(db, 'products');
    const productsSnapshot = await getDocs(productsRef);
    
    if (productsSnapshot.empty) {
      console.log('✅ No products in root collection. Migration not needed.');
      return {
        success: true,
        productsModulesMoved: 0,
        addOnsMoved: 0
      };
    }
    
    console.log(`📦 Found ${productsSnapshot.docs.length} products to migrate`);
    
    let productsMoved = 0;
    let addonsMoved = 0;
    const batch = writeBatch(db);
    let batchCount = 0;
    const BATCH_LIMIT = 500; // Firestore batch limit
    
    for (const productDoc of productsSnapshot.docs) {
      const productId = productDoc.id;
      const productData = productDoc.data();
      const vendorId = productData.vendorId;
      
      if (!vendorId) {
        console.warn(`⚠️ Product ${productId} has no vendorId, skipping...`);
        continue;
      }
      
      console.log(`📝 Migrating product ${productId} to vendor ${vendorId}...`);
      
      // Check if product already exists in vendor path
      const vendorProductRef = doc(db, 'vendors', vendorId, 'products', productId);
      const vendorProductSnap = await getDoc(vendorProductRef);
      
      if (!vendorProductSnap.exists()) {
        // Copy product to vendor path
        await setDoc(vendorProductRef, productData);
        productsMoved++;
        console.log(`  ✅ Moved product to vendors/${vendorId}/products/${productId}`);
      } else {
        console.log(`  ⏭️  Product already exists in vendor path, skipping...`);
      }
      
      // 2. Migrate addons for this product
      const addonsRef = collection(db, 'products', productId, 'addons');
      const addonsSnapshot = await getDocs(addonsRef);
      
      if (!addonsSnapshot.empty) {
        console.log(`  📎 Found ${addonsSnapshot.docs.length} addons for product ${productId}`);
        
        for (const addonDoc of addonsSnapshot.docs) {
          const addonId = addonDoc.id;
          const addonData = addonDoc.data();
          
          // Copy addon to vendor product path
          const vendorProductAddonRef = doc(db, 'vendors', vendorId, 'products', productId, 'addons', addonId);
          const vendorAddonSnap = await getDoc(vendorProductAddonRef);
          
          if (!vendorAddonSnap.exists()) {
            await setDoc(vendorProductAddonRef, addonData);
            addonsMoved++;
            console.log(`    ✅ Moved addon ${addonId}`);
          }
        }
      }
    }
    
    console.log('✅ Migration complete!');
    console.log(`   - Products moved: ${productsMoved}`);
    console.log(`   - Addons moved: ${addonsMoved}`);
    
    return {
      success: true,
      productsMoved,
      addonsMoved
    };
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

/**
 * DELETE old products from root /products collection
 * RUN THIS ONLY AFTER VERIFYING THE MIGRATION WAS SUCCESSFUL!
 */
export const deleteOldProductsCollection = async () => {
  try {
    console.log('🗑️  Starting deletion of old products collection...');
    console.warn('⚠️  This will permanently delete all products from /products');
    
    const productsRef = collection(db, 'products');
    const productsSnapshot = await getDocs(productsRef);
    
    if (productsSnapshot.empty) {
      console.log('✅ No products to delete.');
      return;
    }
    
    console.log(`🗑️  Deleting ${productsSnapshot.docs.length} products and their addons...`);
    
    let deletedProducts = 0;
    let deletedAddons = 0;
    
    for (const productDoc of productsSnapshot.docs) {
      const productId = productDoc.id;
      
      // Delete all addons first
      const addonsRef = collection(db, 'products', productId, 'addons');
      const addonsSnapshot = await getDocs(addonsRef);
      
      for (const addonDoc of addonsSnapshot.docs) {
        await deleteDoc(doc(db, 'products', productId, 'addons', addonDoc.id));
        deletedAddons++;
      }
      
      // Delete product
      await deleteDoc(doc(db, 'products', productId));
      deletedProducts++;
      
      console.log(`  🗑️  Deleted product ${productId} and ${addonsSnapshot.docs.length} addons`);
    }
    
    console.log('✅ Deletion complete!');
    console.log(`   - Products deleted: ${deletedProducts}`);
    console.log(`   - Addons deleted: ${deletedAddons}`);
    
    return {
      success: true,
      deletedProducts,
      deletedAddons
    };
    
  } catch (error) {
    console.error('❌ Deletion error:', error);
    throw error;
  }
};

/**
 * Verification function - Check migration status
 */
export const verifyMigration = async () => {
  try {
    console.log('🔍 Verifying migration...');
    
    // Count products in root
    const rootProductsSnap = await getDocs(collection(db, 'products'));
    const rootCount = rootProductsSnap.size;
    
    // Count all vendors
    const vendorsSnap = await getDocs(collection(db, 'vendors'));
    let vendorProductCount = 0;
    
    for (const vendorDoc of vendorsSnap.docs) {
      const vendorProductsSnap = await getDocs(collection(db, 'vendors', vendorDoc.id, 'products'));
      vendorProductCount += vendorProductsSnap.size;
    }
    
    console.log('📊 Migration Status:');
    console.log(`   - Products in root collection: ${rootCount}`);
    console.log(`   - Products in vendor paths: ${vendorProductCount}`);
    
    if (rootCount === 0 && vendorProductCount > 0) {
      console.log('✅ Migration successful! All products moved to vendor paths.');
    } else if (rootCount > 0 && vendorProductCount > 0) {
      console.log('⚠️  Migration incomplete. Both root and vendor products exist.');
    } else if (rootCount > 0 && vendorProductCount === 0) {
      console.log('❌ Migration not started. Products still in root collection.');
    }
    
    return {
      rootCount,
      vendorProductCount
    };
    
  } catch (error) {
    console.error('❌ Verification error:', error);
    throw error;
  }
};

// Auto-run migration on import (with safety check)
let migrationRun = false;

export const runMigrationOnce = async () => {
  if (migrationRun) {
    console.log('⏭️  Migration already run this session.');
    return;
  }
  
  migrationRun = true;
  
  try {
    // First verify
    const status = await verifyMigration();
    
    // Only migrate if root collection has products
    if (status.rootCount > 0) {
      console.log('🚀 Auto-running migration...');
      await migrateProductsToVendorPaths();
      
      // Verify again
      await verifyMigration();
      
      console.log('');
      console.log('⚠️  IMPORTANT: Review the migration results above.');
      console.log('⚠️  If everything looks good, you can run deleteOldProductsCollection()');
      console.log('⚠️  to remove old products from root /products collection.');
    } else {
      console.log('✅ No migration needed.');
    }
  } catch (error) {
    console.error('❌ Auto-migration failed:', error);
  }
};

// Auto-run on module load
setTimeout(() => {
  runMigrationOnce();
}, 2000);
