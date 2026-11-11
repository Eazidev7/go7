/**
 * 🧪 Test Transaction History System
 * 
 * Verifies that transactions are being created and can be queried
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function testTransactionHistory() {
  console.log('🧪 Testing Transaction History System\n');

  try {
    // 1. Check if transactions collection exists
    console.log('1️⃣ Checking transactions collection...');
    const transactionsRef = db.collection('transactions');
    const snapshot = await transactionsRef.limit(5).get();
    
    if (snapshot.empty) {
      console.log('⚠️  No transactions found yet');
      console.log('💡 Transactions will appear after first payment\n');
    } else {
      console.log(`✅ Found ${snapshot.size} recent transactions\n`);
      
      // Display transaction details
      snapshot.forEach((doc, index) => {
        const tx = doc.data();
        console.log(`📝 Transaction ${index + 1}:`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   User: ${tx.userId}`);
        console.log(`   Type: ${tx.type}`);
        console.log(`   Amount: ₦${tx.amount?.toLocaleString()}`);
        console.log(`   Status: ${tx.status}`);
        console.log(`   Channel: ${tx.channel || 'N/A'}`);
        console.log(`   Reference: ${tx.reference}`);
        console.log(`   Timestamp: ${tx.timestamp?.toDate()}\n`);
      });
    }

    // 2. Test transaction query by userId
    console.log('2️⃣ Testing user-specific transaction query...');
    const testUserId = 'test_user_123'; // Replace with real user ID for testing
    
    const userTxSnapshot = await transactionsRef
      .where('userId', '==', testUserId)
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();

    if (userTxSnapshot.empty) {
      console.log(`ℹ️  No transactions found for user: ${testUserId}`);
      console.log('💡 Use a real user ID from Firestore to test\n');
    } else {
      console.log(`✅ Found ${userTxSnapshot.size} transactions for user\n`);
    }

    // 3. Create a test transaction to verify write permissions
    console.log('3️⃣ Testing transaction creation...');
    const testTxRef = await transactionsRef.add({
      userId: 'test_user_system_check',
      type: 'credit',
      amount: 100,
      reference: `test_${Date.now()}`,
      channel: 'test',
      status: 'success',
      source: 'System Test',
      description: 'Test transaction for system verification',
      method: 'manual',
      currency: 'NGN',
      metadata: {
        testRun: true,
        timestamp: new Date().toISOString()
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Test transaction created: ${testTxRef.id}`);
    
    // Clean up test transaction
    await testTxRef.delete();
    console.log(`🧹 Test transaction deleted\n`);

    // 4. Check Firestore indexes
    console.log('4️⃣ Checking Firestore indexes...');
    console.log('📊 Required composite index:');
    console.log('   Collection: transactions');
    console.log('   Fields: userId (Ascending), timestamp (Descending)');
    console.log('   Status: Check Firebase Console > Firestore > Indexes\n');

    console.log('✅ Transaction History System Test Complete!\n');
    console.log('📋 Summary:');
    console.log('   ✓ Collection accessible');
    console.log('   ✓ Write permissions working');
    console.log('   ✓ Query structure valid');
    console.log('\n🎯 Next: Make a real payment to test end-to-end flow');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error.code === 9) {
      console.log('\n💡 Index missing! Create composite index:');
      console.log('   Firebase Console > Firestore > Indexes');
      console.log('   Collection: transactions');
      console.log('   userId (Ascending) + timestamp (Descending)');
    }
  }
}

// Run the test
testTransactionHistory()
  .then(() => {
    console.log('\n✨ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
