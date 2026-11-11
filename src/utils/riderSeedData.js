/**
 * Rider System Seed Data & Simulator
 * 
 * This script creates test data for the rider system and simulates
 * job assignments for testing purposes.
 */

import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Generate a random 4-digit OTP
 */
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Generate a random booking ID
 */
const generateBookingId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let bookingId = 'Go7-';
  for (let i = 0; i < 7; i++) {
    bookingId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return bookingId;
};

/**
 * Seed test riders
 */
export const seedRiders = async () => {
  console.log('🚴 Seeding test riders...');

  const riders = [
    {
      id: 'rider-001',
      name: 'Tunde Adebayo',
      email: 'tunde@go7.com',
      phone: '+2348012345678',
      status: 'offline',
      location: {
        lat: 7.1475,
        lng: 3.3619,
        accuracy: 10,
        timestamp: new Date().toISOString()
      },
      currentOrderId: null,
      earningsToday: 0,
      totalEarnings: 0,
      completedDeliveries: 0,
      rating: 4.8,
      createdAt: serverTimestamp()
    },
    {
      id: 'rider-002',
      name: 'Chioma Okafor',
      email: 'chioma@go7.com',
      phone: '+2348023456789',
      status: 'offline',
      location: {
        lat: 7.1575,
        lng: 3.3519,
        accuracy: 10,
        timestamp: new Date().toISOString()
      },
      currentOrderId: null,
      earningsToday: 0,
      totalEarnings: 0,
      completedDeliveries: 0,
      rating: 4.9,
      createdAt: serverTimestamp()
    },
    {
      id: 'rider-003',
      name: 'Bola Johnson',
      email: 'bola@go7.com',
      phone: '+2348034567890',
      status: 'offline',
      location: {
        lat: 7.1375,
        lng: 3.3719,
        accuracy: 10,
        timestamp: new Date().toISOString()
      },
      currentOrderId: null,
      earningsToday: 0,
      totalEarnings: 0,
      completedDeliveries: 0,
      rating: 4.7,
      createdAt: serverTimestamp()
    }
  ];

  try {
    for (const rider of riders) {
      await setDoc(doc(db, 'riders', rider.id), rider);
      console.log(`✅ Created rider: ${rider.name} (${rider.id})`);
    }
    console.log('✅ All riders seeded successfully!');
    return riders;
  } catch (error) {
    console.error('❌ Error seeding riders:', error);
    throw error;
  }
};

/**
 * Seed test orders
 */
export const seedOrders = async () => {
  console.log('📦 Seeding test orders...');

  const orders = [
    {
      id: 'order-001',
      bookingId: generateBookingId(),
      customerId: 'customer-001',
      customerName: 'John Doe',
      customerPhone: '+2348045678901',
      packageType: 'Document',
      packageDescription: 'Important documents',
      pickupAddress: 'Ibara, Abeokuta',
      pickupLocation: {
        lat: 7.1475,
        lng: 3.3619
      },
      dropoffAddress: 'Oke-Mosan, Abeokuta',
      dropoffLocation: {
        lat: 7.1575,
        lng: 3.3519
      },
      distance: 1.5,
      deliveryFee: 500,
      deliveryOtp: generateOTP(),
      status: 'pending',
      riderId: null,
      riderLocation: null,
      createdAt: serverTimestamp(),
      estimatedDeliveryTime: '20-30 mins'
    },
    {
      id: 'order-002',
      bookingId: generateBookingId(),
      customerId: 'customer-002',
      customerName: 'Jane Smith',
      customerPhone: '+2348056789012',
      packageType: 'Package',
      packageDescription: 'Small parcel from market',
      pickupAddress: 'Itoku Market, Abeokuta',
      pickupLocation: {
        lat: 7.1375,
        lng: 3.3719
      },
      dropoffAddress: 'Panseke, Abeokuta',
      dropoffLocation: {
        lat: 7.1675,
        lng: 3.3419
      },
      distance: 3.2,
      deliveryFee: 800,
      deliveryOtp: generateOTP(),
      status: 'pending',
      riderId: null,
      riderLocation: null,
      createdAt: serverTimestamp(),
      estimatedDeliveryTime: '30-40 mins'
    },
    {
      id: 'order-003',
      bookingId: generateBookingId(),
      customerId: 'customer-003',
      customerName: 'Ahmed Hassan',
      customerPhone: '+2348067890123',
      packageType: 'Food',
      packageDescription: 'Lunch delivery',
      pickupAddress: 'Kuto, Abeokuta',
      pickupLocation: {
        lat: 7.1275,
        lng: 3.3819
      },
      dropoffAddress: 'Isale Igbein, Abeokuta',
      dropoffLocation: {
        lat: 7.1475,
        lng: 3.3619
      },
      distance: 2.5,
      deliveryFee: 600,
      deliveryOtp: generateOTP(),
      status: 'pending',
      riderId: null,
      riderLocation: null,
      createdAt: serverTimestamp(),
      estimatedDeliveryTime: '15-25 mins'
    }
  ];

  try {
    for (const order of orders) {
      await setDoc(doc(db, 'orders', order.id), order);
      console.log(`✅ Created order: ${order.bookingId} - ${order.packageType}`);
    }
    console.log('✅ All orders seeded successfully!');
    return orders;
  } catch (error) {
    console.error('❌ Error seeding orders:', error);
    throw error;
  }
};

/**
 * Simulate a job assignment to a specific rider
 * @param {string} riderId - Rider ID to assign job to
 * @param {string} orderId - Order ID to assign
 */
export const simulateJobAssignment = async (riderId, orderId) => {
  console.log(`📲 Simulating job assignment: ${orderId} → ${riderId}`);

  try {
    // Create assignment document
    const assignment = {
      riderId: riderId,
      orderId: orderId,
      assignedAt: serverTimestamp(),
      status: 'pending',
      notified: false
    };

    await setDoc(doc(db, 'assignments', riderId), assignment);
    console.log(`✅ Assignment created in /assignments/${riderId}`);
    
    return assignment;
  } catch (error) {
    console.error('❌ Error simulating job assignment:', error);
    throw error;
  }
};

/**
 * Run the complete seed & simulation
 */
export const runSeedAndSimulation = async () => {
  console.log('🎬 Starting seed and simulation...\n');

  try {
    // Step 1: Seed riders
    const riders = await seedRiders();
    console.log('\n');

    // Step 2: Seed orders
    const orders = await seedOrders();
    console.log('\n');

    // Step 3: Simulate an assignment
    console.log('📲 Simulating job assignment...');
    const assignment = await simulateJobAssignment('rider-001', 'order-001');
    console.log('✅ Assignment simulated successfully!');
    console.log('Assignment details:', assignment);

    console.log('\n🎉 Seed and simulation complete!');
    console.log('\n📋 Test Data Summary:');
    console.log(`   - ${riders.length} riders created`);
    console.log(`   - ${orders.length} orders created`);
    console.log(`   - 1 assignment simulated`);
    console.log('\n🔐 Demo Credentials:');
    console.log('   Email: rider@go7.com');
    console.log('   Password: rider123');
    console.log('\n🚀 Access rider dashboard at: /rider/dashboard');
    
    return { riders, orders, assignment };
  } catch (error) {
    console.error('❌ Seed and simulation failed:', error);
    throw error;
  }
};

/**
 * Clear all test data
 */
export const clearTestData = async () => {
  console.log('🗑️ Clearing test data...');
  // Implementation would delete all test documents
  // Left as exercise - use deleteDoc from Firestore
  console.log('⚠️ Clear function not implemented - manually delete from Firebase Console');
};

export default {
  seedRiders,
  seedOrders,
  simulateJobAssignment,
  runSeedAndSimulation,
  clearTestData
};
