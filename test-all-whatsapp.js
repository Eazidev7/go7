/**
 * Test All WhatsApp Notifications
 * Run: node test-all-whatsapp.js
 */

import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDVe4upj9TxE6YE0Oq5J8_3wVTOIlK6vw4",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "722285015876",
  appId: "1:722285015876:web:cc3f16636a0c9d06c1f7e6"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

const TEST_PHONE = "08166205600"; // Change to your test number
const TEST_NAME = "Test User";
const TEST_ORDER = "GO7TEST123";

async function testAll() {
  console.log('🚀 Testing All WhatsApp Notifications...\n');
  console.log(`📱 Sending to: ${TEST_PHONE}\n`);

  // Test 1: Order Created (already auto-triggered)
  console.log('1️⃣ Order Created Notification (auto-triggered on new orders)');
  try {
    const sendOrderUpdate = httpsCallable(functions, 'sendOrderUpdate');
    const result = await sendOrderUpdate({
      phoneNumber: TEST_PHONE,
      customerName: TEST_NAME,
      orderNumber: TEST_ORDER
    });
    console.log('✅ Order Created:', result.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await delay(3000);

  // Test 2: Rider Assignment
  console.log('\n2️⃣ Rider Assignment Notification');
  try {
    const sendRiderAssignment = httpsCallable(functions, 'sendRiderAssignment');
    const result = await sendRiderAssignment({
      phoneNumber: TEST_PHONE,
      customerName: TEST_NAME,
      orderNumber: TEST_ORDER
    });
    console.log('✅ Rider Assigned:', result.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await delay(3000);

  // Test 3: Order Shipping
  console.log('\n3️⃣ Order Shipping Notification');
  try {
    const sendOrderShipping = httpsCallable(functions, 'sendOrderShipping');
    const result = await sendOrderShipping({
      phoneNumber: TEST_PHONE,
      customerName: TEST_NAME,
      orderNumber: TEST_ORDER
    });
    console.log('✅ Order Shipping:', result.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await delay(3000);

  // Test 4: Delivery Confirmation
  console.log('\n4️⃣ Delivery Confirmation Notification');
  try {
    const sendDeliveryConfirmation = httpsCallable(functions, 'sendDeliveryConfirmation');
    const result = await sendDeliveryConfirmation({
      phoneNumber: TEST_PHONE,
      customerName: TEST_NAME,
      orderNumber: TEST_ORDER
    });
    console.log('✅ Delivered:', result.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await delay(3000);

  // Test 5: OTP
  console.log('\n5️⃣ OTP Notification');
  try {
    const sendAuthOTP = httpsCallable(functions, 'sendAuthOTP');
    const result = await sendAuthOTP({
      phoneNumber: TEST_PHONE,
      otp: "123456"
    });
    console.log('✅ OTP Sent:', result.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n✅ All tests completed! Check your WhatsApp 📱');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testAll().catch(console.error);
