const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkVendor() {
  try {
    // Get the vendor we just created
    const vendorId = '4oOKBZ5koTgB5qQK3Ft5hB1MENz1';
    
    const vendorDoc = await db.collection('vendors').doc(vendorId).get();
    
    if (!vendorDoc.exists) {
      console.log('❌ Vendor not found!');
      return;
    }
    
    const data = vendorDoc.data();
    
    console.log('\n📋 VENDOR DATA:');
    console.log('================');
    console.log('vendorId:', data.vendorId);
    console.log('businessName:', data.businessName);
    console.log('phone:', data.phone);
    console.log('\n🔐 VERIFICATION STATUS:');
    console.log('phoneVerified:', data.phoneVerified);
    console.log('phoneVerificationRequired:', data.phoneVerificationRequired);
    console.log('accountStatus:', data.accountStatus);
    console.log('canReceiveOrders:', data.canReceiveOrders);
    console.log('isActive:', data.isActive);
    console.log('registrationComplete:', data.registrationComplete);
    
    console.log('\n❓ SHOULD SHOW VERIFICATION?', 
      !data.phoneVerified ||
      data.accountStatus === 'pending_phone_verification' ||
      !data.registrationComplete
    );
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkVendor();
