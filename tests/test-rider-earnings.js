// Test script for rider earnings functionality
// Run with: node tests/test-rider-earnings.js

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc,
  updateDoc,
  serverTimestamp,
  increment,
  arrayUnion
} = require('firebase/firestore');
const firebaseConfig = require('../src/lib/firebaseConfig');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test data
const TEST_RIDER_ID = 'test-rider-123';
const TEST_DELIVERY_ID = 'test-delivery-' + Date.now();
const DELIVERY_FEE = 1500; // ₦1500

/**
 * Run tests for rider earnings functionality
 */
async function runTests() {
  console.log('🧪 Starting rider earnings tests...');
  
  try {
    // Step 1: Create test rider if it doesn't exist
    console.log(`1. Setting up test rider: ${TEST_RIDER_ID}`);
    const riderRef = doc(db, "riders", TEST_RIDER_ID);
    const riderDoc = await getDoc(riderRef);
    
    if (!riderDoc.exists()) {
      await setDoc(riderRef, {
        name: "Test Rider",
        phone: "+2341234567890",
        email: "testrider@go7.test",
        available: true,
        createdAt: serverTimestamp(),
        totalCompletedDeliveries: 0
      });
      console.log('✅ Created test rider');
    } else {
      console.log('✅ Test rider already exists');
    }
    
    // Step 2: Create test delivery
    console.log(`2. Creating test delivery: ${TEST_DELIVERY_ID}`);
    const deliveryRef = doc(db, "deliveries", TEST_DELIVERY_ID);
    await setDoc(deliveryRef, {
      status: "assigned",
      riderId: TEST_RIDER_ID,
      userId: "test-user-123",
      pickup: {
        address: "123 Test Street, Lagos",
        coordinates: { latitude: 6.5244, longitude: 3.3792 }
      },
      dropoff: {
        address: "456 Sample Road, Lagos",
        coordinates: { latitude: 6.5344, longitude: 3.3992 }
      },
      deliveryFee: DELIVERY_FEE,
      createdAt: serverTimestamp(),
      assignedAt: serverTimestamp()
    });
    console.log('✅ Test delivery created');
    
    // Step 3: Get rider earnings before completion
    console.log('3. Checking rider earnings before delivery completion');
    const earningsRefBefore = doc(db, "rider_earnings", TEST_RIDER_ID);
    const earningsDocBefore = await getDoc(earningsRefBefore);
    
    const earningsBefore = earningsDocBefore.exists() 
      ? earningsDocBefore.data().totalEarned || 0 
      : 0;
    
    console.log(`✅ Current earnings: ₦${earningsBefore}`);
    
    // Step 4: Complete the delivery
    console.log('4. Marking delivery as completed');
    await updateDoc(deliveryRef, {
      status: "completed",
      deliveredAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      completionNotes: 'Completed for testing'
    });
    
    // Step 5: Update rider earnings
    console.log('5. Updating rider earnings');
    const earningsRef = doc(db, "rider_earnings", TEST_RIDER_ID);
    const earningsDoc = await getDoc(earningsRef);
    
    if (earningsDoc.exists()) {
      // Update existing earnings document
      await updateDoc(earningsRef, {
        totalEarned: increment(DELIVERY_FEE),
        lastUpdated: serverTimestamp(),
        deliveryCount: increment(1),
        completedDeliveries: increment(1),
        completedDeliveriesArray: arrayUnion(TEST_DELIVERY_ID),
        lastDeliveryCompleted: serverTimestamp(),
        lastCompletedDeliveryId: TEST_DELIVERY_ID
      });
    } else {
      // Create new earnings document
      await setDoc(earningsRef, {
        totalEarned: DELIVERY_FEE,
        lastUpdated: serverTimestamp(),
        deliveryCount: 1,
        completedDeliveries: 1,
        completedDeliveriesArray: [TEST_DELIVERY_ID],
        lastDeliveryCompleted: serverTimestamp(),
        lastCompletedDeliveryId: TEST_DELIVERY_ID,
        riderId: TEST_RIDER_ID,
        createdAt: serverTimestamp()
      });
    }
    
    // Update rider document
    await updateDoc(riderRef, {
      available: true,
      currentDelivery: null,
      lastCompleted: serverTimestamp(),
      totalCompletedDeliveries: increment(1)
    });
    
    console.log('✅ Rider earnings updated');
    
    // Step 6: Verify earnings update
    console.log('6. Verifying rider earnings after delivery completion');
    const earningsRefAfter = doc(db, "rider_earnings", TEST_RIDER_ID);
    const earningsDocAfter = await getDoc(earningsRefAfter);
    
    if (earningsDocAfter.exists()) {
      const earningsAfter = earningsDocAfter.data();
      console.log(`✅ Updated earnings: ₦${earningsAfter.totalEarned}`);
      console.log(`✅ Earnings increased by: ₦${earningsAfter.totalEarned - earningsBefore}`);
      console.log(`✅ Completed deliveries: ${earningsAfter.completedDeliveries}`);
      console.log(`✅ Delivery IDs in array: ${earningsAfter.completedDeliveriesArray.length}`);
      
      if (earningsAfter.completedDeliveriesArray.includes(TEST_DELIVERY_ID)) {
        console.log('✅ Test delivery ID correctly added to completedDeliveriesArray');
      } else {
        console.log('❌ Test delivery ID not found in completedDeliveriesArray');
      }
    } else {
      console.log('❌ Earnings document not found after update');
    }
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
runTests()
  .then(() => console.log('Tests finished'))
  .catch(err => console.error('Error in test execution:', err));