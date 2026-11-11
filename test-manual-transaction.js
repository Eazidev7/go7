// Manual test for webhook functionality
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

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
const auth = getAuth(app);

const testTransaction = async () => {
  try {
    // Sign in anonymously to get a user ID
    const userCredential = await signInAnonymously(auth);
    const userId = userCredential.user.uid;
    
    console.log('🔐 Signed in as:', userId);
    
    // Add a test transaction directly
    const transactionRef = await addDoc(collection(db, 'transactions'), {
      userId: userId,
      type: 'wallet_topup',
      amount: 2500,
      description: 'Manual test transaction',
      reference: 'TEST-MANUAL-' + Date.now(),
      status: 'completed',
      method: 'test',
      paymentMethod: 'card',
      currency: 'NGN',
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });
    
    console.log('✅ Test transaction created:', transactionRef.id);
    
    // Add a notification
    const notificationRef = await addDoc(collection(db, 'notifications'), {
      uid: userId,
      title: 'Test Payment Received 💰',
      message: '₦2,500 added to your wallet (test)',
      type: 'wallet_credit',
      read: false,
      amount: 2500,
      reference: 'TEST-MANUAL-' + Date.now(),
      timestamp: serverTimestamp()
    });
    
    console.log('✅ Test notification created:', notificationRef.id);
    console.log('👤 User ID to check in app:', userId);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

testTransaction();