#!/usr/bin/env node

/**
 * Migration Validation Script
 * 
 * Validates V1 to V2 migration results and system integrity
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');

if (require('fs').existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.appspot.com`
  });
} else {
  console.log('⚠️ service-account.json not found, using default credentials');
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Validate quantity based on measurement type (local market rules)
 */
function validateQty(measurementType, val) {
  if (measurementType === 'bundle' || measurementType === 'unit' || measurementType === 'portion') {
    return Number.isInteger(val) && val >= 1;
  }
  // weight
  return !Number.isNaN(val) && val > 0;
}

/**
 * Validate V2 product structure
 */
function validateV2Product(product) {
  const requiredFields = ['id', 'vendorId', 'name', 'basePrice', 'measurementType'];
  
  // Check required fields
  for (const field of requiredFields) {
    if (!(field in product)) {
      return { isValid: false, error: `Missing required field: ${field}` };
    }
  }
  
  // Validate measurement type
  const validMeasurementTypes = ['unit', 'portion', 'bundle', 'weight'];
  if (!validMeasurementTypes.includes(product.measurementType)) {
    return { 
      isValid: false, 
      error: `Invalid measurement type: ${product.measurementType}` 
    };
  }
  
  // Validate price
  if (typeof product.basePrice !== 'number' || product.basePrice < 0) {
    return { isValid: false, error: 'Invalid basePrice' };
  }
  
  // Validate quantities if present
  if (product.minQty && !validateQty(product.measurementType, product.minQty)) {
    return { isValid: false, error: 'Invalid minQty for measurement type' };
  }
  
  if (product.maxQty && !validateQty(product.measurementType, product.maxQty)) {
    return { isValid: false, error: 'Invalid maxQty for measurement type' };
  }
  
  // Validate addons
  if (product.addons && Array.isArray(product.addons)) {
    for (const addon of product.addons) {
      if (!addon.id || !addon.name || typeof addon.price !== 'number' || addon.price < 0) {
        return { isValid: false, error: 'Invalid addon structure' };
      }
    }
  }
  
  return { isValid: true };
}

/**
 * Format quantity display
 */
function formatQuantity(qty, measurementType, unitLabel) {
  const defaultLabels = {
    unit: 'item',
    portion: 'serving', 
    bundle: 'bundle',
    weight: 'derica'
  };
  
  const unit = unitLabel || defaultLabels[measurementType] || 'item';
  const formattedQty = measurementType === 'weight' ? qty.toFixed(1).replace(/\.0$/, '') : qty.toString();
  const pluralUnit = qty > 1 && !unit.endsWith('s') ? `${unit}s` : unit;
  
  return `${formattedQty} ${pluralUnit}`;
}

async function validateMigrationResults() {
  console.log('🔍 Starting Migration Validation..\n');
  
  let totalVendors = 0;
  let totalV2Products = 0;
  let totalV1Products = 0;
  let validationErrors = [];
  let validationWarnings = [];
  
  try {
    // Get all vendors
    const vendorsSnapshot = await db.collection('vendors').get();
    totalVendors = vendorsSnapshot.size;
    
    console.log(`🏢 Found ${totalVendors} vendors to validate\n`);
    
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      
      console.log(`📝 Validating vendor: ${vendorData.businessName || vendorId}`);
      
      // Check V2 products
      const v2ProductsSnapshot = await db.collection(`vendors/${vendorId}/products`).get();
      
      for (const productDoc of v2ProductsSnapshot.docs) {
        const product = productDoc.data();
        
        if (product.measurementType) {
          // This is a V2 product
          totalV2Products++;
          
          const validation = validateV2Product({ id: productDoc.id, ...product });
          if (!validation.isValid) {
            validationErrors.push(`V2 Product ${product.name} (${vendorId}): ${validation.error}`);
          } else {
            console.log(`   ✅ V2 Product: ${product.name} (${product.measurementType})`);
          }
          
          // Check measurement type usage
          if (product.minQty && !validateQty(product.measurementType, product.minQty)) {
            validationWarnings.push(`Invalid minQty for ${product.name}: ${product.minQty} (${product.measurementType})`);
          }
          
        } else if (product.price !== undefined) {
          // This looks like a V1 product that wasn't migrated
          totalV1Products++;
          validationWarnings.push(`Unmigrated V1 product found: ${product.name} (${vendorId})`);
        }
      }
      
      // Check legacy menu items
      const menuItemsSnapshot = await db.collection(`vendors/${vendorId}/menus`).get();
      if (!menuItemsSnapshot.empty) {
        totalV1Products += menuItemsSnapshot.size;
        validationWarnings.push(`Vendor ${vendorId} still has ${menuItemsSnapshot.size} V1 menu items`);
      }
    }
    
    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION VALIDATION RESULTS');
    console.log('='.repeat(60));
    
    console.log(`Total Vendors: ${totalVendors}`);
    console.log(`V2 Products: ${totalV2Products}`);
    console.log(`V1 Products: ${totalV1Products}`);
    console.log(`Migration Rate: ${totalV2Products + totalV1Products > 0 ? Math.round((totalV2Products / (totalV2Products + totalV1Products)) * 100) : 0}%`);
    
    // Measurement type distribution
    console.log('\n📊 Measurement Type Distribution:');
    const measurementStats = {};
    
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const productsSnapshot = await db.collection(`vendors/${vendorId}/products`).get();
      
      productsSnapshot.docs.forEach(doc => {
        const product = doc.data();
        if (product.measurementType) {
          measurementStats[product.measurementType] = (measurementStats[product.measurementType] || 0) + 1;
        }
      });
    }
    
    Object.entries(measurementStats).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} products`);
    });
    
    // Validation errors
    if (validationErrors.length > 0) {
      console.log('\n❌ VALIDATION ERRORS:');
      validationErrors.forEach(error => console.log(`   • ${error}`));
    }
    
    // Validation warnings  
    if (validationWarnings.length > 0) {
      console.log('\n⚠️ VALIDATION WARNINGS:');
      validationWarnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    // Final assessment
    console.log('\n🎯 ASSESSMENT:');
    
    if (validationErrors.length === 0) {
      if (totalV2Products > totalV1Products) {
        console.log('✅ MIGRATION SUCCESSFUL - V2 system is operational');
      } else if (totalV2Products > 0) {
        console.log('⚠️ MIGRATION PARTIAL - Continue migrating remaining products');
      } else {
        console.log('❌ MIGRATION NOT STARTED - No V2 products found');
      }
    } else {
      console.log('❌ VALIDATION FAILED - Fix errors before proceeding');
    }
    
    // Quantity validation examples
    console.log('\n📊 Quantity Validation Examples:');
    console.log('   unit: 1, 2, 3 (integers only)');
    console.log('   portion: 1, 2, 5 (integers only)');
    console.log('   bundle: 1, 2, 10 (integers only)');
    console.log('   weight: 0.5, 1.0, 2.5 (decimals allowed)');
    
    // Formatting examples
    console.log('\n🏷️ Quantity Formatting Examples:');
    console.log(`   ${formatQuantity(2, 'unit')} → "2 items"`);
    console.log(`   ${formatQuantity(1, 'portion')} → "1 serving"`);
    console.log(`   ${formatQuantity(3, 'bundle', 'tuber')} → "3 tubers"`);
    console.log(`   ${formatQuantity(1.5, 'weight', 'derica')} → "1.5 dericas"`);
    
    process.exit(validationErrors.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run validation
validateMigrationResults();
