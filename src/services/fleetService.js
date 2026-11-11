import {
    collection,
    doc,
    getDocs,
    updateDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    runTransaction,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Fleet Management Service for GoBuy Orders
 * Handles auto-assignment of foot and bike riders
 */

// Fleet collections
export const FLEET_COLLECTIONS = {
    FOOT: 'foot_fleet',
    BIKE: 'bike_fleet'
};

// Rider status constants
export const RIDER_STATUS = {
    AVAILABLE: 'available',
    BUSY: 'busy',
    OFFLINE: 'offline'
};

// Order status constants  
export const ORDER_STATUS = {
    PENDING: 'Pending',
    ASSIGNED: 'Assigned',
    ACCEPTED: 'Accepted',
    SHOPPING: 'Shopping',
    PURCHASED: 'Purchased',
    IN_TRANSIT: 'InTransit',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled'
};

/**
 * Calculate distance between two points using Haversine formula
 */
export const calculateHaversineDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
};

/**
 * Determine the preferred fleet mode based on distance
 */
export const getPreferredFleetMode = (distanceKm) => {
    return distanceKm <= 2 ? 'foot' : 'bike';
};

/**
 * Get available riders from a specific fleet
 */
export const getAvailableRiders = async (fleetType, customerLocation, maxDistance = 10) => {
    try {
        const collectionName = fleetType === 'foot' ? FLEET_COLLECTIONS.FOOT : FLEET_COLLECTIONS.BIKE;

        // Query available riders
        const ridersQuery = query(
            collection(db, collectionName),
            where('status', '==', RIDER_STATUS.AVAILABLE),
            orderBy('dailyEarnings', 'asc') // Prioritize riders with lower earnings for fairness
        );

        const snapshot = await getDocs(ridersQuery);
        const availableRiders = [];

        snapshot.forEach(doc => {
            const rider = { id: doc.id, ...doc.data() };

            // Calculate distance to customer
            if (rider.location && rider.location.lat && rider.location.lng) {
                const distance = calculateHaversineDistance(
                    customerLocation.lat,
                    customerLocation.lng,
                    rider.location.lat,
                    rider.location.lng
                );

                // Only include riders within reasonable distance
                if (distance <= maxDistance) {
                    rider.distanceKm = distance;
                    availableRiders.push(rider);
                }
            }
        });

        // Sort by distance (nearest first)
        availableRiders.sort((a, b) => a.distanceKm - b.distanceKm);

        return availableRiders;
    } catch (error) {
        console.error(`Error getting available ${fleetType} riders:`, error);
        return [];
    }
};

/**
 * Auto-assign a rider to a GoBuy order
 */
export const autoAssignRider = async (order) => {
    try {
        console.log('🚀 Starting auto-assignment for order:', order.id);

        // Determine customer location
        const customerLocation = {
            lat: order.customerLat,
            lng: order.customerLng
        };

        if (!customerLocation.lat || !customerLocation.lng) {
            throw new Error('Customer location not available');
        }

        // Determine preferred fleet mode
        const preferredMode = getPreferredFleetMode(order.distanceKm || 0);
        console.log(`📍 Order distance: ${order.distanceKm}km, preferred mode: ${preferredMode}`);

        // Try to get riders from preferred fleet first
        let availableRiders = await getAvailableRiders(preferredMode, customerLocation);

        // If no riders available in preferred fleet, try the other fleet
        if (availableRiders.length === 0) {
            const alternativeMode = preferredMode === 'foot' ? 'bike' : 'foot';
            console.log(`⚠️ No ${preferredMode} riders available, trying ${alternativeMode}`);
            availableRiders = await getAvailableRiders(alternativeMode, customerLocation);
        }

        if (availableRiders.length === 0) {
            console.log('❌ No riders available for assignment');
            return { success: false, error: 'No riders available' };
        }

        // Select the nearest available rider
        const selectedRider = availableRiders[0];
        console.log(`✅ Selected rider: ${selectedRider.name} (${selectedRider.distanceKm.toFixed(2)}km away)`);

        // Calculate payout based on order value and distance
        const basePayout = 200;
        const distanceBonus = Math.min(selectedRider.distanceKm * 10, 50); // ₦10 per km, max ₦50
        const totalPayout = basePayout + distanceBonus;

        // Run assignment transaction
        const result = await runTransaction(db, async (transaction) => {
            // Update order with assigned rider
            const orderRef = doc(db, 'gobuy_orders', order.id);
            transaction.update(orderRef, {
                assignedRider: selectedRider.id,
                assignedRiderName: selectedRider.name,
                assignedRiderPhone: selectedRider.phone,
                deliveryMode: selectedRider.mode,
                orderStatus: ORDER_STATUS.ASSIGNED,
                assignedAt: serverTimestamp(),
                estimatedPayout: totalPayout,
                riderDistance: selectedRider.distanceKm
            });

            // Update rider status to busy
            const fleetCollection = selectedRider.mode === 'foot' ? FLEET_COLLECTIONS.FOOT : FLEET_COLLECTIONS.BIKE;
            const riderRef = doc(db, fleetCollection, selectedRider.id);
            transaction.update(riderRef, {
                status: RIDER_STATUS.BUSY,
                currentOrder: order.id,
                lastAssignedAt: serverTimestamp()
            });

            // Create assignment record
            const assignmentRef = doc(collection(db, 'assignments'));
            transaction.set(assignmentRef, {
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
                timestamp: serverTimestamp()
            });

            return {
                riderId: selectedRider.id,
                riderName: selectedRider.name,
                riderMode: selectedRider.mode,
                riderPhone: selectedRider.phone,
                estimatedPayout: totalPayout,
                deviceToken: selectedRider.deviceToken
            };
        });

        console.log('✅ Auto-assignment completed successfully');
        return { success: true, assignment: result };

    } catch (error) {
        console.error('❌ Auto-assignment failed:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Handle rider acceptance of assignment
 */
export const handleRiderAcceptance = async (orderId, riderId, accepted) => {
    try {
        console.log(`🎯 Rider ${riderId} ${accepted ? 'accepted' : 'declined'} order ${orderId}`);

        if (accepted) {
            // Update order status to accepted
            const orderRef = doc(db, 'gobuy_orders', orderId);
            await updateDoc(orderRef, {
                orderStatus: ORDER_STATUS.ACCEPTED,
                acceptedAt: serverTimestamp()
            });

            // Add pending earning to rider's wallet
            const walletRef = doc(db, 'wallets', riderId);
            await runTransaction(db, async (transaction) => {
                // This would need wallet document structure - placeholder for now
                transaction.update(walletRef, {
                    pendingBalance: increment(200), // Base payout
                    lastUpdated: serverTimestamp()
                });
            });

            console.log('✅ Order accepted, wallet updated');
            return { success: true };
        } else {
            // Rider declined - reassign to next available rider
            const orderRef = doc(db, 'gobuy_orders', orderId);
            const orderDoc = await getDoc(orderRef);

            if (orderDoc.exists()) {
                const orderData = orderDoc.data();

                // Reset order status and remove current assignment
                await updateDoc(orderRef, {
                    assignedRider: null,
                    assignedRiderName: null,
                    assignedRiderPhone: null,
                    deliveryMode: null,
                    orderStatus: ORDER_STATUS.PENDING,
                    declinedRiders: arrayUnion(riderId) // Track declined riders
                });

                // Set rider back to available
                const riderFleets = [FLEET_COLLECTIONS.FOOT, FLEET_COLLECTIONS.BIKE];
                for (const fleet of riderFleets) {
                    try {
                        const riderRef = doc(db, fleet, riderId);
                        await updateDoc(riderRef, {
                            status: RIDER_STATUS.AVAILABLE,
                            currentOrder: null
                        });
                        break;
                    } catch (e) {
                        // Rider not in this fleet, try next
                    }
                }

                // Trigger reassignment (avoid infinite loops by excluding declined riders)
                setTimeout(() => {
                    autoAssignRider({ ...orderData, id: orderId });
                }, 1000);
            }

            console.log('⚠️ Order declined, reassigning...');
            return { success: true, reassigned: true };
        }
    } catch (error) {
        console.error('❌ Error handling rider response:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Mark order as delivered and update rider status
 */
export const handleOrderDelivery = async (orderId, riderId) => {
    try {
        await runTransaction(db, async (transaction) => {
            // Update order status
            const orderRef = doc(db, 'gobuy_orders', orderId);
            transaction.update(orderRef, {
                orderStatus: ORDER_STATUS.DELIVERED,
                deliveredAt: serverTimestamp()
            });

            // Set rider back to available
            const riderFleets = [FLEET_COLLECTIONS.FOOT, FLEET_COLLECTIONS.BIKE];
            for (const fleet of riderFleets) {
                try {
                    const riderRef = doc(db, fleet, riderId);
                    transaction.update(riderRef, {
                        status: RIDER_STATUS.AVAILABLE,
                        currentOrder: null,
                        dailyEarnings: increment(200) // Add to daily earnings
                    });
                    break;
                } catch (e) {
                    // Continue to next fleet
                }
            }

            // Move pending to available in wallet
            const walletRef = doc(db, 'wallets', riderId);
            transaction.update(walletRef, {
                availableBalance: increment(200),
                pendingBalance: increment(-200),
                lastUpdated: serverTimestamp()
            });
        });

        console.log('✅ Order delivery completed, rider available for new assignments');
        return { success: true };
    } catch (error) {
        console.error('❌ Error handling delivery:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get assignment statistics for admin dashboard
 */
export const getAssignmentStats = async () => {
    try {
        const assignmentsQuery = query(
            collection(db, 'assignments'),
            orderBy('timestamp', 'desc'),
            limit(100)
        );

        const snapshot = await getDocs(assignmentsQuery);
        const assignments = [];

        snapshot.forEach(doc => {
            assignments.push({ id: doc.id, ...doc.data() });
        });

        return {
            totalAssignments: assignments.length,
            footAssignments: assignments.filter(a => a.riderMode === 'foot').length,
            bikeAssignments: assignments.filter(a => a.riderMode === 'bike').length,
            averageDistance: assignments.reduce((sum, a) => sum + (a.distanceKm || 0), 0) / assignments.length,
            assignments
        };
    } catch (error) {
        console.error('Error getting assignment stats:', error);
        return null;
    }
};

export default {
    autoAssignRider,
    handleRiderAcceptance,
    handleOrderDelivery,
    getAvailableRiders,
    getAssignmentStats,
    calculateHaversineDistance,
    getPreferredFleetMode
};