// Test script for getRiderEarnings function with time frame filtering
// Run with: node tests/test-earnings-timeframe.js

const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDtla46lejRJ9KEZaSQ-zpzTb4TwNKQEBw",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.appspot.com",
  messagingSenderId: "778323378970",
  appId: "1:778323378970:web:c1b9c66690ae7c0dcbae64",
  measurementId: "G-P7SH0SXTX9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Import the getRiderEarnings function - note we can't directly import from the service
// So we'll recreate it here for testing
async function getRiderEarnings(riderId, timeFrame = 'all') {
  const { doc, getDoc } = require('firebase/firestore');
  
  try {
    console.log(`💰 Fetching earnings for rider ${riderId} - timeFrame: ${timeFrame}`);
    
    // Get rider's earnings document
    const earningsRef = doc(db, "rider_earnings", riderId);
    const earningsDoc = await getDoc(earningsRef);
    
    if (!earningsDoc.exists()) {
      // Return default structure if no earnings record exists yet
      return {
        totalEarned: 0,
        deliveryCount: 0,
        completedDeliveries: 0,
        completedDeliveriesArray: [],
        riderId: riderId,
        timeFrame: timeFrame,
        filteredEarnings: 0,
        filteredDeliveryCount: 0,
        completedDeliveriesDetails: []
      };
    }
    
    const earningsData = earningsDoc.data();
    
    // Get completed deliveries details if there are any
    let completedDeliveriesDetails = [];
    
    if (earningsData.completedDeliveriesArray && earningsData.completedDeliveriesArray.length > 0) {
      // Batch get the details of the completed deliveries (limited to the last 50)
      const recentDeliveryIds = earningsData.completedDeliveriesArray.slice(-50);
      const deliveriesPromises = recentDeliveryIds.map(id => 
        getDoc(doc(db, "deliveries", id))
      );
      
      const deliveryDocs = await Promise.all(deliveriesPromises);
      
      completedDeliveriesDetails = deliveryDocs
        .filter(doc => doc.exists())
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          // Sort by completedAt timestamp (descending)
          const aTime = a.deliveredAt ? (a.deliveredAt.toDate?.() || new Date(a.deliveredAt)) : new Date(0);
          const bTime = b.deliveredAt ? (b.deliveredAt.toDate?.() || new Date(b.deliveredAt)) : new Date(0);
          return bTime - aTime;
        });
    }
    
    // Filter deliveries and calculate earnings based on timeFrame
    let filteredDeliveries = [...completedDeliveriesDetails];
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    if (timeFrame !== 'all') {
      filteredDeliveries = completedDeliveriesDetails.filter(delivery => {
        if (!delivery.deliveredAt) return false;
        const deliveryTime = delivery.deliveredAt.toDate ? 
          delivery.deliveredAt.toDate().getTime() : 
          new Date(delivery.deliveredAt).getTime();
        
        switch(timeFrame) {
          case 'today':
            return deliveryTime >= startOfDay;
          case 'week':
            return deliveryTime >= startOfWeek;
          case 'month':
            return deliveryTime >= startOfMonth;
          default:
            return true;
        }
      });
    }
    
    // Calculate filtered earnings
    const filteredEarnings = filteredDeliveries.reduce((sum, delivery) => 
      sum + (delivery.deliveryFee || 0), 0);
    
    // Return earnings with delivery details and filtered data
    return {
      ...earningsData,
      completedDeliveriesDetails,
      timeFrame,
      filteredDeliveries,
      filteredEarnings,
      filteredDeliveryCount: filteredDeliveries.length
    };
  } catch (error) {
    console.error('❌ Error getting rider earnings:', error);
    throw error;
  }
}

// Test constants
const TEST_RIDER_ID = 'test-rider-123'; // Use the same test rider ID as in the previous test

/**
 * Test the earnings time frame filtering
 */
async function testEarningsTimeframes() {
  console.log('🧪 Testing earnings time frame filtering...');
  
  try {
    // Test all time frames
    const timeFrames = ['all', 'today', 'week', 'month'];
    
    for (const timeFrame of timeFrames) {
      console.log(`\n📊 Testing "${timeFrame}" time frame:`);
      
      const earnings = await getRiderEarnings(TEST_RIDER_ID, timeFrame);
      
      console.log(`✅ Total earnings: ₦${earnings.totalEarned || 0}`);
      console.log(`✅ Total completed deliveries: ${earnings.completedDeliveries || 0}`);
      
      if (timeFrame !== 'all') {
        console.log(`✅ Filtered earnings: ₦${earnings.filteredEarnings || 0}`);
        console.log(`✅ Filtered deliveries count: ${earnings.filteredDeliveryCount || 0}`);
      }
      
      // Log delivery details if available
      if (earnings.filteredDeliveries && earnings.filteredDeliveries.length > 0) {
        console.log(`✅ Filtered deliveries: ${earnings.filteredDeliveries.length}`);
        
        // Show first 3 deliveries as examples
        const sampleDeliveries = earnings.filteredDeliveries.slice(0, 3);
        console.log('Sample deliveries:');
        
        sampleDeliveries.forEach((delivery, index) => {
          console.log(`  ${index + 1}. ID: ${delivery.id}`);
          console.log(`     Fee: ₦${delivery.deliveryFee || 0}`);
          console.log(`     Completed: ${delivery.deliveredAt ? new Date(delivery.deliveredAt.toDate()).toLocaleString() : 'N/A'}`);
        });
        
        if (earnings.filteredDeliveries.length > 3) {
          console.log(`  ... and ${earnings.filteredDeliveries.length - 3} more`);
        }
      } else {
        console.log('❌ No deliveries found for this time frame');
      }
    }
    
    console.log('\n🎉 All time frame tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testEarningsTimeframes()
  .then(() => console.log('Tests finished'))
  .catch(err => console.error('Error in test execution:', err));