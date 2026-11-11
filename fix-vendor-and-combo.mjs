import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDLE2KExGTP_enia029xbJsXVZL9jatp-E",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "165892487405",
  appId: "1:165892487405:web:acf6e42b22d3e1f9f4a2a7",
  measurementId: "G-JXBS7G84DH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const vendorId = 'DHRa7xmdUjgACDGrfoXQyfgk7Tq2';
const comboId = 'dOyqOA8TQIayseIkAdTJ';

async function fixVendorAndCombo() {
  console.log('🔧 Fixing vendor and combo...\n');
  
  // Fix vendor - set isActive to true
  const vendorRef = doc(db, 'vendors', vendorId);
  await updateDoc(vendorRef, {
    isActive: true
  });
  console.log('✅ Vendor set to active');
  
  // Fix combo - add missing fields
  const comboRef = doc(db, 'vendors', vendorId, 'combos', comboId);
  await updateDoc(comboRef, {
    timeLeft: 120,  // 2 hours
    comboPrice: 6000,
    originalPrice: 8000,
    savings: 2000
  });
  console.log('✅ Combo updated with missing fields');
  
  console.log('\n🎉 All fixed! Combo should now appear on homepage.');
}

fixVendorAndCombo()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
