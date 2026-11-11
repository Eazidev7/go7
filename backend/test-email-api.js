/**
 * Test all email API endpoints
 * Run: node test-email-api.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5001';
const TEST_EMAIL = 'feyisetantobiloba@gmail.com';

async function testAllEmails() {
  console.log('🧪 Testing Go7 Email API Endpoints...\n');

  try {
    // 1. Test User Registration
    console.log('1️⃣ Testing User Registration...');
    const registerRes = await axios.post(`${API_BASE}/api/users/register`, {
      email: TEST_EMAIL,
      name: 'John Doe',
    });
    console.log('✅', registerRes.data.message);
    console.log('   Email sent:', registerRes.data.emailSent, '\n');

    // 2. Test Order Creation
    console.log('2️⃣ Testing Order Creation...');
    const orderRes = await axios.post(`${API_BASE}/api/orders`, {
      customerEmail: TEST_EMAIL,
      customerName: 'John Doe',
      items: 'Jollof Rice & Chicken, 2x Coca-Cola',
      amount: 4500,
    });
    console.log('✅', orderRes.data.message);
    console.log('   Order ID:', orderRes.data.orderId);
    console.log('   Email sent:', orderRes.data.emailSent, '\n');

    const orderId = orderRes.data.orderId;

    // 3. Test Delivery Booking
    console.log('3️⃣ Testing Delivery Booking...');
    const deliveryRes = await axios.post(`${API_BASE}/api/orders/delivery`, {
      customerEmail: TEST_EMAIL,
      customerName: 'John Doe',
      pickupAddress: '123 Allen Avenue, Ikeja, Lagos',
      destination: '45 Victoria Island, Lagos',
      amount: 2500,
    });
    console.log('✅', deliveryRes.data.message);
    console.log('   Delivery ID:', deliveryRes.data.deliveryId);
    console.log('   Email sent:', deliveryRes.data.emailSent, '\n');

    // 4. Test Order Status Update - Out for Delivery
    console.log('4️⃣ Testing Out-for-Delivery Status...');
    const outForDeliveryRes = await axios.patch(
      `${API_BASE}/api/orders/${orderId}/status`,
      {
        status: 'out_for_delivery',
        customerEmail: TEST_EMAIL,
        customerName: 'John Doe',
        riderName: 'Ahmed Ibrahim',
        riderPhone: '+234 812 345 6789',
        eta: '15-20 minutes',
      }
    );
    console.log('✅', outForDeliveryRes.data.message);
    console.log('   Email sent:', outForDeliveryRes.data.emailSent, '\n');

    // Wait a bit before next email
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 5. Test Order Status Update - Delivered
    console.log('5️⃣ Testing Delivery Complete Status...');
    const deliveredRes = await axios.patch(`${API_BASE}/api/orders/${orderId}/status`, {
      status: 'delivered',
      customerEmail: TEST_EMAIL,
      customerName: 'John Doe',
    });
    console.log('✅', deliveredRes.data.message);
    console.log('   Email sent:', deliveredRes.data.emailSent, '\n');

    // 6. Test Vendor Approval
    console.log('6️⃣ Testing Vendor Approval...');
    const vendorRes = await axios.patch(`${API_BASE}/api/vendors/VENDOR-123/approve`, {
      email: TEST_EMAIL,
      name: 'Chowdeck Restaurant',
    });
    console.log('✅', vendorRes.data.message);
    console.log('   Email sent:', vendorRes.data.emailSent, '\n');

    // 7. Test Password Reset
    console.log('7️⃣ Testing Password Reset...');
    const resetRes = await axios.post(`${API_BASE}/api/auth/reset-password`, {
      email: TEST_EMAIL,
      name: 'John Doe',
    });
    console.log('✅', resetRes.data.message);
    console.log('   Email sent:', resetRes.data.emailSent);
    if (resetRes.data.devResetLink) {
      console.log('   Reset link:', resetRes.data.devResetLink);
    }
    console.log('');

    console.log('🎉 All 7 email API endpoints tested successfully!');
    console.log(`📧 Check ${TEST_EMAIL} for all emails\n`);
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  }
}

// Run tests
testAllEmails();
