/**
 * Test Auto-Trigger WhatsApp Notifications
 * Tests: onOrderCreated, onRiderAssigned, onOrderShipping, onOrderDelivered
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDVe4upj9TxE6YE0Oq5J8_3wVTOIlK6vw4",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "722285015876",
  appId: "1:722285015876:web:cc3f16636a0c9d06c1f7e6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('🧪 Testing Auto-Trigger WhatsApp Notifications\n');
console.log('These functions trigger automatically on Firestore changes:\n');

async function testOrderCreatedTrigger() {
  console.log('1️⃣ Testing onOrderCreated trigger...');
  
  const orderId = 'AUTO-TEST-' + Date.now();
  const testOrder = {
    orderNumber: orderId,
    customerName: 'Test Customer',
    customerPhone: '08166205600',
    total: 5000,
    items: [{ name: 'Test Item', quantity: 1, price: 5000 }],
    status: 'pending',
    createdAt: serverTimestamp()
  };
  
  try {
    await setDoc(doc(db, 'orders', orderId), testOrder);
    console.log('✅ Order created:', orderId);
    console.log('   WhatsApp notification should be sent automatically!');
    console.log('   Check WhatsApp on 08166205600\n');
    return orderId;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testRiderAssignedTrigger(orderId) {
  console.log('2️⃣ Testing onRiderAssigned trigger...');
  console.log('   Waiting 5 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      riderId: 'test-rider-123',
      riderName: 'Test Rider',
      status: 'assigned'
    });
    console.log('✅ Rider assigned to order:', orderId);
    console.log('   WhatsApp "Rider Assigned" notification should be sent!');
    console.log('   Check WhatsApp on 08166205600\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testOrderShippingTrigger(orderId) {
  console.log('3️⃣ Testing onOrderShipping trigger...');
  console.log('   Waiting 5 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'out_for_delivery'
    });
    console.log('✅ Order status changed to out_for_delivery:', orderId);
    console.log('   WhatsApp "Order Shipping" notification should be sent!');
    console.log('   Check WhatsApp on 08166205600\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testOrderDeliveredTrigger(orderId) {
  console.log('4️⃣ Testing onOrderDelivered trigger...');
  console.log('   Waiting 5 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'delivered',
      deliveredAt: serverTimestamp()
    });
    console.log('✅ Order status changed to delivered:', orderId);
    console.log('   WhatsApp "Delivery Confirmation" notification should be sent!');
    console.log('   Check WhatsApp on 08166205600\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function runAllTests() {
  console.log('📱 Phone: 08166205600');
  console.log('⏰ Total test time: ~20 seconds\n');
  console.log('═'.repeat(60) + '\n');
  
  try {
    // Test 1: Create order (triggers onOrderCreated)
    const orderId = await testOrderCreatedTrigger();
    
    if (orderId) {
      // Test 2: Assign rider (triggers onRiderAssigned)
      await testRiderAssignedTrigger(orderId);
      
      // Test 3: Out for delivery (triggers onOrderShipping)
      await testOrderShippingTrigger(orderId);
      
      // Test 4: Delivered (triggers onOrderDelivered)
      await testOrderDeliveredTrigger(orderId);
    }
    
    console.log('═'.repeat(60));
    console.log('\n✅ All tests completed!');
    console.log('\n📱 Check WhatsApp on 08166205600');
    console.log('You should have received 4 messages:');
    console.log('   1. Order received');
    console.log('   2. Rider assigned');
    console.log('   3. Out for delivery');
    console.log('   4. Delivered\n');
    
    // Clean up test order after 30 seconds
    console.log('⏳ Test order will be cleaned up in 30 seconds...');
    setTimeout(async () => {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        console.log('🗑️  Test order deleted:', orderId);
        process.exit(0);
      } catch (error) {
        console.error('Error cleaning up:', error.message);
        process.exit(1);
      }
    }, 30000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
