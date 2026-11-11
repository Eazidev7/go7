import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';

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

async function fixComboImage() {
  console.log('🖼️ Fixing combo image...\n');
  
  const comboRef = doc(db, 'vendors', vendorId, 'combos', comboId);
  const comboSnap = await getDoc(comboRef);
  
  if (comboSnap.exists()) {
    const comboData = comboSnap.data();
    console.log('Current image field:', comboData.image);
    console.log('Current imageUrl field:', comboData.imageUrl);
    
    // Use the existing imageUrl field
    const imageToUse = comboData.imageUrl || defaultImage;
    
    await updateDoc(comboRef, {
      image: imageToUse
    });
    
    console.log('✅ Updated combo.image to match imageUrl:', imageToUse);
  } else {
    console.log('❌ Combo not found!');
  }
}

fixComboImage()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
