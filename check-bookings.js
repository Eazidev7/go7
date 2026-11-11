import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

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

async function checkBookings() {
  try {
    console.log('📊 Checking bookings collection...\n');
    
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, orderBy('createdAt', 'desc'), limit(5));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('❌ NO BOOKINGS FOUND!');
      process.exit(0);
    }
    
    console.log(`✅ Found ${snapshot.size} recent bookings:\n`);
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('─────────────────────────────────');
      console.log('📄 Firebase Document ID:', doc.id);
      console.log('🏷️  bookingId field:', data.bookingId);
      console.log('📧 Sender:', data.sender?.name, '-', data.sender?.email);
      console.log('📅 Created:', data.createdAt?.toDate());
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBookings();
