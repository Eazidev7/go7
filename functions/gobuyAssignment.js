const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Cloud Function: Auto-assign riders to GoBuy orders
 * Triggers when a new document is created in /gobuy_orders
 */
exports.autoAssignGoBuyOrder = functions.firestore
    .document('gobuy_orders/{orderId}')
    .onCreate(async (snap, context) => {
        const orderId = context.params.orderId;
        const orderData = { id: orderId, ...snap.data() };

        console.log(`🚀 Auto-assignment triggered for order: ${orderId}`);

        try {
            // Only process orders in 'Pending' status
            if (orderData.orderStatus !== 'Pending') {
                console.log(`⏭️ Order ${orderId} not pending, skipping assignment`);
                return null;
            }

            // Validate required fields
            if (!orderData.customerLat || !orderData.customerLng) {
                console.error(`❌ Order ${orderId} missing customer coordinates`);
                await updateOrderStatus(orderId, 'Error', 'Missing customer location');
                return null;
            }

            // Run auto-assignment
            const assignmentResult = await assignRiderToOrder(orderData);

            if (assignmentResult.success) {
                console.log(`✅ Order ${orderId} assigned successfully to rider ${assignmentResult.assignment.riderId}`);

                // Send push notification to assigned rider
                await sendRiderNotification(assignmentResult.assignment, orderData);

                // Log assignment for analytics
                await logAssignment(orderId, assignmentResult.assignment);

            } else {
                console.error(`❌ Assignment failed for order ${orderId}: ${assignmentResult.error}`);

                // Mark order as unassigned and notify admin
                await updateOrderStatus(orderId, 'Unassigned', assignmentResult.error);
                await notifyAdminOfAssignmentFailure(orderId, assignmentResult.error);
            }

            return null;
        } catch (error) {
            console.error(`💥 Error in auto-assignment for order ${orderId}:`, error);
            await updateOrderStatus(orderId, 'Error', error.message);
            return null;
        }
    });

/**
 * Assign rider to order using distance-based selection
 */
async function assignRiderToOrder(order) {
    try {
        const customerLocation = {
            lat: order.customerLat,
            lng: order.customerLng
        };

        // Determine preferred fleet mode
        const preferredMode = order.distanceKm <= 2 ? 'foot' : 'bike';
        console.log(`📍 Order distance: ${order.distanceKm}km, preferred mode: ${preferredMode}`);

        // Get available riders
        let availableRiders = await getAvailableRiders(preferredMode, customerLocation);

        // If no riders in preferred fleet, try alternative
        if (availableRiders.length === 0) {
            const alternativeMode = preferredMode === 'foot' ? 'bike' : 'foot';
            console.log(`⚠️ No ${preferredMode} riders available, trying ${alternativeMode}`);
            availableRiders = await getAvailableRiders(alternativeMode, customerLocation);
        }

        if (availableRiders.length === 0) {
            return { success: false, error: 'No riders available' };
        }

        // Filter out declined riders
        const declinedRiders = order.declinedRiders || [];
        const eligibleRiders = availableRiders.filter(rider =>
            !declinedRiders.includes(rider.id)
        );

        if (eligibleRiders.length === 0) {
            return { success: false, error: 'No eligible riders available (all declined)' };
        }

        // Select nearest available rider
        const selectedRider = eligibleRiders[0];
        console.log(`✅ Selected rider: ${selectedRider.name} (${selectedRider.distanceKm.toFixed(2)}km away)`);

        // Calculate payout
        const basePayout = 200;
        const distanceBonus = Math.min(selectedRider.distanceKm * 10, 50);
        const totalPayout = basePayout + distanceBonus;

        // Run assignment transaction
        const batch = db.batch();

        // Update order
        const orderRef = db.collection('gobuy_orders').doc(order.id);
        batch.update(orderRef, {
            assignedRider: selectedRider.id,
            assignedRiderName: selectedRider.name,
            assignedRiderPhone: selectedRider.phone,
            deliveryMode: selectedRider.mode,
            orderStatus: 'Assigned',
            assignedAt: admin.firestore.FieldValue.serverTimestamp(),
            estimatedPayout: totalPayout,
            riderDistance: selectedRider.distanceKm
        });

        // Update rider status
        const fleetCollection = selectedRider.mode === 'foot' ? 'foot_fleet' : 'bike_fleet';
        const riderRef = db.collection(fleetCollection).doc(selectedRider.id);
        batch.update(riderRef, {
            status: 'busy',
            currentOrder: order.id,
            lastAssignedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create assignment record
        const assignmentRef = db.collection('assignments').doc();
        batch.set(assignmentRef, {
            orderId: order.id,
            assignedRider: selectedRider.id,
            riderName: selectedRider.name,
            riderMode: selectedRider.mode,
            riderFleet: fleetCollection,
            customerLocation,
            riderLocation: selectedRider.location,
            distanceKm: selectedRider.distanceKm,
            estimatedPayout: totalPayout,
            status: 'assigned',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        return {
            success: true,
            assignment: {
                riderId: selectedRider.id,
                riderName: selectedRider.name,
                riderMode: selectedRider.mode,
                riderPhone: selectedRider.phone,
                estimatedPayout: totalPayout,
                deviceToken: selectedRider.deviceToken,
                distanceKm: selectedRider.distanceKm
            }
        };

    } catch (error) {
        console.error('Assignment error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get available riders from specified fleet
 */
async function getAvailableRiders(fleetType, customerLocation, maxDistance = 10) {
    try {
        const collectionName = fleetType === 'foot' ? 'foot_fleet' : 'bike_fleet';

        // Query available riders
        const ridersQuery = db.collection(collectionName)
            .where('status', '==', 'available')
            .orderBy('dailyEarnings', 'asc')
            .limit(20);

        const snapshot = await ridersQuery.get();
        const availableRiders = [];

        snapshot.forEach(doc => {
            const rider = { id: doc.id, ...doc.data() };

            if (rider.location && rider.location.lat && rider.location.lng) {
                const distance = calculateHaversineDistance(
                    customerLocation.lat,
                    customerLocation.lng,
                    rider.location.lat,
                    rider.location.lng
                );

                if (distance <= maxDistance) {
                    rider.distanceKm = distance;
                    availableRiders.push(rider);
                }
            }
        });

        // Sort by distance
        availableRiders.sort((a, b) => a.distanceKm - b.distanceKm);

        return availableRiders;
    } catch (error) {
        console.error(`Error getting ${fleetType} riders:`, error);
        return [];
    }
}

/**
 * Calculate distance using Haversine formula
 */
function calculateHaversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Send FCM notification to assigned rider
 */
async function sendRiderNotification(assignment, orderData) {
    try {
        if (!assignment.deviceToken) {
            console.warn('No device token for rider, skipping notification');
            return;
        }

        const message = {
            token: assignment.deviceToken,
            notification: {
                title: '🛍️ New GoBuy Request!',
                body: `₦${assignment.estimatedPayout} payout! ${orderData.itemName} - Accept within 30 seconds`
            },
            data: {
                type: 'assignment',
                orderId: orderData.id,
                riderId: assignment.riderId,
                orderType: 'gobuy',
                itemName: orderData.itemName,
                customerAddress: orderData.customerAddress,
                estimatedPayout: assignment.estimatedPayout.toString(),
                distanceKm: assignment.distanceKm.toString(),
                timeout: '30'
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'gobuy_assignments',
                    priority: 'high',
                    defaultSound: true,
                    defaultVibratePattern: true
                }
            },
            apns: {
                headers: {
                    'apns-priority': '10'
                },
                payload: {
                    aps: {
                        alert: {
                            title: '🛍️ New GoBuy Request!',
                            body: `₦${assignment.estimatedPayout} payout! Accept within 30 seconds`
                        },
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        };

        await admin.messaging().send(message);
        console.log('✅ Assignment notification sent successfully');

        // Set up timeout for reassignment
        setTimeout(async () => {
            await handleAssignmentTimeout(orderData.id, assignment.riderId);
        }, 30000);

    } catch (error) {
        console.error('Error sending rider notification:', error);
    }
}

/**
 * Handle assignment timeout
 */
async function handleAssignmentTimeout(orderId, riderId) {
    try {
        const orderRef = db.collection('gobuy_orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) return;

        const orderData = orderDoc.data();

        // Only timeout if still assigned to this rider
        if (orderData.orderStatus === 'Assigned' && orderData.assignedRider === riderId) {
            console.log(`⏰ Timeout for order ${orderId}, reassigning...`);

            // Reset order to pending and add to declined list
            await orderRef.update({
                assignedRider: null,
                assignedRiderName: null,
                assignedRiderPhone: null,
                deliveryMode: null,
                orderStatus: 'Pending',
                declinedRiders: admin.firestore.FieldValue.arrayUnion(riderId),
                timeoutAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Set rider back to available
            const fleets = ['foot_fleet', 'bike_fleet'];
            for (const fleet of fleets) {
                try {
                    await db.collection(fleet).doc(riderId).update({
                        status: 'available',
                        currentOrder: null
                    });
                    break;
                } catch (e) {
                    // Continue to next fleet
                }
            }

            // Trigger reassignment after delay
            setTimeout(async () => {
                const updatedOrder = { id: orderId, ...orderData, declinedRiders: [...(orderData.declinedRiders || []), riderId] };
                await assignRiderToOrder(updatedOrder);
            }, 2000);
        }
    } catch (error) {
        console.error('Error handling timeout:', error);
    }
}

/**
 * Handle rider response to assignment
 */
exports.handleRiderResponse = functions.https.onCall(async (data, context) => {
    const { orderId, riderId, action } = data;

    try {
        console.log(`📲 Rider response: ${action} for order ${orderId} by rider ${riderId}`);

        if (action === 'accept') {
            // Update order status to accepted
            await db.collection('gobuy_orders').doc(orderId).update({
                orderStatus: 'Accepted',
                acceptedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Add pending earning to wallet
            try {
                await db.collection('wallets').doc(riderId).update({
                    pendingBalance: admin.firestore.FieldValue.increment(200),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
            } catch (walletError) {
                // Create wallet if doesn't exist
                await db.collection('wallets').doc(riderId).set({
                    riderId: riderId,
                    availableBalance: 0,
                    pendingBalance: 200,
                    totalEarnings: 0,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            return { success: true, message: 'Order accepted successfully' };

        } else if (action === 'decline') {
            // Handle decline - reset order and reassign
            await handleRiderDecline(orderId, riderId);
            return { success: true, message: 'Order declined, reassigning...' };
        }

        throw new Error('Invalid action');
    } catch (error) {
        console.error('Error handling rider response:', error);
        return { success: false, error: error.message };
    }
});

/**
 * Handle rider decline
 */
async function handleRiderDecline(orderId, riderId) {
    const batch = db.batch();

    // Reset order
    const orderRef = db.collection('gobuy_orders').doc(orderId);
    batch.update(orderRef, {
        assignedRider: null,
        assignedRiderName: null,
        assignedRiderPhone: null,
        deliveryMode: null,
        orderStatus: 'Pending',
        declinedRiders: admin.firestore.FieldValue.arrayUnion(riderId)
    });

    // Set rider back to available
    const fleets = ['foot_fleet', 'bike_fleet'];
    for (const fleet of fleets) {
        try {
            const riderRef = db.collection(fleet).doc(riderId);
            batch.update(riderRef, {
                status: 'available',
                currentOrder: null
            });
            break;
        } catch (e) {
            // Continue
        }
    }

    await batch.commit();

    // Trigger reassignment after delay
    setTimeout(async () => {
        const orderDoc = await orderRef.get();
        if (orderDoc.exists) {
            const orderData = { id: orderId, ...orderDoc.data() };
            await assignRiderToOrder(orderData);
        }
    }, 2000);
}

/**
 * Update order status
 */
async function updateOrderStatus(orderId, status, reason = null) {
    try {
        const updateData = {
            orderStatus: status,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        if (reason) {
            updateData.statusReason = reason;
        }

        await db.collection('gobuy_orders').doc(orderId).update(updateData);
    } catch (error) {
        console.error('Error updating order status:', error);
    }
}

/**
 * Log assignment for analytics
 */
async function logAssignment(orderId, assignment) {
    try {
        await db.collection('assignment_logs').add({
            orderId,
            riderId: assignment.riderId,
            riderName: assignment.riderName,
            riderMode: assignment.riderMode,
            estimatedPayout: assignment.estimatedPayout,
            distanceKm: assignment.distanceKm,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'assigned'
        });
    } catch (error) {
        console.error('Error logging assignment:', error);
    }
}

/**
 * Notify admin of assignment failure
 */
async function notifyAdminOfAssignmentFailure(orderId, error) {
    try {
        await db.collection('admin_alerts').add({
            type: 'assignment_failure',
            orderId,
            error,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'unread'
        });

        console.log('📨 Admin notified of assignment failure');
    } catch (error) {
        console.error('Error notifying admin:', error);
    }
}