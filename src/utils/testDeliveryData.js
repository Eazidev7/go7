// Test Delivery Data Generator for Go7 Real-time Tracking System
// Creates sample delivery documents in Firestore for testing

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js'; // Use existing Firebase instance

// ✅ FIXED: Use existing Firebase app instead of creating new one
// Removed duplicate Firebase initialization to prevent app/duplicate-app error

// Test delivery document with Lagos coordinates
const testDeliveryData = {
  // Delivery ID: delivery_test_001
  id: "delivery_test_001",
  
  // Customer Information
  customer: {
    uid: "customer_test_123",
    name: "Adebayo Johnson",
    email: "adebayo.johnson@gmail.com",
    phone: "+2348123456789",
    avatar: "https://ui-avatars.io/api/?name=Adebayo+Johnson&background=e61e25&color=fff"
  },
  
  // Rider Information
  rider: {
    uid: "rider_test_456",
    name: "Emeka Okafor",
    email: "emeka.rider@go7.app",
    phone: "+2348987654321",
    avatar: "https://ui-avatars.io/api/?name=Emeka+Okafor&background=10b981&color=fff",
    vehicleType: "motorcycle",
    plateNumber: "ABC-123-DE",
    rating: 4.8
  },
  
  // Package Details
  package: {
    type: "food_delivery",
    description: "Jollof Rice with Chicken from Mama's Kitchen",
    weight: "1.2kg",
    value: 3500,
    instructions: "Handle with care - contains soup",
    items: [
      {
        name: "Jollof Rice with Chicken",
        quantity: 1,
        price: 2500
      },
      {
        name: "Pepper Soup",
        quantity: 1,
        price: 1000
      }
    ]
  },
  
  // Pickup Location (Mama's Kitchen - Victoria Island)
  pickup: {
    address: "15 Ademola Street, Victoria Island, Lagos",
    coordinates: {
      latitude: 6.4269, 
      longitude: 3.4210
    },
    contactPerson: "Restaurant Manager",
    contactPhone: "+2348012345678",
    instructions: "Call when you arrive - ground floor"
  },
  
  // Dropoff Location (Customer's Office - Lekki)
  dropoff: {
    address: "45 Lekki-Epe Expressway, Lekki Phase 1, Lagos", 
    coordinates: {
      latitude: 6.4474,
      longitude: 3.4653
    },
    contactPerson: "Adebayo Johnson",
    contactPhone: "+2348123456789", 
    instructions: "Office complex - Tower B, 3rd floor"
  },
  
  // Current Rider Location (moving towards pickup)
  riderLocation: {
    latitude: 6.4250, // Slightly south of pickup
    longitude: 3.4180,
    timestamp: Date.now(),
    accuracy: 5, // GPS accuracy in meters
    heading: 45, // Direction in degrees (northeast towards pickup)
    speed: 25 // Speed in km/h
  },
  
  // Delivery Status and Timeline
  status: "rider_assigned", // Current status
  statusHistory: [
    {
      status: "order_placed",
      timestamp: Date.now() - 900000, // 15 minutes ago
      location: "pickup",
      message: "Order placed successfully"
    },
    {
      status: "rider_assigned", 
      timestamp: Date.now() - 600000, // 10 minutes ago
      location: "rider_location",
      message: "Rider Emeka has been assigned to your delivery"
    }
  ],
  
  // Timestamps
  createdAt: Date.now() - 900000, // 15 minutes ago
  estimatedPickupTime: Date.now() + 300000, // 5 minutes from now
  estimatedDeliveryTime: Date.now() + 1200000, // 20 minutes from now
  lastUpdated: Date.now(),
  
  // Pricing and Payment
  pricing: {
    subtotal: 3500,
    deliveryFee: 800,
    serviceFee: 200,
    total: 4500,
    currency: "NGN"
  },
  
  payment: {
    method: "wallet",
    status: "paid",
    transactionId: "txn_go7_test_001",
    paidAt: Date.now() - 900000
  },
  
  // Route Information (will be populated by Google Maps)
  route: {
    distance: "5.8 km",
    duration: "12 mins",
    polyline: "", // Will be filled by Google Maps Directions API
    trafficCondition: "moderate"
  },
  
  // Delivery Settings
  settings: {
    realTimeTracking: true,
    smsNotifications: true,
    emailNotifications: true,
    pushNotifications: true,
    shareLocation: true
  },
  
  // Metadata
  metadata: {
    source: "go7_mobile_app",
    version: "v3.0.0",
    testData: true,
    region: "lagos_nigeria"
  }
};

// Additional test delivery for different status
const testDeliveryData2 = {
  ...testDeliveryData,
  id: "delivery_test_002",
  status: "picked_up",
  statusHistory: [
    ...testDeliveryData.statusHistory,
    {
      status: "arrived_pickup",
      timestamp: Date.now() - 300000, // 5 minutes ago
      location: "pickup",
      message: "Rider has arrived at pickup location"
    },
    {
      status: "picked_up",
      timestamp: Date.now() - 180000, // 3 minutes ago
      location: "pickup", 
      message: "Package picked up successfully"
    }
  ],
  pickedUpAt: Date.now() - 180000,
  riderLocation: {
    latitude: 6.4350, // Moving towards dropoff
    longitude: 3.4350,
    timestamp: Date.now(),
    accuracy: 5,
    heading: 75, // Moving east towards Lekki
    speed: 35
  },
  estimatedDeliveryTime: Date.now() + 600000, // 10 minutes from now
};

// Function to create test delivery documents
export async function createTestDeliveries() {
  try {
    console.log('🚀 Creating test delivery documents...');
    
    // Create first test delivery
    const deliveryRef1 = doc(db, 'deliveries', testDeliveryData.id);
    await setDoc(deliveryRef1, {
      ...testDeliveryData,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });
    console.log('✅ Created test delivery 1:', testDeliveryData.id);
    
    // Create second test delivery  
    const deliveryRef2 = doc(db, 'deliveries', testDeliveryData2.id);
    await setDoc(deliveryRef2, {
      ...testDeliveryData2,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });
    console.log('✅ Created test delivery 2:', testDeliveryData2.id);
    
    console.log('🎉 Test deliveries created successfully!');
    console.log('📱 Test URLs:');
    console.log('- Delivery 1:', `http://172.20.10.5:9999/#/production-tracking/${testDeliveryData.id}`);
    console.log('- Delivery 2:', `http://172.20.10.5:9999/#/production-tracking/${testDeliveryData2.id}`);
    
    return {
      delivery1: testDeliveryData.id,
      delivery2: testDeliveryData2.id
    };
    
  } catch (error) {
    console.error('❌ Error creating test deliveries:', error);
    throw error;
  }
}

// Function to simulate rider movement
export async function simulateRiderMovement(deliveryId, targetLat, targetLng, steps = 20) {
  try {
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    const currentTime = Date.now();
    
    // Get current rider location from one of our test deliveries
    let currentLocation = testDeliveryData.riderLocation;
    if (deliveryId === testDeliveryData2.id) {
      currentLocation = testDeliveryData2.riderLocation;
    }
    
    const { latitude: startLat, longitude: startLng } = currentLocation;
    const latStep = (targetLat - startLat) / steps;
    const lngStep = (targetLng - startLng) / steps;
    
    console.log(`🏍️ Simulating rider movement for ${deliveryId}`);
    console.log(`📍 From: ${startLat}, ${startLng} → To: ${targetLat}, ${targetLng}`);
    
    for (let i = 1; i <= steps; i++) {
      const newLat = startLat + (latStep * i);
      const newLng = startLng + (lngStep * i);
      
      await setDoc(deliveryRef, {
        riderLocation: {
          latitude: newLat,
          longitude: newLng,
          timestamp: currentTime + (i * 2000), // 2 seconds per step
          accuracy: Math.random() * 5 + 3, // 3-8 meter accuracy
          heading: Math.atan2(lngStep, latStep) * 180 / Math.PI,
          speed: 30 + (Math.random() * 20) // 30-50 km/h
        },
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      console.log(`📍 Step ${i}/${steps}: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);
      
      // Wait 2 seconds between updates
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('✅ Rider movement simulation completed');
    
  } catch (error) {
    console.error('❌ Error simulating rider movement:', error);
    throw error;
  }
}

// Export test data for use in components
export { testDeliveryData, testDeliveryData2 };

// If running this file directly in browser console
if (typeof window !== 'undefined') {
  window.createTestDeliveries = createTestDeliveries;
  window.simulateRiderMovement = simulateRiderMovement;
  
  console.log('🧪 Test functions available:');
  console.log('- createTestDeliveries(): Create sample delivery documents');
  console.log('- simulateRiderMovement(deliveryId, lat, lng): Simulate rider movement');
  console.log('- Test delivery IDs: delivery_test_001, delivery_test_002');
}

/*
Usage Examples:

1. Create test deliveries:
```javascript
await createTestDeliveries();
```

2. Simulate rider movement to pickup location:
```javascript  
await simulateRiderMovement('delivery_test_001', 6.4269, 3.4210);
```

3. Simulate rider movement to dropoff location:
```javascript
await simulateRiderMovement('delivery_test_001', 6.4474, 3.4653);
```

4. Test tracking URLs:
- http://172.20.10.5:9999/#/production-tracking/delivery_test_001
- http://172.20.10.5:9999/#/production-tracking/delivery_test_002

Firebase Console:
- https://console.firebase.google.com/project/go7-delivery/firestore/data/deliveries
*/