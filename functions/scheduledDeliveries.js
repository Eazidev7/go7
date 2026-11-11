// Scheduled Delivery Handler
// Cloud Functions to automatically assign riders to scheduled deliveries

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

// Make sure to initialize admin only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const firestore = admin.firestore();

/**
 * Cloud Function that runs every minute to check for scheduled deliveries
 * that need rider assignment (20 minutes before pickup time)
 */
exports.processScheduledDeliveries = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    try {
      const now = new Date();
      const assignmentTime = new Date(now.getTime() + 20 * 60 * 1000); // 20 minutes from now
      
      console.log(`🕐 Checking for scheduled deliveries to assign at ${assignmentTime.toISOString()}`);
      
      // Find scheduled deliveries that need rider assignment
      const scheduledDeliveries = await firestore
        .collection('deliveries')
        .where('status', '==', 'scheduled')
        .where('pickupTime', '<=', admin.firestore.Timestamp.fromDate(assignmentTime))
        .get();
      
      if (scheduledDeliveries.empty) {
        console.log('📭 No scheduled deliveries ready for assignment');
        return null;
      }
      
      console.log(`📦 Found ${scheduledDeliveries.size} scheduled deliveries ready for assignment`);
      
      const batch = firestore.batch();
      const assignmentPromises = [];
      
      // Process each scheduled delivery
      for (const deliveryDoc of scheduledDeliveries.docs) {
        const deliveryId = deliveryDoc.id;
        const deliveryData = deliveryDoc.data();
        
        console.log(`🔄 Processing scheduled delivery ${deliveryId}`);
        
        // Try to assign a rider
        const assignmentResult = await assignRiderToScheduledDelivery(deliveryId, deliveryData);
        
        if (assignmentResult.success) {
          // Update delivery status to pending (rider assigned)
          batch.update(deliveryDoc.ref, {
            status: 'pending',
            riderId: assignmentResult.riderId,
            assignedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          assignmentPromises.push({
            deliveryId,
            riderId: assignmentResult.riderId,
            success: true
          });
        } else {
          // Mark as failed assignment attempt
          batch.update(deliveryDoc.ref, {
            assignmentAttempted: true,
            assignmentFailureReason: assignmentResult.reason,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          assignmentPromises.push({
            deliveryId,
            success: false,
            reason: assignmentResult.reason
          });
        }
      }
      
      // Commit all updates
      await batch.commit();
      
      // Log results
      const successCount = assignmentPromises.filter(a => a.success).length;
      const failureCount = assignmentPromises.filter(a => !a.success).length;
      
      console.log(`✅ Processed ${scheduledDeliveries.size} scheduled deliveries: ${successCount} assigned, ${failureCount} failed`);
      
      return {
        processed: scheduledDeliveries.size,
        assigned: successCount,
        failed: failureCount,
        results: assignmentPromises
      };
      
    } catch (error) {
      console.error('❌ Error processing scheduled deliveries:', error);
      return null;
    }
  });

/**
 * Assign a rider to a scheduled delivery
 * @param {string} deliveryId 
 * @param {Object} deliveryData 
 * @returns {Object} Assignment result
 */
async function assignRiderToScheduledDelivery(deliveryId, deliveryData) {
  try {
    // Find available riders
    const ridersSnapshot = await firestore
      .collection('riders')
      .where('available', '==', true)
      .get();
    
    if (ridersSnapshot.empty) {
      return {
        success: false,
        reason: 'No available riders found'
      };
    }
    
    const pickupCoordinates = deliveryData.pickup?.coordinates;
    
    if (!pickupCoordinates) {
      return {
        success: false,
        reason: 'No pickup coordinates available'
      };
      
    }
    
    // Find the closest available rider
    let closestRider = null;
    let shortestDistance = Infinity;
    
    for (const riderDoc of ridersSnapshot.docs) {
      const riderData = riderDoc.data();
      const riderLocation = riderData.lastLocation || riderData.location;
      
      if (riderLocation && riderLocation.coordinates) {
        const distance = calculateDistance(
          pickupCoordinates.lat,
          pickupCoordinates.lng,
          riderLocation.coordinates.lat,
          riderLocation.coordinates.lng
        );
        
        if (distance < shortestDistance) {
          shortestDistance = distance;
          closestRider = {
            id: riderDoc.id,
            ...riderData,
            distance
          };
        }
      }
    }
    
    if (!closestRider) {
      return {
        success: false,
        reason: 'No riders with location data found'
      };
    }
    
    // Assign the delivery to the closest rider
    const riderRef = firestore.collection('riders').doc(closestRider.id);
    
    await riderRef.update({
      available: false,
      currentDeliveryId: deliveryId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`🏍️ Assigned scheduled delivery ${deliveryId} to rider ${closestRider.id} (${shortestDistance.toFixed(2)}km away)`);
    
    return {
      success: true,
      riderId: closestRider.id,
      distance: shortestDistance
    };
    
  } catch (error) {
    console.error(`❌ Error assigning rider to scheduled delivery ${deliveryId}:`, error);
    return {
      success: false,
      reason: error.message
    };
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}