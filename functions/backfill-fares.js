/**
 * 🔧 Go7 Fare Consistency Backfill Script
 * 
 * This script fixes existing bookings/deliveries that may have inconsistent fare values.
 * Run this once after implementing the centralized fare system.
 * 
 * Usage:
 * - In Firebase Console → Functions → Run in playground
 * - Or run locally: node backfill-fares.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Import launch pricing calculator
const { calculateFare } = require('./fareCalculator');

/**
 * Backfill deliveries collection
 */
async function backfillDeliveries() {
  console.log('🔄 Starting deliveries backfill...');
  
  const deliveriesSnapshot = await db.collection('deliveries').get();
  let updatedCount = 0;
  let errorCount = 0;

  for (const doc of deliveriesSnapshot.docs) {
    try {
      const data = doc.data();
      
      // Check if fare fields are missing or inconsistent
      if (!data.fare && data.distanceKm && data.durationMin) {
        const correctFare = calculateFare(data.distanceKm, data.durationMin);
        
        await doc.ref.update({
          fare: correctFare,
          finalFare: correctFare,
          estimatedFare: correctFare,
          totalKobo: correctFare * 100,
          backfilled: true,
          backfilledAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Updated delivery ${doc.id}: ₦${correctFare}`);
        updatedCount++;
      }
      
      // Fix inconsistent fare fields
      else if (data.fare && (data.finalFare !== data.fare || data.estimatedFare !== data.fare)) {
        await doc.ref.update({
          finalFare: data.fare,
          estimatedFare: data.fare,
          totalKobo: data.fare * 100,
          synchronized: true,
          synchronizedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`🔧 Synchronized delivery ${doc.id} fare fields`);
        updatedCount++;
      }
      
    } catch (error) {
      console.error(`❌ Error updating delivery ${doc.id}:`, error);
      errorCount++;
    }
  }
  
  console.log(`📊 Deliveries backfill complete: ${updatedCount} updated, ${errorCount} errors`);
}

/**
 * Backfill bookings collection
 */
async function backfillBookings() {
  console.log('🔄 Starting bookings backfill...');
  
  const bookingsSnapshot = await db.collection('bookings').get();
  let updatedCount = 0;
  let errorCount = 0;

  for (const doc of bookingsSnapshot.docs) {
    try {
      const data = doc.data();
      
      // Check if fare fields are missing or inconsistent
      if (!data.fare && data.distanceKm && data.durationMin) {
        const correctFare = calculateFare(data.distanceKm, data.durationMin);
        
        await doc.ref.update({
          fare: correctFare,
          finalFare: correctFare,
          estimatedFare: correctFare,
          totalKobo: correctFare * 100,
          backfilled: true,
          backfilledAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Updated booking ${doc.id}: ₦${correctFare}`);
        updatedCount++;
      }
      
      // Fix inconsistent fare fields
      else if (data.fare && (data.finalFare !== data.fare || data.estimatedFare !== data.fare)) {
        await doc.ref.update({
          finalFare: data.fare,
          estimatedFare: data.fare,
          totalKobo: data.fare * 100,
          synchronized: true,
          synchronizedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`🔧 Synchronized booking ${doc.id} fare fields`);
        updatedCount++;
      }
      
    } catch (error) {
      console.error(`❌ Error updating booking ${doc.id}:`, error);
      errorCount++;
    }
  }
  
  console.log(`📊 Bookings backfill complete: ${updatedCount} updated, ${errorCount} errors`);
}

/**
 * Main backfill function
 */
async function runBackfill() {
  console.log('🚀 Starting Go7 Fare Consistency Backfill...');
  
  try {
    await backfillDeliveries();
    await backfillBookings();
    
    console.log('🎉 Backfill completed successfully!');
    
    // Create a summary document
    await db.collection('system').doc('fare-backfill').set({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      message: 'All fare values have been standardized using centralized calculation'
    });
    
  } catch (error) {
    console.error('💥 Backfill failed:', error);
    
    // Log the failure
    await db.collection('system').doc('fare-backfill').set({
      status: 'failed',
      error: error.message,
      failedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}

// Export for Cloud Functions
module.exports = { runBackfill, calculateFare, backfillDeliveries, backfillBookings };

// Run directly if called from command line
if (require.main === module) {
  runBackfill().then(() => {
    console.log('Backfill script completed');
    process.exit(0);
  }).catch(error => {
    console.error('Backfill script failed:', error);
    process.exit(1);
  });
}