/**
 * Admin Settings Manager - Update Platform Settings in Firebase
 * 
 * Run this script to update platform settings like service fee
 * 
 * Usage:
 *   node update-platform-settings.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDmLv6nMWt3ELRcNW2a6bPfAQk5xoBXDqE",
  authDomain: "go7-delivery.firebaseapp.com",
  projectId: "go7-delivery",
  storageBucket: "go7-delivery.firebasestorage.app",
  messagingSenderId: "990515758151",
  appId: "1:990515758151:web:f45f70bac0a6d39db3dbc5",
  measurementId: "G-PB30SN8MH2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getPlatformSettings() {
  try {
    const settingsRef = doc(db, 'settings', 'platform');
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      console.log('Current Platform Settings:');
      console.log(JSON.stringify(settingsDoc.data(), null, 2));
      return settingsDoc.data();
    } else {
      console.log('No platform settings found in Firestore');
      return null;
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    return null;
  }
}

async function updatePlatformSettings(settings) {
  try {
    const settingsRef = doc(db, 'settings', 'platform');
    await setDoc(settingsRef, {
      ...settings,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'admin-script'
    }, { merge: true });
    
    console.log('\n✅ Platform settings updated successfully!');
    console.log('\nNew Settings:');
    console.log(JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('❌ Error updating settings:', error);
  }
}

// Default settings to initialize
const defaultSettings = {
  serviceFee: {
    enabled: true,
    amount: 150, // ₦150 flat fee for food orders
    description: 'Platform service fee'
  },
  deliveryFee: {
    baseFee: 500,     // ₦500 for 0-5km
    perKmRate: 100,   // ₦100/km after 5km
    maxDistance: 8    // 8 km maximum
  }
};

// Main execution
async function main() {
  console.log('🔧 Platform Settings Manager\n');
  console.log('='.repeat(50));
  
  // Get current settings
  console.log('\n📖 Fetching current settings...');
  const currentSettings = await getPlatformSettings();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📝 Updating to default settings...');
  
  // Update with default settings
  await updatePlatformSettings(defaultSettings);
  
  console.log('\n' + '='.repeat(50));
  console.log('\n💡 Settings can be customized:');
  console.log(`
  Service Fee:
    - enabled: true/false (enable or disable service fee)
    - amount: 150 (fee amount in Naira)
    - description: "Platform service fee" (label shown to users)
  
  Delivery Fee:
    - baseFee: 500 (base fee for 0-5km)
    - perKmRate: 100 (additional fee per km after 5km)
    - maxDistance: 8 (maximum delivery distance in km)
  `);
  
  console.log('\n✨ To customize, edit this script or use the admin panel\n');
  
  process.exit(0);
}

main().catch(console.error);
