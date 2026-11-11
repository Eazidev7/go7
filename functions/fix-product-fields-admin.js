// ====================================================================
// 🔧 AUTOMATIC PRODUCT FIELD NORMALIZER (Admin SDK)
// Scans all vendors and fixes field name mismatches
// ====================================================================

const admin = require('firebase-admin');

// Initialize Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'go7-b69ab'
  });
}

const db = admin.firestore();

let totalVendors = 0;
let totalProducts = 0;
let productsFixed = 0;
let productsSkipped = 0;

async function fixProductFields(dryRun = true) {
  console.log('\n🔧 ========================================');
  console.log('🔧 PRODUCT FIELD NORMALIZER');
  console.log('========================================\n');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '✍️  LIVE MODE (will update)'}\n`);

  try {
    // Get all vendors
    console.log('Step 1: Scanning vendors...\n');
    const vendorsSnap = await db.collection('vendors').get();

    if (vendorsSnap.empty) {
      console.log('❌ No vendors found');
      return;
    }

    totalVendors = vendorsSnap.size;
    console.log(`✅ Found ${totalVendors} vendors\n`);

    // Process each vendor
    for (const vendorDoc of vendorsSnap.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      
      console.log(`\n📍 Vendor: ${vendorData.name || vendorData.title || vendorId}`);
      console.log('─────────────────────────────────────');

      // Get all products for this vendor
      const productsSnap = await db
        .collection('vendors')
        .doc(vendorId)
        .collection('products')
        .get();

      if (productsSnap.empty) {
        console.log('   ⚠️  No products\n');
        continue;
      }

      console.log(`   Found ${productsSnap.size} products`);
      totalProducts += productsSnap.size;

      // Batch update
      const batch = db.batch();
      let batchCount = 0;
      let vendorFixCount = 0;

      for (const productDoc of productsSnap.docs) {
        const data = productDoc.data();
        const updates = {};
        let needsUpdate = false;

        // Check if needs normalization
        if (!data.title && data.name) {
          updates.title = data.name;
          needsUpdate = true;
          console.log(`   🔧 ${productDoc.id}: Adding title from name`);
        }

        if (!data.desc && data.description) {
          updates.desc = data.description;
          needsUpdate = true;
          console.log(`   🔧 ${productDoc.id}: Adding desc from description`);
        }

        if (!data.imageUrl && data.image) {
          updates.imageUrl = data.image;
          needsUpdate = true;
          console.log(`   🔧 ${productDoc.id}: Adding imageUrl from image`);
        }

        // Validate price
        if (typeof data.price !== 'number' || isNaN(data.price)) {
          const parsedPrice = parseFloat(String(data.price));
          if (!isNaN(parsedPrice)) {
            updates.price = parsedPrice;
            needsUpdate = true;
            console.log(`   🔧 ${productDoc.id}: Converting price to number (${data.price} → ${parsedPrice})`);
          } else {
            console.log(`   ⚠️  ${productDoc.id}: Invalid price "${data.price}" - cannot fix`);
          }
        }

        if (needsUpdate) {
          productsFixed++;
          vendorFixCount++;
          
          if (!dryRun) {
            batch.update(productDoc.ref, updates);
            batchCount++;

            // Commit batch every 500 operations
            if (batchCount >= 500) {
              await batch.commit();
              console.log(`   💾 Committed ${batchCount} updates`);
              batchCount = 0;
            }
          }
        } else {
          productsSkipped++;
        }
      }

      // Commit remaining updates for this vendor
      if (!dryRun && batchCount > 0) {
        await batch.commit();
        console.log(`   💾 Committed ${batchCount} updates`);
      }

      if (vendorFixCount > 0) {
        console.log(`   ✅ Fixed ${vendorFixCount} products for this vendor`);
      } else {
        console.log(`   ✓ All products already normalized`);
      }
    }

    // Summary
    console.log('\n\n========================================');
    console.log('📊 SUMMARY');
    console.log('========================================');
    console.log(`Vendors scanned: ${totalVendors}`);
    console.log(`Products scanned: ${totalProducts}`);
    console.log(`Products needing fixes: ${productsFixed}`);
    console.log(`Products already correct: ${productsSkipped}`);
    
    if (dryRun && productsFixed > 0) {
      console.log('\n⚠️  This was a DRY RUN - no changes were made');
      console.log('Run with --live flag to apply fixes:');
      console.log('   node fix-product-fields-admin.js --live');
    } else if (!dryRun && productsFixed > 0) {
      console.log('\n✅ All fixes applied successfully!');
      console.log('🔄 Refresh your browser to see the changes');
    } else {
      console.log('\n✅ All products already have correct field names!');
    }
    
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    throw error;
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const isLive = args.includes('--live');

console.log('🚀 Starting Product Field Normalizer (Admin SDK)...\n');

fixProductFields(!isLive)
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
