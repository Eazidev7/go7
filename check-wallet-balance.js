/**
 * Quick script to check wallet balance directly from Firestore
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAE9wI9PP5Ps9wFVXYHSxLhv23IIGK7MWs",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "671896145312",
  appId: "1:671896145312:web:2fa0e5a97c8fb5b12e1fea",
  measurementId: "G-R34JNX3JTL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Your user ID from the logs
const userId = 'aXOuD9NzauRS5bf9Ue5YoJSSGsE2';

async function checkWallet() {
  try {
    console.log('🔍 Checking wallet for user:', userId);
    console.log('📍 Path: customers/' + userId + '/wallet/main');
    
    const walletRef = doc(db, 'customers', userId, 'wallet', 'main');
    const walletSnap = await getDoc(walletRef);
    
    console.log('\n📄 Document exists:', walletSnap.exists());
    
    if (walletSnap.exists()) {
      const data = walletSnap.data();
      console.log('\n✅ Wallet data:');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n💰 Balance: ₦' + (data.balance || 0).toLocaleString());
    } else {
      console.log('\n❌ No wallet document found!');
      console.log('💡 The wallet might be in a different collection.');
      console.log('💡 Check Firebase Console > Firestore Database');
      console.log('💡 Look for where the wallet with ₦2600 balance is stored');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  }
}

checkWallet();
