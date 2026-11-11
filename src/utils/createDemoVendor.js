/**
 * 🧪 DEMO VENDOR ACCOUNT CREATION
 * Creates a test vendor account for development testing
 */

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';

/**
 * Create a demo vendor account for testing
 */
export const createDemoVendor = async () => {
  const demoVendorData = {
    email: 'demo.vendor@go7.com',
    password: 'demo123456',
    name: 'Demo Restaurant',
    phone: '+2348012345678',
    address: 'Demo Street, Abeokuta, Ogun State',
    type: 'restaurant',
    description: 'Demo restaurant for testing GO7 platform'
  };

  try {
    console.log('🧪 Creating demo vendor account...');
    
    // 1. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      demoVendorData.email,
      demoVendorData.password
    );
    const vendorId = userCredential.user.uid;

    // 2. Create Firestore vendor document (unverified)
    const vendorDoc = {
      vendorId: vendorId,
      userId: vendorId,
      name: demoVendorData.name.trim(),
      businessName: demoVendorData.name.trim(),
      email: demoVendorData.email.trim(),
      phone: demoVendorData.phone.trim(),
      
      // PHONE VERIFICATION FIELDS
      phoneVerified: false,
      phoneVerificationRequired: true,
      mustVerifyPhone: true,
      
      address: demoVendorData.address.trim(),
      type: demoVendorData.type,
      categories: [demoVendorData.type.toLowerCase()],
      description: demoVendorData.description?.trim() || '',
      
      // ACCOUNT STATUS - STRICTLY ENFORCED
      accountStatus: 'pending_phone_verification',
      canReceiveOrders: false,
      isActive: false,
      registrationComplete: false,
      
      // Availability settings
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      availableHours: { start: '08:00', end: '22:00' },
      deliveryTime: '30-45 mins',
      deliveryFee: 200,
      isTemporarilyClosed: false,
      isOnline: true,
      autoAccept: false,
      
      // Location
      location: {
        address: demoVendorData.address.trim(),
        coordinates: {
          latitude: 7.1475,
          longitude: 3.3619
        }
      },
      coordinates: {
        latitude: 7.1475,
        longitude: 3.3619
      },
      
      // Stats
      rating: 4.5,
      totalOrders: 0,
      totalProducts: 0,
      
      // Timestamps
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'vendors', vendorId), vendorDoc);
    
    console.log('✅ Demo vendor created successfully:', {
      vendorId,
      email: demoVendorData.email,
      password: demoVendorData.password,
      phone: demoVendorData.phone,
      needsVerification: true
    });
    
    // Sign out demo user
    await auth.signOut();
    
    return {
      success: true,
      vendorId,
      credentials: {
        email: demoVendorData.email,
        password: demoVendorData.password,
        phone: demoVendorData.phone
      }
    };
    
  } catch (error) {
    console.error('❌ Error creating demo vendor:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('📧 Demo vendor already exists, returning existing credentials');
      return {
        success: true,
        alreadyExists: true,
        credentials: {
          email: demoVendorData.email,
          password: demoVendorData.password,
          phone: demoVendorData.phone
        }
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Auto-create demo vendor if in development
if (import.meta.env.MODE === 'development') {
  console.log('🧪 Development mode detected - Demo vendor available');
  console.log('Demo Credentials:', {
    email: 'demo.vendor@go7.com',
    password: 'demo123456',
    phone: '+2348012345678'
  });
}

export const demoCredentials = {
  email: 'demo.vendor@go7.com',
  password: 'demo123456',
  phone: '+2348012345678'
};