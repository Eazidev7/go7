/**
 * 🧪 Test DVA Virtual Account Creation
 * 
 * Tests the createUserVirtualAccount function with sample user data
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json'); // You'll need to add this

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'go7-delivery'
});

const testCreateVirtualAccount = async () => {
  try {
    console.log('🧪 Testing Virtual Account Creation...');
    
    const testUser = {
      uid: 'test-user-' + Date.now(),
      email: 'test@go7delivery.com',
      phone: '+2348123456789',
      name: 'Test User'
    };
    
    // This would normally be called from Firebase Functions
    const functions = admin.functions();
    const createVirtualAccount = functions.httpsCallable('createUserVirtualAccount');
    
    const result = await createVirtualAccount(testUser);
    
    console.log('✅ Virtual Account Created:', result.data);
    
    return result.data;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Test DVA webhook simulation
const testDVAWebhook = async () => {
  const webhookData = {
    event: "dedicatedaccount.received_credit",
    data: {
      amount: 100000, // ₦1000 in kobo
      session_id: "DVA-TEST-" + Date.now(),
      customer: {
        customer_code: "CUS_test123" // This should match a real customer code
      },
      dedicated_account: {
        account_number: "1234567890",
        bank_name: "Titan Paystack"
      }
    }
  };
  
  console.log('🧪 Testing DVA Webhook:', webhookData);
  
  // This would normally be sent to the webhook endpoint
  // https://us-central1-go7-delivery.cloudfunctions.net/paystackWebhookV2
  
  return webhookData;
};

module.exports = {
  testCreateVirtualAccount,
  testDVAWebhook
};

// Run tests if called directly
if (require.main === module) {
  (async () => {
    await testCreateVirtualAccount();
    await testDVAWebhook();
  })();
}