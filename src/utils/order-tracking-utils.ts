// Firestore Database Structure for Go7 Order Tracking

import { db } from '../lib/firebase';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// TypeScript interfaces for data structures
interface Order {
  orderId: string;
  customerId: string;
  riderId: string;
  pickup: [number, number];
  dropoff: [number, number];
  fee: string;
  status: 'accepted' | 'picked_up' | 'en_route' | 'delivered';
  customerName: string;
  customerPhone: string;
  items: string[];
  estimatedDeliveryTime?: string;
}



// Create a test order in Firestore
export const createTestOrder = async (orderData: Omit<Order, 'timestamp'>): Promise<boolean> => {
  try {
    const orderDocRef = doc(db, 'orders', orderData.orderId);
    
    await setDoc(orderDocRef, {
      ...orderData,
      timestamp: serverTimestamp()
    });
    
    console.log(`✅ Test order created: ${orderData.orderId}`);
    return true;
  } catch (error) {
    console.error('❌ Error creating test order:', error);
    return false;
  }
};

// Update order status
export const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<boolean> => {
  try {
    const orderDocRef = doc(db, 'orders', orderId);
    
    await setDoc(orderDocRef, {
      status,
      timestamp: serverTimestamp()
    }, { merge: true });
    
    console.log(`✅ Order status updated: ${orderId} -> ${status}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    return false;
  }
};

// This file defines the expected document structures in Firestore

/*
Collection: orders
Document ID: {orderId} (e.g., "GO7-001", "GO7-002")

Order Document Structure:
{
  "orderId": "GO-001",
  "customerId": "customer123",
  "customerName": "John Doe",
  "customerPhone": "+234-901-234-5678",
  "riderId": "AKEEM01",
  "pickup": [3.3619, 7.1475],         // [longitude, latitude]
  "dropoff": [3.3700, 7.1530],        // [longitude, latitude]
  "fee": "₦1450",
  "status": "en_route",               // accepted | picked_up | en_route | delivered
  "items": ["Jollof Rice", "Chicken", "Plantain"],
  "timestamp": [Firestore ServerTimestamp],
  "estimatedDeliveryTime": "2025-09-30T14:30:00Z",
  "totalAmount": "₦3500",
  "paymentMethod": "card",
  "specialInstructions": "Ring doorbell twice"
}

Collection: chats/{orderId}/messages
Document ID: auto-generated

Chat Message Document Structure:
{
  "senderId": "customer123" | "AKEEM01" | "support",
  "senderType": "customer" | "rider" | "support",
  "message": "Where are you now?",
  "timestamp": [Firestore ServerTimestamp],
  "isRead": false
}

Collection: riders
Document ID: {riderId} (e.g., "AKEEM01")

Rider Document Structure (for GPS tracking):
{
  "lat": 7.1500,
  "lng": 3.3660,
  "status": "en_route",
  "timestamp": [Firestore ServerTimestamp],
  "riderId": "AKEEM01",
  "currentOrderId": "GO-001"
}
*/

// Utility function to create a sample order for testing
export const createSampleOrder = async (orderId: string) => {
  try {
    const orderData = {
      orderId,
      customerId: 'customer123',
      customerName: 'John Doe',
      customerPhone: '+234-901-234-5678',
      riderId: 'AKEEM01',
      pickup: [3.3619, 7.1475] as [number, number],
      dropoff: [3.3700, 7.1530] as [number, number],
      fee: '₦1450',
      status: 'accepted' as const,
      items: ['Jollof Rice', 'Grilled Chicken', 'Plantain', 'Coke'],
      timestamp: serverTimestamp(),
      estimatedDeliveryTime: '2025-09-30T14:30:00Z',
      totalAmount: '₦3500',
      paymentMethod: 'card',
      specialInstructions: 'Ring doorbell twice'
    };

    const orderDocRef = doc(db, 'orders', orderId);
    await setDoc(orderDocRef, orderData);
    
    console.log(`✅ Sample order created: ${orderId}`);
    return true;
  } catch (error) {
    console.error('❌ Error creating sample order:', error);
    return false;
  }
};

// Utility function to send a test chat message
export const sendTestMessage = async (
  orderId: string,
  senderId: string,
  senderType: 'customer' | 'rider' | 'support',
  message: string
) => {
  try {
    const messageData = {
      senderId,
      senderType,
      message,
      timestamp: serverTimestamp(),
      isRead: false
    };

    const chatRef = collection(db, 'chats', orderId, 'messages');
    await addDoc(chatRef, messageData);
    
    console.log(`✅ Test message sent to order ${orderId}: ${message}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending test message:', error);
    return false;
  }
};

// Simulate a complete order journey for testing
export const simulateOrderJourney = async (orderId: string) => {
  console.log(`🚀 Starting order journey simulation for: ${orderId}`);
  
  try {
    // Create sample order
    await createSampleOrder(orderId);
    
    // Send initial messages
    await sendTestMessage(orderId, 'AKEEM01', 'rider', 'I have received your order! Heading to the restaurant now.');
    
    // Simulate status progression
    setTimeout(async () => {
      await updateOrderStatus(orderId, 'picked_up');
      await sendTestMessage(orderId, 'AKEEM01', 'rider', 'Order picked up! On my way to you now 🛵');
    }, 3000);
    
    setTimeout(async () => {
      await updateOrderStatus(orderId, 'en_route');
      await sendTestMessage(orderId, 'AKEEM01', 'rider', 'Almost there! ETA 5 minutes');
    }, 8000);
    
    setTimeout(async () => {
      await updateOrderStatus(orderId, 'delivered');
      await sendTestMessage(orderId, 'AKEEM01', 'rider', 'Order delivered successfully! Thank you for choosing Go7! 🎉');
    }, 15000);
    
    console.log(`✅ Order journey simulation completed for: ${orderId}`);
  } catch (error) {
    console.error('❌ Error during order journey simulation:', error);
  }
};

// Pre-defined sample orders for testing with complete data
export const SAMPLE_ORDERS = [
  {
    orderId: 'GO-001',
    customerId: 'customer_123',
    riderId: 'AKEEM01',
    pickup: [3.3619, 7.1475] as [number, number], // Central Abeokuta
    dropoff: [3.3700, 7.1530] as [number, number], // Delivery location
    fee: '₦1450',
    status: 'accepted' as const,
    customerName: 'John Adebayo',
    customerPhone: '+234 901 234 5678',
    items: ['Jollof Rice', 'Grilled Chicken', 'Coca Cola'],
    estimatedDeliveryTime: '25-30 minutes'
  },
  {
    orderId: 'GO-002',
    customerId: 'customer_456',
    riderId: 'MUSA22',
    pickup: [3.3580, 7.1450] as [number, number], // University area
    dropoff: [3.3650, 7.1500] as [number, number], // Student residence
    fee: '₦1200',
    status: 'picked_up' as const,
    customerName: 'Fatima Ibrahim',
    customerPhone: '+234 802 345 6789',
    items: ['Amala & Ewedu', 'Assorted Meat', 'Fanta'],
    estimatedDeliveryTime: '20-25 minutes'
  },
  {
    orderId: 'GO-003',
    customerId: 'customer_789',
    riderId: 'KEMI45',
    pickup: [3.3480, 7.1600] as [number, number], // Near Olumo Rock
    dropoff: [3.3550, 7.1550] as [number, number], // Residential area
    fee: '₦1600',
    status: 'en_route' as const,
    customerName: 'David Ogundimu',
    customerPhone: '+234 703 456 7890',
    items: ['Pounded Yam', 'Egusi Soup', 'Fish', 'Malt'],
    estimatedDeliveryTime: '15-20 minutes'
  },
  {
    orderId: 'GO-004',
    customerId: 'customer_101',
    riderId: 'BOLA88',
    pickup: [3.3600, 7.1400] as [number, number], // Business district
    dropoff: [3.3720, 7.1520] as [number, number], // Office complex
    fee: '₦1800',
    status: 'delivered' as const,
    customerName: 'Sarah Adeyemi',
    customerPhone: '+234 809 567 8901',
    items: ['Ofada Rice', 'Ayamase Stew', 'Plantain', 'Water'],
    estimatedDeliveryTime: 'Delivered'
  }
];

// Create all sample orders and setup test data
export const setupAllTestData = async (): Promise<void> => {
  console.log('🚀 Setting up all test data for order tracking...');
  
  try {
    // Create sample orders
    for (const orderData of SAMPLE_ORDERS) {
      await createTestOrder(orderData);
      
      // Add sample chat messages
      await createSampleChatMessages(orderData.orderId);
      
      // Small delay between orders
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('🎉 All test data setup completed!');
    console.log('📋 Test Orders Available:');
    SAMPLE_ORDERS.forEach(order => {
      console.log(`- ${order.orderId}: ${order.customerName} (${order.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error setting up test data:', error);
  }
};

// Create sample chat messages for an order
const createSampleChatMessages = async (orderId: string): Promise<void> => {
  const sampleMessages = [
    {
      senderId: 'rider',
      senderType: 'rider' as const,
      message: 'Hello! I\'ve accepted your order and I\'m heading to the restaurant now.',
      isRead: false
    },
    {
      senderId: 'customer',
      senderType: 'customer' as const,
      message: 'Great! How long will it take?',
      isRead: true
    },
    {
      senderId: 'rider',
      senderType: 'rider' as const,
      message: 'About 25-30 minutes total. I\'ll update you when I pick up your order!',
      isRead: false
    }
  ];

  const chatRef = collection(db, 'chats', orderId, 'messages');
  
  for (const message of sampleMessages) {
    await addDoc(chatRef, {
      ...message,
      timestamp: serverTimestamp()
    });
  }
};

// Simulate order progression for testing
export const simulateOrderProgression = async (orderId: string): Promise<void> => {
  console.log(`🎬 Starting order progression simulation for: ${orderId}`);
  
  const statuses = ['accepted', 'picked_up', 'en_route', 'delivered'] as const;
  
  for (let i = 0; i < statuses.length; i++) {
    await updateOrderStatus(orderId, statuses[i]);
    
    // Add a chat message for each status change
    const chatRef = collection(db, 'chats', orderId, 'messages');
    const statusMessages = {
      accepted: '✅ Your order has been accepted! Preparing now...',
      picked_up: '📦 Order picked up! On my way to deliver it.',
      en_route: '🛵 Almost there! ETA 5-10 minutes.',
      delivered: '🎉 Order delivered! Enjoy your meal!'
    };
    
    await addDoc(chatRef, {
      senderId: 'rider_sim',
      senderType: 'rider',
      message: statusMessages[statuses[i]],
      timestamp: serverTimestamp(),
      isRead: false
    });
    
    if (i < statuses.length - 1) {
      // Wait 10 seconds between status changes
      console.log(`⏳ Status: ${statuses[i]} -> Waiting 10 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log(`✅ Order progression simulation completed for: ${orderId}`);
};

// Example usage in browser console:
// import { setupAllTestData, simulateOrderProgression } from './utils/order-tracking-utils';
// 
// // Setup all test data
// await setupAllTestData();
// 
// // Test a specific order progression
// await simulateOrderProgression('GO-001');
// 
// // Test URLs:
// // http://localhost:3000/track/GO-001
// // http://localhost:3000/track/GO-002
// // http://localhost:3000/track/GO-003
// // http://localhost:3000/track/GO-004