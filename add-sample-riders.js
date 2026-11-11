/**
 * GO7 RIDER AUTO-DISPATCH - FIREBASE SAMPLE DATA SCRIPT
 * ======================================================
 * Run this in your browser console (on any Go7 page) to add sample riders
 * 
 * INSTRUCTIONS:
 * 1. Open Go7 app in browser (make sure you're logged in)
 * 2. Press F12 to open DevTools
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter to run
 * 6. Wait for "✅ Sample riders added successfully!" message
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './src/firebase/config';

async function addSampleRiders() {
  console.log('🚴 Adding sample riders to Firestore...');
  
  const sampleRiders = [
    {
      name: "Tunde Adebayo",
      phone: "+234 801 234 5678",
      email: "tunde.adebayo@go7.ng",
      latitude: 7.1580,
      longitude: 3.3650,
      vehicleType: "bike",
      status: "available",
      lastActive: Date.now(),
      rating: 4.8,
      completedDeliveries: 127,
      currentOrder: null,
      joinedDate: new Date('2024-01-15'),
      licensePlate: "AK-123-XY",
      profilePhoto: null,
      emergencyContact: "+234 802 111 2222"
    },
    {
      name: "Fatima Hassan",
      phone: "+234 803 456 7890",
      email: "fatima.hassan@go7.ng",
      latitude: 7.1420,
      longitude: 3.3580,
      vehicleType: "bicycle",
      status: "available",
      lastActive: Date.now(),
      rating: 4.9,
      completedDeliveries: 89,
      currentOrder: null,
      joinedDate: new Date('2024-03-20'),
      licensePlate: null,
      profilePhoto: null,
      emergencyContact: "+234 804 333 4444"
    },
    {
      name: "Ibrahim Ojo",
      phone: "+234 805 678 9012",
      email: "ibrahim.ojo@go7.ng",
      latitude: 7.1550,
      longitude: 3.3700,
      vehicleType: "bike",
      status: "available",
      lastActive: Date.now(),
      rating: 4.7,
      completedDeliveries: 156,
      currentOrder: null,
      joinedDate: new Date('2023-11-10'),
      licensePlate: "AK-456-ZT",
      profilePhoto: null,
      emergencyContact: "+234 806 555 6666"
    },
    {
      name: "Blessing Okoro",
      phone: "+234 807 890 1234",
      email: "blessing.okoro@go7.ng",
      latitude: 7.1490,
      longitude: 3.3600,
      vehicleType: "bike",
      status: "available",
      lastActive: Date.now(),
      rating: 5.0,
      completedDeliveries: 203,
      currentOrder: null,
      joinedDate: new Date('2023-08-05'),
      licensePlate: "AK-789-MP",
      profilePhoto: null,
      emergencyContact: "+234 808 777 8888"
    },
    {
      name: "Chinedu Okeke",
      phone: "+234 809 012 3456",
      email: "chinedu.okeke@go7.ng",
      latitude: 7.1520,
      longitude: 3.3580,
      vehicleType: "foot",
      status: "offline",
      lastActive: Date.now() - (15 * 60 * 1000), // 15 minutes ago
      rating: 4.6,
      completedDeliveries: 67,
      currentOrder: null,
      joinedDate: new Date('2024-05-12'),
      licensePlate: null,
      profilePhoto: null,
      emergencyContact: "+234 810 999 0000"
    }
  ];

  try {
    const ridersRef = collection(db, 'riders');
    
    for (const rider of sampleRiders) {
      const docRef = await addDoc(ridersRef, {
        ...rider,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Added rider: ${rider.name} (ID: ${docRef.id})`);
    }
    
    console.log('✅ Sample riders added successfully!');
    console.log(`📊 Total riders added: ${sampleRiders.length}`);
    console.log('🔍 Check Firestore console to verify: https://console.firebase.google.com/');
    
  } catch (error) {
    console.error('❌ Error adding sample riders:', error);
    console.error('Make sure you are logged in and have proper permissions');
  }
}

// Run the script
addSampleRiders();


// ========================================
// ALTERNATIVE: Manual Firestore Console Method
// ========================================
// If the script above doesn't work, manually add to Firestore:
//
// 1. Go to: https://console.firebase.google.com/
// 2. Select your Go7 project
// 3. Click "Firestore Database" in left menu
// 4. Click "Start Collection"
// 5. Collection ID: "riders"
// 6. Click "Next"
// 7. Add these fields for first document:
//
// Field Name       | Type      | Value
// -----------------|-----------|------------------
// name             | string    | Tunde Adebayo
// phone            | string    | +234 801 234 5678
// email            | string    | tunde@go7.ng
// latitude         | number    | 7.1580
// longitude        | number    | 3.3650
// vehicleType      | string    | bike
// status           | string    | available
// lastActive       | timestamp | [Click "timestamp" and use current time]
// rating           | number    | 4.8
// completedDeliveries | number | 127
// currentOrder     | null      | null
//
// 8. Click "Save"
// 9. Repeat for other riders using data from sampleRiders array above


// ========================================
// QUICK VERIFICATION SCRIPT
// ========================================
// Run this to check if riders exist:

/*
import { collection, getDocs } from 'firebase/firestore';
import { db } from './src/firebase/config';

async function checkRiders() {
  const ridersRef = collection(db, 'riders');
  const snapshot = await getDocs(ridersRef);
  
  console.log(`📊 Total riders in database: ${snapshot.size}`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- ${data.name} (${data.status}) - ${data.vehicleType}`);
  });
}

checkRiders();
*/


// ========================================
// RIDER STATUS UPDATE SCRIPT
// ========================================
// Update rider status manually:

/*
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './src/firebase/config';

async function updateRiderStatus(riderId, newStatus) {
  const riderRef = doc(db, 'riders', riderId);
  await updateDoc(riderRef, {
    status: newStatus,
    lastActive: Date.now(),
    updatedAt: serverTimestamp()
  });
  console.log(`✅ Updated rider ${riderId} to ${newStatus}`);
}

// Usage:
// updateRiderStatus('RIDER_DOC_ID', 'available');
*/


// ========================================
// RELEASE ALL BUSY RIDERS SCRIPT
// ========================================
// Reset all riders to available (useful for testing):

/*
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './src/firebase/config';

async function releaseAllRiders() {
  const ridersRef = collection(db, 'riders');
  const snapshot = await getDocs(ridersRef);
  
  let count = 0;
  for (const docSnap of snapshot.docs) {
    if (docSnap.data().status === 'busy') {
      await updateDoc(doc(db, 'riders', docSnap.id), {
        status: 'available',
        currentOrder: null,
        lastActive: Date.now()
      });
      count++;
    }
  }
  
  console.log(`✅ Released ${count} riders back to available pool`);
}

// Run this when testing is complete:
// releaseAllRiders();
*/
