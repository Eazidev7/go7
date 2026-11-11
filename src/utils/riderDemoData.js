// Go7 Demo Data Loader for Rider Dashboard Testing
// Creates sample orders in Firestore for development testing

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export const createDemoRiderOrders = async () => {
  try {
    console.log('🚀 Creating demo rider orders...');

    const demoOrders = [
      {
        riderId: "RIDER001",
        status: "assigned",
        restaurantName: "Pizza Palace",
        customerName: "John Smith",
        pickup: "123 Main St, Downtown",
        dropoff: "456 Oak Ave, Midtown", 
        total: "24.99",
        items: [
          { name: "Large Pepperoni Pizza", quantity: 1, price: "18.99" },
          { name: "Garlic Bread", quantity: 1, price: "4.99" },
          { name: "Soda", quantity: 1, price: "1.99" }
        ],
        customerPhone: "+1234567890",
        createdAt: serverTimestamp(),
        estimatedDeliveryTime: 30
      },
      {
        riderId: "RIDER001", 
        status: "picked_up",
        restaurantName: "Burger Junction",
        customerName: "Sarah Johnson",
        pickup: "789 Food Court, Mall Plaza",
        dropoff: "321 Pine St, Northside",
        total: "18.50",
        items: [
          { name: "Cheeseburger Combo", quantity: 1, price: "12.99" },
          { name: "Onion Rings", quantity: 1, price: "5.50" }
        ],
        customerPhone: "+1987654321",
        createdAt: serverTimestamp(),
        picked_upAt: serverTimestamp(),
        estimatedDeliveryTime: 20
      },
      {
        riderId: "RIDER001",
        status: "delivering", 
        restaurantName: "Sushi Express",
        customerName: "Mike Chen",
        pickup: "555 Asian Plaza, Chinatown",
        dropoff: "888 Business District, Suite 201",
        total: "32.75",
        items: [
          { name: "California Roll", quantity: 2, price: "8.99" },
          { name: "Salmon Teriyaki", quantity: 1, price: "14.99" }
        ],
        customerPhone: "+1122334455",
        createdAt: serverTimestamp(),
        picked_upAt: serverTimestamp(), 
        deliveringAt: serverTimestamp(),
        estimatedDeliveryTime: 15
      },
      {
        riderId: "RIDER001",
        status: "delivered",
        restaurantName: "Taco Fiesta", 
        customerName: "Lisa Garcia",
        pickup: "111 Mexican Ave, Southside",
        dropoff: "999 Residential St, Westend",
        total: "16.25",
        items: [
          { name: "Chicken Tacos", quantity: 3, price: "9.99" },
          { name: "Guacamole", quantity: 1, price: "3.99" },
          { name: "Chips & Salsa", quantity: 1, price: "2.25" }
        ],
        customerPhone: "+1555666777",
        createdAt: serverTimestamp(),
        picked_upAt: serverTimestamp(),
        deliveringAt: serverTimestamp(),
        deliveredAt: serverTimestamp(),
        completedAt: serverTimestamp(),
        estimatedDeliveryTime: 25
      }
    ];

    const results = [];
    for (const order of demoOrders) {
      const docRef = await addDoc(collection(db, 'orders'), order);
      results.push(docRef.id);
      console.log('✅ Created order:', docRef.id);
    }

    console.log(`🎯 Successfully created ${results.length} demo orders for RIDER001`);
    return {
      success: true,
      orderIds: results,
      count: results.length
    };

  } catch (error) {
    console.error('❌ Error creating demo orders:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const createDemoOrder = async (riderId = "RIDER001", status = "assigned") => {
  try {
    const demoOrder = {
      riderId,
      status,
      restaurantName: "Demo Restaurant",
      customerName: "Test Customer",
      pickup: "123 Demo Street, Test City",
      dropoff: "456 Customer Ave, Delivery Town",
      total: "19.99",
      items: [
        { name: "Demo Item", quantity: 1, price: "19.99" }
      ],
      customerPhone: "+1234567890",
      createdAt: serverTimestamp(),
      estimatedDeliveryTime: 25
    };

    // Add status-specific timestamps
    if (status !== "assigned") {
      demoOrder.picked_upAt = serverTimestamp();
    }
    if (status === "delivering" || status === "delivered") {
      demoOrder.deliveringAt = serverTimestamp();
    }
    if (status === "delivered") {
      demoOrder.deliveredAt = serverTimestamp();
      demoOrder.completedAt = serverTimestamp();
    }

    const docRef = await addDoc(collection(db, 'orders'), demoOrder);
    console.log('✅ Created single demo order:', docRef.id);

    return {
      success: true,
      orderId: docRef.id
    };
  } catch (error) {
    console.error('❌ Error creating demo order:', error);
    return {
      success: false,
      error: error.message  
    };
  }
};