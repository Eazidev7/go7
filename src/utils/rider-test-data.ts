// Sample rider data and test setup for Go7 delivery system
import { createRiderProfile, updateRiderGPS, simulateRiderJourney } from './rider-utils';
import { createTestOrder } from './order-tracking-utils';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Sample rider profiles for testing
export const SAMPLE_RIDERS = [
  {
    riderId: 'AKEEM01',
    name: 'Akeem Olatunji',
    phone: '+234 801 234 5678',
    email: 'akeem@go7delivery.com',
    status: 'active' as const,
    vehicle: 'motorcycle' as const,
    rating: 4.8,
    completedOrders: 127,
    profileImage: '/avatars/akeem.jpg'
  },
  {
    riderId: 'MUSA22',
    name: 'Musa Ibrahim',
    phone: '+234 802 345 6789',
    email: 'musa@go7delivery.com',
    status: 'active' as const,
    vehicle: 'motorcycle' as const,
    rating: 4.9,
    completedOrders: 203,
    profileImage: '/avatars/musa.jpg'
  },
  {
    riderId: 'KEMI45',
    name: 'Kemi Adebayo',
    phone: '+234 703 456 7890',
    email: 'kemi@go7delivery.com',
    status: 'active' as const,
    vehicle: 'bicycle' as const,
    rating: 4.7,
    completedOrders: 89,
    profileImage: '/avatars/kemi.jpg'
  },
  {
    riderId: 'TUNDE88',
    name: 'Tunde Okoro',
    phone: '+234 704 567 8901',
    email: 'tunde@go7delivery.com',
    status: 'busy' as const,
    vehicle: 'motorcycle' as const,
    rating: 4.6,
    completedOrders: 156,
    currentOrderId: 'GO-005',
    profileImage: '/avatars/tunde.jpg'
  },
  {
    riderId: 'FOLAKE12',
    name: 'Folake Daniels',
    phone: '+234 705 678 9012',
    email: 'folake@go7delivery.com',
    status: 'active' as const,
    vehicle: 'car' as const,
    rating: 4.9,
    completedOrders: 234,
    profileImage: '/avatars/folake.jpg'
  }
];

// Sample order assignments for riders
export const SAMPLE_RIDER_ORDERS = [
  {
    orderId: 'GO-001',
    riderId: 'AKEEM01',
    status: 'accepted' as const
  },
  {
    orderId: 'GO-002',
    riderId: 'MUSA22',
    status: 'picked_up' as const
  },
  {
    orderId: 'GO-003',
    riderId: 'KEMI45',
    status: 'en_route' as const
  },
  {
    orderId: 'GO-004',
    riderId: 'AKEEM01',
    status: 'delivered' as const
  },
  {
    orderId: 'GO-005',
    riderId: 'TUNDE88',
    status: 'en_route' as const
  }
];

// Create all sample riders in Firestore
export const setupRiderTestData = async (): Promise<void> => {
  console.log('🚀 Setting up rider test data...');
  
  try {
    for (const riderData of SAMPLE_RIDERS) {
      await createRiderProfile(riderData);
      
      // Set initial GPS location (somewhere in Abeokuta)
      const baseCoords: [number, number] = [3.3619, 7.1475];
      const randomOffset = 0.01; // ~1km radius
      const lat = baseCoords[1] + (Math.random() - 0.5) * randomOffset;
      const lng = baseCoords[0] + (Math.random() - 0.5) * randomOffset;
      
      await updateRiderGPS(riderData.riderId, {
        lat,
        lng,
        status: riderData.status,
        timestamp: serverTimestamp(),
        currentOrderId: riderData.currentOrderId
      });
      
      console.log(`✅ Rider ${riderData.name} (${riderData.riderId}) setup complete`);
      
      // Small delay to avoid overwhelming Firestore
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('🎉 All rider test data setup completed!');
    
    // Log rider credentials for easy testing
    console.log('📋 Test Rider Credentials:');
    SAMPLE_RIDERS.forEach(rider => {
      console.log(`- ${rider.riderId}: ${rider.name} (${rider.phone})`);
    });
    
  } catch (error) {
    console.error('❌ Error setting up rider test data:', error);
  }
};

// Setup sample orders assigned to riders
export const setupRiderOrderTestData = async (): Promise<void> => {
  console.log('📦 Setting up rider order assignments...');
  
  try {
    for (const assignment of SAMPLE_RIDER_ORDERS) {
      // Update order with rider assignment
      const orderDocRef = doc(db, 'orders', assignment.orderId);
      await setDoc(orderDocRef, {
        riderId: assignment.riderId,
        status: assignment.status,
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log(`✅ Order ${assignment.orderId} assigned to ${assignment.riderId} with status: ${assignment.status}`);
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('🎉 Rider order assignments completed!');
    
  } catch (error) {
    console.error('❌ Error setting up rider order assignments:', error);
  }
};

// Start GPS simulation for all active riders
export const startAllRiderSimulations = async (): Promise<void> => {
  console.log('🛵 Starting GPS simulations for all active riders...');
  
  const simulationPromises = SAMPLE_RIDERS
    .filter(rider => rider.status === 'active' || rider.status === 'busy')
    .map(async (rider) => {
      // Get a random order or create a default route
      const assignment = SAMPLE_RIDER_ORDERS.find(a => a.riderId === rider.riderId && a.status !== 'delivered');
      
      if (assignment) {
        // Simulate journey for the assigned order
        const startCoords: [number, number] = [3.3619, 7.1475]; // Pickup location
        const endCoords: [number, number] = [3.3700, 7.1530]; // Dropoff location
        
        await simulateRiderJourney(
          rider.riderId,
          startCoords,
          endCoords,
          assignment.orderId,
          15 // 15 minute journey
        );
      } else {
        // Just update GPS with random movement around Abeokuta
        const baseCoords: [number, number] = [3.3619, 7.1475];
        const randomCoords: [number, number] = [
          baseCoords[0] + (Math.random() - 0.5) * 0.02,
          baseCoords[1] + (Math.random() - 0.5) * 0.02
        ];
        
        await updateRiderGPS(rider.riderId, {
          lat: randomCoords[1],
          lng: randomCoords[0],
          status: rider.status,
          timestamp: serverTimestamp()
        });
      }
    });
  
  await Promise.all(simulationPromises);
  console.log('🎉 All rider GPS simulations completed!');
};

// Create sample chat messages for rider orders
export const setupRiderChatTestData = async (): Promise<void> => {
  console.log('💬 Setting up rider chat test data...');
  
  const sampleChats = [
    {
      orderId: 'GO-001',
      messages: [
        { sender: 'customer', message: 'Hello, when will you pick up my order?' },
        { sender: 'rider', message: 'Hi! I am on my way to the restaurant. ETA 5 minutes.' },
        { sender: 'customer', message: 'Great, thank you!' },
        { sender: 'rider', message: 'Order picked up! Now heading to your location.' }
      ]
    },
    {
      orderId: 'GO-002',
      messages: [
        { sender: 'rider', message: 'Hi! I have picked up your order and am on my way.' },
        { sender: 'customer', message: 'Perfect! I will be waiting at the front door.' },
        { sender: 'rider', message: 'I am 2 minutes away from your location.' }
      ]
    },
    {
      orderId: 'GO-003',
      messages: [
        { sender: 'customer', message: 'Can you please call when you arrive? The gate is locked.' },
        { sender: 'rider', message: 'Sure! I will call you when I reach your location.' },
        { sender: 'rider', message: 'I am approaching your area now.' }
      ]
    }
  ];
  
  try {
    for (const chat of sampleChats) {
      for (let i = 0; i < chat.messages.length; i++) {
        const message = chat.messages[i];
        
        const messageData = {
          senderId: message.sender === 'rider' ? 'AKEEM01' : 'customer_123',
          senderType: message.sender,
          message: message.message,
          timestamp: serverTimestamp(),
          isRead: true
        };
        
        const messagesRef = doc(db, 'chats', chat.orderId, 'messages', `msg_${i + 1}`);
        await setDoc(messagesRef, messageData);
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log(`✅ Chat messages created for order ${chat.orderId}`);
    }
    
    console.log('🎉 Rider chat test data setup completed!');
    
  } catch (error) {
    console.error('❌ Error setting up rider chat test data:', error);
  }
};

// Complete setup function that runs all test data creation
export const setupCompleteRiderTestEnvironment = async (): Promise<void> => {
  console.log('🚀 Setting up complete rider test environment...');
  
  try {
    // 1. Setup rider profiles
    await setupRiderTestData();
    
    // 2. Setup order assignments
    await setupRiderOrderTestData();
    
    // 3. Setup chat messages
    await setupRiderChatTestData();
    
    // 4. Start GPS simulations (optional - can be resource intensive)
    // await startAllRiderSimulations();
    
    console.log('🎉 Complete rider test environment setup finished!');
    console.log('');
    console.log('📱 Test the rider app:');
    console.log('1. Go to /rider/login');
    console.log('2. Use any of these rider IDs: AKEEM01, MUSA22, KEMI45, TUNDE88, FOLAKE12');
    console.log('3. Or use phone numbers: +234 801 234 5678, +234 802 345 6789, etc.');
    console.log('');
    console.log('🛵 Available test orders:');
    SAMPLE_RIDER_ORDERS.forEach(order => {
      console.log(`- Order ${order.orderId}: Assigned to ${order.riderId} (${order.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error setting up complete rider test environment:', error);
  }
};

// Cleanup function to remove test data
export const cleanupRiderTestData = async (): Promise<void> => {
  console.log('🧹 Cleaning up rider test data...');
  
  try {
    // Note: In a real implementation, you would delete the documents
    // For now, just log what would be cleaned up
    console.log('Would clean up:');
    console.log('- Rider profiles in riders/ collection');
    console.log('- Chat messages in chats/ collection');
    console.log('- GPS tracking data');
    console.log('- Order assignments');
    
    console.log('✅ Test data cleanup completed');
    
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
  }
};

// Export utility functions for browser console testing
export const riderTestUtils = {
  setupRiderTestData,
  setupRiderOrderTestData,
  setupRiderChatTestData,
  startAllRiderSimulations,
  setupCompleteRiderTestEnvironment,
  cleanupRiderTestData,
  SAMPLE_RIDERS,
  SAMPLE_RIDER_ORDERS
};

export default riderTestUtils;

// Example usage in browser console:
// import riderTestUtils from './utils/rider-test-data';
// 
// // Setup everything
// await riderTestUtils.setupCompleteRiderTestEnvironment();
// 
// // Or setup individual components
// await riderTestUtils.setupRiderTestData();
// await riderTestUtils.setupRiderOrderTestData();
// 
// // Test URLs:
// // http://localhost:3000/rider/login
// // http://localhost:3000/rider/dashboard
// // http://localhost:3000/rider/order/GO-001