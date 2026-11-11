import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBmQwPSnQslo6Sq4NeYjAUi8iaZIYVlaBg",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "232009015458",
  appId: "1:232009015458:web:49dbb63a5a67112325f7fb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('🔍 Testing Firestore connection...\n');

// Test 1: List all bookings
console.log('📋 Fetching all bookings...');
const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
console.log(`✅ Found ${bookingsSnapshot.size} bookings\n`);

bookingsSnapshot.forEach((doc) => {
  const data = doc.data();
  console.log(`📦 Booking ID: ${doc.id}`);
  console.log(`   - BookingId field: ${data.bookingId}`);
  console.log(`   - Sender: ${data.sender?.name || 'N/A'}`);
  console.log(`   - Recipient: ${data.recipient?.name || 'N/A'}`);
  console.log(`   - Status: ${data.status || 'N/A'}`);
  console.log(`   - Created: ${data.createdAt?.toDate?.() || 'N/A'}`);
  console.log('');
});

// Test 2: Try to fetch specific booking
const testId = 'Go7-8dvv6ae';
console.log(`\n🔍 Testing fetch for specific ID: ${testId}`);
const docRef = doc(db, 'bookings', testId);
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
  console.log('✅ FOUND! Data:', docSnap.data());
} else {
  console.log('❌ NOT FOUND with that document ID');
  console.log('💡 The bookingId field might be different from the document ID');
}

process.exit(0);
