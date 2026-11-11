// Test script to add sample transaction data for testing HistoryScreen
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAXI2RLyPDqjWFyg9Kkrbw_EgAEXreRjkc",
  authDomain: "go7-uber-app.firebaseapp.com", 
  projectId: "go7-uber-app",
  storageBucket: "go7-uber-app.firebasestorage.app",
  messagingSenderId: "847558248785",
  appId: "1:847558248785:web:a74b6eb8c2cc116a0efa30"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Replace with actual user ID from Firebase Auth
const testUserId = "TEST_USER_ID"; 

const sampleTransactions = [
  {
    userId: testUserId,
    type: 'wallet_topup',
    amount: 5000,
    description: 'Wallet top-up via card',
    paymentMethod: 'card',
    reference: 'TEST-001-' + Date.now(),
    status: 'completed',
    timestamp: serverTimestamp()
  },
  {
    userId: testUserId,
    type: 'wallet_debit',
    amount: 1200,
    description: 'Order payment - Pizza Palace',
    reference: 'TEST-002-' + Date.now(),
    status: 'completed',
    timestamp: serverTimestamp()
  },
  {
    userId: testUserId,
    type: 'wallet_topup_dva',
    amount: 10000,
    description: 'Bank transfer top-up',
    paymentMethod: 'bank_transfer',
    reference: 'TEST-003-' + Date.now(),
    status: 'completed',
    timestamp: serverTimestamp()
  }
];

const sampleDeliveries = [
  {
    userId: testUserId,
    status: 'delivered',
    deliveryFee: 500,
    pickupAddress: '123 Main Street, Abeokuta',
    deliveryAddress: '456 Oak Avenue, Abeokuta',
    reference: 'DEL-001-' + Date.now(),
    createdAt: serverTimestamp()
  },
  {
    userId: testUserId,
    status: 'in_transit',
    deliveryFee: 800,
    pickupAddress: 'KFC Oke-Ilewo',
    deliveryAddress: '789 Pine Road, Abeokuta',
    reference: 'DEL-002-' + Date.now(),
    createdAt: serverTimestamp()
  }
];

const sampleOrders = [
  {
    userId: testUserId,
    status: 'delivered',
    totalAmount: 2500,
    items: [
      { name: 'Large Pizza', quantity: 1, price: 2000 },
      { name: 'Soft Drink', quantity: 2, price: 250 }
    ],
    restaurant: 'Pizza Palace',
    reference: 'ORD-001-' + Date.now(),
    createdAt: serverTimestamp()
  },
  {
    userId: testUserId,
    status: 'preparing',
    totalAmount: 1800,
    items: [
      { name: 'Chicken Burger', quantity: 1, price: 1500 },
      { name: 'Fries', quantity: 1, price: 300 }
    ],
    restaurant: 'Burger King',
    reference: 'ORD-002-' + Date.now(),
    createdAt: serverTimestamp()
  }
];

const addTestData = async () => {
  try {
    console.log('Adding sample transactions...');
    for (const transaction of sampleTransactions) {
      await addDoc(collection(db, 'transactions'), transaction);
    }
    
    console.log('Adding sample deliveries...');
    for (const delivery of sampleDeliveries) {
      await addDoc(collection(db, 'deliveries'), delivery);
    }
    
    console.log('Adding sample orders...');
    for (const order of sampleOrders) {
      await addDoc(collection(db, 'orders'), order);
    }
    
    console.log('✅ Sample data added successfully!');
    console.log('🔥 You can now test the HistoryScreen with real data');
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  }
};

// Run this script with: node test-history-data.js
// Make sure to replace testUserId with actual Firebase Auth user ID
addTestData();