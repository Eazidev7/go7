/**
 * 🔐 GET VENDOR CREDENTIALS
 * 
 * Lists all vendor accounts with emails from Firestore
 * Note: Passwords cannot be retrieved (hashed by Firebase Auth)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDiUnq9vlXkp5űBNTyLVFWe3Kq_B0v21M8",
  authDomain: "go7-32084.firebaseapp.com",
  projectId: "go7-32084",
  storageBucket: "go7-32084.firebasestorage.app",
  messagingSenderId: "201718584347",
  appId: "1:201718584347:web:b78d9a83ff03e01afaca9c",
  measurementId: "G-S3R4VVXZ5J"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getVendorCredentials() {
  try {
    console.log('🔍 Fetching all vendor accounts...\n');
    
    const vendorsRef = collection(db, 'vendors');
    const snapshot = await getDocs(vendorsRef);
    
    if (snapshot.empty) {
      console.log('❌ No vendors found in database');
      return;
    }
    
    console.log(`✅ Found ${snapshot.size} vendor account(s)\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const vendors = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      vendors.push({
        id: doc.id,
        email: data.email || data.ownerEmail || 'No email',
        businessName: data.name || data.businessName || 'Unknown Business',
        phone: data.phone || data.phoneNumber || 'No phone',
        category: data.category || data.businessType || 'Unknown',
        status: data.isActive ? '✅ Active' : '❌ Inactive',
        createdAt: data.createdAt?.toDate?.() || 'Unknown'
      });
    });
    
    // Sort by creation date
    vendors.sort((a, b) => {
      if (a.createdAt === 'Unknown') return 1;
      if (b.createdAt === 'Unknown') return -1;
      return b.createdAt - a.createdAt;
    });
    
    vendors.forEach((vendor, index) => {
      console.log(`\n📦 VENDOR ${index + 1}:`);
      console.log(`   Business: ${vendor.businessName}`);
      console.log(`   📧 Email: ${vendor.email}`);
      console.log(`   📱 Phone: ${vendor.phone}`);
      console.log(`   🏷️  Category: ${vendor.category}`);
      console.log(`   Status: ${vendor.status}`);
      console.log(`   Vendor ID: ${vendor.id}`);
      console.log(`   Created: ${vendor.createdAt !== 'Unknown' ? vendor.createdAt.toLocaleString() : 'Unknown'}`);
      console.log('   ─────────────────────────────────────────────────────────');
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('   1. Passwords CANNOT be retrieved (they are hashed by Firebase)');
    console.log('   2. To login, use the email above and try the password you set');
    console.log('   3. If you forgot the password, use the password reset option');
    console.log('   4. Or manually reset via Firebase Console → Authentication');
    console.log('\n💡 QUICK RESET:');
    console.log('   Visit: https://go7-32084.firebaseapp.com/vendor/login');
    console.log('   Click "Forgot Password" and enter the email above');
    console.log('\n🔧 MANUAL RESET (Firebase Console):');
    console.log('   1. Go to: https://console.firebase.google.com/project/go7-32084/authentication/users');
    console.log('   2. Find the vendor email');
    console.log('   3. Click ⋮ menu → Reset Password');
    console.log('   4. Copy the password reset link and send to vendor');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Create a simple CSV export
    console.log('📋 COPY-PASTE FRIENDLY LIST:\n');
    vendors.forEach((v, i) => {
      console.log(`${i + 1}. ${v.businessName} | ${v.email} | ${v.phone}`);
    });
    
    console.log('\n✅ Done!\n');
    
  } catch (error) {
    console.error('❌ Error fetching vendors:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure Firebase config is correct');
    console.error('2. Check internet connection');
    console.error('3. Verify Firestore rules allow read access');
  }
  
  process.exit(0);
}

console.log('🔐 GO7 VENDOR CREDENTIALS RETRIEVER\n');
getVendorCredentials();
