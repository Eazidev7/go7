// Go7 Demo Data Loader - Creates test orders for rider dashboard testing
// Run this script to populate Firestore with sample delivery data

import { db } from '../firebase/config.js';
import { collection, doc, setDoc } from 'firebase/firestore';

// Sample orders for testing rider dashboard
const sampleOrders = [
  {
    id: 'GO7-001',
    riderId: 'RIDER001',
    status: 'assigned',
    pickup: 'KFC Ikeja Mall',
    drop: '15 Allen Avenue, Ikeja',
    customer: {
      name: 'John Adebayo',
      phone: '+234 803 123 4567',
      address: '15 Allen Avenue, Ikeja, Lagos',
      notes: 'Please call when you arrive. Gate is red.'
    },
    restaurant: {
      name: 'KFC Ikeja Mall',
      address: 'Shop L25, Ikeja City Mall, Alausa, Ikeja'
    },
    items: [
      { name: 'Zinger Burger Combo', quantity: 2, price: 3500 },
      { name: 'Hot Wings (6pcs)', quantity: 1, price: 2200 },
      { name: 'Pepsi 50cl', quantity: 2, price: 600 }
    ],
    totalAmount: 6300,
    createdAt: Date.now() - (30 * 60 * 1000), // 30 minutes ago
    updatedAt: Date.now() - (30 * 60 * 1000)
  },
  {
    id: 'GO7-002', 
    riderId: 'RIDER001',
    status: 'picked_up',
    pickup: 'Dominos Pizza VI',
    drop: '42 Kingsway Road, Ikoyi',
    customer: {
      name: 'Sarah Ibrahim',
      phone: '+234 901 567 8901',
      address: '42 Kingsway Road, Ikoyi, Lagos',
      notes: 'Office building, ask for Sarah at reception'
    },
    restaurant: {
      name: 'Dominos Pizza Victoria Island',
      address: '268A Ajose Adeogun Street, Victoria Island'
    },
    items: [
      { name: 'Large Pepperoni Pizza', quantity: 1, price: 5500 },
      { name: 'Chicken Wings', quantity: 1, price: 3200 }
    ],
    totalAmount: 8700,
    createdAt: Date.now() - (45 * 60 * 1000), // 45 minutes ago
    picked_upAt: Date.now() - (10 * 60 * 1000), // 10 minutes ago
    updatedAt: Date.now() - (10 * 60 * 1000)
  },
  {
    id: 'GO7-003',
    riderId: 'RIDER001',
    status: 'delivering',
    pickup: 'Chicken Republic Surulere',
    drop: '8 Randle Avenue, Surulere',
    customer: {
      name: 'Michael Okafor',
      phone: '+234 802 345 6789',
      address: '8 Randle Avenue, Surulere, Lagos'
    },
    restaurant: {
      name: 'Chicken Republic Surulere',
      address: '45 Adeniran Ogunsanya Street, Surulere'
    },
    items: [
      { name: 'Refuel Max', quantity: 1, price: 2800 },
      { name: 'Chicken Strips', quantity: 1, price: 1500 }
    ],
    totalAmount: 4300,
    createdAt: Date.now() - (60 * 60 * 1000), // 1 hour ago
    picked_upAt: Date.now() - (25 * 60 * 1000), // 25 minutes ago
    deliveringAt: Date.now() - (5 * 60 * 1000), // 5 minutes ago
    updatedAt: Date.now() - (5 * 60 * 1000)
  },
  {
    id: 'GO7-004',
    riderId: 'RIDER001',
    status: 'delivered',
    pickup: 'Mr. Biggs Yaba',
    drop: '23 Herbert Macaulay Way, Yaba',
    customer: {
      name: 'Fatima Hassan',
      phone: '+234 708 901 2345',
      address: '23 Herbert Macaulay Way, Yaba, Lagos'
    },
    restaurant: {
      name: 'Mr. Biggs Yaba',
      address: '12 Commercial Avenue, Yaba'
    },
    items: [
      { name: 'Meat Pie', quantity: 3, price: 1200 },
      { name: 'Chicken & Chips', quantity: 1, price: 2500 }
    ],
    totalAmount: 3700,
    createdAt: Date.now() - (90 * 60 * 1000), // 1.5 hours ago
    picked_upAt: Date.now() - (70 * 60 * 1000),
    deliveringAt: Date.now() - (50 * 60 * 1000),
    deliveredAt: Date.now() - (35 * 60 * 1000), // 35 minutes ago
    updatedAt: Date.now() - (35 * 60 * 1000)
  },
  {
    id: 'GO7-005',
    riderId: 'RIDER001',
    status: 'delivered',
    pickup: 'Sharwarma Plus Lekki',
    drop: 'Lekki Phase 1 Estate',
    customer: {
      name: 'David Ogundimu',
      phone: '+234 815 432 1098',
      address: 'Block 15, Flat 8, Lekki Phase 1, Lagos'
    },
    restaurant: {
      name: 'Sharwarma Plus',
      address: 'Plot 15, Admiralty Way, Lekki Phase 1'
    },
    items: [
      { name: 'Chicken Sharwarma', quantity: 2, price: 3000 },
      { name: 'Turkish Delight', quantity: 1, price: 1800 }
    ],
    totalAmount: 4800,
    createdAt: Date.now() - (120 * 60 * 1000), // 2 hours ago
    picked_upAt: Date.now() - (105 * 60 * 1000),
    deliveringAt: Date.now() - (85 * 60 * 1000),
    deliveredAt: Date.now() - (70 * 60 * 1000), // 70 minutes ago
    updatedAt: Date.now() - (70 * 60 * 1000)
  }
];

// Function to load demo data
export const loadDemoData = async () => {
  try {
    console.log('🚀 Loading Go7 demo data...');
    
    const promises = sampleOrders.map(async (order) => {
      const docRef = doc(db, 'orders', order.id);
      await setDoc(docRef, order);
      console.log(`✅ Created order ${order.id}`);
    });
    
    await Promise.all(promises);
    
    console.log('🎉 Demo data loaded successfully!');
    console.log(`📦 Created ${sampleOrders.length} sample orders for RIDER001`);
    
    return {
      success: true,
      ordersCreated: sampleOrders.length,
      riderId: 'RIDER001'
    };
    
  } catch (error) {
    console.error('❌ Error loading demo data:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Auto-load demo data for development
if (import.meta.env.DEV) {
  // Uncomment the line below to auto-load demo data on import
  // loadDemoData();
}

export default { loadDemoData, sampleOrders };