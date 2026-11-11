/**
 * 🚀 GO7 V1 TO V2 MIGRATION SCRIPT
 * 
 * This script migrates all vendor data from V1 structure to V2 structure:
 * 
 * FROM: /vendors/{vendorId}/menuItems
 * TO:   /vendors/{vendorId}/products
 * 
 * V1 Structure:
 * - name, description, price, category, image, addOns[]
 * 
 * V2 Structure:
 * - id, name, description, basePrice, imageUrl, category, measurementType, 
 *   minQty, maxQty, addons[], createdAt, updatedAt
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

// Initialize Firebase Admin (you'll need to provide your service account key)
const serviceAccount = require('../serviceAccountKey.json'); // Add your service account key

const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'go7-32d4d.appspot.com' // Replace with your storage bucket
});

const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Generate a unique product ID
 */
function generateProductId() {
  return db.collection('temp').doc().id;
}

/**
 * Convert V1 addon to V2 addon format
 */
function convertAddonToV2(v1Addon) {
  return {
    id: generateProductId(),
    name: v1Addon.name || '',
    price: parseFloat(v1Addon.price) || 0,
    imageUrl: null, // V1 addons didn't have images
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Convert V1 menu item to V2 product format
 */
function convertMenuItemToV2Product(v1MenuItem, vendorId) {
  const productId = generateProductId();
  
  // Convert addons to V2 format
  const v2Addons = [];
  if (v1MenuItem.addOns && Array.isArray(v1MenuItem.addOns)) {
    v1MenuItem.addOns.forEach(addon => {
      if (addon.name && addon.price) {
        v2Addons.push(convertAddonToV2(addon));
      }
    });
  }

  return {
    id: productId,
    name: v1MenuItem.name || '',
    description: v1MenuItem.description || '',
    basePrice: parseFloat(v1MenuItem.price || v1MenuItem.basePrice) || 0,
    imageUrl: v1MenuItem.image || v1MenuItem.imageUrl || null,
    category: v1MenuItem.category || 'food',
    measurementType: 'unit', // Default for migrated items
    minQty: 1,
    maxQty: 10,
    addons: v2Addons,
    isAvailable: v1MenuItem.isAvailable !== false, // Default to true
    vendorId: vendorId,
    // Migration metadata
    migratedFrom: 'v1',
    originalId: v1MenuItem.id,
    createdAt: v1MenuItem.createdAt || new Date(),
    updatedAt: new Date(),
    migratedAt: new Date()
  };
}

/**
 * Migrate a single vendor's menu items to V2 products
 */
async function migrateVendorMenu(vendorId) {
  console.log(`🔄 Migrating vendor: ${vendorId}`);
  
  try {
    // Get all V1 menu items
    const v1MenuRef = db.collection('vendors').doc(vendorId).collection('menuItems');
    const v1MenuSnapshot = await v1MenuRef.get();
    
    if (v1MenuSnapshot.empty) {
      console.log(`   ℹ️  No V1 menu items found for vendor: ${vendorId}`);
      return { success: true, migrated: 0, errors: [] };
    }

    console.log(`   📋 Found ${v1MenuSnapshot.docs.length} V1 menu items`);

    // Check if V2 products already exist
    const v2ProductsRef = db.collection('vendors').doc(vendorId).collection('products');
    const v2ProductsSnapshot = await v2ProductsRef.get();
    
    if (!v2ProductsSnapshot.empty) {
      console.log(`   ⚠️  V2 products already exist (${v2ProductsSnapshot.docs.length} products). Skipping migration.`);
      return { success: true, migrated: 0, errors: [], skipped: true };
    }

    const batch = db.batch();
    const errors = [];
    let migratedCount = 0;

    // Convert each V1 menu item to V2 product
    v1MenuSnapshot.docs.forEach((doc) => {
      try {
        const v1MenuItem = { id: doc.id, ...doc.data() };
        const v2Product = convertMenuItemToV2Product(v1MenuItem, vendorId);
        
        // Add to batch
        const v2ProductRef = v2ProductsRef.doc(v2Product.id);
        batch.set(v2ProductRef, v2Product);
        
        migratedCount++;
        console.log(`   ✅ Converted: ${v1MenuItem.name} -> ${v2Product.id}`);
      } catch (error) {
        console.error(`   ❌ Error converting item ${doc.id}:`, error);
        errors.push({ itemId: doc.id, error: error.message });
      }
    });

    // Commit the batch
    if (migratedCount > 0) {
      await batch.commit();
      console.log(`   🎉 Successfully migrated ${migratedCount} items for vendor: ${vendorId}`);
    }

    return { success: true, migrated: migratedCount, errors };

  } catch (error) {
    console.error(`   💥 Failed to migrate vendor ${vendorId}:`, error);
    return { success: false, error: error.message, migrated: 0, errors: [] };
  }
}

/**
 * Get all vendor IDs that have V1 menu items
 */
async function getAllVendorIds() {
  console.log('🔍 Finding all vendors with V1 menu items...');
  
  const vendorsRef = db.collection('vendors');
  const vendorsSnapshot = await vendorsRef.get();
  
  const vendorIds = [];
  
  for (const vendorDoc of vendorsSnapshot.docs) {
    const vendorId = vendorDoc.id;
    
    // Check if this vendor has V1 menu items
    const menuItemsRef = vendorDoc.ref.collection('menuItems');
    const menuItemsSnapshot = await menuItemsRef.limit(1).get();
    
    if (!menuItemsSnapshot.empty) {
      vendorIds.push(vendorId);
    }
  }
  
  console.log(`📊 Found ${vendorIds.length} vendors with V1 menu items`);
  return vendorIds;
}

/**
 * Run the complete migration
 */
async function runFullMigration() {
  console.log('🚀 GO7 V1 TO V2 MIGRATION STARTED');
  console.log('=====================================');
  
  const startTime = Date.now();
  const results = {
    totalVendors: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    totalItemsMigrated: 0,
    skippedVendors: 0,
    errors: []
  };

  try {
    // Get all vendor IDs with V1 data
    const vendorIds = await getAllVendorIds();
    results.totalVendors = vendorIds.length;

    if (vendorIds.length === 0) {
      console.log('ℹ️  No vendors found with V1 menu items. Migration complete.');
      return results;
    }

    // Migrate each vendor
    for (const vendorId of vendorIds) {
      const result = await migrateVendorMenu(vendorId);
      
      if (result.success) {
        results.successfulMigrations++;
        results.totalItemsMigrated += result.migrated;
        
        if (result.skipped) {
          results.skippedVendors++;
        }
      } else {
        results.failedMigrations++;
        results.errors.push({ vendorId, error: result.error });
      }

      // Add a small delay to avoid overwhelming Firestore
      await new Promise(resolve => setTimeout(resolve, 100));
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    results.errors.push({ general: error.message });
  }

  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n🎯 MIGRATION SUMMARY');
  console.log('====================');
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📊 Total Vendors: ${results.totalVendors}`);
  console.log(`✅ Successful: ${results.successfulMigrations}`);
  console.log(`⏭️  Skipped: ${results.skippedVendors}`);
  console.log(`❌ Failed: ${results.failedMigrations}`);
  console.log(`🔄 Items Migrated: ${results.totalItemsMigrated}`);
  
  if (results.errors.length > 0) {
    console.log(`\n⚠️  ERRORS (${results.errors.length}):`);
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${JSON.stringify(error)}`);
    });
  }

  console.log('\n🎉 MIGRATION COMPLETE!');
  return results;
}

/**
 * Migrate a specific vendor (for testing)
 */
async function migrateSingleVendor(vendorId) {
  console.log('🧪 TESTING SINGLE VENDOR MIGRATION');
  console.log('==================================');
  
  const result = await migrateVendorMenu(vendorId);
  console.log('Result:', JSON.stringify(result, null, 2));
  return result;
}

// Export functions for use in different contexts
module.exports = {
  runFullMigration,
  migrateSingleVendor,
  migrateVendorMenu,
  convertMenuItemToV2Product,
  convertAddonToV2
};

// Command line execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0] === 'single') {
    // Test single vendor migration
    const vendorId = args[1];
    if (!vendorId) {
      console.error('❌ Please provide vendor ID: node migrateV1ToV2.js single VENDOR_ID');
      process.exit(1);
    }
    migrateSingleVendor(vendorId).then(() => process.exit(0));
  } else {
    // Run full migration
    runFullMigration().then(() => process.exit(0));
  }
}