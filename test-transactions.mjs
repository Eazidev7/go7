// Test script to verify transaction history data
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBqDKw2l7-5TZi3yU9s9HbzlCNxCwDqb34",
  authDomain: "fir-48f25.firebaseapp.com",
  projectId: "fir-48f25",
  storageBucket: "fir-48f25.firebasestorage.app",
  messagingSenderId: "313429076453",
  appId: "1:313429076453:web:88e4b84f54ad5d40d02a1a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTransactions() {
  try {
    console.log('\n=== Checking Transactions Collections ===\n');
    
    // Check walletTransactions
    const walletQuery = query(collection(db, 'walletTransactions'), limit(5));
    const walletSnap = await getDocs(walletQuery);
    
    console.log(`📊 walletTransactions count: ${walletSnap.size}`);
    walletSnap.forEach(doc => {
      const data = doc.data();
      console.log('\n💰 Wallet Transaction:');
      console.log(`   ID: ${doc.id}`);
      console.log(`   Type: ${data.type}`);
      console.log(`   Amount: ₦${data.amount}`);
      console.log(`   Description: ${data.description}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Reference: ${data.reference}`);
    });
    
    console.log('\n---\n');
    
    // Check transactions
    const transQuery = query(collection(db, 'transactions'), limit(5));
    const transSnap = await getDocs(transQuery);
    
    console.log(`📊 transactions count: ${transSnap.size}`);
    transSnap.forEach(doc => {
      const data = doc.data();
      console.log('\n🛒 Order Transaction:');
      console.log(`   ID: ${doc.id}`);
      console.log(`   Type: ${data.type}`);
      console.log(`   Amount: ₦${data.amount}`);
      console.log(`   Description: ${data.description}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   OrderID: ${data.orderId}`);
      console.log(`   OrderType: ${data.orderType}`);
      console.log(`   Reference: ${data.reference}`);
    });
    
    console.log('\n=== Check Complete ===\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTransactions();
