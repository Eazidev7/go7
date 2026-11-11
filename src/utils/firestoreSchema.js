// Firestore Document Structure for Go7 Real-time Delivery Tracking

/**
 * Collection: deliveries/{deliveryId}
 * 
 * This document structure supports real-time tracking, notifications,
 * and seamless integration with rider and customer apps.
 */

const deliveryDocumentSchema = {
  // Delivery identification
  deliveryId: "delivery_123456789", // Unique delivery identifier
  orderId: "order_987654321", // Related order ID from orders collection
  
  // Customer information
  customer: {
    uid: "user_abc123", // Firebase Auth UID
    name: "John Doe",
    email: "john@example.com", 
    phone: "+2348012345678",
    fcmToken: "fcm_token_for_push_notifications" // For push notifications
  },

  // Rider information (assigned when status becomes 'assigned')
  rider: {
    uid: "rider_xyz789", // Firebase Auth UID for rider
    name: "Ahmed Hassan",
    phone: "+2348087654321",
    photo: "https://go7-assets.com/riders/ahmed.jpg",
    rating: 4.9,
    vehicle: "Honda CG 125", // Vehicle details
    plateNumber: "ABC-123-XY",
    fcmToken: "rider_fcm_token"
  },

  // Location details
  pickup: {
    address: "123 Victoria Island, Lagos",
    latitude: 6.4281,
    longitude: 3.4219,
    instructions: "Blue gate beside GTBank", // Special pickup instructions
    contactName: "Restaurant Manager",
    contactPhone: "+2348011111111"
  },

  dropoff: {
    address: "456 Lekki Phase 1, Lagos", 
    latitude: 6.4474,
    longitude: 3.4553,
    instructions: "Apartment 4B, ring doorbell twice", // Delivery instructions
    contactName: "John Doe", // Usually same as customer
    contactPhone: "+2348012345678"
  },

  // Real-time rider location (updated every 3-5 seconds)
  riderLocation: {
    latitude: 6.4320,
    longitude: 3.4301,
    accuracy: 5.2, // GPS accuracy in meters
    speed: 25, // Speed in km/h
    heading: 180, // Direction in degrees (0-360)
    timestamp: 1699027200000 // Unix timestamp of location update
  },

  // Route information (calculated when delivery is assigned)
  route: [
    { latitude: 6.4281, longitude: 3.4219 }, // Starting point (pickup)
    { latitude: 6.4290, longitude: 3.4225 }, // Waypoint 1
    { latitude: 6.4350, longitude: 3.4280 }, // Waypoint 2
    { latitude: 6.4400, longitude: 3.4400 }, // Waypoint 3
    { latitude: 6.4474, longitude: 3.4553 }  // End point (dropoff)
  ],

  // Delivery status tracking
  status: "en_route", // requested → assigned → en_route → picked_up → delivered → cancelled
  
  // Status timeline for progress tracking
  statusHistory: [
    {
      status: "requested",
      timestamp: "2023-11-03T10:00:00Z",
      note: "Order placed by customer"
    },
    {
      status: "assigned", 
      timestamp: "2023-11-03T10:05:00Z",
      note: "Rider Ahmed assigned to delivery",
      riderId: "rider_xyz789"
    },
    {
      status: "en_route",
      timestamp: "2023-11-03T10:10:00Z", 
      note: "Rider heading to pickup location"
    }
    // Will continue to add picked_up, delivered, etc.
  ],

  // Timing information
  createdAt: "2023-11-03T10:00:00Z", // When delivery was requested
  assignedAt: "2023-11-03T10:05:00Z", // When rider was assigned
  pickedUpAt: null, // Will be set when status becomes picked_up
  deliveredAt: null, // Will be set when status becomes delivered
  eta: "2023-11-03T11:00:00Z", // Estimated arrival time (calculated)
  lastUpdated: "2023-11-03T10:15:30Z", // Last time document was updated

  // Payment and pricing
  pricing: {
    deliveryFee: 1500, // In kobo (₦15.00)
    distance: 5.2, // Distance in kilometers
    estimatedDuration: 25, // Estimated time in minutes
    currency: "NGN"
  },

  // Package/order details
  package: {
    description: "Food delivery from KFC",
    weight: "1-2kg",
    dimensions: "Small bag",
    value: 5000, // Package value in kobo (₦50.00)
    fragile: false,
    instructions: "Handle with care, contains drinks"
  },

  // Additional metadata
  metadata: {
    platform: "web", // web, android, ios
    version: "1.0.0", // App version
    sessionId: "session_abc123",
    source: "restaurant_app", // Where delivery was initiated
    promotions: ["FREE_DELIVERY"], // Applied promo codes
    paymentMethod: "paystack", // Payment method used
    paymentStatus: "paid" // paid, pending, failed
  },

  // Notification tracking
  notifications: {
    smsEnabled: true,
    emailEnabled: true, 
    pushEnabled: true,
    lastSentStatus: "assigned", // Last status for which notification was sent
    sentCount: 2 // Total notifications sent for this delivery
  },

  // Quality and feedback
  feedback: {
    rating: null, // Customer rating (1-5) - set after delivery
    comment: null, // Customer feedback comment
    riderRating: null, // Customer rating for rider
    issues: [], // Any reported issues during delivery
    completedAt: null // When feedback was submitted
  }
};

/**
 * Collection: notifications/{deliveryId}
 * Sub-collection: logs/{logId}
 * 
 * Stores notification history for debugging and analytics
 */
const notificationLogSchema = {
  type: "status_change", // status_change, reminder, promotion
  deliveryId: "delivery_123456789",
  status: "picked_up", // The status that triggered notification
  channels: {
    sms: {
      sent: true,
      timestamp: "2023-11-03T10:20:00Z",
      provider: "termii",
      messageId: "msg_123456",
      cost: 50 // Cost in kobo
    },
    email: {
      sent: true,
      timestamp: "2023-11-03T10:20:01Z", 
      provider: "resend",
      messageId: "email_123456"
    },
    push: {
      sent: false,
      error: "Invalid FCM token",
      timestamp: "2023-11-03T10:20:02Z"
    }
  },
  success: true,
  totalCost: 50, // Total notification cost in kobo
  createdAt: "2023-11-03T10:20:00Z"
};

/**
 * Usage Examples:
 * 
 * 1. Create new delivery:
 * ```javascript
 * const deliveryRef = doc(db, 'deliveries', deliveryId);
 * await setDoc(deliveryRef, deliveryData);
 * ```
 * 
 * 2. Listen to delivery updates:
 * ```javascript
 * const unsubscribe = onSnapshot(deliveryRef, (doc) => {
 *   const delivery = doc.data();
 *   updateUI(delivery);
 * });
 * ```
 * 
 * 3. Update rider location:
 * ```javascript
 * await updateDoc(deliveryRef, {
 *   riderLocation: newLocation,
 *   lastUpdated: serverTimestamp()
 * });
 * ```
 * 
 * 4. Change delivery status:
 * ```javascript
 * await updateDoc(deliveryRef, {
 *   status: 'picked_up',
 *   pickedUpAt: serverTimestamp(),
 *   statusHistory: arrayUnion({
 *     status: 'picked_up',
 *     timestamp: new Date().toISOString(),
 *     note: 'Package collected from pickup location'
 *   })
 * });
 * ```
 */

export { deliveryDocumentSchema, notificationLogSchema };