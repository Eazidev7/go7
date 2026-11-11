// 🔧 FIX VENDOR BUSINESS NAMES - Migration Script
// Run this once to sync businessName field for all existing vendors

import { collection, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Fixes businessName field for all existing vendors
 * Sets businessName = name if businessName is missing or generic
 */
export const fixVendorBusinessNames = async () => {
  try {
    console.log('🔧 Starting vendor businessName migration...');
    
    const vendorsRef = collection(db, 'vendors');
    const snapshot = await getDocs(vendorsRef);
    
    let fixed = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const vendorDoc of snapshot.docs) {
      const vendorData = vendorDoc.data();
      const vendorId = vendorDoc.id;
      
      // Check if businessName needs fixing
      const needsFix = 
        !vendorData.businessName || 
        vendorData.businessName === 'Business' ||
        vendorData.businessName === 'Vendor' ||
        vendorData.businessName === 'Your Business';
      
      if (needsFix && vendorData.name) {
        try {
          await updateDoc(doc(db, 'vendors', vendorId), {
            businessName: vendorData.name,
            updatedAt: serverTimestamp()
          });
          
          console.log(`✅ Fixed vendor ${vendorId}: "${vendorData.name}"`);
          fixed++;
        } catch (error) {
          console.error(`❌ Error fixing vendor ${vendorId}:`, error);
          errors++;
        }
      } else {
        console.log(`⏭️ Skipped vendor ${vendorId}: businessName already good`);
        skipped++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Fixed: ${fixed} vendors`);
    console.log(`⏭️ Skipped: ${skipped} vendors`);
    console.log(`❌ Errors: ${errors} vendors`);
    console.log(`📦 Total: ${snapshot.docs.length} vendors`);
    
    return { fixed, skipped, errors, total: snapshot.docs.length };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Run from browser console:
// import { fixVendorBusinessNames } from './utils/fixVendorBusinessNames';
// fixVendorBusinessNames().then(result => console.log('Done!', result));
