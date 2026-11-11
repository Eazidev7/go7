/**
 * 🔧 FIX EXISTING FIRESTORE PRODUCTS - Convert string prices to numbers
 * 
 * Run this script to fix all existing products with string prices
 * This ensures all prices in Firestore are stored as numbers
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  writeBatch,
  query,
  collectionGroup
} from 'firebase/firestore';

// Import your Firebase config
import { firebaseConfig } from './firebase/config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface ProductUpdate {
  path: string;
  oldPrice: any;
  newPrice: number;
  hasVariants: boolean;
}

/**
 * Fix prices for all vendor products
 */
async function fixVendorProducts() {
  console.log('🔍 Scanning vendor products for price issues...\n');
  
  const updates: ProductUpdate[] = [];
  let totalProducts = 0;
  let fixedProducts = 0;
  
  try {
    // Get all vendors
    const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
    console.log(`📦 Found ${vendorsSnapshot.size} vendors\n`);
    
    // For each vendor, check their products
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorName = vendorDoc.data().name || 'Unknown Vendor';
      
      console.log(`\n🏪 Checking ${vendorName} (${vendorId})...`);
      
      const productsRef = collection(db, `vendors/${vendorId}/products`);
      const productsSnapshot = await getDocs(productsRef);
      
      console.log(`  Found ${productsSnapshot.size} products`);
      
      for (const productDoc of productsSnapshot.docs) {
        totalProducts++;
        const productData = productDoc.data();
        const productPath = `vendors/${vendorId}/products/${productDoc.id}`;
        
        let needsUpdate = false;
        const updateData: any = {};
        
        // Check main price
        if (typeof productData.price !== 'number' || isNaN(productData.price)) {
          const oldPrice = productData.price;
          const newPrice = parseFloat(String(productData.price)) || 0;
          
          needsUpdate = true;
          updateData.price = newPrice;
          
          console.log(`  ⚠️  ${productData.name || productData.title}: "${oldPrice}" -> ${newPrice}`);
          
          updates.push({
            path: productPath,
            oldPrice,
            newPrice,
            hasVariants: false
          });
        }
        
        // Check variant prices
        if (productData.variants && Array.isArray(productData.variants)) {
          const fixedVariants = productData.variants.map((variant: any) => {
            if (typeof variant.price !== 'number' || isNaN(variant.price)) {
              const oldPrice = variant.price;
              const newPrice = parseFloat(String(variant.price)) || 0;
              
              console.log(`    🔧 Variant ${variant.name}: "${oldPrice}" -> ${newPrice}`);
              needsUpdate = true;
              
              return {
                ...variant,
                price: newPrice
              };
            }
            return variant;
          });
          
          if (needsUpdate) {
            updateData.variants = fixedVariants;
          }
        }
        
        // Apply update if needed
        if (needsUpdate) {
          const productRef = doc(db, productPath);
          await updateDoc(productRef, updateData);
          fixedProducts++;
          console.log(`  ✅ Fixed ${productData.name || productData.title}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 SUMMARY:`);
    console.log(`  Total products scanned: ${totalProducts}`);
    console.log(`  Products fixed: ${fixedProducts}`);
    console.log(`  Products OK: ${totalProducts - fixedProducts}`);
    console.log(`\n✅ Price fix completed successfully!\n`);
    
  } catch (error) {
    console.error('\n❌ Error fixing products:', error);
    throw error;
  }
}

/**
 * Fix prices in global /products collection
 */
async function fixGlobalProducts() {
  console.log('\n🌍 Fixing global /products collection...\n');
  
  try {
    const productsSnapshot = await getDocs(collection(db, 'products'));
    console.log(`📦 Found ${productsSnapshot.size} products in global collection\n`);
    
    let fixed = 0;
    
    for (const productDoc of productsSnapshot.docs) {
      const productData = productDoc.data();
      
      if (typeof productData.price !== 'number' || isNaN(productData.price)) {
        const oldPrice = productData.price;
        const newPrice = parseFloat(String(productData.price)) || 0;
        
        console.log(`  ⚠️  ${productData.name || productData.title}: "${oldPrice}" -> ${newPrice}`);
        
        const productRef = doc(db, `products/${productDoc.id}`);
        await updateDoc(productRef, { price: newPrice });
        
        fixed++;
        console.log(`  ✅ Fixed ${productData.name || productData.title}`);
      }
    }
    
    console.log(`\n📊 Global products fixed: ${fixed}\n`);
    
  } catch (error) {
    console.error('\n❌ Error fixing global products:', error);
    throw error;
  }
}

/**
 * Validate all products after fix
 */
async function validateProducts() {
  console.log('\n🔍 Validating all products...\n');
  
  let totalChecked = 0;
  let invalidFound = 0;
  
  try {
    // Check vendor products
    const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
    
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const productsSnapshot = await getDocs(
        collection(db, `vendors/${vendorId}/products`)
      );
      
      for (const productDoc of productsSnapshot.docs) {
        totalChecked++;
        const productData = productDoc.data();
        
        if (typeof productData.price !== 'number' || isNaN(productData.price)) {
          console.log(`  ❌ Invalid price in ${vendorId}/${productDoc.id}: ${productData.price}`);
          invalidFound++;
        }
        
        if (productData.variants && Array.isArray(productData.variants)) {
          productData.variants.forEach((variant: any, index: number) => {
            if (typeof variant.price !== 'number' || isNaN(variant.price)) {
              console.log(`  ❌ Invalid variant price in ${vendorId}/${productDoc.id} variant ${index}: ${variant.price}`);
              invalidFound++;
            }
          });
        }
      }
    }
    
    console.log(`\n📊 VALIDATION RESULTS:`);
    console.log(`  Total products checked: ${totalChecked}`);
    console.log(`  Invalid prices found: ${invalidFound}`);
    
    if (invalidFound === 0) {
      console.log(`\n✅ All products have valid numeric prices!\n`);
    } else {
      console.log(`\n⚠️  ${invalidFound} invalid prices still found. Please run the fix again.\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Error validating products:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Firestore Price Fix Tool\n');
  console.log('This will fix all products with string prices and convert them to numbers.\n');
  
  try {
    // Step 1: Fix vendor products
    await fixVendorProducts();
    
    // Step 2: Fix global products
    await fixGlobalProducts();
    
    // Step 3: Validate everything
    await validateProducts();
    
    console.log('🎉 All done! Your products should now have proper numeric prices.\n');
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

export { fixVendorProducts, fixGlobalProducts, validateProducts };
