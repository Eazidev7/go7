/**
 * 🧹 GO7 V2 CLEANUP UTILITY
 * 
 * Helper functions to clean up after V2 migration:
 * - Remove orphaned images
 * - Validate data integrity
 * - Generate migration reports
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');
const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'go7-32d4d.appspot.com'
});

const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Validate V2 data integrity
 */
async function validateV2Data(vendorId) {
  console.log(`🔍 Validating V2 data for vendor: ${vendorId}`);
  
  const issues = [];
  
  try {
    // Get all V2 products
    const productsRef = db.collection('vendors').doc(vendorId).collection('products');
    const productsSnapshot = await productsRef.get();
    
    if (productsSnapshot.empty) {
      issues.push('No V2 products found');
      return { isValid: false, issues };
    }
    
    for (const doc of productsSnapshot.docs) {
      const product = doc.data();
      const productId = doc.id;
      
      // Check required fields
      const requiredFields = ['name', 'basePrice', 'category', 'measurementType'];
      for (const field of requiredFields) {
        if (!product[field]) {
          issues.push(`Product ${productId}: Missing ${field}`);
        }
      }
      
      // Validate measurement type
      const validMeasurementTypes = ['unit', 'portion', 'bundle', 'weight'];
      if (!validMeasurementTypes.includes(product.measurementType)) {
        issues.push(`Product ${productId}: Invalid measurementType`);
      }
      
      // Validate addons
      if (product.addons && Array.isArray(product.addons)) {
        product.addons.forEach((addon, index) => {
          if (!addon.id || !addon.name || typeof addon.price !== 'number') {
            issues.push(`Product ${productId}: Invalid addon at index ${index}`);
          }
        });
      }
      
      // Check if image exists in storage (if imageUrl is provided)
      if (product.imageUrl) {
        try {
          const imageRef = storage.bucket().file(`vendors/${vendorId}/products/${productId}.jpg`);
          const [exists] = await imageRef.exists();
          if (!exists) {
            issues.push(`Product ${productId}: Image file missing in storage`);
          }
        } catch (error) {
          issues.push(`Product ${productId}: Error checking image - ${error.message}`);
        }
      }
    }
    
    console.log(`✅ Validated ${productsSnapshot.docs.length} products`);
    
  } catch (error) {
    issues.push(`Validation error: ${error.message}`);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    productCount: productsSnapshot?.docs.length || 0
  };
}

/**
 * Clean up orphaned storage files
 */
async function cleanupOrphanedFiles(vendorId) {
  console.log(`🧹 Cleaning up orphaned files for vendor: ${vendorId}`);
  
  const report = {
    productImagesDeleted: 0,
    addonImagesDeleted: 0,
    errors: []
  };
  
  try {
    // Get all V2 products to get valid IDs
    const productsRef = db.collection('vendors').doc(vendorId).collection('products');
    const productsSnapshot = await productsRef.get();
    
    const validProductIds = new Set();
    const validAddonIds = new Set();
    
    productsSnapshot.docs.forEach(doc => {
      validProductIds.add(doc.id);
      
      const product = doc.data();
      if (product.addons && Array.isArray(product.addons)) {
        product.addons.forEach(addon => {
          if (addon.id) {
            validAddonIds.add(addon.id);
          }
        });
      }
    });
    
    console.log(`📋 Found ${validProductIds.size} valid products, ${validAddonIds.size} valid addons`);
    
    // Clean up product images
    try {
      const productImagesRef = storage.bucket().getFiles({
        prefix: `vendors/${vendorId}/products/`
      });
      
      const [productFiles] = await productImagesRef;
      
      for (const file of productFiles) {
        const fileName = file.name.split('/').pop()?.replace('.jpg', '');
        if (fileName && !validProductIds.has(fileName)) {
          try {
            await file.delete();
            report.productImagesDeleted++;
            console.log(`🗑️ Deleted orphaned product image: ${fileName}`);
          } catch (error) {
            report.errors.push(`Failed to delete product image ${fileName}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      report.errors.push(`Error cleaning product images: ${error.message}`);
    }
    
    // Clean up addon images
    try {
      const addonImagesRef = storage.bucket().getFiles({
        prefix: `vendors/${vendorId}/addons/`
      });
      
      const [addonFiles] = await addonImagesRef;
      
      for (const file of addonFiles) {
        const fileName = file.name.split('/').pop()?.replace('.jpg', '');
        if (fileName && !validAddonIds.has(fileName)) {
          try {
            await file.delete();
            report.addonImagesDeleted++;
            console.log(`🗑️ Deleted orphaned addon image: ${fileName}`);
          } catch (error) {
            report.errors.push(`Failed to delete addon image ${fileName}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      report.errors.push(`Error cleaning addon images: ${error.message}`);
    }
    
  } catch (error) {
    report.errors.push(`Cleanup error: ${error.message}`);
  }
  
  return report;
}

/**
 * Generate migration report
 */
async function generateMigrationReport() {
  console.log('📊 Generating migration report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    totalVendors: 0,
    vendorsWithV2Products: 0,
    vendorsWithV1Only: 0,
    totalV2Products: 0,
    totalV2Addons: 0,
    vendorDetails: []
  };
  
  try {
    // Get all vendors
    const vendorsSnapshot = await db.collection('vendors').get();
    report.totalVendors = vendorsSnapshot.docs.length;
    
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      
      // Check V2 products
      const v2ProductsSnapshot = await db
        .collection('vendors')
        .doc(vendorId)
        .collection('products')
        .get();
      
      // Check V1 menu items
      const v1MenuSnapshot = await db
        .collection('vendors')
        .doc(vendorId)
        .collection('menuItems')
        .get();
      
      const hasV2Products = !v2ProductsSnapshot.empty;
      const hasV1Menu = !v1MenuSnapshot.empty;
      
      if (hasV2Products) {
        report.vendorsWithV2Products++;
        
        // Count addons
        let addonCount = 0;
        v2ProductsSnapshot.docs.forEach(doc => {
          const product = doc.data();
          if (product.addons && Array.isArray(product.addons)) {
            addonCount += product.addons.length;
          }
        });
        
        report.totalV2Products += v2ProductsSnapshot.docs.length;
        report.totalV2Addons += addonCount;
      }
      
      if (hasV1Menu && !hasV2Products) {
        report.vendorsWithV1Only++;
      }
      
      report.vendorDetails.push({
        vendorId,
        name: vendorData.name || vendorData.businessName || 'Unknown',
        hasV1Menu,
        hasV2Products,
        v1MenuCount: v1MenuSnapshot.docs.length,
        v2ProductCount: v2ProductsSnapshot.docs.length,
        v2AddonCount: hasV2Products ? v2ProductsSnapshot.docs.reduce((sum, doc) => {
          const product = doc.data();
          return sum + (product.addons?.length || 0);
        }, 0) : 0
      });
    }
    
  } catch (error) {
    console.error('Error generating report:', error);
    report.error = error.message;
  }
  
  return report;
}

/**
 * Run full cleanup for a vendor
 */
async function runFullCleanup(vendorId) {
  console.log(`🚀 Running full cleanup for vendor: ${vendorId}`);
  
  const results = {
    validation: await validateV2Data(vendorId),
    cleanup: await cleanupOrphanedFiles(vendorId)
  };
  
  console.log('\n📋 CLEANUP SUMMARY');
  console.log('==================');
  console.log(`✅ Data Valid: ${results.validation.isValid}`);
  console.log(`📦 Products: ${results.validation.productCount}`);
  console.log(`🗑️ Images Deleted: ${results.cleanup.productImagesDeleted + results.cleanup.addonImagesDeleted}`);
  
  if (results.validation.issues.length > 0) {
    console.log('\n⚠️ VALIDATION ISSUES:');
    results.validation.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }
  
  if (results.cleanup.errors.length > 0) {
    console.log('\n❌ CLEANUP ERRORS:');
    results.cleanup.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  return results;
}

/**
 * Run cleanup for all vendors
 */
async function runGlobalCleanup() {
  console.log('🌍 Running global cleanup...');
  
  const report = await generateMigrationReport();
  console.log('\n📊 MIGRATION REPORT');
  console.log('===================');
  console.log(`📈 Total Vendors: ${report.totalVendors}`);
  console.log(`✅ V2 Vendors: ${report.vendorsWithV2Products}`);
  console.log(`❓ V1 Only: ${report.vendorsWithV1Only}`);
  console.log(`📦 Total V2 Products: ${report.totalV2Products}`);
  console.log(`🧩 Total V2 Addons: ${report.totalV2Addons}`);
  
  // Save report to file
  const fs = require('fs');
  const reportPath = `migration_report_${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Full report saved to: ${reportPath}`);
  
  return report;
}

// Export functions
module.exports = {
  validateV2Data,
  cleanupOrphanedFiles,
  generateMigrationReport,
  runFullCleanup,
  runGlobalCleanup
};

// Command line execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node cleanup.js report           # Generate migration report');
    console.log('  node cleanup.js validate VENDOR_ID  # Validate specific vendor');
    console.log('  node cleanup.js cleanup VENDOR_ID   # Full cleanup for vendor');
    process.exit(1);
  }
  
  const command = args[0];
  const vendorId = args[1];
  
  switch (command) {
    case 'report':
      runGlobalCleanup().then(() => process.exit(0));
      break;
    case 'validate':
      if (!vendorId) {
        console.error('Please provide vendor ID');
        process.exit(1);
      }
      validateV2Data(vendorId).then((result) => {
        console.log('Validation result:', JSON.stringify(result, null, 2));
        process.exit(0);
      });
      break;
    case 'cleanup':
      if (!vendorId) {
        console.error('Please provide vendor ID');
        process.exit(1);
      }
      runFullCleanup(vendorId).then(() => process.exit(0));
      break;
    default:
      console.error('Unknown command:', command);
      process.exit(1);
  }
}