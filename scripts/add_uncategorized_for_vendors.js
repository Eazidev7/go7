/**
 * Migration Script: Add Uncategorized Category for Vendors
 * 
 * This script:
 * 1. Creates an "Uncategorized" category for each vendor that doesn't have categories
 * 2. Updates products without categoryId to use the "Uncategorized" category
 * 
 * Usage: node scripts/add_uncategorized_for_vendors.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateVendorCategories() {
  console.log('🚀 Starting vendor categories migration...\n');

  try {
    // Get all vendors
    const vendorsSnapshot = await db.collection('vendors').get();
    console.log(`📊 Found ${vendorsSnapshot.size} vendors\n`);

    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      const vendorName = vendorData.businessName || vendorData.name || vendorId;

      console.log(`\n🏪 Processing: ${vendorName} (${vendorId})`);

      // Check if vendor has categories
      const categoriesSnapshot = await db
        .collection('vendors')
        .doc(vendorId)
        .collection('categories')
        .get();

      let uncategorizedId = null;

      if (categoriesSnapshot.empty) {
        console.log('  ℹ️  No categories found - creating Uncategorized category');
        
        // Create Uncategorized category
        const categoryRef = await db
          .collection('vendors')
          .doc(vendorId)
          .collection('categories')
          .add({
            name: 'Uncategorized',
            slug: 'uncategorized',
            priority: 999,
            iconUrl: null,
            vendorId: vendorId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

        uncategorizedId = categoryRef.id;
        console.log(`  ✅ Created Uncategorized category: ${uncategorizedId}`);
      } else {
        console.log(`  ℹ️  Found ${categoriesSnapshot.size} existing categories`);
        
        // Check if Uncategorized already exists
        const uncategorized = categoriesSnapshot.docs.find(
          doc => doc.data().name === 'Uncategorized' || doc.data().slug === 'uncategorized'
        );

        if (uncategorized) {
          uncategorizedId = uncategorized.id;
          console.log(`  ℹ️  Uncategorized category already exists: ${uncategorizedId}`);
        } else {
          // Create Uncategorized category
          const categoryRef = await db
            .collection('vendors')
            .doc(vendorId)
            .collection('categories')
            .add({
              name: 'Uncategorized',
              slug: 'uncategorized',
              priority: 999,
              iconUrl: null,
              vendorId: vendorId,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

          uncategorizedId = categoryRef.id;
          console.log(`  ✅ Created Uncategorized category: ${uncategorizedId}`);
        }
      }

      // Update products without categoryId
      const productsSnapshot = await db
        .collection('vendors')
        .doc(vendorId)
        .collection('products')
        .get();

      let updatedCount = 0;
      const batch = db.batch();

      for (const productDoc of productsSnapshot.docs) {
        const productData = productDoc.data();

        if (!productData.categoryId) {
          const productRef = db
            .collection('vendors')
            .doc(vendorId)
            .collection('products')
            .doc(productDoc.id);

          batch.update(productRef, {
            categoryId: uncategorizedId,
            categoryName: 'Uncategorized',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
        console.log(`  ✅ Updated ${updatedCount} products to Uncategorized`);
      } else {
        console.log(`  ℹ️  No products need categorization`);
      }
    }

    console.log('\n\n✅ Migration completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Processed ${vendorsSnapshot.size} vendors`);
    console.log(`   - All vendors now have at least one category`);
    console.log(`   - All products are now categorized`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateVendorCategories()
  .then(() => {
    console.log('\n✨ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
