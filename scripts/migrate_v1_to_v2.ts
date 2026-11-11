/**
 * migrate_v1_to_v2.ts
 * Usage: NODE_ENV=production node ./dist/migrate_v1_to_v2.js
 *
 * This script reads legacy vendor menu items and writes them to new V2 collection:
 * /vendors/{vendorId}/products/{productId}
 *
 * IMPORTANT: It does not delete old data. Run in dry-run first.
 */

import admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.NODE_ENV !== "production";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

interface V1MenuItem {
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  basePrice?: number;
  imageUrl?: string;
  imagePath?: string;
  category?: string;
  measurementType?: string;
  minQty?: number;
  maxQty?: number;
  createdAt?: admin.firestore.Timestamp;
  addons?: V1Addon[] | { [key: string]: V1Addon };
  addOns?: V1Addon[]; // Alternative field name
}

interface V1Addon {
  id?: string;
  name?: string;
  price?: number;
  imageUrl?: string;
}

interface V2Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string | null;
  category: string;
  measurementType: string;
  minQty: number;
  maxQty: number;
  isAvailable: boolean;
  vendorId: string;
  createdAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
  updatedAt: admin.firestore.FieldValue;
  addons: V2Addon[];
  // Migration metadata
  migratedFrom: string;
  originalId: string;
  migratedAt: admin.firestore.FieldValue;
}

interface V2Addon {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isAvailable?: boolean;
}

async function copyImageInStorage(oldPath: string, newPath: string): Promise<void> {
  try {
    const oldFile = bucket.file(oldPath);
    const [exists] = await oldFile.exists();
    
    if (exists) {
      await oldFile.copy(bucket.file(newPath));
      console.log(`✅ Copied image: ${oldPath} → ${newPath}`);
    }
  } catch (error) {
    console.error(`❌ Failed to copy image ${oldPath}:`, error);
  }
}

function normalizeAddons(oldAddons: V1MenuItem['addons'] | V1MenuItem['addOns']): V2Addon[] {
  const addons: V2Addon[] = [];
  
  if (Array.isArray(oldAddons)) {
    for (const a of oldAddons) {
      const addonId = a.id || uuidv4();
      addons.push({
        id: addonId,
        name: a.name || "Addon",
        price: Number(a.price || 0),
        imageUrl: a.imageUrl || null,
        isAvailable: true,
      });
    }
  } else if (oldAddons && typeof oldAddons === "object") {
    // Handle object format
    for (const key of Object.keys(oldAddons)) {
      const a = oldAddons[key];
      addons.push({
        id: a.id || key || uuidv4(),
        name: a.name || "Addon",
        price: Number(a.price || 0),
        imageUrl: a.imageUrl || null,
        isAvailable: true,
      });
    }
  }
  
  return addons;
}

async function migrateVendor(vendorId: string): Promise<{ success: boolean; migrated: number; errors: string[] }> {
  console.log(`🔄 Processing vendor: ${vendorId}`);
  
  const errors: string[] = [];
  let migratedCount = 0;
  
  try {
    // Check if V2 products already exist
    const existingV2Products = await db.collection(`vendors/${vendorId}/products`).limit(1).get();
    if (!existingV2Products.empty) {
      console.log(`   ⚠️  V2 products already exist for vendor ${vendorId}. Skipping.`);
      return { success: true, migrated: 0, errors: [] };
    }
    
    // Get V1 menu items
    const oldMenuRef = db.collection(`vendors/${vendorId}/menuItems`);
    const oldMenuSnap = await oldMenuRef.get();
    
    if (oldMenuSnap.empty) {
      console.log(`   ℹ️  No V1 menu items found for vendor ${vendorId}`);
      return { success: true, migrated: 0, errors: [] };
    }
    
    console.log(`   📋 Found ${oldMenuSnap.size} V1 menu items`);
    
    // Process each menu item
    for (const itemDoc of oldMenuSnap.docs) {
      try {
        const old = itemDoc.data() as V1MenuItem;
        const productId = itemDoc.id || uuidv4();
        
        // Normalize addons from both possible field names
        const addons = normalizeAddons(old.addons || old.addOns);
        
        const product: V2Product = {
          id: productId,
          name: old.name || old.title || "Unnamed product",
          description: old.description || "",
          basePrice: Number(old.price || old.basePrice || 0),
          imageUrl: old.imageUrl || null,
          category: old.category || "food",
          measurementType: old.measurementType || "unit",
          minQty: old.minQty ? Number(old.minQty) : 1,
          maxQty: old.maxQty ? Number(old.maxQty) : 10,
          isAvailable: true,
          vendorId: vendorId,
          createdAt: old.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          addons: addons,
          // Migration metadata
          migratedFrom: 'v1',
          originalId: itemDoc.id,
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        if (DRY_RUN) {
          console.log(`   [DRY RUN] Would write: vendors/${vendorId}/products/${productId}`);
          console.log(`   [DRY RUN] Product:`, {
            name: product.name,
            basePrice: product.basePrice,
            addons: product.addons.length
          });
        } else {
          const productRef = db.doc(`vendors/${vendorId}/products/${productId}`);
          await productRef.set(product, { merge: true });
          
          // Copy image if it exists in old location but not in new imageUrl
          if (!product.imageUrl && old.imagePath) {
            const newImagePath = `vendors/${vendorId}/products/${productId}.jpg`;
            await copyImageInStorage(old.imagePath, newImagePath);
            
            // Update product with new image URL
            const publicUrl = `gs://${process.env.FIREBASE_STORAGE_BUCKET}/${newImagePath}`;
            await productRef.update({ imageUrl: publicUrl });
          }
          
          console.log(`   ✅ Migrated product: ${product.name} (${productId})`);
        }
        
        migratedCount++;
      } catch (error) {
        const errorMsg = `Failed to migrate item ${itemDoc.id}: ${error}`;
        console.error(`   ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    return { success: true, migrated: migratedCount, errors };
    
  } catch (error) {
    const errorMsg = `Failed to process vendor ${vendorId}: ${error}`;
    console.error(`❌ ${errorMsg}`);
    return { success: false, migrated: migratedCount, errors: [errorMsg] };
  }
}

async function migrate(): Promise<void> {
  console.log("🚀 Starting GO7 V1 to V2 Migration");
  console.log("===================================");
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'PRODUCTION'}`);
  
  const startTime = Date.now();
  const results = {
    totalVendors: 0,
    processedVendors: 0,
    totalMigrated: 0,
    totalErrors: 0,
    vendorResults: [] as Array<{
      vendorId: string;
      success: boolean;
      migrated: number;
      errors: string[];
    }>
  };
  
  try {
    const vendorsSnap = await db.collection("vendors").get();
    results.totalVendors = vendorsSnap.size;
    
    console.log(`📊 Found ${vendorsSnap.size} vendors`);
    
    for (const vendorDoc of vendorsSnap.docs) {
      const vendorId = vendorDoc.id;
      const result = await migrateVendor(vendorId);
      
      results.processedVendors++;
      results.totalMigrated += result.migrated;
      results.totalErrors += result.errors.length;
      results.vendorResults.push({
        vendorId,
        success: result.success,
        migrated: result.migrated,
        errors: result.errors
      });
      
      // Small delay to avoid overwhelming Firestore
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
  } catch (error) {
    console.error("💥 Migration failed:", error);
    results.totalErrors++;
  }
  
  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n🎯 MIGRATION SUMMARY');
  console.log('====================');
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📊 Total Vendors: ${results.totalVendors}`);
  console.log(`✅ Processed: ${results.processedVendors}`);
  console.log(`🔄 Items Migrated: ${results.totalMigrated}`);
  console.log(`❌ Total Errors: ${results.totalErrors}`);
  
  // Show vendor-specific results
  const failedVendors = results.vendorResults.filter(r => !r.success || r.errors.length > 0);
  if (failedVendors.length > 0) {
    console.log('\n⚠️  VENDORS WITH ISSUES:');
    failedVendors.forEach((result, index) => {
      console.log(`${index + 1}. ${result.vendorId}: ${result.migrated} migrated, ${result.errors.length} errors`);
      result.errors.forEach(error => console.log(`   - ${error}`));
    });
  }
  
  console.log(`\n${DRY_RUN ? '🧪 DRY RUN COMPLETE' : '🎉 MIGRATION COMPLETE'}!`);
}

// Run migration
migrate().catch((err) => {
  console.error("💥 Migration failed:", err);
  process.exit(1);
});