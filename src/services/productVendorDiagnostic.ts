import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

/**
 * 🔧 PRODUCT-VENDOR RELATIONSHIP DIAGNOSTIC
 * Test script to verify products are correctly linked to vendors
 */

export class ProductVendorDiagnostic {
  
  // Test 1: Check all vendors and their product counts
  static async testAllVendorProducts() {
    console.log('🔍 DIAGNOSTIC: Testing all vendor products...\n');
    
    try {
      // Get all vendors
      const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
      console.log(`Found ${vendorsSnapshot.size} vendors total\n`);
      
      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorId = vendorDoc.id;
        const vendorData = vendorDoc.data();
        
        console.log(`🏪 Vendor: ${vendorData.name || 'Unknown'} (ID: ${vendorId})`);
        
        // Check products for this vendor using V2 structure
        const productsSnapshot = await getDocs(
          collection(db, 'vendors', vendorId, 'products')
        );
        
        console.log(`   📦 Products found: ${productsSnapshot.size}`);
        
        if (productsSnapshot.size > 0) {
          productsSnapshot.docs.forEach((productDoc, index) => {
            const product = productDoc.data();
            console.log(`   ${index + 1}. ${product.name || 'Unnamed'} - ₦${product.basePrice || product.price || 'N/A'}`);
            
            // Check if vendorId is correctly set in product
            if (product.vendorId && product.vendorId !== vendorId) {
              console.log(`   ⚠️  WARNING: Product vendorId (${product.vendorId}) doesn't match collection path (${vendorId})`);
            }
            if (!product.vendorId) {
              console.log(`   ⚠️  WARNING: Product missing vendorId field`);
            }
          });
        }
        console.log(''); // Empty line for readability
      }
      
    } catch (error) {
      console.error('❌ Error in diagnostic:', error);
    }
  }
  
  // Test 2: Try querying products by vendor ID using service method
  static async testVendorProductQuery(vendorId: string) {
    console.log(`🔍 DIAGNOSTIC: Testing product query for vendor ${vendorId}...\n`);
    
    try {
      // Test V2 structure query
      const productsSnapshot = await getDocs(
        query(
          collection(db, 'vendors', vendorId, 'products'),
          where('active', '==', true)
        )
      );
      
      console.log(`Found ${productsSnapshot.size} active products for vendor ${vendorId}`);
      
      productsSnapshot.docs.forEach((doc, index) => {
        const product = doc.data();
        console.log(`${index + 1}. ${product.name} - ₦${product.basePrice || product.price} (${product.category || 'No category'})`);
        console.log(`   Product Type: ${product.productType || 'Not set'}`);
        console.log(`   Active: ${product.active !== undefined ? product.active : 'Not set'}`);
        console.log(`   VendorId in doc: ${product.vendorId || 'Not set'}`);
      });
      
    } catch (error) {
      console.error('❌ Error querying vendor products:', error);
    }
  }
  
  // Test 3: Verify category display issues
  static async testCategoryDisplay() {
    console.log('🔍 DIAGNOSTIC: Testing category display...\n');
    
    try {
      // Check for products without categories
      const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
      
      let totalProducts = 0;
      let productsWithCategories = 0;
      let productsWithoutCategories = 0;
      
      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorId = vendorDoc.id;
        const productsSnapshot = await getDocs(
          collection(db, 'vendors', vendorId, 'products')
        );
        
        productsSnapshot.docs.forEach(productDoc => {
          const product = productDoc.data();
          totalProducts++;
          
          if (product.category && product.category.trim()) {
            productsWithCategories++;
          } else {
            productsWithoutCategories++;
            console.log(`❌ Product without category: ${product.name} (Vendor: ${vendorId})`);
          }
        });
      }
      
      console.log(`\n📊 CATEGORY SUMMARY:`);
      console.log(`Total Products: ${totalProducts}`);
      console.log(`With Categories: ${productsWithCategories}`);
      console.log(`Without Categories: ${productsWithoutCategories}`);
      
    } catch (error) {
      console.error('❌ Error in category diagnostic:', error);
    }
  }
}

// Auto-run diagnostics if this file is imported
if (typeof window !== 'undefined') {
  console.log('🔧 Product-Vendor Relationship Diagnostic Tool Ready');
  console.log('Run these commands in browser console:');
  console.log('- ProductVendorDiagnostic.testAllVendorProducts()');
  console.log('- ProductVendorDiagnostic.testVendorProductQuery("vendor-id")');
  console.log('- ProductVendorDiagnostic.testCategoryDisplay()');
}