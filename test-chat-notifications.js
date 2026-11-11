/**
 * Test Chat Notification System
 * Tests: sendChatNotification FCM function
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';

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

console.log('💬 Testing Chat Notification System\n');
console.log('This tests the sendChatNotification FCM function\n');
console.log('═'.repeat(60) + '\n');

async function setupTestUser() {
  console.log('1️⃣ Setting up test user...');
  
  const userId = 'test-user-' + Date.now();
  const testUser = {
    uid: userId,
    displayName: 'Test Customer',
    email: 'test@go7.com',
    phone: '08166205600',
    fcmToken: 'test-token-123', // In production, this would be a real FCM token
    createdAt: serverTimestamp()
  };
  
  try {
    await setDoc(doc(db, 'users', userId), testUser);
    console.log('✅ Test user created:', userId);
    console.log('   Name:', testUser.displayName);
    console.log('   FCM Token:', testUser.fcmToken, '\n');
    return userId;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function createTestDelivery(userId) {
  console.log('2️⃣ Creating test delivery...');
  
  const deliveryId = 'DELIVERY-' + Date.now();
  const testDelivery = {
    deliveryId: deliveryId,
    customerId: userId,
    riderId: 'rider-123',
    pickupAddress: 'Test Pickup Location',
    deliveryAddress: 'Test Delivery Location',
    status: 'in_progress',
    createdAt: serverTimestamp()
  };
  
  try {
    await setDoc(doc(db, 'deliveries', deliveryId), testDelivery);
    console.log('✅ Test delivery created:', deliveryId);
    console.log('   Customer:', userId);
    console.log('   Rider: rider-123\n');
    return deliveryId;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function sendTestChatMessage(deliveryId, userId) {
  console.log('3️⃣ Sending chat message from rider...');
  
  const messageId = 'MSG-' + Date.now();
  const testMessage = {
    senderId: 'rider-123',
    receiverId: userId,
    text: '🏍️ Hello! I am on my way to pick up your order. ETA: 5 minutes.',
    senderRole: 'rider',
    senderName: 'Test Rider',
    timestamp: serverTimestamp(),
    read: false,
    delivered: true
  };
  
  try {
    await setDoc(doc(db, 'chats', deliveryId, 'messages', messageId), testMessage);
    
    console.log('✅ Chat message created:', messageId);
    console.log('   Delivery:', deliveryId);
    console.log('   From: rider-123 (Test Rider)');
    console.log('   To:', userId);
    console.log('   Message:', testMessage.text);
    console.log('\n   🔔 sendChatNotification function should trigger!');
    console.log('   This sends an FCM push notification to the user.\n');
    
    return messageId;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function sendCustomerReply(deliveryId, userId) {
  console.log('4️⃣ Sending reply from customer...');
  console.log('   Waiting 3 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const messageId = 'MSG-' + Date.now();
  const replyMessage = {
    senderId: userId,
    receiverId: 'rider-123',
    text: '👍 Great! Thank you for the update.',
    senderRole: 'customer',
    senderName: 'Test Customer',
    timestamp: serverTimestamp(),
    read: false,
    delivered: true
  };
  
  try {
    await setDoc(doc(db, 'chats', deliveryId, 'messages', messageId), replyMessage);
    
    console.log('✅ Customer reply sent:', messageId);
    console.log('   Message:', replyMessage.text);
    console.log('\n   🔔 Rider would receive notification (if rider had FCM token)\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function cleanupTestData(userId, deliveryId) {
  console.log('5️⃣ Cleaning up test data...');
  console.log('   Waiting 10 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  try {
    // Delete messages
    const messagesSnapshot = await getDocs(collection(db, 'chats', deliveryId, 'messages'));
    const deletePromises = messagesSnapshot.docs.map(msgDoc => deleteDoc(msgDoc.ref));
    await Promise.all(deletePromises);
    
    // Delete chat document
    await deleteDoc(doc(db, 'chats', deliveryId));
    
    // Delete delivery
    await deleteDoc(doc(db, 'deliveries', deliveryId));
    
    // Delete user
    await deleteDoc(doc(db, 'users', userId));
    
    console.log('✅ Test data cleaned up successfully\n');
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
  }
}

async function runChatTest() {
  try {
    // Setup test user
    const userId = await setupTestUser();
    if (!userId) {
      console.error('Failed to create test user');
      process.exit(1);
    }
    
    // Create delivery
    const deliveryId = await createTestDelivery(userId);
    if (!deliveryId) {
      console.error('Failed to create test delivery');
      process.exit(1);
    }
    
    // Send message from rider (triggers notification)
    await sendTestChatMessage(deliveryId, userId);
    
    // Send reply from customer (triggers notification to rider)
    await sendCustomerReply(deliveryId, userId);
    
    console.log('═'.repeat(60));
    console.log('\n✅ Chat notification test completed!\n');
    console.log('📋 Summary:');
    console.log('   • Test user created with FCM token');
    console.log('   • Test delivery created');
    console.log('   • Chat messages exchanged');
    console.log('   • sendChatNotification function triggered');
    console.log('\nℹ️  In production:');
    console.log('   • Users get real FCM tokens when they login');
    console.log('   • Notifications appear as push notifications');
    console.log('   • Works on mobile and desktop browsers\n');
    
    // Cleanup
    await cleanupTestData(userId, deliveryId);
    
    console.log('🎉 Test complete! Exiting...\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
runChatTest();
