import {
    collection,
    doc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    setDoc,
    deleteDoc,
    serverTimestamp,
    getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Real-time Data Management Service for Go7 Tracking System
 * Handles all Firestore listeners and data synchronization
 */

class TrackingDataService {
    constructor() {
        this.listeners = new Map();
        this.orderCache = new Map();
        this.riderLocationCache = new Map();
        this.isConnected = false;
    }

    // Initialize the service and set up connection monitoring
    initialize() {
        this.isConnected = true;
        console.log('🔥 Go7 Tracking Data Service initialized');

        // Monitor Firestore connection status
        this.setupConnectionMonitoring();

        return this;
    }

    // Connection monitoring
    setupConnectionMonitoring() {
        // This will help detect connection issues
        const unsubscribe = onSnapshot(
            doc(db, 'system', 'status'),
            (doc) => {
                this.isConnected = true;
            },
            (error) => {
                console.warn('Connection issue detected:', error);
                this.isConnected = false;
            }
        );

        this.listeners.set('connection', unsubscribe);
    }

    // Listen to a specific order's real-time updates
    listenToOrder(orderId, callback, errorCallback = null) {
        const orderRef = doc(db, 'bookings', orderId);

        const unsubscribe = onSnapshot(
            orderRef,
            (doc) => {
                if (doc.exists()) {
                    const orderData = { id: doc.id, ...doc.data() };
                    this.orderCache.set(orderId, orderData);
                    callback(orderData);
                } else {
                    callback(null);
                }
            },
            (error) => {
                console.error(`Error listening to order ${orderId}:`, error);
                if (errorCallback) errorCallback(error);
            }
        );

        this.listeners.set(`order_${orderId}`, unsubscribe);
        return unsubscribe;
    }

    // Listen to rider location updates
    listenToRiderLocation(riderId, callback, errorCallback = null) {
        const locationRef = doc(db, 'riders', riderId, 'location', 'current');

        const unsubscribe = onSnapshot(
            locationRef,
            (doc) => {
                if (doc.exists()) {
                    const locationData = {
                        riderId,
                        ...doc.data(),
                        timestamp: doc.data().timestamp?.toDate() || new Date()
                    };
                    this.riderLocationCache.set(riderId, locationData);
                    callback(locationData);
                } else {
                    callback(null);
                }
            },
            (error) => {
                console.error(`Error listening to rider location ${riderId}:`, error);
                if (errorCallback) errorCallback(error);
            }
        );

        this.listeners.set(`rider_location_${riderId}`, unsubscribe);
        return unsubscribe;
    }

    // Listen to all orders for a specific rider
    listenToRiderOrders(riderId, callback, errorCallback = null) {
        const ordersQuery = query(
            collection(db, 'bookings'),
            where('riderId', '==', riderId),
            where('orderStatus', 'in', ['assigned', 'pickup', 'enroute']),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            ordersQuery,
            (snapshot) => {
                const orders = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Update cache
                orders.forEach(order => {
                    this.orderCache.set(order.id, order);
                });

                callback(orders);
            },
            (error) => {
                console.error(`Error listening to rider orders ${riderId}:`, error);
                if (errorCallback) errorCallback(error);
            }
        );

        this.listeners.set(`rider_orders_${riderId}`, unsubscribe);
        return unsubscribe;
    }

    // Listen to all active orders (for admin dashboard)
    listenToAllActiveOrders(callback, errorCallback = null) {
        const ordersQuery = query(
            collection(db, 'bookings'),
            where('orderStatus', 'in', ['pending', 'assigned', 'pickup', 'enroute']),
            orderBy('createdAt', 'desc'),
            limit(50) // Limit to prevent excessive data
        );

        const unsubscribe = onSnapshot(
            ordersQuery,
            (snapshot) => {
                const orders = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Update cache
                orders.forEach(order => {
                    this.orderCache.set(order.id, order);
                });

                callback(orders);
            },
            (error) => {
                console.error('Error listening to all active orders:', error);
                if (errorCallback) errorCallback(error);
            }
        );

        this.listeners.set('all_active_orders', unsubscribe);
        return unsubscribe;
    }

    // Listen to all active riders (for admin dashboard)
    listenToAllActiveRiders(callback, errorCallback = null) {
        const ridersQuery = query(
            collection(db, 'riders'),
            where('status', '==', 'online'),
            orderBy('lastUpdated', 'desc')
        );

        const unsubscribe = onSnapshot(
            ridersQuery,
            (snapshot) => {
                const riders = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                callback(riders);
            },
            (error) => {
                console.error('Error listening to active riders:', error);
                if (errorCallback) errorCallback(error);
            }
        );

        this.listeners.set('all_active_riders', unsubscribe);
        return unsubscribe;
    }

    // Update order status with timestamp
    async updateOrderStatus(orderId, newStatus, additionalData = {}) {
        try {
            const updateData = {
                orderStatus: newStatus,
                updatedAt: serverTimestamp(),
                [`${newStatus}Time`]: serverTimestamp(),
                ...additionalData
            };

            await updateDoc(doc(db, 'bookings', orderId), updateData);

            // Update cache immediately for optimistic UI
            const cachedOrder = this.orderCache.get(orderId);
            if (cachedOrder) {
                this.orderCache.set(orderId, { ...cachedOrder, ...updateData });
            }

            return true;
        } catch (error) {
            console.error('Error updating order status:', error);
            throw error;
        }
    }

    // Update rider location
    async updateRiderLocation(riderId, locationData) {
        try {
            const updateData = {
                ...locationData,
                lastUpdated: serverTimestamp(),
                timestamp: serverTimestamp()
            };

            await setDoc(
                doc(db, 'riders', riderId, 'location', 'current'),
                updateData,
                { merge: true }
            );

            // Update cache
            this.riderLocationCache.set(riderId, { riderId, ...updateData });

            return true;
        } catch (error) {
            console.error('Error updating rider location:', error);
            throw error;
        }
    }

    // Update rider status (online, offline, busy)
    async updateRiderStatus(riderId, status, riderInfo = {}) {
        try {
            const updateData = {
                status,
                lastUpdated: serverTimestamp(),
                ...riderInfo
            };

            await setDoc(
                doc(db, 'riders', riderId),
                updateData,
                { merge: true }
            );

            return true;
        } catch (error) {
            console.error('Error updating rider status:', error);
            throw error;
        }
    }

    // Get cached order data (for immediate UI updates)
    getCachedOrder(orderId) {
        return this.orderCache.get(orderId) || null;
    }

    // Get cached rider location (for immediate UI updates)
    getCachedRiderLocation(riderId) {
        return this.riderLocationCache.get(riderId) || null;
    }

    // Calculate ETA between two points
    calculateETA(fromLat, fromLng, toLat, toLng, avgSpeed = 30) {
        // Haversine distance calculation
        const R = 6371; // Earth's radius in kilometers
        const dLat = (toLat - fromLat) * Math.PI / 180;
        const dLng = (toLng - fromLng) * Math.PI / 180;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        // Calculate ETA in minutes (assuming average speed in km/h)
        const eta = Math.round((distance / avgSpeed) * 60);
        return { distance, eta };
    }

    // Bulk operation: Send notifications to multiple users
    async sendBulkNotifications(notifications) {
        try {
            const batch = [];
            notifications.forEach(notification => {
                const notificationRef = doc(collection(db, 'notifications'));
                batch.push(setDoc(notificationRef, {
                    ...notification,
                    createdAt: serverTimestamp(),
                    read: false
                }));
            });

            await Promise.all(batch);
            return true;
        } catch (error) {
            console.error('Error sending bulk notifications:', error);
            throw error;
        }
    }

    // Listen to notifications for a specific user
    listenToUserNotifications(userId, callback, errorCallback = null) {
        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('read', '==', false),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(
            notificationsQuery,
            (snapshot) => {
                const notifications = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                callback(notifications);
            },
            (error) => {
                console.error(`Error listening to notifications for user ${userId}:`, error);
                // Handle permission denied errors gracefully
                if (error?.code === 'permission-denied') {
                  console.warn('📵 Insufficient permissions for notifications. Some features may not work.');
                  // Continue without notifications rather than crashing
                  return;
                }
                if (errorCallback) errorCallback(error);
            }
        );

        this.listeners.set(`notifications_${userId}`, unsubscribe);
        return unsubscribe;
    }

    // Mark notification as read
    async markNotificationAsRead(notificationId) {
        try {
            await updateDoc(doc(db, 'notifications', notificationId), {
                read: true,
                readAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    // Analytics: Get delivery statistics
    async getDeliveryStats(dateRange = 7) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - dateRange);

            const ordersQuery = query(
                collection(db, 'bookings'),
                where('createdAt', '>=', startDate),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(ordersQuery);
            const orders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const stats = {
                total: orders.length,
                delivered: orders.filter(o => o.orderStatus === 'delivered').length,
                pending: orders.filter(o => o.orderStatus === 'pending').length,
                inProgress: orders.filter(o => ['assigned', 'pickup', 'enroute'].includes(o.orderStatus)).length,
                totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0)
            };

            return stats;
        } catch (error) {
            console.error('Error getting delivery stats:', error);
            throw error;
        }
    }

    // Stop a specific listener
    stopListener(listenerKey) {
        const unsubscribe = this.listeners.get(listenerKey);
        if (unsubscribe) {
            unsubscribe();
            this.listeners.delete(listenerKey);
            return true;
        }
        return false;
    }

    // Stop all listeners (cleanup)
    stopAllListeners() {
        this.listeners.forEach((unsubscribe, key) => {
            unsubscribe();
        });
        this.listeners.clear();
        this.orderCache.clear();
        this.riderLocationCache.clear();
        console.log('🔥 All Go7 tracking listeners stopped');
    }

    // Get connection status
    getConnectionStatus() {
        return this.isConnected;
    }

    // Retry failed operations
    async retryOperation(operation, maxRetries = 3) {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                return await operation();
            } catch (error) {
                attempt++;
                if (attempt === maxRetries) {
                    throw error;
                }
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }
}

// Create and export singleton instance
const trackingService = new TrackingDataService();
export default trackingService;

// Export individual methods for convenience
export const {
    listenToOrder,
    listenToRiderLocation,
    listenToRiderOrders,
    listenToAllActiveOrders,
    listenToAllActiveRiders,
    updateOrderStatus,
    updateRiderLocation,
    updateRiderStatus,
    getCachedOrder,
    getCachedRiderLocation,
    calculateETA,
    sendBulkNotifications,
    listenToUserNotifications,
    markNotificationAsRead,
    getDeliveryStats,
    stopListener,
    stopAllListeners
} = trackingService;