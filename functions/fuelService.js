/**
 * GO7 Fuel & CNG Delivery Service
 * Handles fuel order creation, processing, and rider assignment
 */

const functions = require('firebase-functions/v1');
const admin = require('./adminInit');
const { db } = admin;
const { validateCoordinates } = require('./deliveryFeeService');

// Fuel pricing configuration (can be moved to Firestore for dynamic pricing)
const FUEL_PRICING = {
  petrol: { pricePerLitre: 1200, name: 'Petrol' },
  diesel: { pricePerLitre: 1600, name: 'Diesel' },
  cng: { pricePerKg: 1400, name: 'CNG' }
};

// Fuel delivery pricing (distance-based)
const FUEL_DELIVERY_BASE_FEE = 1000; // Base fee
const FUEL_DELIVERY_PER_KM = 250; // ₦250 per km
const FUEL_PLATFORM_FEE_RATE = 0.15; // 15% platform fee
const MAX_FUEL_DELIVERY_KM = 20; // Max 20km delivery radius

/**
 * Calculate volume from amount and fuel type
 */
function calculateVolume(amount, fuelType) {
  const pricing = FUEL_PRICING[fuelType];
  if (!pricing) return 0;

  const pricePerUnit = fuelType === 'cng' ? pricing.pricePerKg : pricing.pricePerLitre;
  // Fuel is sold in whole litres/kg; the remainder (change) is credited to the wallet.
  return Math.floor(amount / pricePerUnit);
}

/**
 * Calculate fuel delivery fee based on distance.
 * Fuel and CNG deliveries are always round trips: the rider must go to the
 * station, fill up, and return the fuel/cylinder to the customer. The delivery
 * fee is therefore charged on 2x the station-to-customer distance.
 */
function calculateFuelDeliveryFee(distanceKm, fuelType) {
  const isRoundTrip = true;
  const chargeableKm = distanceKm * 2;
  const distanceCharge = chargeableKm * FUEL_DELIVERY_PER_KM;
  const deliveryFee = FUEL_DELIVERY_BASE_FEE + distanceCharge;
  const platformFee = Math.round(deliveryFee * FUEL_PLATFORM_FEE_RATE);
  const totalDeliveryFee = deliveryFee + platformFee;

  return {
    baseFee: FUEL_DELIVERY_BASE_FEE,
    distanceCharge,
    distanceKm: chargeableKm,
    stationDistanceKm: distanceKm,
    isRoundTrip,
    platformFee,
    platformFeeRate: FUEL_PLATFORM_FEE_RATE,
    deliveryFee,
    totalDeliveryFee
  };
}

/**
 * Generate unique order reference
 */
function generateOrderRef() {
  return 'GF' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Generate a 6-digit delivery PIN (same format used across Go7 deliveries)
 */
function generateDeliveryPIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Internal bot-safe fuel order creation (same logic as the callable below).
 */
async function createFuelOrderInternal(data, uid) {
  const { fuelType, amount, deliveryLocation, paymentMethod } = data;

  // Validate input
  if (!fuelType || !FUEL_PRICING[fuelType]) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid fuel type');
  }

  if (!amount || amount < 1000) {
    throw new functions.https.HttpsError('invalid-argument', 'Minimum amount is ₦1,000');
  }

  try {
    validateCoordinates(deliveryLocation, 'delivery location');
  } catch (err) {
    throw new functions.https.HttpsError('invalid-argument', err.message);
  }

  if (!paymentMethod || !['wallet', 'card'].includes(paymentMethod)) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid payment method required');
  }

  // Find nearest available fuel station first (to calculate distance)
  const nearestStation = await findNearestFuelStation(deliveryLocation, fuelType);
  if (!nearestStation) {
    throw new functions.https.HttpsError('failed-precondition', 'No fuel stations available in your area');
  }

  // Calculate distance from station to customer
  const distanceKm = calculateDistance(
    nearestStation.location.lat,
    nearestStation.location.lng,
    deliveryLocation.lat,
    deliveryLocation.lng
  );

  // Check delivery radius
  if (distanceKm > MAX_FUEL_DELIVERY_KM) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Delivery not available beyond ${MAX_FUEL_DELIVERY_KM} km (your location is ${distanceKm.toFixed(1)} km from nearest station)`
    );
  }

  // Calculate volume (whole litres/kg), actual fuel cost, and wallet change
  const volume = calculateVolume(amount, fuelType);
  const pricing = FUEL_PRICING[fuelType];
  const pricePerUnit = fuelType === 'cng' ? pricing.pricePerKg : pricing.pricePerLitre;
  const fuelCost = volume * pricePerUnit;
  const change = amount - fuelCost; // remainder credited to the wallet
  const deliveryPricing = calculateFuelDeliveryFee(distanceKm, fuelType);
  const totalAmount = Math.round(fuelCost + deliveryPricing.totalDeliveryFee);
  const generatedOrderRef = generateOrderRef();
  const deliveryPIN = generateDeliveryPIN();

  // Check wallet balance if paying with wallet
  if (paymentMethod === 'wallet') {
    const walletDoc = await db.collection('wallets').doc(uid).get();
    const walletBalance = walletDoc.exists ? Number(walletDoc.data().balance) || 0 : 0;

    if (walletBalance < totalAmount) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Insufficient wallet balance. Required: ₦${totalAmount.toLocaleString()}, Available: ₦${walletBalance.toLocaleString()}`
      );
    }
  }

  // Create order in Firestore
  const orderData = {
    customerId: uid,
    stationId: nearestStation.id,
    stationName: nearestStation.name,
    stationAddress: nearestStation.location.address,

    // Order details
    fuelType,
    amount,
    volume,
    fuelCost,
    change,
    distanceKm,
    stationDistanceKm: deliveryPricing.stationDistanceKm,
    isRoundTrip: deliveryPricing.isRoundTrip,
    deliveryFee: deliveryPricing.deliveryFee,
    platformFee: deliveryPricing.platformFee,
    totalDeliveryFee: deliveryPricing.totalDeliveryFee,
    totalAmount,

    // Delivery pricing breakdown
    feeBreakdown: {
      fuelAmount: amount,
      baseFee: deliveryPricing.baseFee,
      distanceCharge: deliveryPricing.distanceCharge,
      distanceKm: deliveryPricing.distanceKm,
      stationDistanceKm: deliveryPricing.stationDistanceKm,
      isRoundTrip: deliveryPricing.isRoundTrip,
      platformFee: deliveryPricing.platformFee,
      platformFeeRate: deliveryPricing.platformFeeRate,
      deliveryFee: deliveryPricing.deliveryFee,
      totalDeliveryFee: deliveryPricing.totalDeliveryFee,
      totalAmount,
      calculatedAt: new Date().toISOString()
    },

    // Location
    deliveryLocation,
    stationLocation: {
      lat: nearestStation.location.lat,
      lng: nearestStation.location.lng,
      address: nearestStation.location.address
    },

    // Status
    status: 'pending',
    statusHistory: [
      { status: 'pending', timestamp: admin.firestore.FieldValue.serverTimestamp(), note: 'Order created' }
    ],

    // Payment
    paymentMethod,
    paymentStatus: 'pending',

    // Metadata
    orderRef: generatedOrderRef,
    deliveryPIN,
    customerPIN: deliveryPIN,
    deliveryPINVerified: false,
    orderType: 'fuel',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    // Fuel orders stay in the rider pool longer than standard 1-hour deliveries
    riderPoolExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 4 * 60 * 60 * 1000)
  };

  const fuelOrderRef = await db.collection('fuelOrders').add(orderData);
  const orderId = fuelOrderRef.id;

  // Process payment
  if (paymentMethod === 'wallet') {
    await processWalletPayment(uid, totalAmount, orderId, 'fuel_order');
  } else if (change > 0) {
    // Card payment: credit the fuel change to the wallet
    await creditWallet(uid, change, orderId, 'fuel_order_change');
  }

  // Create chat for this order
  await createFuelOrderChat(orderId, uid, nearestStation.id);

  // Notify available riders about the new fuel order
  await notifyAvailableRiders(orderId, orderData);

  return {
    success: true,
    orderId,
    orderRef: generatedOrderRef,
    deliveryPIN,
    totalAmount,
    deliveryPricing,
    estimatedDeliveryTime: '15-30 minutes'
  };
}

/**
 * Create a new fuel order
 */
exports.createFuelOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  return createFuelOrderInternal(data, context.auth.uid);
});

exports.createFuelOrderInternal = createFuelOrderInternal;
// Exported for audit/testability (not a pricing change).
exports.calculateVolume = calculateVolume;
exports.calculateFuelDeliveryFee = calculateFuelDeliveryFee;
exports.FUEL_PRICING = FUEL_PRICING;

/**
 * Find nearest available fuel station
 */
async function findNearestFuelStation(location, fuelType = 'petrol') {
  // Simple distance calculation - in production, use proper geospatial query
  const stationsSnapshot = await db.collection('fuelStations')
    .where('isActive', '==', true)
    .where(`fuelTypes.${fuelType}.available`, '==', true)
    .limit(10)
    .get();

  if (stationsSnapshot.empty) {
    // Return default station for demo
    return {
      id: 'default_station',
      name: 'Total Energies',
      location: { address: 'Itoku, Abeokuta' }
    };
  }

  // Find nearest by distance (simplified)
  let nearestStation = null;
  let minDistance = Infinity;

  stationsSnapshot.forEach(doc => {
    const station = doc.data();
    const distance = calculateDistance(
      location.lat,
      location.lng,
      station.location.lat,
      station.location.lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestStation = { id: doc.id, ...station };
    }
  });

  return nearestStation;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Process wallet payment
 */
async function processWalletPayment(uid, amount, orderId, description) {
  const walletRef = db.collection('wallets').doc(uid);
  const userRef = db.collection('users').doc(uid);

  await db.runTransaction(async (transaction) => {
    const walletDoc = await transaction.get(walletRef);
    const userDoc = await transaction.get(userRef);

    const currentBalance = walletDoc.exists ? Number(walletDoc.data().balance) || 0 : 0;
    const newBalance = currentBalance - amount;

    if (newBalance < 0) {
      throw new Error('Insufficient wallet balance');
    }

    transaction.set(walletRef, {
      balance: newBalance,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    transaction.set(userRef, {
      walletBalance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    transaction.set(walletRef.collection('transactions').doc(orderId), {
      type: 'debit',
      amount,
      description: `Fuel order ${orderId}`,
      previousBalance: currentBalance,
      newBalance,
      category: 'fuel_order',
      status: 'completed',
      source: 'fuel_order',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { orderId, description }
    });
  });

  // Update order payment status
  await db.collection('fuelOrders').doc(orderId).update({
    paymentStatus: 'paid',
    paidAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Credit wallet (used to return fuel change to the customer's Go7 wallet)
 */
async function creditWallet(uid, amount, orderId, description) {
  if (!amount || amount <= 0) return;

  const walletRef = db.collection('wallets').doc(uid);
  const userRef = db.collection('users').doc(uid);

  await db.runTransaction(async (transaction) => {
    const walletDoc = await transaction.get(walletRef);
    const userDoc = await transaction.get(userRef);

    const currentBalance = walletDoc.exists ? Number(walletDoc.data().balance) || 0 : 0;
    const newBalance = currentBalance + amount;

    transaction.set(walletRef, {
      balance: newBalance,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    transaction.set(userRef, {
      walletBalance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    transaction.set(walletRef.collection('transactions').doc(orderId), {
      type: 'credit',
      amount,
      description: `Fuel change refund ${orderId}`,
      previousBalance: currentBalance,
      newBalance,
      category: 'fuel_order_change',
      status: 'completed',
      source: 'fuel_order_change',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { orderId, description }
    });
  });
}

/**
 * Create chat for fuel order
 */
async function createFuelOrderChat(orderId, customerId, stationId) {
  const chatRef = db.collection('chats').doc(orderId);
  
  await chatRef.set({
    orderId,
    customerId,
    stationId,
    type: 'fuel_order',
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    participants: [customerId, stationId]
  });

  // Add system message
  const messagesRef = chatRef.collection('messages');
  await messagesRef.add({
    senderId: 'system',
    senderType: 'system',
    type: 'system',
    content: '🛢️ Fuel order created. Waiting for rider assignment...',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false
  });
}

/**
 * Update fuel order status
 */
exports.updateFuelOrderStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { orderId, status, note, riderId } = data;
  const uid = context.auth.uid;

  // Validate status
  const validStatuses = ['pending', 'confirmed', 'fuel_purchased', 'on_the_way', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid status');
  }

  try {
    const orderRef = db.collection('fuelOrders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found');
    }

    const orderData = orderDoc.data();

    // Update order status
    await orderRef.update({
      status,
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        note: note || '',
        updatedBy: uid
      }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(riderId && { riderId })
    });

    // Handle status-specific actions
    if (status === 'confirmed' && riderId) {
      await assignRiderToOrder(orderId, riderId, orderData.customerId);
    }

    if (status === 'fuel_purchased') {
      await sendFuelPurchaseNotification(orderId, orderData);
    }

    if (status === 'delivered') {
      await completeFuelOrder(orderId, orderData);
    }

    return { success: true, status };

  } catch (error) {
    console.error('Error updating fuel order status:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Assign rider to fuel order
 */
async function assignRiderToOrder(orderId, riderId, customerId) {
  // Update order with rider
  await db.collection('fuelOrders').doc(orderId).update({
    riderId,
    riderAssignedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Get rider details
  const riderDoc = await db.collection('riders').doc(riderId).get();
  const riderData = riderDoc.data();

  // Send chat notification
  const chatRef = db.collection('chats').doc(orderId);
  const messagesRef = chatRef.collection('messages');
  
  await messagesRef.add({
    senderId: 'system',
    senderType: 'system',
    type: 'rider_assignment',
    content: `🏍️ Rider assigned!\n\nRider: ${riderData?.name || 'GO7 Rider'}\nPhone: ${riderData?.phone || 'Contact support'}\n\nYour fuel order is being processed.`,
    metadata: {
      riderId,
      riderName: riderData?.name,
      riderPhone: riderData?.phone
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false
  });

  await chatRef.update({
    lastMessage: '🏍️ Rider assigned to your order',
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    riderId
  });
}

/**
 * Send fuel purchase notification
 */
async function sendFuelPurchaseNotification(orderId, orderData) {
  const chatRef = db.collection('chats').doc(orderId);
  const messagesRef = chatRef.collection('messages');
  
  await messagesRef.add({
    senderId: orderData.riderId || 'system',
    senderType: orderData.riderId ? 'rider' : 'system',
    type: 'fuel_purchase_confirmation',
    content: `✅ Fuel purchased at ${orderData.stationName}\n\n${orderData.fuelType.toUpperCase()}: ${orderData.volume.toFixed(1)} ${orderData.fuelType === 'cng' ? 'KG' : 'Litres'}\nAmount: ₦${orderData.amount.toLocaleString()}\n\nYour fuel is on the way! 🚗`,
    metadata: {
      fuelType: orderData.fuelType,
      amount: orderData.amount,
      volume: orderData.volume,
      stationName: orderData.stationName
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false
  });

  await chatRef.update({
    lastMessage: '✅ Fuel purchased - on the way!',
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Complete fuel order
 */
async function completeFuelOrder(orderId, orderData) {
  const chatRef = db.collection('chats').doc(orderId);
  const messagesRef = chatRef.collection('messages');
  
  await messagesRef.add({
    senderId: orderData.riderId || 'system',
    senderType: orderData.riderId ? 'rider' : 'system',
    type: 'fuel_delivery_confirmation',
    content: `🎉 Fuel delivered successfully!\n\n${orderData.fuelType.toUpperCase()}: ${orderData.volume.toFixed(1)} ${orderData.fuelType === 'cng' ? 'KG' : 'Litres'}\nLocation: ${orderData.deliveryLocation.address}\n\nThank you for using GO7 Fuel Delivery!`,
    metadata: {
      fuelType: orderData.fuelType,
      volume: orderData.volume,
      deliveryLocation: orderData.deliveryLocation.address
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false
  });

  await chatRef.update({
    lastMessage: '🎉 Fuel delivered successfully!',
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'completed'
  });

  // Update order completion time
  await db.collection('fuelOrders').doc(orderId).update({
    deliveredAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Get available fuel orders for riders
 */
exports.getAvailableFuelOrders = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const snapshot = await db.collection('fuelOrders')
      .where('status', '==', 'pending')
      .where('riderId', '==', null)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, orders };

  } catch (error) {
    console.error('Error getting available fuel orders:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get fuel orders for customer
 */
exports.getCustomerFuelOrders = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const uid = context.auth.uid;

  try {
    const snapshot = await db.collection('fuelOrders')
      .where('customerId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, orders };

  } catch (error) {
    console.error('Error getting customer fuel orders:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get the nearest fuel station and its distance from a given location
 * Used by the frontend to preview the accurate delivery fee.
 */
exports.getNearestFuelStation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { lat, lng, fuelType } = data || {};
  if (!lat || !lng) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid lat/lng required');
  }

  try {
    const nearestStation = await findNearestFuelStation({ lat, lng }, fuelType || 'petrol');
    if (!nearestStation) {
      throw new functions.https.HttpsError('failed-precondition', 'No fuel stations available in your area');
    }

    const distanceKm = calculateDistance(
      nearestStation.location.lat,
      nearestStation.location.lng,
      lat,
      lng
    );

    return {
      success: true,
      station: {
        id: nearestStation.id,
        name: nearestStation.name,
        address: nearestStation.location.address,
        location: nearestStation.location
      },
      distanceKm
    };
  } catch (error) {
    console.error('Error getting nearest fuel station:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Notify available riders about a new fuel order via FCM push
 */
async function notifyAvailableRiders(orderId, orderData) {
  try {
    const snapshot = await db.collection('riders')
      .where('status', '==', 'available')
      .limit(50)
      .get();

    const tokens = [];
    snapshot.forEach(doc => {
      const rider = doc.data();
      const token = rider.fcmToken || rider.deviceToken;
      if (token) tokens.push(token);
    });

    if (tokens.length === 0) {
      console.log('No available riders with FCM tokens for fuel order notification');
      return;
    }

    const unit = orderData.fuelType === 'cng' ? 'KG' : 'Litres';
    const title = '⛽ New Fuel Order!';
    const body = `₦${Number(orderData.amount || 0).toLocaleString()} fuel delivery (${(orderData.fuelType || 'petrol').toUpperCase()}) - ${orderData.volume} ${unit}. Accept now!`;

    const message = {
      notification: { title, body },
      data: {
        type: 'fuel_order',
        orderId,
        orderType: 'fuel',
        fuelType: orderData.fuelType || '',
        amount: String(orderData.amount || ''),
        volume: String(orderData.volume || ''),
        click_action: '/rider/dashboard'
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'fuel_orders',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const result = await admin.messaging().sendEachForMulticast({ ...message, tokens });
    const total = tokens.length;
    const failed = result.failureCount;
    console.log(`✅ Fuel order notification: ${result.successCount}/${total} sent, ${failed} failed`);

    // Clear stale/invalid FCM tokens so they don't keep failing
    const badTokenCodes = new Set([
      'messaging/registration-token-not-registered',
      'messaging/sender-id-mismatch',
      'messaging/invalid-argument'
    ]);
    if (failed > 0 && result.responses) {
      const tokensToClear = [];
      for (let i = 0; i < result.responses.length; i++) {
        const resp = result.responses[i];
        if (!resp.success && badTokenCodes.has(resp.error?.code)) {
          tokensToClear.push(tokens[i]);
        }
      }
      if (tokensToClear.length > 0) {
        const batch = db.batch();
        const snap = await db.collection('riders').where('fcmToken', 'in', tokensToClear).get();
        snap.forEach(d => batch.update(d.ref, { fcmToken: null }));
        const deviceSnap = await db.collection('riders').where('deviceToken', 'in', tokensToClear).get();
        deviceSnap.forEach(d => batch.update(d.ref, { deviceToken: null }));
        await batch.commit();
        console.log(`🗑️ Cleared ${tokensToClear.length} stale rider FCM tokens`);
      }
    }
  } catch (error) {
    console.error('Error notifying riders of fuel order:', error);
  }
}